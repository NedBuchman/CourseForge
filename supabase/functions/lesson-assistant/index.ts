import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  lessonTitle: string;
  lessonContent: string;
  chatHistory: Message[];
  userMessage: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const body: RequestBody = await req.json();
    const { lessonTitle, lessonContent, chatHistory = [], userMessage } = body;

    if (!lessonTitle || !lessonContent || !userMessage) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: lessonTitle, lessonContent, or userMessage",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripHtmlTags = (html: string): string => {
      return html.replace(/<[^>]*>/g, ' ')
                 .replace(/\s+/g, ' ')
                 .trim();
    };

    const plainTextContent = stripHtmlTags(lessonContent);

    const systemPrompt = `You are a helpful and patient tutor assisting a student with understanding their lesson. Your role is to:

1. Help explain concepts from the lesson in different ways if the student is confused
2. Answer questions about the lesson content
3. Provide clarifications and additional context
4. Help the student go deeper into topics they find interesting
5. Be encouraging and supportive

Current Lesson Context:
Title: ${lessonTitle}
Content: ${plainTextContent}

Guidelines:
- Base your responses on the lesson content provided
- If the student asks about something not covered in the lesson, acknowledge that and provide general educational guidance if appropriate
- Keep responses clear and concise (2-4 paragraphs)
- Use examples when helpful
- Encourage critical thinking
- Be friendly and supportive`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...chatHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: "user", content: userMessage }
    ];

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const data = await openaiResponse.json();
    const assistantMessage = data.choices[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error("No response from AI");
    }

    return new Response(
      JSON.stringify({
        success: true,
        content: assistantMessage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in lesson-assistant function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});