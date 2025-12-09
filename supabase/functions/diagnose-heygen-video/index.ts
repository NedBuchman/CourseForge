import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DiagnosticRequest {
  providerVideoId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const heygenApiKey = Deno.env.get("HEYGEN_API_KEY");
    if (!heygenApiKey) {
      throw new Error("HEYGEN_API_KEY not configured");
    }

    const { providerVideoId }: DiagnosticRequest = await req.json();

    if (!providerVideoId) {
      throw new Error("providerVideoId is required");
    }

    console.log(`Diagnosing HeyGen video: ${providerVideoId}`);

    const response = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${providerVideoId}`,
      {
        method: 'GET',
        headers: {
          'X-Api-Key': heygenApiKey,
        },
      }
    );

    const responseText = await response.text();
    console.log('Raw HeyGen Response:', responseText);

    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Failed to parse HeyGen response: ${responseText}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        providerVideoId,
        httpStatus: response.status,
        httpStatusText: response.statusText,
        rawResponse: responseText,
        parsedData,
        videoStatus: parsedData?.data?.status,
        videoUrl: parsedData?.data?.video_url,
        thumbnailUrl: parsedData?.data?.thumbnail_url,
        duration: parsedData?.data?.duration,
        error: parsedData?.data?.error,
      }, null, 2),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error: any) {
    console.error('Diagnostic error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
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