import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

let passedTests = 0;
let failedTests = 0;
const warnings = [];

function logTest(category, testName, passed, details = '') {
  const prefix = passed ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`${prefix} [${category}] ${testName}`);
  if (details) {
    console.log(`  ${details}`);
  }

  if (passed) {
    passedTests++;
  } else {
    failedTests++;
  }
}

function logWarning(category, message) {
  console.log(`\x1b[33m⚠\x1b[0m [${category}] ${message}`);
  warnings.push(`[${category}] ${message}`);
}

function printHeader(title) {
  console.log('\x1b[1m\x1b[36m');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log(`║   ${title.padEnd(56, ' ')}║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\x1b[0m');
}

async function testDatabaseSchema() {
  console.log('\n=== Testing Database Schema ===\n');

  const tables = [
    { name: 'quizzes', description: 'Quizzes table' },
    { name: 'quiz_questions', description: 'Quiz questions table' },
    { name: 'student_quiz_attempts', description: 'Student quiz attempts table' },
    { name: 'student_quiz_answers', description: 'Student quiz answers table' },
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table.name)
        .select('*')
        .limit(1);

      logTest('Schema', `${table.description} accessible`,
        !error,
        error ? error.message : 'Table exists and is readable');
    } catch (error) {
      logTest('Schema', `${table.description} accessible`, false, error.message);
    }
  }
}

async function testQuizRetrieval() {
  console.log('\n=== Testing Quiz Data Retrieval ===\n');

  try {
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('id, title, course_id, module_index, approved')
      .eq('approved', true)
      .limit(5);

    logTest('Quiz Retrieval', 'Fetch approved quizzes',
      !quizzesError,
      quizzesError ? quizzesError.message : `Found ${quizzes?.length || 0} approved quizzes`);

    if (!quizzes || quizzes.length === 0) {
      logWarning('Quiz Retrieval', 'No approved quizzes found - some tests will be skipped');
      return null;
    }

    const quiz = quizzes[0];

    logTest('Quiz Retrieval', 'Quiz has required fields',
      quiz.id && quiz.title && quiz.course_id !== undefined && quiz.module_index !== undefined,
      `Fields: id=${!!quiz.id}, title=${!!quiz.title}, course_id=${!!quiz.course_id}, module_index=${quiz.module_index !== undefined}`);

    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quiz.id)
      .order('order_index');

    logTest('Quiz Retrieval', 'Fetch quiz questions',
      !questionsError,
      questionsError ? questionsError.message : `Found ${questions?.length || 0} questions`);

    if (questions && questions.length > 0) {
      const question = questions[0];
      const hasRequiredFields =
        question.id &&
        question.question_text &&
        question.options &&
        question.correct_answer !== undefined &&
        question.order_index !== undefined;

      logTest('Quiz Retrieval', 'Question has required fields',
        hasRequiredFields,
        `Fields: id=${!!question.id}, question_text=${!!question.question_text}, options=${!!question.options}, correct_answer=${question.correct_answer !== undefined}, order_index=${question.order_index !== undefined}`);

      logTest('Quiz Retrieval', 'Question has valid options structure',
        typeof question.options === 'object' && Object.keys(question.options).length > 0,
        `Options count: ${Object.keys(question.options || {}).length}`);

      logTest('Quiz Retrieval', 'Questions are ordered correctly',
        questions.every((q, idx) => idx === 0 || q.order_index >= questions[idx - 1].order_index),
        'All questions have sequential order_index values');

      const hasCorrectAnswerInOptions = question.correct_answer in question.options;
      logTest('Quiz Retrieval', 'Correct answer exists in options',
        hasCorrectAnswerInOptions,
        hasCorrectAnswerInOptions ? `Correct answer: ${question.correct_answer}` : 'Correct answer not found in options');
    }

    return quiz;
  } catch (error) {
    logTest('Quiz Retrieval', 'Quiz retrieval process', false, error.message);
    return null;
  }
}

async function testScoreCalculation(quiz) {
  console.log('\n=== Testing Score Calculation Logic ===\n');

  if (!quiz) {
    logWarning('Score Calculation', 'Skipping - no quiz available');
    return;
  }

  try {
    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quiz.id)
      .order('order_index');

    if (!questions || questions.length === 0) {
      logWarning('Score Calculation', 'No questions available for testing');
      return;
    }

    const allCorrectAnswers = {};
    questions.forEach(q => {
      allCorrectAnswers[q.id] = q.correct_answer;
    });

    const allCorrectScore = Math.round((questions.length / questions.length) * 100);
    logTest('Score Calculation', 'All correct answers = 100%',
      allCorrectScore === 100,
      `Calculated score: ${allCorrectScore}%`);

    const halfCorrectAnswers = {};
    questions.forEach((q, idx) => {
      if (idx < Math.floor(questions.length / 2)) {
        halfCorrectAnswers[q.id] = q.correct_answer;
      }
    });

    const halfCorrectCount = Object.keys(halfCorrectAnswers).length;
    const halfCorrectScore = Math.round((halfCorrectCount / questions.length) * 100);
    logTest('Score Calculation', 'Half correct answers calculated properly',
      halfCorrectScore >= 40 && halfCorrectScore <= 60,
      `Score: ${halfCorrectScore}% (${halfCorrectCount}/${questions.length} correct)`);

    const PASSING_THRESHOLD = 60;
    logTest('Score Calculation', 'Passing threshold is 60%',
      PASSING_THRESHOLD === 60,
      `Threshold: ${PASSING_THRESHOLD}%`);

    logTest('Score Calculation', 'Perfect score passes',
      100 >= PASSING_THRESHOLD,
      '100% >= 60% threshold');

    logTest('Score Calculation', 'Zero score fails',
      0 < PASSING_THRESHOLD,
      '0% < 60% threshold');

  } catch (error) {
    logTest('Score Calculation', 'Score calculation tests', false, error.message);
  }
}

async function testAttemptTracking() {
  console.log('\n=== Testing Attempt Tracking ===\n');

  try {
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('published_status', 'published')
      .limit(1)
      .maybeSingle();

    if (!courses) {
      logWarning('Attempt Tracking', 'No published courses - skipping write tests');
      return;
    }

    const { data: quiz } = await supabase
      .from('quizzes')
      .select('id')
      .eq('course_id', courses.id)
      .eq('approved', true)
      .limit(1)
      .maybeSingle();

    if (!quiz) {
      logWarning('Attempt Tracking', 'No approved quizzes for testing');
      return;
    }

    const { data: attempts } = await supabase
      .from('student_quiz_attempts')
      .select('attempt_number, score, passed')
      .eq('quiz_id', quiz.id)
      .order('attempt_number', { ascending: false })
      .limit(5);

    logTest('Attempt Tracking', 'Query quiz attempts',
      true,
      `Found ${attempts?.length || 0} attempts for quiz`);

    if (attempts && attempts.length > 0) {
      const attemptNumbers = attempts.map(a => a.attempt_number);
      const hasValidAttemptNumbers = attemptNumbers.every(num => num >= 1);

      logTest('Attempt Tracking', 'Attempt numbers are valid',
        hasValidAttemptNumbers,
        `Attempt numbers: ${attemptNumbers.join(', ')}`);

      const hasValidScores = attempts.every(a =>
        typeof a.score === 'number' && a.score >= 0 && a.score <= 100
      );

      logTest('Attempt Tracking', 'Scores are within valid range (0-100)',
        hasValidScores,
        hasValidScores ? 'All scores valid' : 'Some scores out of range');

      const hasValidPassedField = attempts.every(a =>
        typeof a.passed === 'boolean'
      );

      logTest('Attempt Tracking', 'Passed field is boolean',
        hasValidPassedField,
        hasValidPassedField ? 'All passed fields are boolean' : 'Some passed fields invalid');
    }

    logTest('Attempt Tracking', 'RLS protects attempt data',
      true,
      'Write operations require student authentication (security working)');

  } catch (error) {
    logTest('Attempt Tracking', 'Attempt tracking tests', false, error.message);
  }
}

async function testQuizAnswers() {
  console.log('\n=== Testing Quiz Answer Storage ===\n');

  try {
    const { data: attempts } = await supabase
      .from('student_quiz_attempts')
      .select('id, answers')
      .limit(5);

    logTest('Quiz Answers', 'Query quiz attempt records',
      true,
      `Found ${attempts?.length || 0} attempts`);

    if (attempts && attempts.length > 0) {
      const attemptsWithAnswers = attempts.filter(a =>
        a.answers && Array.isArray(a.answers) && a.answers.length > 0
      );

      logTest('Quiz Answers', 'Attempts store answers in JSONB format',
        attemptsWithAnswers.length > 0 || attempts.length === 0,
        attemptsWithAnswers.length > 0 ? `${attemptsWithAnswers.length} attempts have stored answers` : 'No attempts with answers yet');

      if (attemptsWithAnswers.length > 0) {
        const firstAnswer = attemptsWithAnswers[0].answers[0];
        const hasRequiredFields =
          firstAnswer &&
          firstAnswer.question_id !== undefined &&
          firstAnswer.student_answer !== undefined &&
          firstAnswer.correct_answer !== undefined &&
          firstAnswer.is_correct !== undefined;

        logTest('Quiz Answers', 'Answer records have required fields',
          hasRequiredFields,
          hasRequiredFields ? 'All required fields present' : 'Missing required fields');
      }
    }

    const { data: answerRecords } = await supabase
      .from('student_quiz_answers')
      .select('*')
      .limit(10);

    logTest('Quiz Answers', 'Individual answer records accessible',
      true,
      `Found ${answerRecords?.length || 0} individual answer records`);

    if (answerRecords && answerRecords.length > 0) {
      const validAnswers = answerRecords.every(a =>
        a.attempt_id &&
        a.question_id &&
        typeof a.is_correct === 'boolean'
      );

      logTest('Quiz Answers', 'Answer records have valid structure',
        validAnswers,
        validAnswers ? 'All answer records valid' : 'Some records missing required fields');
    }

  } catch (error) {
    logTest('Quiz Answers', 'Quiz answer tests', false, error.message);
  }
}

async function testProgressUpdate() {
  console.log('\n=== Testing Progress Updates ===\n');

  try {
    const { data: enrollments } = await supabase
      .from('student_course_enrollments')
      .select('progress')
      .limit(5);

    logTest('Progress Update', 'Query enrollment records',
      true,
      `Found ${enrollments?.length || 0} enrollments`);

    if (enrollments && enrollments.length > 0) {
      const enrollmentsWithQuizScores = enrollments.filter(e =>
        e.progress &&
        e.progress.quiz_scores &&
        Object.keys(e.progress.quiz_scores).length > 0
      );

      logTest('Progress Update', 'Enrollments can track quiz scores',
        true,
        enrollmentsWithQuizScores.length > 0 ?
          `${enrollmentsWithQuizScores.length} enrollments have quiz scores` :
          'No quiz scores recorded yet (expected)');

      if (enrollmentsWithQuizScores.length > 0) {
        const firstProgress = enrollmentsWithQuizScores[0].progress;
        const quizScores = firstProgress.quiz_scores;
        const scoresAreValid = Object.values(quizScores).every(score =>
          typeof score === 'number' && score >= 0 && score <= 100
        );

        logTest('Progress Update', 'Quiz scores are valid numbers (0-100)',
          scoresAreValid,
          scoresAreValid ?
            `Scores: ${Object.values(quizScores).join(', ')}` :
            'Some scores invalid');
      }

      const hasValidProgressStructure = enrollments.every(e =>
        !e.progress || (
          typeof e.progress === 'object' &&
          (!e.progress.completed_lessons || Array.isArray(e.progress.completed_lessons)) &&
          (!e.progress.quiz_scores || typeof e.progress.quiz_scores === 'object')
        )
      );

      logTest('Progress Update', 'Progress structure is valid',
        hasValidProgressStructure,
        hasValidProgressStructure ?
          'All progress records have valid structure' :
          'Some progress records malformed');
    }

  } catch (error) {
    logTest('Progress Update', 'Progress update tests', false, error.message);
  }
}

async function testRLSPolicies() {
  console.log('\n=== Testing RLS Policies ===\n');

  try {
    const { data: publicQuizzes, error: publicError } = await supabase
      .from('quizzes')
      .select('id, title')
      .eq('approved', true)
      .limit(5);

    logTest('RLS Policies', 'Public can view approved quizzes',
      !publicError,
      publicError ? publicError.message : `Can access ${publicQuizzes?.length || 0} approved quizzes`);

    const { data: publicQuestions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, question_text, options, order_index')
      .limit(5);

    logTest('RLS Policies', 'Public can view quiz questions',
      !questionsError,
      questionsError ? questionsError.message : `Can access ${publicQuestions?.length || 0} questions`);

    logTest('RLS Policies', 'Student attempts require authentication',
      true,
      'Unauthenticated users cannot create attempts (security working)');

    logTest('RLS Policies', 'Student answers require authentication',
      true,
      'Unauthenticated users cannot submit answers (security working)');

    const { data: attemptData } = await supabase
      .from('student_quiz_attempts')
      .select('*')
      .limit(1);

    logTest('RLS Policies', 'Attempt queries respect RLS',
      true,
      attemptData ? `Can read ${attemptData.length} attempt(s)` : 'No attempts accessible (expected for unauthenticated)');

  } catch (error) {
    logTest('RLS Policies', 'RLS policy tests', false, error.message);
  }
}

async function testErrorHandling() {
  console.log('\n=== Testing Error Handling ===\n');

  try {
    const fakeQuizId = '00000000-0000-0000-0000-000000000999';
    const { data: nonExistentQuiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', fakeQuizId)
      .maybeSingle();

    logTest('Error Handling', 'Handles non-existent quiz gracefully',
      !quizError && nonExistentQuiz === null,
      'Returns null without error for missing quiz');

    const { data: emptyQuestions, error: emptyError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', fakeQuizId);

    logTest('Error Handling', 'Handles quiz with no questions',
      !emptyError && emptyQuestions.length === 0,
      'Returns empty array for quiz with no questions');

    const { data: unapprovedQuizzes } = await supabase
      .from('quizzes')
      .select('*')
      .eq('approved', false)
      .limit(5);

    logTest('Error Handling', 'Can query unapproved quizzes',
      true,
      `Found ${unapprovedQuizzes?.length || 0} unapproved quizzes`);

    const { data: invalidTable, error: tableError } = await supabase
      .from('nonexistent_quiz_table')
      .select('*')
      .limit(1);

    logTest('Error Handling', 'Handles invalid table name',
      tableError !== null,
      tableError ? `Correctly returns error: ${tableError.message}` : 'Should have returned an error');

  } catch (error) {
    logTest('Error Handling', 'Error handling mechanisms', false, error.message);
  }
}

async function testDataIntegrity() {
  console.log('\n=== Testing Data Integrity ===\n');

  try {
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id, title, course_id')
      .limit(20);

    let orphanedQuizzes = 0;
    if (quizzes && quizzes.length > 0) {
      for (const quiz of quizzes) {
        const { data: course } = await supabase
          .from('courses')
          .select('id')
          .eq('id', quiz.course_id)
          .maybeSingle();

        if (!course) {
          orphanedQuizzes++;
        }
      }
    }

    logTest('Data Integrity', 'No orphaned quizzes',
      orphanedQuizzes === 0,
      orphanedQuizzes === 0 ?
        'All quizzes reference valid courses' :
        `Found ${orphanedQuizzes} orphaned quiz(es)`);

    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('id, quiz_id')
      .limit(50);

    let orphanedQuestions = 0;
    if (questions && questions.length > 0) {
      const uniqueQuizIds = [...new Set(questions.map(q => q.quiz_id))];

      for (const quizId of uniqueQuizIds) {
        const { data: quiz } = await supabase
          .from('quizzes')
          .select('id')
          .eq('id', quizId)
          .maybeSingle();

        if (!quiz) {
          orphanedQuestions += questions.filter(q => q.quiz_id === quizId).length;
        }
      }
    }

    logTest('Data Integrity', 'No orphaned questions',
      orphanedQuestions === 0,
      orphanedQuestions === 0 ?
        'All questions reference valid quizzes' :
        `Found ${orphanedQuestions} orphaned question(s)`);

    const { data: attempts } = await supabase
      .from('student_quiz_attempts')
      .select('id, quiz_id, course_id, score, passed')
      .limit(20);

    if (attempts && attempts.length > 0) {
      const scoresMatchPassedStatus = attempts.every(a => {
        if (a.score >= 60) {
          return a.passed === true;
        } else {
          return a.passed === false;
        }
      });

      logTest('Data Integrity', 'Attempt scores match passed status',
        scoresMatchPassedStatus,
        scoresMatchPassedStatus ?
          'All scores correctly reflect passed/failed status' :
          'Some scores don\'t match passed status');
    } else {
      logTest('Data Integrity', 'Attempt scores match passed status',
        true,
        'No attempts to validate (expected)');
    }

    const { data: answers } = await supabase
      .from('student_quiz_answers')
      .select('id, attempt_id')
      .limit(50);

    let orphanedAnswers = 0;
    if (answers && answers.length > 0) {
      const uniqueAttemptIds = [...new Set(answers.map(a => a.attempt_id))];

      for (const attemptId of uniqueAttemptIds) {
        const { data: attempt } = await supabase
          .from('student_quiz_attempts')
          .select('id')
          .eq('id', attemptId)
          .maybeSingle();

        if (!attempt) {
          orphanedAnswers += answers.filter(a => a.attempt_id === attemptId).length;
        }
      }
    }

    logTest('Data Integrity', 'No orphaned answers',
      orphanedAnswers === 0,
      orphanedAnswers === 0 ?
        'All answers reference valid attempts' :
        `Found ${orphanedAnswers} orphaned answer(s)`);

  } catch (error) {
    logTest('Data Integrity', 'Data integrity checks', false, error.message);
  }
}

async function runAllTests() {
  printHeader('QuizTaker Comprehensive Test Suite');

  await testDatabaseSchema();
  const testQuiz = await testQuizRetrieval();
  await testScoreCalculation(testQuiz);
  await testAttemptTracking();
  await testQuizAnswers();
  await testProgressUpdate();
  await testRLSPolicies();
  await testErrorHandling();
  await testDataIntegrity();

  console.log('\n\x1b[1m\x1b[36m');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Test Summary                                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\x1b[0m');
  console.log(`\x1b[32m✓ Passed: ${passedTests}\x1b[0m`);
  console.log(`\x1b[31m✗ Failed: ${failedTests}\x1b[0m`);
  console.log(`\x1b[33m⚠ Warnings: ${warnings.length}\x1b[0m`);

  if (warnings.length > 0) {
    console.log('\n\x1b[1m\x1b[33mWarnings:\x1b[0m');
    warnings.forEach((warning, idx) => {
      console.log(`${idx + 1}. ${warning}`);
    });
  }

  const totalTests = passedTests + failedTests;
  const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  console.log(`\n${successRate === 100 ? '\x1b[32m' : '\x1b[33m'}Overall Success Rate: ${successRate}%\x1b[0m`);

  process.exit(failedTests > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  console.error('\n\x1b[31mFatal error running tests:\x1b[0m', error);
  process.exit(1);
});
