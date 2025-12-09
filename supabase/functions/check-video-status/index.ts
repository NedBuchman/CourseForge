import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface StatusCheckRequest {
  courseId: string;
}

async function checkHeyGenVideoStatus(
  videoId: string,
  heygenApiKey: string
): Promise<{ 
  status: string; 
  video_url?: string; 
  thumbnail_url?: string; 
  duration?: number;
  error?: string;
}> {
  try {
    const response = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': heygenApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        status: 'failed',
        error: `Status check error (${response.status}): ${errorText}`
      };
    }

    const data = await response.json();
    
    return {
      status: data.data.status,
      video_url: data.data.video_url,
      thumbnail_url: data.data.thumbnail_url,
      duration: data.data.duration
    };
  } catch (error: any) {
    console.error('Error checking HeyGen status:', error);
    return {
      status: 'failed',
      error: error.message
    };
  }
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

    const requestData: StatusCheckRequest = await req.json();
    const { courseId } = requestData;

    console.log('Checking video status for course:', courseId);

    const { data: processingAssets, error: assetsError } = await supabase
      .from('video_assets')
      .select('id, provider_video_id, asset_type, asset_reference_id, generation_status, video_url')
      .eq('course_id', courseId)
      .or('generation_status.eq.processing,video_url.is.null')
      .not('generation_status', 'eq', 'failed');

    if (assetsError) {
      throw assetsError;
    }

    if (!processingAssets || processingAssets.length === 0) {
      const { data: allAssets } = await supabase
        .from('video_assets')
        .select('generation_status')
        .eq('course_id', courseId);

      const completedCount = allAssets?.filter(a => a.generation_status === 'completed').length || 0;
      const failedCount = allAssets?.filter(a => a.generation_status === 'failed').length || 0;
      const totalCount = allAssets?.length || 0;

      if (totalCount > 0 && completedCount + failedCount === totalCount) {
        await supabase
          .from('courses')
          .update({
            video_generation_status: failedCount === 0 ? 'completed' : 'partial',
            video_generation_progress: 100,
            video_generation_stage: failedCount === 0 
              ? 'All videos generated successfully!' 
              : `${completedCount} videos completed, ${failedCount} failed`,
            video_generation_completed_at: new Date().toISOString(),
            videos_generated_count: completedCount
          })
          .eq('id', courseId);

        return new Response(
          JSON.stringify({
            success: true,
            status: 'completed',
            message: 'All videos processed',
            completed: completedCount,
            failed: failedCount,
            total: totalCount
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: 'no_processing_videos',
          message: 'No videos currently processing',
          completed: completedCount,
          failed: failedCount,
          pending: totalCount - completedCount - failedCount
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`Checking status for ${processingAssets.length} videos needing sync`);

    let updatedCount = 0;
    let completedCount = 0;
    let failedCount = 0;

    for (const asset of processingAssets) {
      if (!asset.provider_video_id) {
        console.warn(`Asset ${asset.id} has no provider_video_id, skipping`);
        continue;
      }

      console.log(`Checking HeyGen status for asset ${asset.id} (current status: ${asset.generation_status})`);

      const statusResult = await checkHeyGenVideoStatus(
        asset.provider_video_id,
        heygenApiKey
      );

      console.log(`Asset ${asset.id} HeyGen response:`, statusResult.status);

      if (statusResult.status === 'completed' && statusResult.video_url) {
        await supabase
          .from('video_assets')
          .update({
            generation_status: 'completed',
            video_url: statusResult.video_url,
            thumbnail_url: statusResult.thumbnail_url || null,
            duration_seconds: statusResult.duration || 0,
            generation_completed_at: new Date().toISOString(),
            approved: false
          })
          .eq('id', asset.id);

        await supabase
          .from('video_generation_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('video_asset_id', asset.id);

        updatedCount++;
        completedCount++;
      } else if (statusResult.status === 'failed') {
        await supabase
          .from('video_assets')
          .update({
            generation_status: 'failed',
            generation_error: statusResult.error || 'Video generation failed at HeyGen',
            generation_completed_at: new Date().toISOString()
          })
          .eq('id', asset.id);

        await supabase
          .from('video_generation_queue')
          .update({
            status: 'failed',
            error_message: statusResult.error || 'Generation failed',
            completed_at: new Date().toISOString()
          })
          .eq('video_asset_id', asset.id);

        updatedCount++;
        failedCount++;
      } else if (statusResult.status === 'processing' && asset.generation_status !== 'processing') {
        console.log(`Asset ${asset.id} is processing at HeyGen, updating status in database`);
        await supabase
          .from('video_assets')
          .update({
            generation_status: 'processing'
          })
          .eq('id', asset.id);

        await supabase
          .from('video_generation_queue')
          .update({
            status: 'processing'
          })
          .eq('video_asset_id', asset.id);

        updatedCount++;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const { data: allAssets } = await supabase
      .from('video_assets')
      .select('generation_status')
      .eq('course_id', courseId);

    const totalCompleted = allAssets?.filter(a => a.generation_status === 'completed').length || 0;
    const totalFailed = allAssets?.filter(a => a.generation_status === 'failed').length || 0;
    const totalProcessing = allAssets?.filter(a => a.generation_status === 'processing').length || 0;
    const total = allAssets?.length || 0;

    const progress = total > 0 ? Math.floor(85 + ((totalCompleted + totalFailed) / total) * 15) : 85;

    await supabase
      .from('courses')
      .update({
        video_generation_progress: Math.min(progress, 99),
        video_generation_stage: `${totalCompleted}/${total} videos completed (${totalProcessing} processing)...`,
        videos_generated_count: totalCompleted
      })
      .eq('id', courseId);

    if (totalProcessing === 0 && total > 0) {
      await supabase
        .from('courses')
        .update({
          video_generation_status: totalFailed === 0 ? 'completed' : 'partial',
          video_generation_progress: 100,
          video_generation_stage: totalFailed === 0 
            ? 'All videos generated successfully!' 
            : `${totalCompleted} videos completed, ${totalFailed} failed`,
          video_generation_completed_at: new Date().toISOString()
        })
        .eq('id', courseId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: 'processing',
        message: `Updated ${updatedCount} video statuses`,
        stats: {
          total,
          completed: totalCompleted,
          failed: totalFailed,
          processing: totalProcessing
        }
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error: any) {
    console.error('Error in check-video-status:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Status check failed',
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