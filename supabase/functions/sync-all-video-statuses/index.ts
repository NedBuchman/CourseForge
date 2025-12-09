import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VideoUpdate {
  videoAssetId: string;
  providerVideoId: string;
  assetRef: string;
  heygenStatus: string;
  heygenVideoUrl: string | null;
  updateAttempted: boolean;
  updateSuccess: boolean;
  updateError: string | null;
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== Starting Full Video Status Sync ===');

    const { data: processingVideos, error: fetchError } = await supabase
      .from('video_assets')
      .select('id, course_id, provider_video_id, asset_reference_id')
      .eq('generation_status', 'processing')
      .not('provider_video_id', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch videos: ${fetchError.message}`);
    }

    if (!processingVideos || processingVideos.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No processing videos found',
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

    console.log(`Found ${processingVideos.length} processing videos`);

    const updates: VideoUpdate[] = [];

    for (const video of processingVideos) {
      console.log(`\n--- Checking video ${video.id} (ref: ${video.asset_reference_id}) ---`);

      const update: VideoUpdate = {
        videoAssetId: video.id,
        providerVideoId: video.provider_video_id,
        assetRef: video.asset_reference_id,
        heygenStatus: 'unknown',
        heygenVideoUrl: null,
        updateAttempted: false,
        updateSuccess: false,
        updateError: null
      };

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
          update.heygenStatus = 'error';
          update.updateError = `HeyGen API error: ${heygenResponse.status} - ${errorText}`;
          console.error(update.updateError);
          updates.push(update);
          continue;
        }

        const heygenData = await heygenResponse.json();
        update.heygenStatus = heygenData.data.status;
        update.heygenVideoUrl = heygenData.data.video_url || null;

        console.log(`HeyGen status: ${update.heygenStatus}`);
        console.log(`Video URL present: ${!!update.heygenVideoUrl}`);

        if (update.heygenStatus === 'completed' && update.heygenVideoUrl) {
          console.log('Attempting database update to completed...');
          update.updateAttempted = true;

          const { data: updateResult, error: updateError } = await supabase
            .from('video_assets')
            .update({
              generation_status: 'completed',
              video_url: update.heygenVideoUrl,
              thumbnail_url: heygenData.data.thumbnail_url || null,
              duration_seconds: Math.floor(heygenData.data.duration || 0),
              generation_completed_at: new Date().toISOString(),
              approved: false
            })
            .eq('id', video.id)
            .select('id, generation_status');

          if (updateError) {
            update.updateError = `Update failed: ${updateError.message}`;
            console.error(update.updateError);
          } else if (updateResult && updateResult.length > 0) {
            update.updateSuccess = true;
            console.log(`✅ Successfully updated to: ${updateResult[0].generation_status}`);
          } else {
            update.updateError = 'Update returned no rows';
            console.error(update.updateError);
          }
        } else if (update.heygenStatus === 'failed') {
          console.log('Attempting database update to failed...');
          update.updateAttempted = true;

          const { error: updateError } = await supabase
            .from('video_assets')
            .update({
              generation_status: 'failed',
              generation_error: heygenData.data.error || 'Generation failed',
              generation_completed_at: new Date().toISOString()
            })
            .eq('id', video.id);

          if (updateError) {
            update.updateError = `Update failed: ${updateError.message}`;
            console.error(update.updateError);
          } else {
            update.updateSuccess = true;
            console.log('✅ Successfully updated to failed');
          }
        } else {
          console.log(`Video still ${update.heygenStatus}, no update needed`);
        }

      } catch (error: any) {
        update.updateError = error.message;
        console.error(`Error processing video: ${error.message}`);
      }

      updates.push(update);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    const successCount = updates.filter(u => u.updateSuccess).length;
    const errorCount = updates.filter(u => u.updateError).length;

    console.log(`\n=== Sync Complete ===`);
    console.log(`Total: ${updates.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${updates.length} videos, ${successCount} updated successfully`,
        stats: {
          total: updates.length,
          updated: successCount,
          errors: errorCount
        },
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