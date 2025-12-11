import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function runDiagnostics() {
  console.log('='.repeat(80));
  console.log('COURSE COMPLETION DIAGNOSTIC TEST');
  console.log('='.repeat(80));

  const courseId = 'e208f0b0-175d-40be-aa5e-85ec643834c4'; // Golden Retrievers
  const userId = 'b4ad4794-230f-4fe9-bb3b-02fc45c33669';

  console.log('\n1. COURSE INFORMATION');
  console.log('-'.repeat(80));
  const { data: course } = await supabase
    .from('courses')
    .select('id, title, status, lessons')
    .eq('id', courseId)
    .maybeSingle();

  if (course) {
    console.log(`Course: ${course.title}`);
    console.log(`Status: ${course.status}`);
    console.log(`Total Lessons: ${course.lessons?.length || 0}`);
    console.log(`Last Lesson Index: ${(course.lessons?.length || 1) - 1}`);
  }

  console.log('\n2. QUIZZES ANALYSIS');
  console.log('-'.repeat(80));

  const { data: allQuizzes } = await supabase
    .from('quizzes')
    .select('id, title, module_index, approved')
    .eq('course_id', courseId)
    .order('module_index');

  console.log(`Total Quizzes: ${allQuizzes?.length || 0}`);
  console.log(`Approved Quizzes: ${allQuizzes?.filter(q => q.approved).length || 0}`);
  console.log(`Unapproved Quizzes: ${allQuizzes?.filter(q => !q.approved).length || 0}`);

  console.log('\nQuiz Details:');
  allQuizzes?.forEach(q => {
    console.log(`  Module ${q.module_index}: ${q.title} [${q.approved ? 'APPROVED' : 'UNAPPROVED'}]`);
  });

  console.log('\n3. STUDENT QUIZ ATTEMPTS');
  console.log('-'.repeat(80));

  const approvedQuizzes = allQuizzes?.filter(q => q.approved) || [];

  for (const quiz of approvedQuizzes) {
    const { data: attempts } = await supabase
      .from('student_quiz_attempts')
      .select('id, score, passed, completed_at, user_id')
      .eq('user_id', userId)
      .eq('quiz_id', quiz.id)
      .order('completed_at', { ascending: false })
      .limit(1);

    const attempt = attempts?.[0];
    if (attempt) {
      console.log(`  Module ${quiz.module_index}: ${quiz.title}`);
      console.log(`    Score: ${attempt.score}%`);
      console.log(`    Passed: ${attempt.passed ? 'YES' : 'NO'}`);
      console.log(`    Attempt ID: ${attempt.id}`);
    } else {
      console.log(`  Module ${quiz.module_index}: ${quiz.title}`);
      console.log(`    NO ATTEMPTS YET`);
    }
  }

  console.log('\n4. COMPLETION CHECK SIMULATION');
  console.log('-'.repeat(80));

  let allPassed = true;
  let passedCount = 0;
  let totalApproved = approvedQuizzes.length;

  for (const quiz of approvedQuizzes) {
    const { data: attempts, error: attemptsError } = await supabase
      .from('student_quiz_attempts')
      .select('passed')
      .eq('user_id', userId)
      .eq('quiz_id', quiz.id)
      .order('completed_at', { ascending: false })
      .limit(1);

    if (attemptsError) {
      console.log(`  ERROR checking quiz ${quiz.module_index}: ${attemptsError.message}`);
      allPassed = false;
      continue;
    }

    if (!attempts || attempts.length === 0) {
      console.log(`  Module ${quiz.module_index}: NO ATTEMPT - INCOMPLETE`);
      allPassed = false;
    } else if (!attempts[0].passed) {
      console.log(`  Module ${quiz.module_index}: FAILED - INCOMPLETE`);
      allPassed = false;
    } else {
      console.log(`  Module ${quiz.module_index}: PASSED ✓`);
      passedCount++;
    }
  }

  console.log('\n5. FINAL RESULTS');
  console.log('-'.repeat(80));
  console.log(`Total Approved Quizzes: ${totalApproved}`);
  console.log(`Quizzes Passed: ${passedCount}`);
  console.log(`Completion Status: ${allPassed ? 'COMPLETE ✓' : 'INCOMPLETE'}`);
  console.log(`Button Should Be: ${allPassed ? 'ENABLED' : 'DISABLED'}`);

  console.log('\n6. CHECKING FOR COMMON ISSUES');
  console.log('-'.repeat(80));

  // Check for null user_id in attempts
  const { data: nullUserAttempts } = await supabase
    .from('student_quiz_attempts')
    .select('id, quiz_id, score, passed')
    .eq('course_id', courseId)
    .is('user_id', null);

  if (nullUserAttempts && nullUserAttempts.length > 0) {
    console.log(`⚠️  ISSUE: Found ${nullUserAttempts.length} attempts with NULL user_id`);
    console.log('   These attempts will not be counted towards completion.');
  } else {
    console.log('✓ No attempts with NULL user_id');
  }

  // Check for duplicate student_id vs user_id
  const { data: attemptCheck } = await supabase
    .from('student_quiz_attempts')
    .select('id, student_id, user_id')
    .eq('course_id', courseId)
    .limit(5);

  console.log('\nSample attempts (checking student_id vs user_id):');
  attemptCheck?.forEach(a => {
    console.log(`  Attempt ${a.id.substring(0, 8)}... student_id: ${a.student_id?.substring(0, 8) || 'null'} user_id: ${a.user_id?.substring(0, 8) || 'null'}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('DIAGNOSTIC COMPLETE');
  console.log('='.repeat(80));
}

runDiagnostics().catch(console.error);
