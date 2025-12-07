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

    console.log("=== CourseForge Video Generation Test ===");
    console.log("API Key configured:", !!heygenApiKey);

    if (!heygenApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "HEYGEN_API_KEY not configured",
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

    const testScript = `Welcome to Introduction to JavaScript.

In this lesson, you'll learn:
1. What is JavaScript and why it's important
2. Basic syntax and data types
3. Variables and constants
4. Functions and control flow

JavaScript is a versatile programming language that powers the interactive elements of websites. It runs in web browsers and can also be used on servers with Node.js. Understanding JavaScript is essential for modern web development.

That concludes this lesson. Let's test your understanding with a quick quiz.`;

    const videoConfig = {
      avatar_id: 'Adrian_public_3_20240312',
      voice_id: '75af67cc2ceb498681d0085bb56bddc3',
      avatar_style: 'normal',
      background_style: 'color',
      background_color: '#f0f4f8'
    };

    console.log("Using video config:", videoConfig);
    console.log("Script length:", testScript.length, "characters");

    const heygenRequest = {
      video_inputs: [{
        character: {
          type: 'avatar',
          avatar_id: videoConfig.avatar_id,
          avatar_style: videoConfig.avatar_style
        },
        voice: {
          type: 'text',
          input_text: testScript,
          voice_id: videoConfig.voice_id,
          speed: 1.0
        },
        background: {
          type: videoConfig.background_style,
          value: videoConfig.background_color
        }
      }],
      dimension: {
        width: 1280,
        height: 720
      },
      aspect_ratio: '16:9',
      test: false
    };

    console.log("Sending request to HeyGen API...");
    console.log("Request payload:", JSON.stringify(heygenRequest, null, 2));

    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': heygenApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(heygenRequest),
    });

    const responseText = await response.text();
    console.log("HeyGen response status:", response.status);
    console.log("HeyGen response body:", responseText);

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "HeyGen API returned error",
          status: response.status,
          statusText: response.statusText,
          responseBody: responseText,
          requestPayload: heygenRequest,
          diagnostics: {
            apiKeyConfigured: true,
            apiKeyLength: heygenApiKey.length,
            avatarId: videoConfig.avatar_id,
            voiceId: videoConfig.voice_id,
            scriptLength: testScript.length
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
          parseError: String(parseError)
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

    console.log("✅ Video generation successful!");
    console.log("Video ID:", data.data?.video_id);
    console.log("Status:", data.data?.status);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Video generation test successful! CourseForge parameters work correctly.",
        videoId: data.data?.video_id,
        videoStatus: data.data?.status,
        videoConfig: videoConfig,
        scriptLength: testScript.length,
        diagnostics: {
          apiKeyConfigured: true,
          apiKeyLength: heygenApiKey.length,
          responseStatus: response.status,
          hasVideoId: !!data.data?.video_id,
          estimatedProcessingTime: "2-5 minutes"
        },
        fullResponse: data,
        nextSteps: [
          "Video is now processing at HeyGen",
          "Use check-video-status function to monitor progress",
          "Video URL will be available when status is 'completed'"
        ]
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