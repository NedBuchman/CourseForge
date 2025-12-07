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
    const heygenApiKey = Deno.env.get("HEYGEN_API_KEY");

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

    console.log("Fetching voice list from HeyGen API...");

    const response = await fetch('https://api.heygen.com/v2/voices', {
      method: 'GET',
      headers: {
        'X-Api-Key': heygenApiKey,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log("HeyGen response status:", response.status);

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "HeyGen API returned error",
          details: responseText,
          status: response.status,
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

    console.log("✅ Successfully fetched voice list");
    console.log("Total voices:", data.data?.voices?.length || 0);

    const englishVoices = data.data?.voices?.filter((v: any) =>
      v.language?.toLowerCase().includes('english') ||
      v.voice_id?.toLowerCase().includes('en')
    ) || [];

    return new Response(
      JSON.stringify({
        success: true,
        voices: data.data?.voices || [],
        englishVoices: englishVoices,
        total: data.data?.voices?.length || 0,
        englishTotal: englishVoices.length,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error: any) {
    console.error("❌ Failed to fetch voices:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error",
        stack: error.stack,
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