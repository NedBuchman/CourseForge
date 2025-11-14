import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  let courseId: string | undefined;

  try {
    const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!claudeApiKey) {
      console.error("ANTHROPIC_API_KEY is not configured in Supabase project secrets");
      throw new Error("ANTHROPIC_API_KEY not configured. Please add it to Supabase project secrets.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: CourseRequest = await req.json();
    const { courseId: reqCourseId, subject, audience, difficulty, duration, objectives, context, uploadedFileContents, restrictToFilesOnly, chatHistory } = requestData;

    courseId = reqCourseId;

    console.log("Processing course generation request:", { courseId, subject, audience, difficulty, duration });

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

    let prompt = `You are an expert instructional designer. You MUST respond with ONLY valid JSON.\n\nCRITICAL RULES - FOLLOW EXACTLY:\n1. Your response must START with the character { (opening brace)\n2. Your response must END with the character } (closing brace)\n3. NO text before the {\n4. NO text after the }\n5. NO markdown code blocks (\`\`\`json or \`\`\`)\n6. NO explanations, notes, or comments anywhere\n7. Do NOT include trailing commas in arrays or objects\n8. Ensure all JSON strings are properly escaped\n\nCOURSE REQUIREMENTS:\nTopic: ${subject}\nAudience: ${audience}\nDifficulty: ${difficulty}\nDuration: ${duration}\nNumber of Lessons: ${lessonCount}\nDuration per Lesson: ${lessonDuration}`;

    if (objectives) {
      prompt += `\nObjectives: ${objectives}`;
    }

    if (context) {
      prompt += `\nEmphasis: ${context}`;
    }

    if (uploadedFileContents && uploadedFileContents.length > 0) {
      const totalWords = uploadedFileContents.reduce((sum, content) => sum + content.split(/\s+/).length, 0);
      console.log(`Including ${uploadedFileContents.length} reference file(s) with ${totalWords} words. Restrict mode: ${restrictToFilesOnly || false}`);

      if (restrictToFilesOnly) {
        prompt += `\n\n=== CRITICAL CONTENT RESTRICTION ===\nYou MUST base the course content ONLY on the Reference Materials provided below.\n\nIMPORTANT RULES:\n1. DO NOT use your general knowledge or training data\n2. ALL course content must be derived from the materials below\n3. If information is not available in the reference materials, acknowledge the limitation\n4. Stay strictly within the scope of the provided documents\n5. Do not infer or assume information not present in the materials\n\nReference Materials (${uploadedFileContents.length} file(s), ~${totalWords} words):\n${uploadedFileContents.join('\n\n--- NEXT DOCUMENT ---\n\n')}`;
      } else {
        prompt += `\n\nReference Materials Provided (${uploadedFileContents.length} file(s), ~${totalWords} words):\nThe user has provided reference materials below. Use these as PRIMARY SOURCES for the course content.\nYou may supplement with your general knowledge where appropriate to create a comprehensive course.\n\n${uploadedFileContents.join('\n\n--- NEXT DOCUMENT ---\n\n')}`;
      }
    }

    if (chatHistory && chatHistory.length > 0) {
      prompt += `\n\nREFINEMENT CHAT HISTORY:\nThe user had a conversation with an instructional design assistant to refine this course. Consider these discussions when generating content:\n\n`;
      chatHistory.forEach(msg => {
        prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
      });
      prompt += `\nIMPORTANT: Incorporate the insights, requests, and refinements from the chat above into the course content.`;
    }

    prompt += `\n\nCONTENT REQUIREMENTS:\n1. Create exactly ${lessonCount} progressive lessons with accurate, current information\n2. Each lesson must have: clear title, focused content (~600 words), 3-5 learning objectives\n3. Use practical examples, basic HTML tags for formatting (<strong>, <em>, <p>), audience-appropriate language\n4. Content should be comprehensive and educational\n\nJSON STRUCTURE TO RETURN (start with { immediately):\n{\n  \"course_title\": \"${subject}\",\n  \"total_lessons\": ${lessonCount},\n  \"estimated_duration\": \"${duration}\",\n  \"lessons\": [\n    {\n      \"lesson_number\": 1,\n      \"title\": \"Lesson title here\",\n      \"content\": \"Comprehensive lesson content with <strong>formatted</strong> text and examples\",\n      \"duration\": \"${lessonDuration}\",\n      \"objectives\": [\"Objective 1\", \"Objective 2\", \"Objective 3\"]\n    }\n  ]\n}\n\nFINAL REMINDER: Your response must be PURE JSON starting with { and ending with }. Nothing else!`;

    console.log("Calling Claude API...");
    await updateProgress(supabase, courseId, 15, `Generating ${lessonCount} lessons with AI...`, 0, []);

    const timeoutDuration = 540000;
    const maxRetries = 2;
    let claudeResponse;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt}/${maxRetries}`);
        await updateProgress(supabase, courseId, 15 + (attempt * 5), `Retrying AI generation (attempt ${attempt + 1})...`, 0, []);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

      const progressUpdateInterval = setInterval(async () => {
        const currentProgress = 15 + (attempt * 5) + Math.min(attempt === 0 ? 70 : 60, Math.floor(Math.random() * 10));
        await updateProgress(supabase, courseId, currentProgress, `AI is generating course content... (this may take 2-5 minutes)`, undefined, []);
      }, 10000);

      try {
        claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": claudeApiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: lessonCount <= 3 ? 8000 : lessonCount <= 4 ? 10000 : lessonCount <= 6 ? 12000 : lessonCount <= 8 ? 14000 : 16000,
            temperature: 0.3,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        clearInterval(progressUpdateInterval);
        break;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        clearInterval(progressUpdateInterval);
        lastError = fetchError;
        console.error(`Attempt ${attempt + 1} failed:`, fetchError.message);

        if (fetchError.name === 'AbortError') {
          if (attempt === maxRetries) {
            console.error(`Claude API timeout after ${timeoutDuration / 1000} seconds (all retries exhausted)`);
            throw new Error(`Course generation timed out after ${maxRetries + 1} attempts. The AI took too long to generate content. Please try: 1) Creating a shorter course, 2) Simplifying your requirements, or 3) Trying again in a few minutes.`);
          }
          continue;
        }

        if (attempt === maxRetries) {
          throw fetchError;
        }
      }
    }

    if (!claudeResponse || !claudeResponse.ok) {
      const errorText = await claudeResponse?.text() || 'Unknown error';
      console.error("Claude API Error:", claudeResponse?.status, errorText);

      if (claudeResponse?.status === 401) {
        throw new Error("Authentication failed: Invalid or missing ANTHROPIC_API_KEY. Please verify your API key is correct in Supabase project secrets.");
      } else if (claudeResponse?.status === 429) {
        throw new Error("Rate limit exceeded: Too many requests to Claude API. Please wait a few minutes and try again.");
      } else if (claudeResponse?.status === 500 || claudeResponse?.status === 529) {
        throw new Error("Claude API is temporarily unavailable. Please try again in a few minutes.");
      } else {
        throw new Error(`Claude API error (${claudeResponse?.status}): ${errorText}. Please check your API configuration and try again.`);
      }
    }

    await updateProgress(supabase, courseId, 85, 'Processing AI response...', undefined, []);

    const claudeData = await claudeResponse.json();
    console.log("Claude Response received successfully");

    if (!claudeData.content || !claudeData.content[0] || !claudeData.content[0].text) {
      console.error("Invalid Claude response structure:", JSON.stringify(claudeData));
      throw new Error("Received invalid response from Claude API. Please try again.");
    }

    let contentText = claudeData.content[0].text.trim();

    const extractJSON = (text: string): string => {
      let cleaned = text.trim();

      console.log("DEBUG: Original text length:", cleaned.length);
      console.log("DEBUG: First 200 chars:", cleaned.substring(0, 200));
      console.log("DEBUG: Last 200 chars:", cleaned.substring(Math.max(0, cleaned.length - 200)));

      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        console.log("DEBUG: Removed ```json markers");
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        console.log("DEBUG: Removed ``` markers");
      }

      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        console.log("DEBUG: Extracted content between braces, length:", cleaned.length);
      }

      cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

      cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

      return cleaned.trim();
    };

    contentText = extractJSON(contentText);

    await updateProgress(supabase, courseId, 90, 'Parsing course content...', undefined, []);

    let courseContent;
    try {
      courseContent = JSON.parse(contentText);
      console.log("SUCCESS: Parsed JSON on first attempt");
    } catch (parseError: any) {
      console.error("PARSE ERROR: Failed to parse Claude response as JSON");
      console.error("Error details:", parseError.message);
      console.error("Full extracted text to parse:", contentText);
      console.error("Text length:", contentText.length);

      const retryPrompt = `Your previous response had invalid JSON formatting and could not be parsed.\n\nCRITICAL INSTRUCTIONS:\n- Output ONLY raw JSON\n- Start immediately with {\n- End immediately with }\n- NO markdown, NO explanations, NO extra text\n- Remove ALL trailing commas from arrays and objects\n- Properly escape all quotes in strings\n\nGenerate a course with ${lessonCount} lessons on: ${subject}\n\nRequired JSON format (output this EXACT structure):\n{\"course_title\":\"${subject}\",\"total_lessons\":${lessonCount},\"estimated_duration\":\"${duration}\",\"lessons\":[{\"lesson_number\":1,\"title\":\"Title Here\",\"content\":\"Content here with <strong>formatting</strong>\",\"duration\":\"${lessonDuration}\",\"objectives\":[\"objective 1\",\"objective 2\",\"objective 3\"]}]}\n\nSTART YOUR RESPONSE WITH { NOW:`;

      console.log("RETRY: Attempting to get valid JSON with simplified prompt");
      await updateProgress(supabase, courseId, 85, 'Fixing JSON format issues...', undefined, []);

      try {
        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), 180000);

        const retryResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": claudeApiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: lessonCount <= 3 ? 8000 : lessonCount <= 4 ? 10000 : lessonCount <= 6 ? 12000 : 14000,
            temperature: 0.1,
            messages: [
              {
                role: "user",
                content: retryPrompt,
              },
            ],
          }),
          signal: retryController.signal,
        });

        clearTimeout(retryTimeoutId);

        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          if (retryData.content?.[0]?.text) {
            console.log("RETRY: Got response from Claude");
            const retryText = extractJSON(retryData.content[0].text);
            console.log("RETRY: Extracted JSON, attempting parse...");
            courseContent = JSON.parse(retryText);
            console.log("SUCCESS: Parsed JSON on retry attempt");
          } else {
            console.error("RETRY FAILED: Invalid response structure from Claude");
            throw new Error(`JSON parsing failed. Original error: ${parseError.message}. The AI response format was invalid even after retry.`);
          }
        } else {
          const retryErrorText = await retryResponse.text();
          console.error("RETRY FAILED: HTTP error", retryResponse.status, retryErrorText);
          throw new Error(`Failed to get valid response on retry (HTTP ${retryResponse.status}). Original parsing error: ${parseError.message}`);
        }
      } catch (retryError: any) {
        console.error("RETRY EXCEPTION:", retryError.message);
        console.error("Stack trace:", retryError.stack);
        throw new Error(`Failed to parse course content from Claude. The AI returned invalid JSON format. Original error: ${parseError.message}. Retry error: ${retryError.message}. Please try: 1) Creating a shorter course, 2) Simplifying your objectives, or 3) Trying again in a few moments.`);
      }
    }

    if (!courseContent.lessons || !Array.isArray(courseContent.lessons) || courseContent.lessons.length === 0) {
      console.error("Invalid course content structure:", JSON.stringify(courseContent).substring(0, 500));
      throw new Error("Generated course content is missing lessons. Please try again.");
    }

    await updateProgress(supabase, courseId, 95, 'Saving course to database...', undefined, Array.from({ length: lessonCount }, (_, i) => i + 1));

    const { data: updatedCourse, error: updateError } = await supabase
      .from('courses')
      .update({
        status: 'completed',
        generated_content: courseContent,
        generation_progress: 100,
        generation_stage: 'Completed',
        generation_completed_at: new Date().toISOString(),
        current_lesson_generating: null,
        lessons_generated: Array.from({ length: lessonCount }, (_, i) => i + 1),
        content_status: 'completed',
        content_generated_at: new Date().toISOString(),
        current_step: 2,
        last_completed_step: 1,
      })
      .eq('id', courseId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating course with generated content:', updateError);
      throw new Error('Failed to save course content to database');
    }

    console.log("Course content generated and saved successfully");

    return new Response(
      JSON.stringify({
        success: true,
        courseContent,
        usage: claudeData.usage,
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