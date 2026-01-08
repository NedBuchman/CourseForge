import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const courseIds = [
  '36c2cd20-3291-42c7-86cf-2a5619c72126', // The Story of Santa Claus
  'e208f0b0-175d-40be-aa5e-85ec643834c4', // Golden Retrievers
  '8f31ddb3-cbf7-48f6-a96b-9e0f1bbcfce5', // Life at the U.S Naval Academy
  'a689e687-6b61-4de4-a53f-a7e15bfe1c7f'  // How to Fly a Kite
];

async function verifyVideoUrls() {
  console.log('🔍 Verifying video URLs are accessible...\n');

  for (const courseId of courseIds) {
    // Get course info
    const { data: course } = await supabase
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .single();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📹 ${course?.title || 'Unknown Course'}`);
    console.log(`${'='.repeat(60)}\n`);

    // Get video assets
    const { data: videos, error } = await supabase
      .from('video_assets')
      .select('id, asset_reference_id, video_url, thumbnail_url, generation_status, updated_at')
      .eq('course_id', courseId)
      .order('asset_reference_id');

    if (error) {
      console.error(`❌ Error fetching videos:`, error);
      continue;
    }

    if (!videos || videos.length === 0) {
      console.log('❌ No video assets found');
      continue;
    }

    console.log(`Found ${videos.length} video(s)\n`);

    for (const video of videos) {
      console.log(`📝 Lesson ${video.asset_reference_id}:`);
      console.log(`   Video Asset ID: ${video.id}`);
      console.log(`   Status: ${video.generation_status}`);
      console.log(`   Updated: ${new Date(video.updated_at).toLocaleString()}`);

      if (video.video_url) {
        console.log(`   Video URL: ${video.video_url.substring(0, 80)}...`);

        // Test if URL is accessible
        try {
          const response = await fetch(video.video_url, { method: 'HEAD' });
          if (response.ok) {
            console.log(`   ✅ URL is accessible (${response.status})`);
          } else {
            console.log(`   ❌ URL returned error (${response.status})`);
          }
        } catch (error) {
          console.log(`   ❌ URL check failed: ${error.message}`);
        }
      } else {
        console.log(`   ⚠️  No video URL`);
      }

      if (video.thumbnail_url) {
        console.log(`   Thumbnail: ${video.thumbnail_url.substring(0, 80)}...`);
      }

      console.log();
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Verification complete!');
  console.log(`${'='.repeat(60)}\n`);
}

verifyVideoUrls().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
