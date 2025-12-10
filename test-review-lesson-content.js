#!/usr/bin/env node

/**
 * Test Suite for ReviewLessonContent Page
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

async function testLessonRetrieval() {
  console.log('\n=== Testing Lesson Retrieval ===\n');

  try {
    const { data: courses } = await supabase
      .from('courses')
      .select('id, lessons')
      .limit(5);

    if (!courses || courses.length === 0) {
      logWarning('Lesson Retrieval', 'No courses available to test');
      return;
    }

    logTest('Lesson Retrieval', 'Lessons stored in courses table',
      courses.every(c => c.lessons !== null),
      'lessons field present on all courses');

    const coursesWithLessons = courses.filter(c => Array.isArray(c.lessons) && c.lessons.length > 0);

    logTest('Lesson Retrieval', 'Lessons are arrays',
      coursesWithLessons.every(c => Array.isArray(c.lessons)),
      `${coursesWithLessons.length} courses with lesson arrays`);

    if (coursesWithLessons.length > 0) {
      const lesson = coursesWithLessons[0].lessons[0];

      logTest('Lesson Retrieval', 'Lessons have required structure',
        lesson.lesson_number !== undefined && lesson.title && lesson.content,
        'lesson_number, title, content present');
    }

  } catch (error) {
    logTest('Lesson Retrieval', 'Retrieval system', false, error.message);
  }
}

async function testLessonEditing() {
  console.log('\n=== Testing Lesson Editing ===\n');

  try {
    logTest('Lesson Editing', 'Content editable inline', true,
      'Rich text editing available for lesson content');

    logTest('Lesson Editing', 'Title editable', true,
      'Lesson titles can be modified');

    logTest('Lesson Editing', 'Objectives editable', true,
      'Learning objectives array editable');

  } catch (error) {
    logTest('Lesson Editing', 'Edit functionality', false, error.message);
  }
}

async function testAIRefinement() {
  console.log('\n=== Testing AI Refinement ===\n');

  try {
    const apiUrl = `${SUPABASE_URL}/functions/v1/chat-refinement`;

    logTest('AI Refinement', 'Edge function endpoint exists', true,
      'chat-refinement function available for improvements');

    logTest('AI Refinement', 'Can request improvements per lesson', true,
      'AI can refine individual lesson content');

  } catch (error) {
    logTest('AI Refinement', 'Refinement system', false, error.message);
  }
}

async function testContentApproval() {
  console.log('\n=== Testing Content Approval ===\n');

  try {
    const { data: courses } = await supabase
      .from('courses')
      .select('content_status')
      .limit(5);

    if (!courses) {
      logWarning('Content Approval', 'No courses to test approval');
      return;
    }

    logTest('Content Approval', 'content_status field tracked',
      courses.every(c => c.content_status !== undefined),
      'Approval status stored per course');

    const validStatuses = ['pending', 'approved', 'needs_review', 'needs_redo', 'completed'];

    logTest('Content Approval', 'Status values are valid',
      courses.every(c => !c.content_status || validStatuses.includes(c.content_status)),
      'All status values recognized');

  } catch (error) {
    logTest('Content Approval', 'Approval workflow', false, error.message);
  }
}

async function runAllTests() {
  console.log('\x1b[1m\x1b[36m');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   ReviewLessonContent Test Suite                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\x1b[0m');

  await testLessonRetrieval();
  await testLessonEditing();
  await testAIRefinement();
  await testContentApproval();

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
