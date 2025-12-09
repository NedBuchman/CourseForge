import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VideoAssetWithCourse {
  id: string;
  course_id: string;
  provider_video_id: string;
  asset_type: string;
  asset_reference_id: string;
  generation_started_at: string;
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
      console.error(`HeyGen status check failed for ${videoId}:`, errorText);
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
      status: 'error',
      error: error.message
    };
  }
}

async function updateCourseVideoStatus(supabase: any, courseId: string) {
  // Get all video assets for this course
  const { data: allAssets } = await supabase
    .from('video_assets')
    .select('generation_status')
    .eq('course_id', courseId);

  if (!allAssets || allAssets.length === 0) return;

  const totalCompleted = allAssets.filter((a: any) => a.generation_status === 'completed').length;
  const totalFailed = allAssets.filter((a: any) => a.generation_status === 'failed').length;
  const totalProcessing = allAssets.filter((a: any) => a.generation_status === 'processing').length;
  const total = allAssets.length;

  // Update course status
  if (totalProcessing === 0 && total > 0) {
    // All videos are done processing
    await supabase
      .from('courses')
      .update({
        video_generation_status: totalFailed === 0 ? 'completed' : 'partial',
        video_generation_progress: 100,
        video_generation_stage: totalFailed === 0
          ? 'All videos generated successfully!'
          : `${totalCompleted} videos completed, ${totalFailed} failed`,
        video_generation_completed_at: new Date().toISOString(),
        videos_generated_count: totalCompleted,
        videos_status: 'completed'
      })
      .eq('id', courseId);

    console.log(`Course ${courseId} video generation completed: ${totalCompleted}/${total} successful`);
  } else if (totalProcessing > 0) {
    // Still processing
    const progress = total > 0 ? Math.floor(85 + ((totalCompleted + totalFailed) / total) * 15) : 85;

    await supabase
      .from('courses')
      .update({
        video_generation_progress: Math.min(progress, 99),
        video_generation_stage: `${totalCompleted}/${total} videos completed (${totalProcessing} processing)...`,
        videos_generated_count: totalCompleted
      })
      .eq('id', courseId);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const startTime = Date.now();

  try {
    const heygenApiKey = Deno.env.get("HEYGEN_API_KEY");
    if (!heygenApiKey) {
      throw new Error("HEYGEN_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== Background Video Status Check Started ===');

    // Find all video assets that are currently processing
    // Include a safety check for videos stuck in processing for > 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: processingAssets, error: assetsError } = await supabase
      .from('video_assets')
      .select('id, course_id, provider_video_id, asset_type, asset_reference_id, generation_started_at')
      .eq('generation_status', 'processing')
      .not('provider_video_id', 'is', null);

    if (assetsError) {
      throw assetsError;
    }

    if (!processingAssets || processingAssets.length === 0) {
      console.log('No videos currently processing');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No videos currently processing',
          checked: 0,
          updated: 0,
          duration_ms: Date.now() - startTime
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`Found ${processingAssets.length} videos to check`);

    let updatedCount = 0;
    let completedCount = 0;
    let failedCount = 0;
    let staleCount = 0;
    const courseIds = new Set<string>();

    // Check each video with small delays to avoid rate limiting
    for (const asset of processingAssets as VideoAssetWithCourse[]) {
      courseIds.add(asset.course_id);

      // Check if video has been stuck in processing for > 30 minutes
      const startedAt = new Date(asset.generation_started_at).getTime();
      const isStale = startedAt < new Date(thirtyMinutesAgo).getTime();

      if (isStale) {
        console.warn(`Video ${asset.id} has been processing for > 30 minutes, marking as potentially stuck`);
        staleCount++;
      }

      const statusResult = await checkHeyGenVideoStatus(
        asset.provider_video_id,
        heygenApiKey
      );

      console.log(`Video ${asset.id} (${asset.asset_type} ${asset.asset_reference_id}): ${statusResult.status}`);

      if (statusResult.status === 'completed' && statusResult.video_url) {
        // Video is complete, update database
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

        // Update queue status
        await supabase
          .from('video_generation_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('video_asset_id', asset.id);

        updatedCount++;
        completedCount++;
      } else if (statusResult.status === 'failed' || statusResult.status === 'error') {
        // Video failed
        await supabase
          .from('video_assets')
          .update({
            generation_status: 'failed',
            generation_error: statusResult.error || 'Video generation failed at HeyGen',
            generation_completed_at: new Date().toISOString()
          })
          .eq('id', asset.id);

        // Update queue status
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
      }
      // If status is still 'processing' or 'pending', leave it as is

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Update all affected courses
    console.log(`Updating status for ${courseIds.size} courses`);
    for (const courseId of courseIds) {
      await updateCourseVideoStatus(supabase, courseId);
    }

    const duration = Date.now() - startTime;
    console.log(`=== Background Check Complete ===`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Checked: ${processingAssets.length} videos`);
    console.log(`Updated: ${updatedCount} videos (${completedCount} completed, ${failedCount} failed)`);
    console.log(`Stale: ${staleCount} videos (processing > 30 min)`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked ${processingAssets.length} videos, updated ${updatedCount}`,
        stats: {
          checked: processingAssets.length,
          updated: updatedCount,
          completed: completedCount,
          failed: failedCount,
          stale: staleCount,
          courses_affected: courseIds.size,
          duration_ms: duration
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
    console.error('Error in background video status check:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Background check failed',
        duration_ms: Date.now() - startTime
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
