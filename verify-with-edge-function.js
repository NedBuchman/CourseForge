import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const courses = [
  { id: '36c2cd20-3291-42c7-86cf-2a5619c72126', title: 'The Story of Santa Claus' },
  { id: 'e208f0b0-175d-40be-aa5e-85ec643834c4', title: 'Golden Retrievers' },
  { id: '8f31ddb3-cbf7-48f6-a96b-9e0f1bbcfce5', title: 'Life at the U.S Naval Academy' },
  { id: 'a689e687-6b61-4de4-a53f-a7e15bfe1c7f', title: 'How to Fly a Kite' }
];

async function verifyVideos() {
  console.log('🔍 Verifying video status using debug-video-status function...\n');

  for (const course of courses) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📹 ${course.title}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/debug-video-status`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            courseId: course.id,
            checkHeyGen: true
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        console.log(`📊 Course Status:`);
        console.log(`   Generation Status: ${result.course?.video_generation_status || 'N/A'}`);
        console.log(`   Videos Count: ${result.course?.videos_generated_count || 0}`);
        console.log();

        if (result.videoAssets && result.videoAssets.length > 0) {
          console.log(`📝 Video Assets (${result.videoAssets.length} total):\n`);

          result.videoAssets.forEach((video, idx) => {
            console.log(`   ${idx + 1}. Lesson ${video.asset_reference_id}`);
            console.log(`      Status: ${video.generation_status}`);
            console.log(`      Has URL: ${video.video_url ? '✅ Yes' : '❌ No'}`);
            console.log(`      Provider ID: ${video.provider_video_id?.substring(0, 20) || 'N/A'}...`);

            if (video.heygenStatus) {
              const match = video.statusMatch ? '✅' : '❌';
              console.log(`      HeyGen Status: ${video.heygenStatus} ${match}`);
              console.log(`      HeyGen Has URL: ${video.heygenHasUrl ? '✅ Yes' : '❌ No'}`);
            }

            console.log(`      Updated: ${new Date(video.updated_at).toLocaleString()}`);
            console.log();
          });
        } else {
          console.log('❌ No video assets found\n');
        }

        if (result.summary) {
          console.log(`📈 Summary:`);
          console.log(`   Total Videos: ${result.summary.totalVideos || 0}`);
          console.log(`   With URLs: ${result.summary.videosWithUrls || 0}`);
          console.log(`   Completed: ${result.summary.completedVideos || 0}`);
          if (result.summary.needsSync !== undefined) {
            console.log(`   Needs Sync: ${result.summary.needsSync}`);
          }
        }
      } else {
        console.error(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Request failed:`, error.message);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Verification complete!');
  console.log(`${'='.repeat(60)}\n`);
}

verifyVideos().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
