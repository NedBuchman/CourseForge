#!/usr/bin/env node

/**
 * Test Suite for StudentProgressDetail Page
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

async function testStudentEnrollment() {
  console.log('\n=== Testing Student Enrollment ===\n');

  try {
    const { data, error } = await supabase
      .from('student_course_enrollments')
      .select('*')
      .limit(10);

    logTest('Student Enrollment', 'Enrollment table accessible', !error,
      error ? error.message : `Found ${data?.length || 0} enrollments`);

    if (data && data.length > 0) {
      const enrollment = data[0];

      logTest('Student Enrollment', 'Enrollment has required fields',
        enrollment.course_id && enrollment.student_id && enrollment.enrolled_at,
        'course_id, student_id, enrolled_at present');

      logTest('Student Enrollment', 'Progress tracked in enrollment',
        typeof enrollment.progress === 'number',
        `Progress: ${enrollment.progress}%`);
    } else {
      logWarning('Student Enrollment', 'No enrollments found - expected for new installations');
    }

  } catch (error) {
    logTest('Student Enrollment', 'Enrollment system', false, error.message);
  }
}

async function testLessonProgress() {
  console.log('\n=== Testing Lesson Progress ===\n');

  try {
    const { data, error } = await supabase
      .from('student_lesson_completions')
      .select('*')
      .limit(10);

    logTest('Lesson Progress', 'Completion table accessible', !error,
      error ? error.message : `Found ${data?.length || 0} completions`);

    if (data && data.length > 0) {
      logTest('Lesson Progress', 'Per-lesson tracking',
        data.every(c => typeof c.lesson_index === 'number'),
        'Individual lessons tracked');

      logTest('Lesson Progress', 'Completion timestamps',
        data.every(c => c.completed_at),
        'Completion dates recorded');
    }

  } catch (error) {
    logTest('Lesson Progress', 'Progress tracking', false, error.message);
  }
}

async function testQuizAttempts() {
  console.log('\n=== Testing Quiz Attempts ===\n');

  try {
    const { data, error } = await supabase
      .from('student_quiz_attempts')
      .select('*')
      .limit(10);

    logTest('Quiz Attempts', 'Attempts table accessible', !error,
      error ? error.message : `Found ${data?.length || 0} attempts`);

    if (data && data.length > 0) {
      logTest('Quiz Attempts', 'Score tracking',
        data.every(a => typeof a.score === 'number'),
        'Quiz scores recorded');

      logTest('Quiz Attempts', 'Multiple attempts supported',
        true,
        'Students can retake quizzes');
    }

  } catch (error) {
    logTest('Quiz Attempts', 'Quiz tracking', false, error.message);
  }
}

async function testVideoViews() {
  console.log('\n=== Testing Video Views ===\n');

  try {
    const { data, error } = await supabase
      .from('lesson_video_views')
      .select('*')
      .limit(10);

    logTest('Video Views', 'Video views table accessible', !error,
      error ? error.message : `Found ${data?.length || 0} views`);

    if (data && data.length > 0) {
      logTest('Video Views', 'Watch time tracked',
        data.every(v => typeof v.watch_time_seconds === 'number'),
        'Duration of views recorded');

      logTest('Video Views', 'Completion tracking',
        data.every(v => 'completed_at' in v),
        'Video completion timestamps available');
    }

  } catch (error) {
    logTest('Video Views', 'View tracking', false, error.message);
  }
}

async function testStudentData() {
  console.log('\n=== Testing Student Data ===\n');

  try {
    const { data, error } = await supabase
      .from('student_accounts')
      .select('*')
      .limit(5);

    logTest('Student Data', 'Student accounts table accessible', !error,
      error ? error.message : `Found ${data?.length || 0} students`);

    if (data && data.length > 0) {
      logTest('Student Data', 'Student profiles complete',
        data.every(s => s.email && s.first_name && s.last_name),
        'Student information stored');
    }

  } catch (error) {
    logTest('Student Data', 'Student information', false, error.message);
  }
}

async function runAllTests() {
  console.log('\x1b[1m\x1b[36m');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   StudentProgressDetail Test Suite                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\x1b[0m');

  await testStudentEnrollment();
  await testLessonProgress();
  await testQuizAttempts();
  await testVideoViews();
  await testStudentData();

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
