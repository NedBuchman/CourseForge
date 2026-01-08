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

async function findCourses() {
  console.log('🔍 Searching for courses containing keywords...\n');

  const keywords = ['Tom Sawyer', 'Endurance', 'Omelette', 'Omelet'];

  for (const keyword of keywords) {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('id, title, video_generation_status, videos_generated_count')
      .ilike('title', `%${keyword}%`);

    if (error) {
      console.error(`❌ Error searching for "${keyword}":`, error);
      continue;
    }

    if (courses && courses.length > 0) {
      console.log(`✅ Found courses matching "${keyword}":`);
      courses.forEach(course => {
        console.log(`   - "${course.title}"`);
        console.log(`     ID: ${course.id}`);
        console.log(`     Status: ${course.video_generation_status}`);
        console.log(`     Videos: ${course.videos_generated_count}\n`);
      });
    } else {
      console.log(`❌ No courses found matching "${keyword}"\n`);
    }
  }

  // Also list all courses that have videos
  console.log('\n' + '='.repeat(60));
  console.log('📚 All courses with videos:');
  console.log('='.repeat(60) + '\n');

  const { data: allCourses, error: allError } = await supabase
    .from('courses')
    .select('id, title, video_generation_status, videos_generated_count')
    .gt('videos_generated_count', 0)
    .order('created_at', { ascending: false });

  if (allError) {
    console.error('❌ Error fetching all courses:', allError);
  } else if (allCourses) {
    allCourses.forEach((course, idx) => {
      console.log(`${idx + 1}. "${course.title}"`);
      console.log(`   ID: ${course.id}`);
      console.log(`   Status: ${course.video_generation_status}`);
      console.log(`   Videos: ${course.videos_generated_count}\n`);
    });
  }
}

findCourses().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
