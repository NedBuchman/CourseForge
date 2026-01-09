import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function getCorsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    "Access-Control-Allow-Credentials": "true",
  };
}

const rateLimiter = new Map<string, number[]>();

function isRateLimited(key: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const timestamps = rateLimiter.get(key) || [];
  const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
  if (validTimestamps.length >= maxRequests) {
    return true;
  }
  validTimestamps.push(now);
  rateLimiter.set(key, validTimestamps);
  return false;
}

function parseJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

async function verifyAuthentication(req: Request): Promise<string | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = parseJWT(token);
    if (!payload || !payload.sub) {
      return null;
    }
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    return payload.sub;
  } catch (error) {
    console.error('Authentication verification failed:', error);
    return null;
  }
}

async function verifyCourseOwnership(supabase: any, courseId: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('user_id')
      .eq('id', courseId)
      .maybeSingle();
    if (error || !data) {
      return false;
    }
    return data.user_id === userId;
  } catch (error) {
    console.error('Course ownership verification failed:', error);
    return false;
  }
}

function validateCourseRequest(request: any): { valid: boolean; error?: string } {
  if (!request.courseId || typeof request.courseId !== 'string') {
    return { valid: false, error: 'Invalid or missing courseId' };
  }
  if (!request.subject || typeof request.subject !== 'string' || request.subject.length < 3) {
    return { valid: false, error: 'Subject must be at least 3 characters long' };
  }
  if (!request.audience || typeof request.audience !== 'string') {
    return { valid: false, error: 'Audience is required' };
  }
  if (!request.difficulty || typeof request.difficulty !== 'string') {
    return { valid: false, error: 'Difficulty level is required' };
  }
  if (!request.duration || typeof request.duration !== 'string') {
    return { valid: false, error: 'Duration is required' };
  }
  const maxSubjectLength = 200;
  if (request.subject.length > maxSubjectLength) {
    return { valid: false, error: `Subject must be ${maxSubjectLength} characters or less` };
  }
  if (request.objectives && typeof request.objectives === 'string' && request.objectives.length > 1000) {
    return { valid: false, error: 'Objectives must be 1000 characters or less' };
  }
  if (request.context && typeof request.context === 'string' && request.context.length > 2000) {
    return { valid: false, error: 'Additional context must be 2000 characters or less' };
  }
  return { valid: true };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  let courseId: string | null = null;

  try {
    console.log('=== COURSE GENERATION REQUEST RECEIVED ===');

    const userId = await verifyAuthentication(req);
    if (!userId) {
      console.error('Authentication failed - invalid or missing token');
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('User authenticated:', userId.substring(0, 8) + '...');

    const requestData = await req.json();
    console.log('Request data:', {
      subject: requestData.subject,
      audience: requestData.audience,
      difficulty: requestData.difficulty,
      duration: requestData.duration,
      hasObjectives: !!requestData.objectives,
      hasContext: !!requestData.context,
      hasUploadedFiles: !!requestData.uploadedFileContents,
      restrictToFilesOnly: requestData.restrictToFilesOnly,
      hasChatHistory: !!requestData.chatHistory,
      courseId: requestData.courseId,
      contentFormat: requestData.contentFormat,
    });

    const validation = validateCourseRequest(requestData);
    if (!validation.valid) {
      console.error('Validation failed:', validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    courseId = requestData.courseId;
    const { subject, audience, difficulty, duration, objectives, context, uploadedFileContents, restrictToFilesOnly, chatHistory, contentFormat } = requestData;

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing');
      throw new Error('Server configuration error');
    }

    if (!claudeApiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    console.log('Environment configured correctly');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const ownsThisCourse = await verifyCourseOwnership(supabase, courseId, userId);
    if (!ownsThisCourse) {
      console.error('User does not own this course:', courseId);
      return new Response(
        JSON.stringify({ error: 'Forbidden - you do not own this course' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Course ownership verified');

    if (isRateLimited(userId, 5, 60000)) {
      console.warn('Rate limit exceeded for user:', userId);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment before trying again.' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Rate limit check passed');

    const { data: existingCourse, error: courseError } = await supabase
      .from('courses')
      .select('status, generation_progress')
      .eq('id', courseId)
      .maybeSingle();

    if (courseError) {
      console.error('Error fetching course:', courseError);
      throw new Error('Failed to fetch course details');
    }

    if (!existingCourse) {
      console.error('Course not found:', courseId);
      throw new Error('Course not found');
    }

    if (existingCourse.status === 'generating') {
      console.log('Course already generating, returning existing progress');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Course generation already in progress',
          progress: existingCourse.generation_progress || 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Starting course generation for:', courseId);

    await supabase
      .from('courses')
      .update({
        status: 'generating',
        generation_progress: 0,
        generation_stage: 'Initializing...',
        generation_error: null,
        generation_last_heartbeat: new Date().toISOString(),
      })
      .eq('id', courseId);

    const targetWordCount = duration.includes('30') ? 400 : duration.includes('1-hour') ? 600 : duration.includes('2-hours') ? 800 : 1000;

    async function updateProgress(supabase: any, courseId: string, progress: number, stage: string, currentLesson: number | undefined, generatedLessons: number[]) {
      const heartbeat = new Date().toISOString();
      await supabase
        .from('courses')
        .update({
          generation_progress: progress,
          generation_stage: stage,
          current_lesson_generating: currentLesson,
          lessons_generated: generatedLessons,
          generation_last_heartbeat: heartbeat,
        })
        .eq('id', courseId);
    }

    await updateProgress(supabase, courseId, 5, 'Starting course generation...', undefined, []);

    const lessonCount = duration.includes('30') ? 3 : duration.includes('1-hour') ? 4 : duration.includes('2-hours') ? 6 : duration.includes('3-hours') ? 8 : 10;
    const lessonDuration = duration.includes('30') ? '10 min' : duration.includes('1-hour') ? '15 min' : duration.includes('2-hours') ? '20 min' : '25 min';

    const estimatedCompletion = new Date();
    estimatedCompletion.setSeconds(estimatedCompletion.getSeconds() + (lessonCount * 20));

    await supabase
      .from('courses')
      .update({ generation_estimated_completion: estimatedCompletion.toISOString() })
      .eq('id', courseId);

    await updateProgress(supabase, courseId, 10, 'Building course prompt...', undefined, []);

    console.log("Starting chunked generation approach for better reliability...");
    await updateProgress(supabase, courseId, 15, `Generating course outline...`, 0, []);

    const outlinePrompt = `You are an expert instructional designer. Generate a course outline ONLY.\n\nYou MUST respond with ONLY valid JSON (no markdown, no explanations).\n\nCourse Requirements:\n- Topic: ${subject}\n- Audience: ${audience}\n- Difficulty: ${difficulty}\n- Duration: ${duration}\n- Number of Lessons: ${lessonCount}\n- Duration per Lesson: ${lessonDuration}${objectives ? `\n- Objectives: ${objectives}` : ''}${context ? `\n- Emphasis: ${context}` : ''}\n\nGenerate an outline with ${lessonCount} lesson titles and 3-4 objectives for each lesson.\n\nJSON format (start with { immediately):\n{\n  \"course_title\": \"${subject}\",\n  \"total_lessons\": ${lessonCount},\n  \"estimated_duration\": \"${duration}\",\n  \"lessons\": [\n    {\n      \"lesson_number\": 1,\n      \"title\": \"Lesson title here\",\n      \"duration\": \"${lessonDuration}\",\n      \"objectives\": [\"Objective 1\", \"Objective 2\", \"Objective 3\"]\n    }\n  ]\n}`;

    const extractJSON = (text: string): string => {
      let cleaned = text.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      }
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
      return cleaned.trim();
    };

    const outlineResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        temperature: 0.3,
        messages: [{ role: "user", content: outlinePrompt }],
      }),
    });

    if (!outlineResponse.ok) {
      const errorText = await outlineResponse.text();
      console.error("Claude API Error:", outlineResponse.status, errorText);
      throw new Error(`Failed to generate course outline: ${errorText}`);
    }

    const outlineData = await outlineResponse.json();
    const outlineText = extractJSON(outlineData.content[0].text);
    const courseOutline = JSON.parse(outlineText);

    console.log(`Course outline generated with ${courseOutline.lessons.length} lessons`);
    await updateProgress(supabase, courseId, 20, `Outline complete. Generating lesson content...`, 0, []);

    const lessons = [];
    const baseProgress = 20;
    const progressPerLesson = 70 / lessonCount;

    for (let i = 0; i < courseOutline.lessons.length; i++) {
      const lessonOutline = courseOutline.lessons[i];
      const lessonNumber = i + 1;

      console.log(`Generating content for lesson ${lessonNumber}/${lessonCount}: ${lessonOutline.title}`);
      await updateProgress(supabase, courseId, baseProgress + (i * progressPerLesson), `Generating lesson ${lessonNumber}/${lessonCount}: ${lessonOutline.title}`, lessonNumber, lessons.map((_, idx) => idx + 1));

      let lessonContentPrompt = `You are an expert instructional designer. Generate detailed content for ONE lesson.\n\nYou MUST respond with ONLY valid JSON (no markdown, no explanations).\n\nLesson Details:\n- Lesson Number: ${lessonNumber}\n- Title: ${lessonOutline.title}\n- Objectives: ${lessonOutline.objectives.join(', ')}\n- Duration: ${lessonDuration}\n- Target Word Count: ${targetWordCount} words\n- Audience: ${audience}\n- Difficulty: ${difficulty}`;

      if (contentFormat === 'video' || contentFormat === 'hybrid') {
        lessonContentPrompt += `\n- Format: This lesson will be presented as a VIDEO. Write clear, conversational content suitable for narration. Use a friendly, engaging tone.`;
      }

      if (uploadedFileContents && uploadedFileContents.length > 0) {
        lessonContentPrompt += `\n\nReference Materials:\n${uploadedFileContents.join('\n\n')}`;
        if (restrictToFilesOnly) {
          lessonContentPrompt += `\n\nIMPORTANT: Base the lesson content ONLY on the provided reference materials. Do not add external information.`;
        } else {
          lessonContentPrompt += `\n\nUse the reference materials as primary sources, but supplement with your knowledge as needed.`;
        }
      } else {
        lessonContentPrompt += `\n\nNo reference materials provided. Use your knowledge to create comprehensive, accurate content.`;
      }

      lessonContentPrompt += `\n\nGenerate detailed, educational content. Use proper formatting with headings, paragraphs, and lists.\n\nJSON format (start with { immediately):\n{\n  \"content\": \"<h2>Introduction</h2><p>Content here...</p>\"\n}`;

      const lessonResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": claudeApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          temperature: 0.5,
          messages: [{ role: "user", content: lessonContentPrompt }],
        }),
      });

      if (!lessonResponse.ok) {
        const errorText = await lessonResponse.text();
        console.error(`Failed to generate lesson ${lessonNumber}:`, errorText);
        throw new Error(`Failed to generate lesson ${lessonNumber}: ${errorText}`);
      }

      const lessonData = await lessonResponse.json();
      const lessonText = extractJSON(lessonData.content[0].text);
      const lessonContent = JSON.parse(lessonText);

      lessons.push({
        lesson_number: lessonNumber,
        title: lessonOutline.title,
        content: lessonContent.content,
        duration: lessonDuration,
        objectives: lessonOutline.objectives,
      });
    }

    const finalCourseContent = {
      course_title: courseOutline.course_title,
      total_lessons: lessonCount,
      estimated_duration: duration,
      lessons: lessons,
    };

    console.log('Course generation complete, updating database...');
    await updateProgress(supabase, courseId, 95, 'Finalizing course...', undefined, lessons.map((_, idx) => idx + 1));

    const { error: updateError } = await supabase
      .from('courses')
      .update({
        status: 'completed',
        generated_content: finalCourseContent,
        generation_progress: 100,
        generation_stage: 'Complete',
        updated_at: new Date().toISOString(),
      })
      .eq('id', courseId);

    if (updateError) {
      console.error('Failed to update course with generated content:', updateError);
      throw new Error('Failed to save generated course content');
    }

    console.log('=== COURSE GENERATION COMPLETE ===');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Course generated successfully',
        courseContent: finalCourseContent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error("Error in generate-course-content:", error);
    console.error("Error stack:", error.stack);

    let userFriendlyMessage = error.message || "An unexpected error occurred";
    let statusCode = 500;

    if (error.message?.includes('ANTHROPIC_API_KEY not configured')) {
      statusCode = 503;
      userFriendlyMessage = "Configuration Error: The AI service is not properly configured. Please ensure ANTHROPIC_API_KEY is set in your Supabase project secrets (Project Settings > Edge Functions > Add Secret).";
    } else if (error.message?.includes('Authentication failed')) {
      statusCode = 503;
    } else if (error.message?.includes('Rate limit')) {
      statusCode = 429;
    } else if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
      statusCode = 504;
    } else if (error.message?.includes('Failed to parse course content') || error.message?.includes('JSON')) {
      statusCode = 500;
      userFriendlyMessage = "The AI had trouble formatting the course content properly. This is usually temporary. Please try again with: 1) A shorter course duration, 2) Simpler learning objectives, or 3) Wait a moment and retry.";
    } else if (error.message?.includes('Invalid JSON format')) {
      statusCode = 500;
      userFriendlyMessage = error.message;
    }

    if (courseId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase
        .from('courses')
        .update({
          status: 'failed',
          generation_error: userFriendlyMessage,
          generation_progress: 0,
        })
        .eq('id', courseId);
    }

    return new Response(
      JSON.stringify({ error: userFriendlyMessage }),
      {
        status: statusCode,
        headers: { ...getCorsHeaders(null), 'Content-Type': 'application/json' },
      }
    );
  }
});