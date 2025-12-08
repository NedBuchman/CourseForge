import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

interface RequestBody {
  fieldName: string;
  fieldDescription?: string;
  currentValue?: string;
  courseTopic?: string;
  action?: "generate" | "refine" | "regenerate";
  customPrompt?: string;
}

const FIELD_ROLES: Record<string, string> = {
  "Course Headline": "expert marketing copywriter specializing in course headlines",
  "Value Proposition": "conversion strategist specializing in value propositions",
  "Who Is This Course For?": "customer persona expert",
  "Key Course Benefits": "learning outcomes specialist",
  "Instructor Information": "professional bio writer",
  "Enrollment Button Text": "call-to-action specialist",
};

function generateSystemPrompt(fieldName: string): string {
  const role = FIELD_ROLES[fieldName] || "helpful writing assistant";
  return `You are a ${role}. Your goal is to help course creators write compelling, clear, and professional content for their landing pages.

Guidelines:
- Be clear, friendly, and non-jargony
- Focus on benefits and transformation
- Write for course creators and educators
- Avoid robotic or overly formal tone
- Keep it concise and actionable`;
}

function generateAutoPrompt(body: RequestBody): string {
  const { fieldName, fieldDescription, currentValue, courseTopic } = body;

  let prompt = "";

  if (fieldName === "Course Headline") {
    const topic = courseTopic || currentValue || "this course";
    prompt = `Give me 5 catchy, benefit-focused course headlines for a course about ${topic}. Each should be under 100 characters and focus on the transformation or value students will get.`;
  } else if (fieldName === "Value Proposition") {
    const topic = courseTopic || "this course";
    prompt = `Write 3 compelling value propositions (2-3 sentences each) for a course about ${topic}. Focus on the transformation students will experience and why they should take this course.`;
  } else if (fieldName === "Who Is This Course For?") {
    const topic = courseTopic || "this course";
    prompt = `Describe 3 different ideal student personas for a course about ${topic}. Help potential students self-identify if this course is right for them.`;
  } else {
    prompt = `Help me write compelling content for the "${fieldName}" field on my course landing page.`;
    if (fieldDescription) {
      prompt += ` ${fieldDescription}`;
    }
    if (currentValue) {
      prompt += ` Current content: "${currentValue}"`;
    }
  }

  return prompt;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: RequestBody = await req.json();
    const { fieldName, action = "generate", customPrompt, courseTopic } = body;

    console.log("Landing page assistant request:", {
      fieldName,
      action,
      hasCourseTopic: !!courseTopic,
      hasApiKey: !!ANTHROPIC_API_KEY,
      apiKeyLength: ANTHROPIC_API_KEY?.length || 0
    });

    if (!ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY not configured in environment");
      throw new Error("ANTHROPIC_API_KEY environment variable is not set. Please configure it in your Supabase project settings under Edge Functions secrets.");
    }

    if (!fieldName) {
      throw new Error("fieldName is required");
    }

    const systemPrompt = generateSystemPrompt(fieldName);
    let userPrompt = customPrompt || generateAutoPrompt(body);

    if (action === "refine" && body.currentValue) {
      userPrompt = `Please refine and improve this: "${body.currentValue}"`;
    } else if (action === "regenerate") {
      userPrompt += " Give me different options than before.";
    }

    console.log("Calling Anthropic API with:", { systemPrompt: systemPrompt.substring(0, 50), userPrompt: userPrompt.substring(0, 100) });

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorData = await anthropicResponse.text();
      console.error("Anthropic API error:", { status: anthropicResponse.status, errorData });
      throw new Error(`AI service error (${anthropicResponse.status}). Please try again.`);
    }

    const anthropicData = await anthropicResponse.json();
    const content = anthropicData.content?.[0]?.text;

    if (!content) {
      console.error("No content in Anthropic response:", anthropicData);
      throw new Error("AI service returned empty response. Please try again.");
    }

    console.log("Successfully generated content, length:", content.length);

    return new Response(
      JSON.stringify({
        success: true,
        content,
        fieldName,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in landing-page-assistant:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
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
