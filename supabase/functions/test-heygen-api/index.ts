import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
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
    const heygenApiKey = Deno.env.get("HEYGEN_API_KEY");

    console.log("=== HeyGen API Diagnostic Test ===");
    console.log("API Key configured:", !!heygenApiKey);
    console.log("API Key length:", heygenApiKey?.length || 0);

    if (!heygenApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "HEYGEN_API_KEY not configured",
          details: "Please add HEYGEN_API_KEY to your Supabase project secrets",
          diagnostics: {
            apiKeyConfigured: false,
            apiKeyLength: 0
          }
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

    const testScript = "Hello, this is a test video from CourseForge. This is being used to verify API connectivity.";

    const testRequest = {
      video_inputs: [{
        character: {
          type: 'avatar',
          avatar_id: 'eric_public_3_20220815',
          avatar_style: 'normal'
        },
        voice: {
          type: 'text',
          input_text: testScript,
          voice_id: 'en-US-GuyNeural',
          speed: 1.0
        },
        background: {
          type: 'color',
          value: '#f0f4f8'
        }
      }],
      dimension: {
        width: 1280,
        height: 720
      },
      aspect_ratio: '16:9',
      test: true
    };

    console.log("Sending test request to HeyGen API...");
    console.log("Request payload:", JSON.stringify(testRequest, null, 2));

    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': heygenApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest),
    });

    const responseText = await response.text();
    console.log("HeyGen response status:", response.status);
    console.log("HeyGen response body:", responseText);

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "HeyGen API returned error",
          details: responseText,
          diagnostics: {
            apiKeyConfigured: true,
            apiKeyLength: heygenApiKey.length,
            responseStatus: response.status,
            responseStatusText: response.statusText,
            responseBody: responseText
          }
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

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to parse HeyGen response",
          details: responseText,
          diagnostics: {
            apiKeyConfigured: true,
            apiKeyLength: heygenApiKey.length,
            responseStatus: response.status,
            parseError: String(parseError)
          }
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

    console.log("✅ HeyGen API test successful!");

    return new Response(
      JSON.stringify({
        success: true,
        message: "HeyGen API connection successful",
        testVideoId: data.data?.video_id,
        diagnostics: {
          apiKeyConfigured: true,
          apiKeyLength: heygenApiKey.length,
          responseStatus: response.status,
          hasVideoId: !!data.data?.video_id,
          videoStatus: data.data?.status
        },
        fullResponse: data
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error: any) {
    console.error("❌ Test failed:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error",
        stack: error.stack,
        diagnostics: {
          errorType: error.name,
          errorMessage: error.message
        }
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
