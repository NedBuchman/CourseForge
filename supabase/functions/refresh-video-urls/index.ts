import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    const { courseId } = await req.json();

    if (!courseId) {
      throw new Error("courseId is required");
    }

    const heygenApiKey = Deno.env.get("HEYGEN_API_KEY");
    if (!heygenApiKey) {
      throw new Error("HEYGEN_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Refreshing video URLs for course: ${courseId}`);

    const { data: videos, error: fetchError } = await supabase
      .from('video_assets')
      .select('id, provider_video_id, asset_reference_id, generation_status')
      .eq('course_id', courseId)
      .eq('generation_status', 'completed')
      .not('provider_video_id', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch videos: ${fetchError.message}`);
    }

    if (!videos || videos.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No completed videos found for this course',
          updates: []
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`Found ${videos.length} completed videos to refresh`);

    const updates = [];

    for (const video of videos) {
      console.log(`Refreshing video ${video.id} (${video.provider_video_id})`);

      try {
        const heygenResponse = await fetch(
          `https://api.heygen.com/v1/video_status.get?video_id=${video.provider_video_id}`,
          {
            method: 'GET',
            headers: { 'X-Api-Key': heygenApiKey },
          }
        );

        if (!heygenResponse.ok) {
          const errorText = await heygenResponse.text();
          console.error(`HeyGen API error: ${heygenResponse.status} - ${errorText}`);
          updates.push({
            videoAssetId: video.id,
            success: false,
            error: `HeyGen API error: ${heygenResponse.status}`
          });
          continue;
        }

        const heygenData = await heygenResponse.json();
        const newVideoUrl = heygenData.data.video_url;

        if (newVideoUrl) {
          const { error: updateError } = await supabase
            .from('video_assets')
            .update({
              video_url: newVideoUrl,
              thumbnail_url: heygenData.data.thumbnail_url || null,
              duration_seconds: Math.floor(heygenData.data.duration || 0),
              updated_at: new Date().toISOString()
            })
            .eq('id', video.id);

          if (updateError) {
            console.error(`Update failed: ${updateError.message}`);
            updates.push({
              videoAssetId: video.id,
              success: false,
              error: updateError.message
            });
          } else {
            console.log(`✅ Successfully refreshed URL for video ${video.id}`);
            updates.push({
              videoAssetId: video.id,
              success: true,
              newUrl: newVideoUrl
            });
          }
        } else {
          updates.push({
            videoAssetId: video.id,
            success: false,
            error: 'No video URL in response'
          });
        }

      } catch (error: any) {
        console.error(`Error refreshing video: ${error.message}`);
        updates.push({
          videoAssetId: video.id,
          success: false,
          error: error.message
        });
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    const successCount = updates.filter(u => u.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Refreshed ${successCount} of ${videos.length} videos`,
        updates
      }, null, 2),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error: any) {
    console.error('Fatal error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
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