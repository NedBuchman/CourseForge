#!/usr/bin/env node

/**
 * Test Suite for CourseAnalytics Page
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

async function testEnrollmentTracking() {
  console.log('\n=== Testing Enrollment Tracking ===\n');

  try {
    const { data, error } = await supabase
      .from('student_course_enrollments')
      .select('*')
      .limit(10);

    logTest('Enrollment Tracking', 'student_course_enrollments table accessible', !error,
      error ? error.message : `Found ${data?.length || 0} enrollments`);

    if (data && data.length > 0) {
      logTest('Enrollment Tracking', 'Enrollments have required fields',
        data.every(e => e.course_id && e.student_id && e.enrolled_at),
        'course_id, student_id, enrolled_at present');
    }

  } catch (error) {
    logTest('Enrollment Tracking', 'Tracking system', false, error.message);
  }
}

async function testProgressTracking() {
  console.log('\n=== Testing Progress Tracking ===\n');

  try {
    const { data, error } = await supabase
      .from('student_lesson_completions')
      .select('*')
      .limit(10);

    logTest('Progress Tracking', 'student_lesson_completions table accessible', !error,
      error ? error.message : `Found ${data?.length || 0} completions`);

    if (data && data.length > 0) {
      logTest('Progress Tracking', 'Completions tracked per lesson',
        data.every(c => c.course_id && c.student_id && typeof c.lesson_index === 'number'),
        'Lesson-level completion tracked');
    }

  } catch (error) {
    logTest('Progress Tracking', 'Progress system', false, error.message);
  }
}

async function testQuizAttempts() {
  console.log('\n=== Testing Quiz Attempts ===\n');

  try {
    const { data, error } = await supabase
      .from('student_quiz_attempts')
      .select('*')
      .limit(10);

    logTest('Quiz Attempts', 'student_quiz_attempts table accessible', !error,
      error ? error.message : `Found ${data?.length || 0} attempts`);

    if (data && data.length > 0) {
      logTest('Quiz Attempts', 'Attempts track score and date',
        data.every(a => typeof a.score === 'number' && a.completed_at),
        'Score and completion date tracked');
    }

  } catch (error) {
    logTest('Quiz Attempts', 'Attempt tracking', false, error.message);
  }
}

async function testAnalyticsViews() {
  console.log('\n=== Testing Analytics Views ===\n');

  try {
    // Test course_student_overview view (used by CourseAnalytics page)
    const { data: studentOverview, error: overviewError } = await supabase
      .from('course_student_overview')
      .select('*')
      .limit(5);

    logTest('Analytics Views', 'course_student_overview view accessible',
      !overviewError,
      overviewError ? overviewError.message : 'View exists for course overview data');

    // Test course_lesson_analytics view
    const { data: lessonAnalytics, error: lessonError } = await supabase
      .from('course_lesson_analytics')
      .select('*')
      .limit(5);

    logTest('Analytics Views', 'course_lesson_analytics view accessible',
      !lessonError,
      lessonError ? lessonError.message : 'View exists for lesson analytics');

    // Test course_quiz_analytics view
    const { data: quizAnalytics, error: quizError } = await supabase
      .from('course_quiz_analytics')
      .select('*')
      .limit(5);

    logTest('Analytics Views', 'course_quiz_analytics view accessible',
      !quizError,
      quizError ? quizError.message : 'View exists for quiz analytics');

    // Test student_performance_summary view
    const { data: studentPerformance, error: performanceError } = await supabase
      .from('student_performance_summary')
      .select('*')
      .limit(5);

    logTest('Analytics Views', 'student_performance_summary view accessible',
      !performanceError,
      performanceError ? performanceError.message : 'View exists for student performance');

    // Test quiz_question_difficulty view
    const { data: questionDifficulty, error: difficultyError } = await supabase
      .from('quiz_question_difficulty')
      .select('*')
      .limit(5);

    logTest('Analytics Views', 'quiz_question_difficulty view accessible',
      !difficultyError,
      difficultyError ? difficultyError.message : 'View exists for question difficulty analysis');

    // Test lesson_retake_analytics view
    const { data: retakeAnalytics, error: retakeError } = await supabase
      .from('lesson_retake_analytics')
      .select('*')
      .limit(5);

    logTest('Analytics Views', 'lesson_retake_analytics view accessible',
      !retakeError,
      retakeError ? retakeError.message : 'View exists for lesson retake metrics');

  } catch (error) {
    logTest('Analytics Views', 'Analytics views', false, error.message);
  }
}

async function testVideoViews() {
  console.log('\n=== Testing Video Views ===\n');

  try {
    const { data, error } = await supabase
      .from('lesson_video_views')
      .select('*')
      .limit(10);

    logTest('Video Views', 'lesson_video_views table accessible', !error,
      error ? error.message : `Found ${data?.length || 0} video views`);

    if (data && data.length > 0) {
      logTest('Video Views', 'Tracks watch time and completion',
        data.every(v => typeof v.watch_time_seconds === 'number'),
        'Watch time tracked for analytics');
    }

  } catch (error) {
    logTest('Video Views', 'Video tracking', false, error.message);
  }
}

async function runAllTests() {
  console.log('\x1b[1m\x1b[36m');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   CourseAnalytics Test Suite                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\x1b[0m');

  await testEnrollmentTracking();
  await testProgressTracking();
  await testQuizAttempts();
  await testAnalyticsViews();
  await testVideoViews();

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
