import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Lesson {
  lesson_number: number;
  title: string;
  content: string;
  duration: string;
  objectives: string[];
}

interface VerifyRequest {
  course_title: string;
  lessons: Lesson[];
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

    const requestData: VerifyRequest = await req.json();
    const { course_title, lessons } = requestData;

    const lessonsText = lessons.map(l => 
      `**Lesson ${l.lesson_number}: ${l.title}**\n${l.content}`
    ).join('\n\n---\n\n');

    const prompt = `You are a fact-checking expert. Review the following course content for accuracy, currency, and quality.

**Course:** ${course_title}

**Content to Review:**
${lessonsText}

**Instructions:**
1. Check for factual errors, outdated information, or unverified claims
2. Identify any lesson that contains:
   - Outdated statistics or references
   - Unverified or questionable claims
   - Inaccurate technical information
   - Misleading examples or explanations
3. For each issue found, provide:
   - The lesson number
   - A clear description of the issue
   - A specific suggestion for correction
4. Calculate an overall accuracy score (0-100)
5. Determine if the content is verified (true if score >= 90 and no critical errors)

**IMPORTANT:** You must respond with ONLY valid JSON in this exact format:
{
  "verified": true,
  "accuracy_score": 95,
  "errors": [
    {
      "lesson": 2,
      "issue": "Description of the problem",
      "suggestion": "How to fix it"
    }
  ]
}

If no errors are found, return an empty array for errors.
Do not include any text before or after the JSON. Only output the JSON object.`;

    console.log("Calling Claude API for verification...");

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error("Claude API Error:", errorText);
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = await claudeResponse.json();
    let contentText = claudeData.content[0].text;

    contentText = contentText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

    let verificationResults;
    try {
      verificationResults = JSON.parse(contentText);
    } catch (parseError) {
      console.error("Failed to parse Claude response:", contentText);
      throw new Error("Failed to parse verification results");
    }

    return new Response(
      JSON.stringify({
        success: true,
        verificationResults,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in verify-course-content:", error);
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