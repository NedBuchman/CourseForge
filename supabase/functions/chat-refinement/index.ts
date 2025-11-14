import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Lesson {
  lesson_number: number;
  title: string;
  content: string;
  duration: string;
  objectives: string[];
}

interface CourseContent {
  course_title: string;
  total_lessons: number;
  estimated_duration: string;
  lessons: Lesson[];
}

interface ChatRequest {
  message: string;
  courseDetails: {
    subject: string;
    audience: string;
    difficulty: string;
    duration: string;
    objectives?: string;
    context?: string;
  };
  chatHistory: ChatMessage[];
  existingContent?: CourseContent;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!claudeApiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const requestData: ChatRequest = await req.json();
    const { message, courseDetails, chatHistory, existingContent } = requestData;

    let systemPrompt = `You are an expert instructional designer helping a user refine their course details.

The user is creating a course with these details:
- Subject: ${courseDetails.subject}
- Target Audience: ${courseDetails.audience}
- Difficulty: ${courseDetails.difficulty}
- Duration: ${courseDetails.duration}
${courseDetails.objectives ? `- Learning Objectives: ${courseDetails.objectives}` : ''}
${courseDetails.context ? `- Additional Context: ${courseDetails.context}` : ''}`;

    if (existingContent && existingContent.lessons) {
      systemPrompt += `\n\nIMPORTANT: The course has already been generated with ${existingContent.total_lessons} lessons. The user may want to modify specific lessons or add new content.\n\nExisting lessons:\n`;
      existingContent.lessons.forEach(lesson => {
        systemPrompt += `\n${lesson.lesson_number}. ${lesson.title}`;
      });
      systemPrompt += `\n\nWhen the user asks to modify lessons (e.g., "combine lesson 2 & 3", "add more detail in lesson 5", "add a new lesson about X"), acknowledge their request and explain what changes will be made. The changes will be applied when they click the Generate/Regenerate button.`;
    }

    systemPrompt += `\n\nYour role:
1. Answer questions about the course structure
2. Suggest improvements to course content or approach
3. Help clarify learning objectives
4. Recommend topics to include or emphasize
5. Provide guidance on pacing and structure
6. Help tailor content to the target audience
7. When the user is done refining, provide a clear summary of what will be generated/changed

IMPORTANT: When you sense the user is ready to generate/regenerate (e.g., they say "that sounds good", "let's do it", "implement", "generate it"), provide a brief summary like:
"Perfect! Here's what I understand:\n- [List key changes/requirements]\n\nWhen you click the Generate/Regenerate button, the AI will create a course incorporating these refinements. Is that correct?"

Be conversational, helpful, and specific. Ask clarifying questions when needed. Keep responses concise (2-4 sentences typically, unless providing a summary).`;

    const messages = [
      ...chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: message,
      },
    ];

    console.log("Calling Claude API for chat...");

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: systemPrompt,
        messages: messages,
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error("Claude API Error:", errorText);
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = await claudeResponse.json();
    const assistantMessage = claudeData.content[0].text;

    return new Response(
      JSON.stringify({
        success: true,
        message: assistantMessage,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in chat-refinement:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});