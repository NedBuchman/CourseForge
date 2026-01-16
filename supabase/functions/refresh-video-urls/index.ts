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

    // Sync video URLs to courses.generated_content->lessons
    if (successCount > 0) {
      console.log('Syncing video URLs to course lessons...');

      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, generated_content')
        .eq('id', courseId)
        .single();

      if (!courseError && course && course.generated_content && course.generated_content.lessons) {
        const { data: allVideos } = await supabase
          .from('video_assets')
          .select('asset_reference_id, video_url, provider_video_id')
          .eq('course_id', courseId)
          .eq('generation_status', 'completed')
          .not('video_url', 'is', null);

        if (allVideos && allVideos.length > 0) {
          const videoMap = new Map(
            allVideos.map(v => [v.asset_reference_id, { video_url: v.video_url, video_id: v.provider_video_id }])
          );

          const updatedLessons = course.generated_content.lessons.map(lesson => {
            const lessonNumber = lesson.lesson_number.toString();
            const videoData = videoMap.get(lessonNumber);

            if (videoData) {
              return {
                ...lesson,
                video_url: videoData.video_url,
                video_id: videoData.video_id
              };
            }
            return lesson;
          });

          await supabase
            .from('courses')
            .update({
              generated_content: {
                ...course.generated_content,
                lessons: updatedLessons
              }
            })
            .eq('id', courseId);

          console.log('✅ Synced video URLs to course lessons');
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Refreshed ${successCount} of ${videos.length} videos`,
        videosRefreshed: successCount,
        details: successCount > 0 ? `Videos refreshed and synced to course lessons` : 'No videos needed refresh',
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