import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VideoGenerationRequest {
  courseId: string;
  videoAssetIds?: string[];
  regenerateAll?: boolean;
}

interface Lesson {
  lesson_number: number;
  title: string;
  content: string;
  duration: string;
  objectives: string[];
}

interface VideoAsset {
  id: string;
  asset_type: string;
  asset_reference_id: string;
  script_text: string;
  video_config: any;
}

async function stripHtml(html: string): Promise<string> {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

async function generateVideoScript(lesson: Lesson): Promise<string> {
  const plainContent = await stripHtml(lesson.content);
  
  let script = `Welcome to ${lesson.title}.\n\n`;
  
  if (lesson.objectives && lesson.objectives.length > 0) {
    script += `In this lesson, you'll learn:\n`;
    lesson.objectives.forEach((obj, idx) => {
      script += `${idx + 1}. ${obj}\n`;
    });
    script += `\n`;
  }
  
  const words = plainContent.split(' ');
  if (words.length > 400) {
    script += words.slice(0, 400).join(' ') + '... ';
  } else {
    script += plainContent;
  }
  
  script += `\n\nThat concludes this lesson. Let's test your understanding with a quick quiz.`;
  
  return script;
}

async function callHeyGenAPI(
  script: string,
  videoConfig: any,
  heygenApiKey: string
): Promise<{ video_id: string; status: string }> {
  console.log('Calling HeyGen API with config:', { 
    avatarId: videoConfig.avatar_id,
    voiceId: videoConfig.voice_id,
    scriptLength: script.length 
  });

  const heygenRequest = {
    video_inputs: [{
      character: {
        type: 'avatar',
        avatar_id: videoConfig.avatar_id || 'eric_public_3_20220815',
        avatar_style: videoConfig.avatar_style || 'normal'
      },
      voice: {
        type: 'text',
        input_text: script,
        voice_id: videoConfig.voice_id || 'en-US-GuyNeural',
        speed: 1.0
      },
      background: {
        type: videoConfig.background_style || 'color',
        value: videoConfig.background_color || '#f0f4f8'
      }
    }],
    dimension: {
      width: 1280,
      height: 720
    },
    aspect_ratio: '16:9',
    test: false
  };

  const response = await fetch('https://api.heygen.com/v2/video/generate', {
    method: 'POST',
    headers: {
      'X-Api-Key': heygenApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(heygenRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('HeyGen API error:', response.status, errorText);
    throw new Error(`HeyGen API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('HeyGen response:', data);

  if (!data.data || !data.data.video_id) {
    throw new Error('Invalid HeyGen response: missing video_id');
  }

  return {
    video_id: data.data.video_id,
    status: data.data.status || 'processing'
  };
}

async function checkHeyGenVideoStatus(
  videoId: string,
  heygenApiKey: string
): Promise<{ status: string; video_url?: string; thumbnail_url?: string; duration?: number }> {
  const response = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
    method: 'GET',
    headers: {
      'X-Api-Key': heygenApiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HeyGen status check error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    status: data.data.status,
    video_url: data.data.video_url,
    thumbnail_url: data.data.thumbnail_url,
    duration: data.data.duration
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  let courseId: string | undefined;

  try {
    const heygenApiKey = Deno.env.get("HEYGEN_API_KEY");
    if (!heygenApiKey) {
      console.error("HEYGEN_API_KEY is not configured");
      throw new Error("HEYGEN_API_KEY not configured. Please add it to Supabase project secrets.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: VideoGenerationRequest = await req.json();
    courseId = requestData.courseId;

    console.log('Video generation request:', { courseId, regenerateAll: requestData.regenerateAll });

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, video_config, generated_content')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      throw new Error('Course not found');
    }

    await supabase
      .from('courses')
      .update({
        video_generation_status: 'in_progress',
        video_generation_progress: 5,
        video_generation_stage: 'Preparing video generation...',
        video_generation_started_at: new Date().toISOString()
      })
      .eq('id', courseId);

    const lessons: Lesson[] = course.generated_content?.lessons || [];
    if (lessons.length === 0) {
      throw new Error('No lessons found in course');
    }

    console.log(`Generating videos for ${lessons.length} lessons`);

    await supabase
      .from('courses')
      .update({
        videos_total_count: lessons.length,
        video_generation_progress: 10,
        video_generation_stage: 'Creating video assets...'
      })
      .eq('id', courseId);

    const videoAssets: any[] = [];
    for (const lesson of lessons) {
      const script = await generateVideoScript(lesson);
      
      const { data: existingAsset } = await supabase
        .from('video_assets')
        .select('id')
        .eq('course_id', courseId)
        .eq('asset_type', 'lesson')
        .eq('asset_reference_id', lesson.lesson_number.toString())
        .single();

      if (existingAsset && !requestData.regenerateAll) {
        console.log(`Skipping existing video asset for lesson ${lesson.lesson_number}`);
        continue;
      }

      if (existingAsset) {
        await supabase
          .from('video_assets')
          .delete()
          .eq('id', existingAsset.id);
      }

      const { data: asset, error: assetError } = await supabase
        .from('video_assets')
        .insert({
          course_id: courseId,
          asset_type: 'lesson',
          asset_reference_id: lesson.lesson_number.toString(),
          script_text: script,
          video_config: course.video_config,
          generation_status: 'queued'
        })
        .select()
        .single();

      if (assetError) {
        console.error('Error creating video asset:', assetError);
        throw assetError;
      }

      videoAssets.push(asset);
    }

    console.log(`Created ${videoAssets.length} video asset records`);

    await supabase
      .from('courses')
      .update({
        video_generation_progress: 20,
        video_generation_stage: 'Submitting videos to HeyGen...'
      })
      .eq('id', courseId);

    let completedCount = 0;
    const totalVideos = videoAssets.length;

    for (const asset of videoAssets) {
      try {
        console.log(`Generating video for asset ${asset.id}`);

        await supabase
          .from('video_assets')
          .update({
            generation_status: 'processing',
            generation_started_at: new Date().toISOString()
          })
          .eq('id', asset.id);

        const heygenResult = await callHeyGenAPI(
          asset.script_text,
          asset.video_config,
          heygenApiKey
        );

        await supabase
          .from('video_assets')
          .update({
            provider_video_id: heygenResult.video_id,
            generation_status: 'processing',
            metadata: { heygen_status: heygenResult.status }
          })
          .eq('id', asset.id);

        await supabase
          .from('video_generation_queue')
          .insert({
            course_id: courseId,
            video_asset_id: asset.id,
            status: 'processing',
            started_at: new Date().toISOString()
          });

        completedCount++;
        const progress = 20 + Math.floor((completedCount / totalVideos) * 60);
        
        await supabase
          .from('courses')
          .update({
            video_generation_progress: progress,
            video_generation_stage: `Submitted ${completedCount}/${totalVideos} videos to HeyGen...`,
            videos_generated_count: completedCount
          })
          .eq('id', courseId);

        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (videoError: any) {
        console.error(`Error generating video for asset ${asset.id}:`, videoError);
        
        await supabase
          .from('video_assets')
          .update({
            generation_status: 'failed',
            generation_error: videoError.message
          })
          .eq('id', asset.id);
      }
    }

    await supabase
      .from('courses')
      .update({
        video_generation_progress: 85,
        video_generation_stage: 'Videos are processing at HeyGen (2-5 minutes)...',
        video_generation_status: 'processing'
      })
      .eq('id', courseId);

    console.log(`Video generation initiated successfully for ${completedCount} videos`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Submitted ${completedCount} videos for generation`,
        videosSubmitted: completedCount,
        totalVideos: totalVideos,
        status: 'processing'
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error: any) {
    console.error('Error in generate-lesson-videos:', error);

    if (courseId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase
        .from('courses')
        .update({
          video_generation_status: 'failed',
          video_generation_error: error.message,
          video_generation_completed_at: new Date().toISOString()
        })
        .eq('id', courseId);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Video generation failed',
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