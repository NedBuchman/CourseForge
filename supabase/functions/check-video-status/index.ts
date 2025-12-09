import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface StatusCheckRequest {
  courseId: string;
  dryRun?: boolean;
  verbose?: boolean;
}

interface DebugLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

const debugLogs: DebugLog[] = [];

function log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const entry: DebugLog = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data
  };
  debugLogs.push(entry);
  console.log(`[${level.toUpperCase()}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
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
  rawResponse?: any;
}> {
  const startTime = Date.now();
  try {
    log('info', `Calling HeyGen API for video ${videoId}`);

    const response = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': heygenApiKey,
      },
    });

    const apiCallDuration = Date.now() - startTime;
    log('info', `HeyGen API responded in ${apiCallDuration}ms`, {
      videoId,
      httpStatus: response.status,
      statusText: response.statusText
    });

    if (!response.ok) {
      const errorText = await response.text();
      log('error', `HeyGen API error response`, {
        videoId,
        status: response.status,
        errorText
      });
      return {
        status: 'failed',
        error: `Status check error (${response.status}): ${errorText}`
      };
    }

    const rawText = await response.text();
    log('info', `Raw HeyGen response for ${videoId}`, { rawText: rawText.substring(0, 500) });

    const data = JSON.parse(rawText);

    const result = {
      status: data.data?.status || 'unknown',
      video_url: data.data?.video_url,
      thumbnail_url: data.data?.thumbnail_url,
      duration: data.data?.duration,
      rawResponse: data
    };

    log('info', `Parsed HeyGen status for ${videoId}`, {
      status: result.status,
      hasVideoUrl: !!result.video_url,
      duration: result.duration
    });

    return result;
  } catch (error: any) {
    log('error', `Exception checking HeyGen status for ${videoId}`, {
      errorMessage: error.message,
      errorStack: error.stack
    });
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
    debugLogs.length = 0;
    const startTime = Date.now();

    const heygenApiKey = Deno.env.get("HEYGEN_API_KEY");
    if (!heygenApiKey) {
      throw new Error("HEYGEN_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    log('info', 'Initializing Supabase client', {
      url: supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: StatusCheckRequest = await req.json();
    const { courseId, dryRun = false, verbose = false } = requestData;

    log('info', 'Starting video status check', {
      courseId,
      dryRun,
      verbose
    });

    const queryStartTime = Date.now();
    const { data: processingAssets, error: assetsError } = await supabase
      .from('video_assets')
      .select('id, provider_video_id, asset_type, asset_reference_id, generation_status, video_url, created_at, updated_at')
      .eq('course_id', courseId)
      .or('generation_status.eq.processing,video_url.is.null')
      .not('generation_status', 'eq', 'failed');

    log('info', `Query for processing assets completed in ${Date.now() - queryStartTime}ms`, {
      foundCount: processingAssets?.length || 0,
      hasError: !!assetsError
    });

    if (assetsError) {
      log('error', 'Error querying video_assets table', {
        error: assetsError.message,
        code: assetsError.code,
        details: assetsError.details,
        hint: assetsError.hint
      });
      throw assetsError;
    }

    log('info', 'Processing assets found', {
      count: processingAssets?.length || 0,
      assets: processingAssets?.map(a => ({
        id: a.id,
        provider_video_id: a.provider_video_id,
        status: a.generation_status,
        has_video_url: !!a.video_url
      }))
    });

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

    log('info', `Checking status for ${processingAssets.length} videos needing sync`);

    let updatedCount = 0;
    let completedCount = 0;
    let failedCount = 0;
    const updateResults: any[] = [];

    for (const asset of processingAssets) {
      if (!asset.provider_video_id) {
        log('warn', `Asset ${asset.id} has no provider_video_id, skipping`, { asset });
        continue;
      }

      log('info', `Checking HeyGen status for asset`, {
        assetId: asset.id,
        providerVideoId: asset.provider_video_id,
        currentStatus: asset.generation_status,
        hasVideoUrl: !!asset.video_url
      });

      const statusResult = await checkHeyGenVideoStatus(
        asset.provider_video_id,
        heygenApiKey
      );

      const updatePlan = {
        assetId: asset.id,
        providerVideoId: asset.provider_video_id,
        oldStatus: asset.generation_status,
        newStatus: statusResult.status,
        willUpdate: false,
        updateReason: '',
        updateData: {} as any
      };

      if (statusResult.status === 'completed' && statusResult.video_url) {
        updatePlan.willUpdate = true;
        updatePlan.updateReason = 'Video completed at HeyGen';
        updatePlan.updateData = {
          generation_status: 'completed',
          video_url: statusResult.video_url,
          thumbnail_url: statusResult.thumbnail_url || null,
          duration_seconds: statusResult.duration || 0,
          generation_completed_at: new Date().toISOString(),
          approved: false
        };

        log('info', `Asset ${asset.id} will be marked as completed`, {
          videoUrl: statusResult.video_url,
          duration: statusResult.duration,
          dryRun
        });

        if (!dryRun) {
          const updateStartTime = Date.now();
          const { data: updateData, error: updateError } = await supabase
            .from('video_assets')
            .update(updatePlan.updateData)
            .eq('id', asset.id)
            .select();

          const updateDuration = Date.now() - updateStartTime;

          if (updateError) {
            log('error', `Failed to update asset ${asset.id}`, {
              error: updateError.message,
              code: updateError.code,
              details: updateError.details,
              hint: updateError.hint,
              duration: updateDuration
            });
            updatePlan.updateData.error = updateError.message;
          } else {
            log('info', `Successfully updated asset ${asset.id}`, {
              updatedRows: updateData?.length || 0,
              duration: updateDuration
            });

            const { data: verifyData } = await supabase
              .from('video_assets')
              .select('generation_status, video_url, duration_seconds')
              .eq('id', asset.id)
              .single();

            log('info', `Verification read for asset ${asset.id}`, {
              dbStatus: verifyData?.generation_status,
              dbHasUrl: !!verifyData?.video_url,
              matchesExpected: verifyData?.generation_status === 'completed'
            });
          }

          const { error: queueError } = await supabase
            .from('video_generation_queue')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('video_asset_id', asset.id);

          if (queueError) {
            log('error', `Failed to update queue for asset ${asset.id}`, queueError);
          }
        }

        updatedCount++;
        completedCount++;

      } else if (statusResult.status === 'failed') {
        updatePlan.willUpdate = true;
        updatePlan.updateReason = 'Video failed at HeyGen';
        updatePlan.updateData = {
          generation_status: 'failed',
          generation_error: statusResult.error || 'Video generation failed at HeyGen',
          generation_completed_at: new Date().toISOString()
        };

        log('warn', `Asset ${asset.id} will be marked as failed`, {
          error: statusResult.error,
          dryRun
        });

        if (!dryRun) {
          await supabase
            .from('video_assets')
            .update(updatePlan.updateData)
            .eq('id', asset.id);

          await supabase
            .from('video_generation_queue')
            .update({
              status: 'failed',
              error_message: statusResult.error || 'Generation failed',
              completed_at: new Date().toISOString()
            })
            .eq('video_asset_id', asset.id);
        }

        updatedCount++;
        failedCount++;

      } else if (statusResult.status === 'processing' && asset.generation_status !== 'processing') {
        updatePlan.willUpdate = true;
        updatePlan.updateReason = 'Status changed to processing';
        updatePlan.updateData = {
          generation_status: 'processing'
        };

        log('info', `Asset ${asset.id} is processing at HeyGen, updating database`, { dryRun });

        if (!dryRun) {
          await supabase
            .from('video_assets')
            .update({ generation_status: 'processing' })
            .eq('id', asset.id);

          await supabase
            .from('video_generation_queue')
            .update({ status: 'processing' })
            .eq('video_asset_id', asset.id);
        }

        updatedCount++;
      } else {
        updatePlan.updateReason = `No update needed (status: ${statusResult.status})`;
        log('info', `Asset ${asset.id} requires no update`, {
          heygenStatus: statusResult.status,
          dbStatus: asset.generation_status
        });
      }

      updateResults.push(updatePlan);
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

    const totalDuration = Date.now() - startTime;

    log('info', 'Video status check completed', {
      totalDuration,
      updatedCount,
      completedCount,
      failedCount,
      dryRun
    });

    return new Response(
      JSON.stringify({
        success: true,
        status: 'processing',
        message: dryRun
          ? `[DRY RUN] Would update ${updatedCount} video statuses`
          : `Updated ${updatedCount} video statuses`,
        dryRun,
        stats: {
          total,
          completed: totalCompleted,
          failed: totalFailed,
          processing: totalProcessing
        },
        timing: {
          totalDurationMs: totalDuration,
          avgPerVideoMs: processingAssets.length > 0 ? Math.round(totalDuration / processingAssets.length) : 0
        },
        updateResults: verbose ? updateResults : undefined,
        debugLogs: verbose ? debugLogs : undefined
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error: any) {
    log('error', 'Fatal error in check-video-status', {
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Status check failed',
        debugLogs: debugLogs.length > 0 ? debugLogs : undefined
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