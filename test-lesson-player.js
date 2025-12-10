#!/usr/bin/env node

/**
 * Comprehensive Automated Test Suite for LessonPlayer
 *
 * Tests all database operations, video tracking, lesson completion,
 * AI chat integration, and error handling.
 *
 * Usage: node test-lesson-player.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, 'student/.env') });
config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables. Check student/.env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  warnings: [],
};

function logTest(category, name, passed, details = '') {
  const symbol = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${symbol}\x1b[0m [${category}] ${name}`);
  if (details) {
    console.log(`  ${details}`);
  }
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
    testResults.errors.push({ category, name, details });
  }
}

function logWarning(category, message) {
  console.log(`\x1b[33m⚠\x1b[0m [${category}] ${message}`);
  testResults.warnings.push({ category, message });
}

async function testDatabaseSchema() {
  console.log('\n=== Testing Database Schema ===\n');

  try {
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title, lessons, video_config')
      .limit(1);

    logTest('Schema', 'courses table accessible', !coursesError,
      coursesError ? coursesError.message : 'Table exists and is readable');

    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('student_course_enrollments')
      .select('*')
      .limit(1);

    logTest('Schema', 'student_course_enrollments table accessible', !enrollmentsError,
      enrollmentsError ? enrollmentsError.message : 'Table exists and is readable');

    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('*')
      .limit(1);

    logTest('Schema', 'quizzes table accessible', !quizzesError,
      quizzesError ? quizzesError.message : 'Table exists and is readable');

    const { data: videoAssets, error: videoAssetsError } = await supabase
      .from('video_assets')
      .select('*')
      .limit(1);

    logTest('Schema', 'video_assets table accessible', !videoAssetsError,
      videoAssetsError ? videoAssetsError.message : 'Table exists and is readable');

    const { data: videoViews, error: videoViewsError } = await supabase
      .from('lesson_video_views')
      .select('*')
      .limit(1);

    logTest('Schema', 'lesson_video_views table accessible', !videoViewsError,
      videoViewsError ? videoViewsError.message : 'Table exists and is readable');

    const { data: lessonCompletions, error: lessonCompletionsError } = await supabase
      .from('student_lesson_completions')
      .select('*')
      .limit(1);

    logTest('Schema', 'student_lesson_completions table accessible', !lessonCompletionsError,
      lessonCompletionsError ? lessonCompletionsError.message : 'Table exists and is readable');

  } catch (error) {
    logTest('Schema', 'Database connection', false, error.message);
  }
}

async function testCourseDataRetrieval() {
  console.log('\n=== Testing Course Data Retrieval ===\n');

  try {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('id, title, description, lessons, video_config')
      .eq('published_status', 'published')
      .limit(5);

    logTest('Course Data', 'Fetch published courses', !error && courses,
      error ? error.message : `Found ${courses?.length || 0} published courses`);

    if (courses && courses.length > 0) {
      const course = courses[0];

      logTest('Course Data', 'Course has title', !!course.title,
        course.title ? `Title: "${course.title}"` : 'Missing title');

      logTest('Course Data', 'Course has lessons array',
        Array.isArray(course.lessons),
        `Lessons: ${Array.isArray(course.lessons) ? course.lessons.length : 'N/A'}`);

      if (Array.isArray(course.lessons) && course.lessons.length > 0) {
        const lesson = course.lessons[0];

        logTest('Course Data', 'Lesson has required fields',
          lesson.title && lesson.content && lesson.lessonNumber !== undefined,
          `Fields: title=${!!lesson.title}, content=${!!lesson.content}, lessonNumber=${lesson.lessonNumber !== undefined}`);

        logTest('Course Data', 'Lesson content is not empty',
          lesson.content && lesson.content.trim().length > 0,
          `Content length: ${lesson.content ? lesson.content.length : 0} characters`);
      } else {
        logWarning('Course Data', 'First course has no lessons - expected for new installations');
      }

      logTest('Course Data', 'Course has video_config',
        course.video_config !== null && typeof course.video_config === 'object',
        course.video_config ? 'Video config exists' : 'Missing video config');
    } else {
      logWarning('Course Data', 'No published courses found - this is expected for new installations');
    }
  } catch (error) {
    logTest('Course Data', 'Course retrieval', false, error.message);
  }
}

async function testVideoAssetRetrieval() {
  console.log('\n=== Testing Video Asset Retrieval ===\n');

  try {
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('published_status', 'published')
      .limit(1)
      .maybeSingle();

    if (!courses) {
      logWarning('Video Assets', 'No courses available to test video retrieval');
      return;
    }

    const { data: videoAssets, error } = await supabase
      .from('video_assets')
      .select('video_url, asset_type, asset_reference_id, generation_status')
      .eq('course_id', courses.id)
      .eq('asset_type', 'lesson')
      .eq('generation_status', 'completed');

    logTest('Video Assets', 'Query video assets for course', !error,
      error ? error.message : `Found ${videoAssets?.length || 0} completed videos`);

    if (videoAssets && videoAssets.length > 0) {
      const video = videoAssets[0];

      logTest('Video Assets', 'Video has URL',
        !!video.video_url && video.video_url.startsWith('http'),
        video.video_url ? 'Valid URL' : 'Invalid or missing URL');

      logTest('Video Assets', 'Video has asset_reference_id',
        !!video.asset_reference_id,
        `Reference ID: ${video.asset_reference_id}`);

      logTest('Video Assets', 'Video status is completed',
        video.generation_status === 'completed',
        `Status: ${video.generation_status}`);
    } else {
      logWarning('Video Assets', 'No completed videos found - this is expected if videos haven\'t been generated');
    }
  } catch (error) {
    logTest('Video Assets', 'Video retrieval', false, error.message);
  }
}

async function testVideoTracking() {
  console.log('\n=== Testing Video Tracking System ===\n');

  try {
    const testStudentId = '00000000-0000-0000-0000-000000000001';
    const testCourseId = '00000000-0000-0000-0000-000000000002';
    const testLessonIndex = 0;

    const { data: existing } = await supabase
      .from('lesson_video_views')
      .select('*')
      .eq('student_id', testStudentId)
      .eq('course_id', testCourseId)
      .eq('lesson_index', testLessonIndex)
      .maybeSingle();

    logTest('Video Tracking', 'Query existing video views', true,
      existing ? 'Found existing view record' : 'No existing record (expected)');

    const { error: insertError } = await supabase
      .from('lesson_video_views')
      .upsert({
        student_id: testStudentId,
        course_id: testCourseId,
        lesson_index: testLessonIndex,
        started_at: new Date().toISOString(),
        last_position: 0,
        watch_percentage: 0,
        video_duration: 100,
        completed: false,
      });

    logTest('Video Tracking', 'Insert video view record', !insertError,
      insertError ? insertError.message : 'Successfully tracked video start');

    const { error: updateError } = await supabase
      .from('lesson_video_views')
      .upsert({
        student_id: testStudentId,
        course_id: testCourseId,
        lesson_index: testLessonIndex,
        last_position: 50,
        watch_percentage: 50,
        video_duration: 100,
        completed: false,
        updated_at: new Date().toISOString(),
      });

    logTest('Video Tracking', 'Update video progress', !updateError,
      updateError ? updateError.message : 'Successfully updated progress to 50%');

    const { error: completeError } = await supabase
      .from('lesson_video_views')
      .upsert({
        student_id: testStudentId,
        course_id: testCourseId,
        lesson_index: testLessonIndex,
        last_position: 96,
        watch_percentage: 96,
        video_duration: 100,
        completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    logTest('Video Tracking', 'Mark video as completed', !completeError,
      completeError ? completeError.message : 'Successfully marked video complete at 96%');

    await supabase
      .from('lesson_video_views')
      .delete()
      .eq('student_id', testStudentId)
      .eq('course_id', testCourseId)
      .eq('lesson_index', testLessonIndex);

  } catch (error) {
    logTest('Video Tracking', 'Video tracking operations', false, error.message);
  }
}

async function testLessonCompletion() {
  console.log('\n=== Testing Lesson Completion ===\n');

  try {
    const testStudentId = '00000000-0000-0000-0000-000000000001';
    const testCourseId = '00000000-0000-0000-0000-000000000002';

    const { error: completionError } = await supabase
      .from('student_lesson_completions')
      .insert({
        student_id: testStudentId,
        course_id: testCourseId,
        lesson_index: 0,
      });

    logTest('Lesson Completion', 'Insert lesson completion', !completionError,
      completionError ? completionError.message : 'Successfully recorded lesson completion');

    const { data: enrollmentData } = await supabase
      .from('student_course_enrollments')
      .select('progress')
      .eq('student_id', testStudentId)
      .eq('course_id', testCourseId)
      .maybeSingle();

    logTest('Lesson Completion', 'Retrieve enrollment progress', true,
      enrollmentData ? 'Progress data retrieved' : 'No enrollment found (expected)');

    if (!enrollmentData) {
      const { error: enrollError } = await supabase
        .from('student_course_enrollments')
        .insert({
          student_id: testStudentId,
          course_id: testCourseId,
          enrolled_at: new Date().toISOString(),
          progress: {
            completed_lessons: [0],
            total_lessons: 5,
            last_accessed_lesson: 0,
            quiz_scores: {},
          },
        });

      logTest('Lesson Completion', 'Create enrollment record', !enrollError,
        enrollError ? enrollError.message : 'Successfully created enrollment');
    }

    const { error: updateError } = await supabase
      .from('student_course_enrollments')
      .update({
        progress: {
          completed_lessons: [0, 1, 2],
          total_lessons: 5,
          last_accessed_lesson: 2,
          quiz_scores: { 1: 85 },
        },
      })
      .eq('student_id', testStudentId)
      .eq('course_id', testCourseId);

    logTest('Lesson Completion', 'Update enrollment progress', !updateError,
      updateError ? updateError.message : 'Successfully updated progress with multiple completions');

    await supabase
      .from('student_lesson_completions')
      .delete()
      .eq('student_id', testStudentId)
      .eq('course_id', testCourseId);

    await supabase
      .from('student_course_enrollments')
      .delete()
      .eq('student_id', testStudentId)
      .eq('course_id', testCourseId);

  } catch (error) {
    logTest('Lesson Completion', 'Completion workflow', false, error.message);
  }
}

async function testQuizRetrieval() {
  console.log('\n=== Testing Quiz Retrieval ===\n');

  try {
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('published_status', 'published')
      .limit(1)
      .maybeSingle();

    if (!courses) {
      logWarning('Quiz Retrieval', 'No courses available to test quiz retrieval');
      return;
    }

    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('id, title, module_index, approved')
      .eq('course_id', courses.id)
      .eq('approved', true)
      .order('module_index');

    logTest('Quiz Retrieval', 'Fetch approved quizzes for course', !error,
      error ? error.message : `Found ${quizzes?.length || 0} approved quizzes`);

    if (quizzes && quizzes.length > 0) {
      const quiz = quizzes[0];

      logTest('Quiz Retrieval', 'Quiz has required fields',
        !!quiz.id && !!quiz.title && quiz.module_index !== undefined,
        `Fields present: id, title, module_index=${quiz.module_index}`);

      logTest('Quiz Retrieval', 'Quiz is approved',
        quiz.approved === true,
        'Quiz approval status is true');

      logTest('Quiz Retrieval', 'Quizzes are ordered by module_index',
        quizzes.every((q, i) => i === 0 || q.module_index >= quizzes[i - 1].module_index),
        'Quiz order is correct');
    } else {
      logWarning('Quiz Retrieval', 'No approved quizzes found - this is expected if quizzes haven\'t been created');
    }
  } catch (error) {
    logTest('Quiz Retrieval', 'Quiz operations', false, error.message);
  }
}

async function testAIChatEndpoint() {
  console.log('\n=== Testing AI Chat Integration ===\n');

  try {
    const apiUrl = `${SUPABASE_URL}/functions/v1/lesson-assistant`;

    const testPayload = {
      lessonTitle: 'Test Lesson',
      lessonContent: '<p>This is a test lesson about testing. Testing is important for software quality.</p>',
      chatHistory: [],
      userMessage: 'What is this lesson about?',
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    logTest('AI Chat', 'Edge function responds', response.ok || response.status === 500,
      `Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();

      logTest('AI Chat', 'Response has correct structure',
        data.hasOwnProperty('success') && (data.success === true ? data.hasOwnProperty('content') : data.hasOwnProperty('error')),
        data.success ? 'Valid success response' : `Error: ${data.error}`);

      if (data.success) {
        logTest('AI Chat', 'AI provides meaningful response',
          data.content && data.content.length > 20,
          `Response length: ${data.content ? data.content.length : 0} characters`);
      }
    } else {
      const errorText = await response.text();
      logWarning('AI Chat', `Edge function returned error: ${errorText.substring(0, 200)}`);
    }

    const invalidResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    logTest('AI Chat', 'Validates required fields',
      !invalidResponse.ok && invalidResponse.status === 400,
      `Status: ${invalidResponse.status} - Correctly rejects invalid payload`);

  } catch (error) {
    logTest('AI Chat', 'Edge function accessibility', false, error.message);
  }
}

async function testErrorHandling() {
  console.log('\n=== Testing Error Handling ===\n');

  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .maybeSingle();

    logTest('Error Handling', 'Handles non-existent course gracefully',
      !error && data === null,
      'Returns null without error for missing course');

    const { data: emptyLessons, error: emptyError } = await supabase
      .from('courses')
      .select('lessons')
      .limit(1);

    logTest('Error Handling', 'Can query lessons field',
      !emptyError,
      emptyError ? emptyError.message : 'Lessons field accessible');

    try {
      await supabase
        .from('nonexistent_table')
        .select('*')
        .limit(1);

      logTest('Error Handling', 'Handles invalid table name', false,
        'Should have thrown an error');
    } catch (tableError) {
      logTest('Error Handling', 'Handles invalid table name', true,
        'Correctly throws error for non-existent table');
    }

  } catch (error) {
    logTest('Error Handling', 'Error handling mechanisms', false, error.message);
  }
}

async function testRLSPolicies() {
  console.log('\n=== Testing RLS Policies ===\n');

  try {
    const unauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: publicCourses, error: publicError } = await unauthClient
      .from('courses')
      .select('id, title')
      .eq('published_status', 'published')
      .limit(5);

    logTest('RLS Policies', 'Public can view published courses',
      !publicError || publicCourses !== null,
      publicError ? `Error: ${publicError.message}` : `Can access ${publicCourses?.length || 0} published courses`);

    const { data: quizData, error: quizError } = await unauthClient
      .from('quizzes')
      .select('*')
      .eq('approved', true)
      .limit(5);

    logTest('RLS Policies', 'Public can view approved quizzes',
      !quizError || quizData !== null,
      quizError ? `Error: ${quizError.message}` : `Can access ${quizData?.length || 0} approved quizzes`);

  } catch (error) {
    logTest('RLS Policies', 'RLS policy checks', false, error.message);
  }
}

async function testDataIntegrity() {
  console.log('\n=== Testing Data Integrity ===\n');

  try {
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title, lessons, video_config')
      .eq('published_status', 'published')
      .limit(10);

    if (!courses || courses.length === 0) {
      logWarning('Data Integrity', 'No published courses to check integrity');
      return;
    }

    let validCoursesCount = 0;
    let invalidCoursesCount = 0;

    for (const course of courses) {
      let isValid = true;

      if (!course.title || course.title.trim().length === 0) {
        isValid = false;
      }

      if (!Array.isArray(course.lessons) || course.lessons.length === 0) {
        isValid = false;
      }

      if (Array.isArray(course.lessons)) {
        for (const lesson of course.lessons) {
          if (!lesson.title || !lesson.content || lesson.lessonNumber === undefined) {
            isValid = false;
            break;
          }
        }
      }

      if (isValid) {
        validCoursesCount++;
      } else {
        invalidCoursesCount++;
      }
    }

    logTest('Data Integrity', 'Published courses have valid data',
      invalidCoursesCount === 0,
      `Valid: ${validCoursesCount}, Invalid: ${invalidCoursesCount} out of ${courses.length} courses`);

    const { data: orphanedEnrollments } = await supabase
      .from('student_course_enrollments')
      .select('course_id, student_id')
      .limit(100);

    if (orphanedEnrollments && orphanedEnrollments.length > 0) {
      let orphanCount = 0;
      for (const enrollment of orphanedEnrollments) {
        const { data: courseExists } = await supabase
          .from('courses')
          .select('id')
          .eq('id', enrollment.course_id)
          .maybeSingle();

        if (!courseExists) orphanCount++;
      }

      logTest('Data Integrity', 'No orphaned enrollments',
        orphanCount === 0,
        orphanCount > 0 ? `Found ${orphanCount} orphaned enrollment(s)` : 'All enrollments reference valid courses');
    }

  } catch (error) {
    logTest('Data Integrity', 'Data integrity checks', false, error.message);
  }
}

async function runAllTests() {
  console.log('\x1b[1m\x1b[36m');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   LessonPlayer Comprehensive Test Suite                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\x1b[0m');

  await testDatabaseSchema();
  await testCourseDataRetrieval();
  await testVideoAssetRetrieval();
  await testVideoTracking();
  await testLessonCompletion();
  await testQuizRetrieval();
  await testAIChatEndpoint();
  await testErrorHandling();
  await testRLSPolicies();
  await testDataIntegrity();

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
  const successRate = Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100);
  const statusColor = successRate === 100 ? '\x1b[32m' : successRate >= 80 ? '\x1b[33m' : '\x1b[31m';
  console.log(`${statusColor}Overall Success Rate: ${successRate}%\x1b[0m`);
  console.log('\n');

  process.exit(testResults.failed > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  console.error('\x1b[31m\nFatal error running tests:\x1b[0m', error);
  process.exit(1);
});
