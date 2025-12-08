import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    const diagnostics = {
      hasApiKey: !!ANTHROPIC_API_KEY,
      apiKeyLength: ANTHROPIC_API_KEY?.length || 0,
      apiKeyPrefix: ANTHROPIC_API_KEY?.substring(0, 8) || "not set",
      timestamp: new Date().toISOString(),
    };

    console.log("Anthropic API diagnostics:", diagnostics);

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "ANTHROPIC_API_KEY not configured",
          diagnostics,
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

    // Try a simple API call
    console.log("Testing Anthropic API connection...");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: "Say hello in 3 words",
          },
        ],
      }),
    });

    const responseText = await response.text();
    console.log("Anthropic API response:", {
      status: response.status,
      statusText: response.statusText,
      response: responseText.substring(0, 500),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Anthropic API returned ${response.status}`,
          status: response.status,
          statusText: response.statusText,
          response: responseText,
          diagnostics,
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

    const data = JSON.parse(responseText);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Anthropic API is working!",
        response: data,
        diagnostics,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Test failed:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
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
