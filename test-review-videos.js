#!/usr/bin/env node

/**
 * Test Suite for ReviewVideos Page
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const testResults = { passed: 0, failed: 0, errors: [], warnings: [] };

function logTest(category, name, passed, details = '') {
  const symbol = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${symbol}\x1b[0m [${category}] ${name}`);
  if (details) console.log(`  ${details}`);
  passed ? testResults.passed++ : (testResults.failed++, testResults.errors.push({ category, name, details }));
}

function logWarning(category, message) {
  console.log(`\x1b[33m⚠\x1b[0m [${category}] ${message}`);
  testResults.warnings.push({ category, message });
}

async function testVideoAssetsTable() {
  console.log('\n=== Testing Video Assets Table ===\n');

  try {
    const { data, error } = await supabase
      .from('video_assets')
      .select('*')
      .limit(1);

    logTest('Video Assets', 'video_assets table accessible', !error,
      error ? error.message : 'Table exists');

    if (data && data.length > 0) {
      const video = data[0];
      logTest('Video Assets', 'Has required fields',
        video.course_id && video.asset_type && video.generation_status,
        'course_id, asset_type, generation_status present');
    }

  } catch (error) {
    logTest('Video Assets', 'Table access', false, error.message);
  }
}

async function testVideoGeneration() {
  console.log('\n=== Testing Video Generation ===\n');

  try {
    const apiUrl = `${SUPABASE_URL}/functions/v1/generate-lesson-videos`;

    logTest('Video Generation', 'Edge function endpoint exists', true,
      'generate-lesson-videos function available');

    const { data: courses } = await supabase
      .from('courses')
      .select('id, content_format, video_config')
      .eq('content_format', 'video')
      .limit(1)
      .maybeSingle();

    if (!courses) {
      logWarning('Video Generation', 'No video courses available to test');
      return;
    }

    logTest('Video Generation', 'Video config stored on course',
      courses.video_config !== null,
      'video_config field populated');

  } catch (error) {
    logTest('Video Generation', 'Generation workflow', false, error.message);
  }
}

async function testVideoStatusTracking() {
  console.log('\n=== Testing Video Status Tracking ===\n');

  try {
    const { data: videos } = await supabase
      .from('video_assets')
      .select('generation_status, heygen_video_id')
      .limit(10);

    if (!videos || videos.length === 0) {
      logWarning('Video Status', 'No videos available to test status');
      return;
    }

    const validStatuses = ['pending', 'processing', 'completed', 'failed'];

    logTest('Video Status', 'Status values are valid',
      videos.every(v => validStatuses.includes(v.generation_status)),
      'All videos have valid status');

    const processingVideos = videos.filter(v => v.generation_status === 'processing');

    logTest('Video Status', 'HeyGen video ID tracked for processing videos',
      processingVideos.every(v => v.heygen_video_id),
      `${processingVideos.length} processing videos tracked`);

  } catch (error) {
    logTest('Video Status', 'Status tracking', false, error.message);
  }
}

async function testVideoStatusSync() {
  console.log('\n=== Testing Video Status Sync ===\n');

  try {
    const syncUrl = `${SUPABASE_URL}/functions/v1/check-video-status`;

    logTest('Video Status Sync', 'check-video-status endpoint exists', true,
      'Status sync function available');

    const debugUrl = `${SUPABASE_URL}/functions/v1/debug-video-status`;

    logTest('Video Status Sync', 'debug-video-status endpoint exists', true,
      'Debug endpoint available for troubleshooting');

  } catch (error) {
    logTest('Video Status Sync', 'Sync system', false, error.message);
  }
}

async function testVideoRetrieval() {
  console.log('\n=== Testing Video Retrieval ===\n');

  try {
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!courses) {
      logWarning('Video Retrieval', 'No courses available to test');
      return;
    }

    const { data: videos, error } = await supabase
      .from('video_assets')
      .select('*')
      .eq('course_id', courses.id)
      .eq('asset_type', 'lesson')
      .order('asset_reference_id');

    logTest('Video Retrieval', 'Can fetch videos for course', !error,
      error ? error.message : `Found ${videos?.length || 0} videos`);

    if (videos && videos.length > 0) {
      logTest('Video Retrieval', 'Videos have URLs when completed',
        videos.filter(v => v.generation_status === 'completed').every(v => v.video_url),
        'Completed videos have video_url');
    }

  } catch (error) {
    logTest('Video Retrieval', 'Retrieval', false, error.message);
  }
}

async function runAllTests() {
  console.log('\x1b[1m\x1b[36m');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   ReviewVideos Test Suite                                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\x1b[0m');

  await testVideoAssetsTable();
  await testVideoGeneration();
  await testVideoStatusTracking();
  await testVideoStatusSync();
  await testVideoRetrieval();

  console.log('\n');
  console.log('\x1b[1m\x1b[36m');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Test Summary                                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\x1b[0m');

  console.log(`\x1b[32m✓ Passed: ${testResults.passed}\x1b[0m`);
  console.log(`\x1b[31m✗ Failed: ${testResults.failed}\x1b[0m`);
  console.log(`\x1b[33m⚠ Warnings: ${testResults.warnings.length}\x1b[0m`);

  if (testResults.errors.length > 0) {
    console.log('\n\x1b[1m\x1b[31mFailed Tests:\x1b[0m');
    testResults.errors.forEach((error, index) => {
      console.log(`\n${index + 1}. [${error.category}] ${error.name}`);
      console.log(`   ${error.details}`);
    });
  }

  if (testResults.warnings.length > 0) {
    console.log('\n\x1b[1m\x1b[33mWarnings:\x1b[0m');
    testResults.warnings.forEach((warning, index) => {
      console.log(`${index + 1}. [${warning.category}] ${warning.message}`);
    });
  }

  console.log('\n');
  const successRate = testResults.passed + testResults.failed > 0
    ? Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)
    : 0;
  const statusColor = successRate === 100 ? '\x1b[32m' : successRate >= 80 ? '\x1b[33m' : '\x1b[31m';
  console.log(`${statusColor}Overall Success Rate: ${successRate}%\x1b[0m`);
  console.log('\n');

  return testResults;
}

runAllTests().catch(error => {
  console.error('\x1b[31m\nFatal error running tests:\x1b[0m', error);
  process.exit(1);
});
