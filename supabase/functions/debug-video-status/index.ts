import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DebugRequest {
  courseId: string;
  checkHeyGen?: boolean;
}

async function checkHeyGenStatus(videoId: string, apiKey: string) {
  try {
    const response = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
      {
        method: 'GET',
        headers: { 'X-Api-Key': apiKey },
      }
    );

    const text = await response.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return {
        error: 'Failed to parse JSON',
        rawText: text,
        httpStatus: response.status
      };
    }

    return {
      httpStatus: response.status,
      status: parsed.data?.status,
      video_url: parsed.data?.video_url,
      thumbnail_url: parsed.data?.thumbnail_url,
      duration: parsed.data?.duration,
      error: parsed.error,
      rawResponse: parsed
    };
  } catch (error: any) {
    return {
      error: error.message,
      stack: error.stack
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const heygenApiKey = Deno.env.get("HEYGEN_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { courseId, checkHeyGen = false }: DebugRequest = await req.json();

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) {
      throw new Error(`Course not found: ${courseError.message}`);
    }

    const { data: videoAssets, error: assetsError } = await supabase
      .from('video_assets')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: true });

    if (assetsError) {
      throw new Error(`Failed to fetch video assets: ${assetsError.message}`);
    }

    const { data: queueItems } = await supabase
      .from('video_generation_queue')
      .select('*')
      .eq('course_id', courseId);

    const statusCounts = {
      pending: 0,
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      unknown: 0
    };

    const detailedAssets = [];

    for (const asset of videoAssets || []) {
      const status = asset.generation_status || 'unknown';
      statusCounts[status as keyof typeof statusCounts] = (statusCounts[status as keyof typeof statusCounts] || 0) + 1;

      const assetDetail: any = {
        id: asset.id,
        asset_type: asset.asset_type,
        asset_reference_id: asset.asset_reference_id,
        database: {
          generation_status: asset.generation_status,
          has_video_url: !!asset.video_url,
          video_url: asset.video_url,
          thumbnail_url: asset.thumbnail_url,
          duration_seconds: asset.duration_seconds,
          provider_video_id: asset.provider_video_id,
          generation_error: asset.generation_error,
          approved: asset.approved,
          created_at: asset.created_at,
          updated_at: asset.updated_at,
          generation_started_at: asset.generation_started_at,
          generation_completed_at: asset.generation_completed_at
        }
      };

      if (checkHeyGen && heygenApiKey && asset.provider_video_id) {
        assetDetail.heygen = await checkHeyGenStatus(asset.provider_video_id, heygenApiKey);
        assetDetail.statusMatch = assetDetail.heygen.status === asset.generation_status;
        assetDetail.needsSync = assetDetail.heygen.status === 'completed' && !asset.video_url;
      }

      detailedAssets.push(assetDetail);
    }

    const queryUsedForSync = {
      description: "Query used by check-video-status to find videos needing sync",
      sql: `
        SELECT * FROM video_assets
        WHERE course_id = '${courseId}'
        AND (generation_status = 'processing' OR video_url IS NULL)
        AND generation_status != 'failed'
      `
    };

    const { data: syncQuery } = await supabase
      .from('video_assets')
      .select('id, generation_status, video_url, provider_video_id')
      .eq('course_id', courseId)
      .or('generation_status.eq.processing,video_url.is.null')
      .not('generation_status', 'eq', 'failed');

    const diagnostics = {
      timestamp: new Date().toISOString(),
      courseId,
      course: {
        title: course.title,
        video_generation_status: course.video_generation_status,
        video_generation_progress: course.video_generation_progress,
        video_generation_stage: course.video_generation_stage,
        videos_generated_count: course.videos_generated_count,
        video_generation_started_at: course.video_generation_started_at,
        video_generation_completed_at: course.video_generation_completed_at
      },
      summary: {
        totalAssets: videoAssets?.length || 0,
        statusCounts,
        queuedItems: queueItems?.length || 0,
        assetsNeedingSync: syncQuery?.length || 0
      },
      syncQuery: {
        ...queryUsedForSync,
        matchedAssets: syncQuery?.map(a => ({
          id: a.id,
          status: a.generation_status,
          has_url: !!a.video_url,
          has_provider_id: !!a.provider_video_id
        }))
      },
      videoAssets: detailedAssets,
      queueItems: queueItems || [],
      checkedHeyGen: checkHeyGen
    };

    return new Response(
      JSON.stringify(diagnostics, null, 2),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error: any) {
    console.error('Debug error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
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