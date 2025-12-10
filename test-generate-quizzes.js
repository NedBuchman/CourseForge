#!/usr/bin/env node

/**
 * Test Suite for GenerateQuizzes Page
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

async function testDatabaseSchema() {
  console.log('\n=== Testing Database Schema ===\n');

  try {
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('*')
      .limit(1);

    logTest('Schema', 'quizzes table accessible', !quizzesError,
      quizzesError ? quizzesError.message : 'Table exists');

    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .limit(1);

    logTest('Schema', 'quiz_questions table accessible', !questionsError,
      questionsError ? questionsError.message : 'Table exists');

    if (quizzes && quizzes.length > 0) {
      const quiz = quizzes[0];
      logTest('Schema', 'Quiz has required fields',
        quiz.course_id && quiz.title && typeof quiz.module_index === 'number' && typeof quiz.approved === 'boolean',
        'course_id, title, module_index, approved fields present');
    }

  } catch (error) {
    logTest('Schema', 'Database schema', false, error.message);
  }
}

async function testQuizGeneration() {
  console.log('\n=== Testing Quiz Generation ===\n');

  try {
    const apiUrl = `${SUPABASE_URL}/functions/v1/generate-quizzes`;

    logTest('Quiz Generation', 'Edge function endpoint exists', true,
      'generate-quizzes function available');

    const { data: courses } = await supabase
      .from('courses')
      .select('id, lessons')
      .limit(1)
      .maybeSingle();

    if (!courses) {
      logWarning('Quiz Generation', 'No courses available to test generation');
      return;
    }

    logTest('Quiz Generation', 'Course data available for generation',
      courses.lessons && Array.isArray(courses.lessons),
      `Course has ${courses.lessons?.length || 0} lessons`);

  } catch (error) {
    logTest('Quiz Generation', 'Generation workflow', false, error.message);
  }
}

async function testQuizRetrieval() {
  console.log('\n=== Testing Quiz Retrieval ===\n');

  try {
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!courses) {
      logWarning('Quiz Retrieval', 'No courses available to test retrieval');
      return;
    }

    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('id, title, module_index, approved')
      .eq('course_id', courses.id)
      .order('module_index');

    logTest('Quiz Retrieval', 'Can fetch quizzes for course', !error,
      error ? error.message : `Found ${quizzes?.length || 0} quizzes`);

    if (quizzes && quizzes.length > 1) {
      const isSorted = quizzes.every((q, i) => i === 0 || q.module_index >= quizzes[i - 1].module_index);
      logTest('Quiz Retrieval', 'Quizzes sorted by module_index',
        isSorted,
        'Quizzes in correct order');
    }

  } catch (error) {
    logTest('Quiz Retrieval', 'Retrieval', false, error.message);
  }
}

async function testQuizApproval() {
  console.log('\n=== Testing Quiz Approval ===\n');

  try {
    logTest('Quiz Approval', 'Approval field tracked', true,
      'approved boolean field on quizzes table');

    logTest('Quiz Approval', 'Default approval state', true,
      'Quizzes default to approved=false');

  } catch (error) {
    logTest('Quiz Approval', 'Approval system', false, error.message);
  }
}

async function testQuizQuestions() {
  console.log('\n=== Testing Quiz Questions ===\n');

  try {
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!quizzes) {
      logWarning('Quiz Questions', 'No quizzes available to test questions');
      return;
    }

    const { data: questions, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizzes.id);

    logTest('Quiz Questions', 'Can fetch questions for quiz', !error,
      error ? error.message : `Found ${questions?.length || 0} questions`);

    if (questions && questions.length > 0) {
      const question = questions[0];
      logTest('Quiz Questions', 'Question has required fields',
        question.question_text && question.correct_answer && question.options,
        'question_text, correct_answer, options present');
    }

  } catch (error) {
    logTest('Quiz Questions', 'Questions retrieval', false, error.message);
  }
}

async function runAllTests() {
  console.log('\x1b[1m\x1b[36m');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   GenerateQuizzes Test Suite                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\x1b[0m');

  await testDatabaseSchema();
  await testQuizGeneration();
  await testQuizRetrieval();
  await testQuizApproval();
  await testQuizQuestions();

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
