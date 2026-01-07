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
  return { valid: true };
}

async function logSecurityEvent(
  supabase: any,
  eventType: string,
  status: 'success' | 'failure',
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    console.log(`Security Event: ${eventType} - ${status}`, {
      resource_type: resourceType,
      resource_id: resourceId,
      metadata
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CourseRequest {
  courseId: string;
  subject: string;
  audience: string;
  difficulty: string;
  duration: string;
  objectives?: string;
  context?: string;
  uploadedFileContents?: string[];
  restrictToFilesOnly?: boolean;
  chatHistory?: ChatMessage[];
  contentFormat?: string;
}

async function updateProgress(
  supabase: any,
  courseId: string,
  progress: number,
  stage: string,
  currentLesson?: number,
  lessonsGenerated?: number[]
) {
  const updates: any = {
    generation_progress: progress,
    generation_stage: stage,
    generation_last_heartbeat: new Date().toISOString(),
  };

  if (currentLesson !== undefined) {
    updates.current_lesson_generating = currentLesson;
  }

  if (lessonsGenerated !== undefined) {
    updates.lessons_generated = lessonsGenerated;
  }

  await supabase
    .from('courses')
    .update(updates)
    .eq('id', courseId);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  let courseId: string | undefined;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rateLimitKey = `generate-course:${clientIp}`;

    if (isRateLimited(rateLimitKey, 3, 300000)) {
      await logSecurityEvent(supabase, 'generate_course_rate_limited', 'failure', 'course', undefined, { ip: clientIp });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Too many course generation requests. Please wait 5 minutes before trying again.",
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const userId = await verifyAuthentication(req);
    if (!userId) {
      await logSecurityEvent(supabase, 'generate_course_unauthorized', 'failure', 'course');
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized: Authentication required",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const requestData: CourseRequest = await req.json();

    const validation = validateCourseRequest(requestData);
    if (!validation.valid) {
      await logSecurityEvent(supabase, 'generate_course_invalid_input', 'failure', 'course', requestData.courseId, {
        error: validation.error
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: validation.error,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { courseId: reqCourseId, subject, audience, difficulty, duration, objectives, context, uploadedFileContents, restrictToFilesOnly, chatHistory, contentFormat } = requestData;

    courseId = reqCourseId;

    const ownsCourse = await verifyCourseOwnership(supabase, courseId, userId);
    if (!ownsCourse) {
      await logSecurityEvent(supabase, 'generate_course_unauthorized_access', 'failure', 'course', courseId, {
        user_id: userId
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized: You do not have permission to generate content for this course",
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    await logSecurityEvent(supabase, 'generate_course_started', 'success', 'course', courseId, {
      user_id: userId
    });

    const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!claudeApiKey) {
      console.error("ANTHROPIC_API_KEY is not configured in Supabase project secrets");
      throw new Error("ANTHROPIC_API_KEY not configured. Please add it to Supabase project secrets.");
    }

    const isVideoFormat = contentFormat === 'video';
    const targetWordCount = isVideoFormat ? 350 : 600;

    console.log("Processing course generation request:", {
      courseId,
      subject,
      audience,
      difficulty,
      duration,
      contentFormat,
      targetWordCount
    });

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

    const outlinePrompt = `You are an expert instructional designer. Generate a course outline ONLY.\\n\\nYou MUST respond with ONLY valid JSON (no markdown, no explanations).\\n\\nCourse Requirements:\\n- Topic: ${subject}\\n- Audience: ${audience}\\n- Difficulty: ${difficulty}\\n- Duration: ${duration}\\n- Number of Lessons: ${lessonCount}\\n- Duration per Lesson: ${lessonDuration}${objectives ? `\\n- Objectives: ${objectives}` : ''}${context ? `\\n- Emphasis: ${context}` : ''}\\n\\nGenerate an outline with ${lessonCount} lesson titles and 3-4 objectives for each lesson.\\n\\nJSON format (start with { immediately):\\n{\\n  \\\"course_title\\\": \\\"${subject}\\\",\\n  \\\"total_lessons\\\": ${lessonCount},\\n  \\\"estimated_duration\\\": \\\"${duration}\\\",\\n  \\\"lessons\\\": [\\n    {\\n      \\\"lesson_number\\\": 1,\\n      \\\"title\\\": \\\"Lesson title here\\\",\\n      \\\"duration\\\": \\\"${lessonDuration}\\\",\\n      \\\"objectives\\\": [\\\"Objective 1\\\", \\\"Objective 2\\\", \\\"Objective 3\\\"]\\n    }\\n  ]\\n}`;

    const extractJSON = (text: string): string => {
      let cleaned = text.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\\s*/i, '').replace(/\\s*```$/i, '').trim();
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\\s*/i, '').replace(/\\s*```$/i, '').trim();
      }
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      cleaned = cleaned.replace(/[\\u0000-\\u001F\\u007F-\\u009F]/g, '');
      cleaned = cleaned.replace(/,(\\s*[}\\]])/g, '$1');
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

      let lessonContentPrompt = `You are an expert instructional designer. Generate detailed content for ONE lesson.\\n\\nYou MUST respond with ONLY valid JSON (no markdown, no explanations).\\n\\nLesson Details:\\n- Lesson Number: ${lessonNumber}\\n- Title: ${lessonOutline.title}\\n- Objectives: ${lessonOutline.objectives.join(', ')}\\n- Duration: ${lessonDuration}\\n- Target Word Count: ${targetWordCount} words\\n- Audience: ${audience}\\n- Difficulty: ${difficulty}`;

      if (uploadedFileContents && uploadedFileContents.length > 0) {
        if (restrictToFilesOnly) {
          lessonContentPrompt += `\\n\\nCRITICAL: Base content ONLY on these reference materials:\\n${uploadedFileContents.join('\\n\\n--- NEXT DOCUMENT ---\\n\\n')}`;
        } else {
          lessonContentPrompt += `\\n\\nReference Materials (use as primary sources):\\n${uploadedFileContents.join('\\n\\n--- NEXT DOCUMENT ---\\n\\n')}`;
        }
      }

      lessonContentPrompt += `\\n\\nGenerate comprehensive educational content (~${targetWordCount} words) with practical examples and HTML formatting (<strong>, <em>, <p>).\\n${isVideoFormat ? 'Keep content concise and conversational for video narration.' : ''}\\n\\nJSON format:\\n{\\n  \\\"content\\\": \\\"Detailed lesson content with <strong>formatting</strong> and examples\\\"\\n}`;

      const lessonResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": claudeApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 3000,
          temperature: 0.3,
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

      console.log(`Lesson ${lessonNumber} completed (${lessons.length}/${lessonCount})`);
      await updateProgress(supabase, courseId, baseProgress + ((i + 1) * progressPerLesson), `Lesson ${lessonNumber}/${lessonCount} complete`, undefined, lessons.map((_, idx) => idx + 1));
    }

    const courseContent = {
      course_title: courseOutline.course_title,
      total_lessons: lessonCount,
      estimated_duration: duration,
      lessons: lessons,
    };

    console.log(`All ${lessonCount} lessons generated successfully`);

    await updateProgress(supabase, courseId, 95, 'Saving course to database...', undefined, Array.from({ length: lessonCount }, (_, i) => i + 1));

    const { error: updateError } = await supabase
      .from('courses')
      .update({
        status: 'completed',
        generated_content: courseContent,
        generation_progress: 100,
        generation_stage: 'Completed',
        generation_completed_at: new Date().toISOString(),
        current_lesson_generating: null,
        lessons_generated: Array.from({ length: lessonCount}, (_, i) => i + 1),
        content_status: 'completed',
        content_generated_at: new Date().toISOString(),
        current_step: 2,
        last_completed_step: 1,
      })
      .eq('id', courseId);

    if (updateError) {
      console.error('Error updating course with generated content:', updateError);
      throw new Error('Failed to save course content to database');
    }

    console.log("Course content generated and saved successfully");
    console.log("User will review content at step 2 before proceeding");
    console.log("Video generation (if enabled) will start after content approval");

    return new Response(
      JSON.stringify({
        success: true,
        courseContent,
        usage: outlineData.usage,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
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
          generation_completed_at: new Date().toISOString(),
          current_lesson_generating: null,
        })
        .eq('id', courseId);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: userFriendlyMessage,
        errorType: error.name,
        timestamp: new Date().toISOString(),
      }),
      {
        status: statusCode,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
