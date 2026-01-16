import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function refreshCourseVideoUrls(courseId, courseName) {
  console.log(`\n📹 Refreshing video URLs for: ${courseName}`);
  console.log(`   Course ID: ${courseId}`);

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/refresh-video-urls`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseId })
      }
    );

    const result = await response.json();

    if (response.ok && result.success) {
      console.log(`   ✅ Success: Refreshed ${result.videosRefreshed || 0} videos`);
      if (result.details) {
        console.log(`   📝 Details: ${result.details}`);
      }
      return { success: true, count: result.videosRefreshed || 0 };
    } else {
      console.log(`   ❌ Failed: ${result.error || result.message || 'Unknown error'}`);
      return { success: false, error: result.error || result.message };
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting HeyGen Video URL Refresh Process');
  console.log('='.repeat(50));

  // Get courses with approved or completed video status
  const { data: coursesWithVideos, error } = await supabase
    .from('courses')
    .select(`
      id,
      title,
      videos_status,
      videos_generated_count,
      videos_total_count
    `)
    .in('videos_status', ['approved', 'completed', 'generated', 'processing'])
    .order('title');

  if (error) {
    console.error('❌ Error fetching courses:', error.message);
    process.exit(1);
  }

  if (!coursesWithVideos || coursesWithVideos.length === 0) {
    console.log('ℹ️  No courses with videos found.');
    return;
  }

  console.log(`\n📊 Found ${coursesWithVideos.length} courses with video status`);

  // Filter courses that have generated videos
  const coursesToRefresh = coursesWithVideos.filter(course =>
    course.videos_generated_count > 0 || course.videos_total_count > 0
  );

  if (coursesToRefresh.length === 0) {
    console.log('ℹ️  No courses with generated videos found.');
    return;
  }

  console.log(`\n🎯 Courses to refresh: ${coursesToRefresh.length}`);
  for (const course of coursesToRefresh) {
    console.log(`   • ${course.title} (${course.videos_generated_count || course.videos_total_count || '?'} videos, status: ${course.videos_status})`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('Starting refresh...\n');

  const results = {
    total: coursesToRefresh.length,
    successful: 0,
    failed: 0,
    totalVideosRefreshed: 0,
    errors: []
  };

  for (let i = 0; i < coursesToRefresh.length; i++) {
    const course = coursesToRefresh[i];
    console.log(`[${i + 1}/${coursesToRefresh.length}]`);

    const result = await refreshCourseVideoUrls(course.id, course.title);

    if (result.success) {
      results.successful++;
      results.totalVideosRefreshed += result.count;
    } else {
      results.failed++;
      results.errors.push({
        course: course.title,
        error: result.error
      });
    }

    // Add a small delay between courses to avoid overwhelming the API
    if (i < coursesToRefresh.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 REFRESH SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total courses processed: ${results.total}`);
  console.log(`✅ Successful: ${results.successful}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`🎬 Total videos refreshed: ${results.totalVideosRefreshed}`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    for (const err of results.errors) {
      console.log(`   • ${err.course}: ${err.error}`);
    }
  }

  console.log('\n✨ Refresh process completed!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
