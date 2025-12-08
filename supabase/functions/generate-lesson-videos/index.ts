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

interface VideoGenerationError {
  assetId: string;
  lessonNumber: string;
  error: string;
}

function validateVideoConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config) {
    errors.push('video_config is null or undefined');
    return { valid: false, errors };
  }

  if (!config.avatar_id && config.avatar_id !== '') {
    errors.push('avatar_id is missing');
  }

  if (!config.voice_id && config.voice_id !== '') {
    errors.push('voice_id is missing');
  }

  return { valid: errors.length === 0, errors };
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

function estimateDuration(wordCount: number, wordsPerMinute: number = 140): number {
  return Math.ceil((wordCount / wordsPerMinute) * 60);
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

async function generateVideoScript(lesson: Lesson): Promise<{ script: string; wordCount: number; estimatedSeconds: number }> {
  const MAX_SAFE_WORDS = 350;
  const TARGET_DURATION_SECONDS = 150;
  const WORDS_PER_MINUTE = 140;

  const plainContent = await stripHtml(lesson.content);

  const intro = `Welcome to ${lesson.title}.`;
  const introWords = countWords(intro);

  let objectivesSection = '';
  let objectivesWords = 0;
  if (lesson.objectives && lesson.objectives.length > 0) {
    const maxObjectives = Math.min(lesson.objectives.length, 4);
    objectivesSection = `In this lesson, you'll learn:\n`;
    for (let i = 0; i < maxObjectives; i++) {
      objectivesSection += `${i + 1}. ${lesson.objectives[i]}\n`;
    }
    objectivesWords = countWords(objectivesSection);
  }

  const outro = `That concludes this lesson. Let's test your understanding with a quick quiz.`;
  const outroWords = countWords(outro);

  const fixedWords = introWords + objectivesWords + outroWords;
  const availableWordsForContent = MAX_SAFE_WORDS - fixedWords;

  console.log(`Video script calculation for lesson ${lesson.lesson_number}:`, {
    introWords,
    objectivesWords,
    outroWords,
    fixedWords,
    availableWordsForContent,
    originalContentWords: countWords(plainContent)
  });

  const contentWords = plainContent.split(/\s+/).filter(w => w.length > 0);
  let finalContent = plainContent;

  if (contentWords.length > availableWordsForContent) {
    const sentences = plainContent.split(/\.(?=\s|$)/).filter(s => s.trim().length > 0);
    let truncatedContent = '';
    let currentWordCount = 0;

    for (const sentence of sentences) {
      const sentenceWords = countWords(sentence);
      if (currentWordCount + sentenceWords <= availableWordsForContent) {
        truncatedContent += sentence + '. ';
        currentWordCount += sentenceWords;
      } else {
        break;
      }
    }

    finalContent = truncatedContent.trim();
    console.log(`Content truncated from ${contentWords.length} to ${currentWordCount} words`);
  }

  let script = intro + '\n\n';
  if (objectivesSection) {
    script += objectivesSection + '\n';
  }
  script += finalContent + '\n\n';
  script += outro;

  const totalWords = countWords(script);
  const estimatedSeconds = estimateDuration(totalWords, WORDS_PER_MINUTE);

  console.log(`Final script stats for lesson ${lesson.lesson_number}:`, {
    totalWords,
    estimatedSeconds,
    estimatedMinutes: (estimatedSeconds / 60).toFixed(2),
    withinLimit: estimatedSeconds <= TARGET_DURATION_SECONDS
  });

  if (totalWords > MAX_SAFE_WORDS) {
    console.warn(`WARNING: Script exceeds safe word limit! ${totalWords} > ${MAX_SAFE_WORDS}`);
  }

  return {
    script,
    wordCount: totalWords,
    estimatedSeconds
  };
}

function getResolutionDimensions(resolution: string): { width: number; height: number } {
  switch (resolution) {
    case '480p':
      return { width: 854, height: 480 };
    case '540p':
      return { width: 960, height: 540 };
    case '1080p':
      return { width: 1920, height: 1080 };
    case '720p':
    default:
      return { width: 1280, height: 720 };
  }
}

function getPlanConcurrencyLimit(planTier: string): number {
  switch (planTier) {
    case 'enterprise':
      return 20;
    case 'scale':
      return 6;
    case 'pro':
      return 3;
    case 'free':
    default:
      return 1;
  }
}

async function callHeyGenAPI(
  script: string,
  videoConfig: any,
  heygenApiKey: string,
  resolution: string = '720p'
): Promise<{ video_id: string; status: string }> {
  const validation = validateVideoConfig(videoConfig);
  if (!validation.valid) {
    console.error('Invalid video config:', validation.errors);
    throw new Error(`Invalid video configuration: ${validation.errors.join(', ')}`);
  }

  console.log('Calling HeyGen API with config:', {
    avatarId: videoConfig.avatar_id,
    voiceId: videoConfig.voice_id,
    scriptLength: script.length,
    resolution,
    apiKeyConfigured: !!heygenApiKey,
    apiKeyLength: heygenApiKey?.length
  });

  const dimensions = getResolutionDimensions(resolution);
  const heygenRequest = {
    video_inputs: [{
      character: {
        type: 'avatar',
        avatar_id: videoConfig.avatar_id || 'Adrian_public_3_20240312',
        avatar_style: videoConfig.avatar_style || 'normal'
      },
      voice: {
        type: 'text',
        input_text: script,
        voice_id: videoConfig.voice_id || '75af67cc2ceb498681d0085bb56bddc3',
        speed: 1.0
      },
      background: {
        type: videoConfig.background_style || 'color',
        value: videoConfig.background_color || '#f0f4f8'
      }
    }],
    dimension: dimensions,
    aspect_ratio: '16:9',
    test: false
  };

  console.log('HeyGen API Request Payload:', JSON.stringify(heygenRequest, null, 2));

  const response = await fetch('https://api.heygen.com/v2/video/generate', {
    method: 'POST',
    headers: {
      'X-Api-Key': heygenApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(heygenRequest),
  });

  const responseText = await response.text();
  console.log('HeyGen API Response:', { status: response.status, body: responseText });

  if (!response.ok) {
    console.error('HeyGen API error details:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText
    });
    throw new Error(`HeyGen API error (${response.status}): ${responseText}`);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    console.error('Failed to parse HeyGen response:', parseError);
    throw new Error(`Invalid JSON response from HeyGen: ${responseText}`);
  }

  console.log('HeyGen parsed response:', data);

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
      .select('id, video_config, generated_content, heygen_plan_tier, video_resolution')
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
      const scriptData = await generateVideoScript(lesson);

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
          script_text: scriptData.script,
          video_config: course.video_config,
          generation_status: 'queued',
          metadata: {
            wordCount: scriptData.wordCount,
            estimatedSeconds: scriptData.estimatedSeconds,
            estimatedMinutes: (scriptData.estimatedSeconds / 60).toFixed(2)
          }
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
    const failedVideos: VideoGenerationError[] = [];

    const planTier = course.heygen_plan_tier || 'free';
    const resolution = course.video_resolution || '720p';
    const concurrencyLimit = getPlanConcurrencyLimit(planTier);

    console.log(`Starting parallel video generation for ${totalVideos} assets`);
    console.log(`Plan: ${planTier}, Concurrency: ${concurrencyLimit}, Resolution: ${resolution}`);

    // Process videos in parallel batches based on plan tier
    async function submitVideoToHeyGen(asset: any): Promise<{ success: boolean; error?: string }> {
      try {
        console.log(`\n=== Processing asset ${asset.id} (Lesson ${asset.asset_reference_id}) ===`);

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
          heygenApiKey,
          resolution
        );

        console.log(`✅ Successfully submitted video for asset ${asset.id}:`, {
          videoId: heygenResult.video_id,
          status: heygenResult.status
        });

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

        return { success: true };
      } catch (videoError: any) {
        console.error(`❌ Error generating video for asset ${asset.id}:`, {
          error: videoError.message,
          stack: videoError.stack
        });

        await supabase
          .from('video_assets')
          .update({
            generation_status: 'failed',
            generation_error: videoError.message
          })
          .eq('id', asset.id);

        return { success: false, error: videoError.message };
      }
    }

    // Submit videos in batches respecting concurrency limit
    for (let i = 0; i < videoAssets.length; i += concurrencyLimit) {
      const batch = videoAssets.slice(i, i + concurrencyLimit);
      console.log(`\n📦 Processing batch ${Math.floor(i / concurrencyLimit) + 1}: ${batch.length} videos`);

      const batchResults = await Promise.all(
        batch.map(asset => submitVideoToHeyGen(asset))
      );

      // Update counts
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const asset = batch[j];

        if (result.success) {
          completedCount++;
        } else {
          failedVideos.push({
            assetId: asset.id,
            lessonNumber: asset.asset_reference_id,
            error: result.error || 'Unknown error'
          });
        }
      }

      const progress = 20 + Math.floor((completedCount / totalVideos) * 60);
      await supabase
        .from('courses')
        .update({
          video_generation_progress: progress,
          video_generation_stage: `Submitted ${completedCount}/${totalVideos} videos to HeyGen...`,
          videos_generated_count: completedCount
        })
        .eq('id', courseId);

      // Small delay between batches to avoid overwhelming the API
      if (i + concurrencyLimit < videoAssets.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`\n=== Video Generation Summary ===`);
    console.log(`Total: ${totalVideos}, Success: ${completedCount}, Failed: ${failedVideos.length}`);

    const finalStatus = completedCount > 0 ? 'processing' : 'failed';
    const finalProgress = completedCount > 0 ? 85 : 0;

    // Calculate estimated completion time (10 minutes per video, but consider parallel processing)
    const estimatedMinutesPerVideo = 10;
    const batchesNeeded = Math.ceil(completedCount / concurrencyLimit);
    const estimatedTotalMinutes = batchesNeeded * estimatedMinutesPerVideo;
    const estimatedCompletionTime = new Date(Date.now() + estimatedTotalMinutes * 60 * 1000);

    const finalStage = completedCount > 0
      ? `Processing ${completedCount} videos at HeyGen (~${estimatedTotalMinutes} min est.)... ${completedCount}/${totalVideos} submitted`
      : `All video submissions failed`;

    await supabase
      .from('courses')
      .update({
        video_generation_progress: finalProgress,
        video_generation_stage: finalStage,
        video_generation_status: finalStatus,
        estimated_completion_time: completedCount > 0 ? estimatedCompletionTime.toISOString() : null,
        video_generation_error: failedVideos.length > 0 ? `${failedVideos.length} videos failed: ${failedVideos.map(f => `Lesson ${f.lessonNumber}: ${f.error}`).join('; ')}` : null
      })
      .eq('id', courseId);

    console.log(`Video generation completed: ${completedCount}/${totalVideos} successful`);

    if (failedVideos.length > 0) {
      console.log('Failed videos:', failedVideos);
    }

    return new Response(
      JSON.stringify({
        success: completedCount > 0,
        message: `Submitted ${completedCount} of ${totalVideos} videos for generation`,
        videosSubmitted: completedCount,
        totalVideos: totalVideos,
        failedCount: failedVideos.length,
        failedVideos: failedVideos,
        status: finalStatus,
        details: failedVideos.length > 0 ? 'Some videos failed to submit. Check logs for details.' : 'All videos submitted successfully'
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