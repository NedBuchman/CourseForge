import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const courseNames = [
  'Life at the U.S Naval Academy',
  'Golden Retrievers',
  'The Story of Santa Claus',
  'How to Fly a Kite',
  'Adventures of Tom Sawyer',
  'Endurance',
  'How to Make an Omelette'
];

async function refreshCourseVideos() {
  console.log('🔍 Finding courses...\n');

  // Find all the courses by title
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, title, video_generation_status, videos_generated_count')
    .in('title', courseNames);

  if (coursesError) {
    console.error('❌ Error fetching courses:', coursesError);
    process.exit(1);
  }

  if (!courses || courses.length === 0) {
    console.log('❌ No courses found');
    process.exit(1);
  }

  console.log(`✅ Found ${courses.length} courses:\n`);
  courses.forEach((course, idx) => {
    console.log(`${idx + 1}. ${course.title}`);
    console.log(`   - ID: ${course.id}`);
    console.log(`   - Status: ${course.video_generation_status}`);
    console.log(`   - Videos: ${course.videos_generated_count}\n`);
  });

  // For each course, check video assets and refresh URLs
  for (const course of courses) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📹 Processing: ${course.title}`);
    console.log(`${'='.repeat(60)}\n`);

    // Get video assets for this course
    const { data: videos, error: videosError } = await supabase
      .from('video_assets')
      .select('id, asset_reference_id, provider_video_id, video_url, generation_status')
      .eq('course_id', course.id)
      .order('asset_reference_id');

    if (videosError) {
      console.error(`❌ Error fetching videos for ${course.title}:`, videosError);
      continue;
    }

    console.log(`📊 Current video status:`);
    console.log(`   Total videos: ${videos.length}`);
    console.log(`   Completed: ${videos.filter(v => v.generation_status === 'completed').length}`);
    console.log(`   With URLs: ${videos.filter(v => v.video_url).length}`);
    console.log(`   With HeyGen IDs: ${videos.filter(v => v.provider_video_id).length}\n`);

    // Call refresh-video-urls edge function
    console.log(`🔄 Calling refresh-video-urls for course ${course.id}...`);

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/refresh-video-urls`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ courseId: course.id }),
        }
      );

      const result = await response.json();

      if (result.success) {
        console.log(`✅ ${result.message}\n`);

        if (result.updates && result.updates.length > 0) {
          console.log(`📝 Update details:`);
          result.updates.forEach((update, idx) => {
            const status = update.success ? '✅' : '❌';
            console.log(`   ${idx + 1}. Video Asset ${update.videoAssetId.substring(0, 8)}... ${status}`);
            if (update.success && update.newUrl) {
              console.log(`      New URL: ${update.newUrl.substring(0, 60)}...`);
            } else if (!update.success && update.error) {
              console.log(`      Error: ${update.error}`);
            }
          });
          console.log();
        }
      } else {
        console.error(`❌ Refresh failed: ${result.error}\n`);
      }
    } catch (error) {
      console.error(`❌ Error calling refresh function:`, error.message);
    }

    // Wait a bit between courses to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('🎉 Video URL refresh complete!');
  console.log(`${'='.repeat(60)}\n`);

  // Show final summary
  console.log('📊 Final Summary:\n');

  for (const course of courses) {
    const { data: videos } = await supabase
      .from('video_assets')
      .select('video_url, generation_status')
      .eq('course_id', course.id);

    const withUrls = videos?.filter(v => v.video_url).length || 0;
    const completed = videos?.filter(v => v.generation_status === 'completed').length || 0;
    const total = videos?.length || 0;

    console.log(`${course.title}:`);
    console.log(`   ${completed}/${total} completed, ${withUrls}/${total} have URLs\n`);
  }
}

refreshCourseVideos().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
