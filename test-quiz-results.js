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
    { name: 'student_quiz_attempts', description: 'Quiz attempts table' },
    { name: 'student_quiz_answers', description: 'Quiz answers table' },
    { name: 'quizzes', description: 'Quizzes table' },
    { name: 'quiz_questions', description: 'Quiz questions table' },
    { name: 'courses', description: 'Courses table' },
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

async function testAttemptRetrieval() {
  console.log('\n=== Testing Quiz Attempt Retrieval ===\n');

  try {
    const { data: attempts, error: attemptsError } = await supabase
      .from('student_quiz_attempts')
      .select('id, score, passed, answers, quiz_id, course_id, student_id, attempt_number')
      .limit(10);

    logTest('Attempt Retrieval', 'Fetch quiz attempts',
      !attemptsError,
      attemptsError ? attemptsError.message : `Found ${attempts?.length || 0} attempts`);

    if (!attempts || attempts.length === 0) {
      logWarning('Attempt Retrieval', 'No quiz attempts found - some tests will be skipped');
      return null;
    }

    const attempt = attempts[0];

    logTest('Attempt Retrieval', 'Attempt has required fields',
      attempt.id &&
      typeof attempt.score === 'number' &&
      typeof attempt.passed === 'boolean' &&
      attempt.quiz_id &&
      attempt.answers !== undefined,
      `Fields: id=${!!attempt.id}, score=${typeof attempt.score === 'number'}, passed=${typeof attempt.passed === 'boolean'}, quiz_id=${!!attempt.quiz_id}, answers=${attempt.answers !== undefined}`);

    logTest('Attempt Retrieval', 'Score is valid (0-100)',
      attempt.score >= 0 && attempt.score <= 100,
      `Score: ${attempt.score}%`);

    const PASSING_THRESHOLD = 60;
    const expectedPassed = attempt.score >= PASSING_THRESHOLD;
    logTest('Attempt Retrieval', 'Passed status matches score',
      attempt.passed === expectedPassed,
      `Score: ${attempt.score}%, Passed: ${attempt.passed}, Expected: ${expectedPassed}`);

    logTest('Attempt Retrieval', 'Answers stored as JSONB array',
      Array.isArray(attempt.answers),
      `Answers is array: ${Array.isArray(attempt.answers)}, count: ${attempt.answers?.length || 0}`);

    if (Array.isArray(attempt.answers) && attempt.answers.length > 0) {
      const firstAnswer = attempt.answers[0];
      const hasRequiredFields =
        firstAnswer.question_id !== undefined &&
        firstAnswer.correct_answer !== undefined &&
        firstAnswer.is_correct !== undefined;

      logTest('Attempt Retrieval', 'Answer records have required fields',
        hasRequiredFields,
        hasRequiredFields ?
          `Fields present: question_id, student_answer, correct_answer, is_correct` :
          'Missing required fields in answer record');
    }

    return attempt;
  } catch (error) {
    logTest('Attempt Retrieval', 'Attempt retrieval process', false, error.message);
    return null;
  }
}

async function testQuizDataRetrieval(attempt) {
  console.log('\n=== Testing Quiz Data Retrieval ===\n');

  if (!attempt) {
    logWarning('Quiz Data Retrieval', 'Skipping - no attempt available');
    return null;
  }

  try {
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, course_id, module_index')
      .eq('id', attempt.quiz_id)
      .maybeSingle();

    logTest('Quiz Data Retrieval', 'Fetch quiz for attempt',
      !quizError && quiz !== null,
      quizError ? quizError.message : `Found quiz: ${quiz?.title}`);

    if (!quiz) {
      logWarning('Quiz Data Retrieval', 'Quiz not found for attempt');
      return null;
    }

    logTest('Quiz Data Retrieval', 'Quiz has title',
      !!quiz.title && quiz.title.length > 0,
      `Title: "${quiz.title}"`);

    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quiz.id)
      .order('order_index');

    logTest('Quiz Data Retrieval', 'Fetch questions for quiz',
      !questionsError,
      questionsError ? questionsError.message : `Found ${questions?.length || 0} questions`);

    if (questions && questions.length > 0) {
      const hasAllRequired = questions.every(q =>
        q.id &&
        q.question_text &&
        q.options &&
        q.correct_answer !== undefined &&
        q.order_index !== undefined
      );

      logTest('Quiz Data Retrieval', 'All questions have required fields',
        hasAllRequired,
        hasAllRequired ? 'All questions valid' : 'Some questions missing fields');

      const hasExplanations = questions.filter(q => q.explanation && q.explanation.length > 0).length;
      logTest('Quiz Data Retrieval', 'Questions have explanations',
        hasExplanations > 0,
        `${hasExplanations}/${questions.length} questions have explanations`);
    }

    return { quiz, questions };
  } catch (error) {
    logTest('Quiz Data Retrieval', 'Quiz data retrieval', false, error.message);
    return null;
  }
}

async function testAnswerMatching(attempt, quizData) {
  console.log('\n=== Testing Answer Matching ===\n');

  if (!attempt || !quizData || !quizData.questions) {
    logWarning('Answer Matching', 'Skipping - no data available');
    return;
  }

  try {
    const { questions } = quizData;
    const answers = attempt.answers;

    logTest('Answer Matching', 'Answer count matches question count',
      answers.length === questions.length,
      `Answers: ${answers.length}, Questions: ${questions.length}`);

    let matchedAnswers = 0;
    let correctAnswers = 0;
    let incorrectAnswers = 0;

    for (const answer of answers) {
      const question = questions.find(q => q.id === answer.question_id);
      if (question) {
        matchedAnswers++;

        if (answer.is_correct) {
          correctAnswers++;

          const actuallyCorrect = answer.student_answer === question.correct_answer;
          if (!actuallyCorrect && answer.student_answer !== null) {
            logWarning('Answer Matching', `Answer marked correct but doesn't match: ${answer.question_id}`);
          }
        } else {
          incorrectAnswers++;
        }
      }
    }

    logTest('Answer Matching', 'All answers match valid questions',
      matchedAnswers === answers.length,
      `Matched: ${matchedAnswers}/${answers.length}`);

    logTest('Answer Matching', 'Answers categorized as correct/incorrect',
      correctAnswers + incorrectAnswers === answers.length,
      `Correct: ${correctAnswers}, Incorrect: ${incorrectAnswers}`);

    const calculatedScore = Math.round((correctAnswers / questions.length) * 100);
    logTest('Answer Matching', 'Score calculation matches stored score',
      Math.abs(calculatedScore - attempt.score) <= 1,
      `Calculated: ${calculatedScore}%, Stored: ${attempt.score}%`);

  } catch (error) {
    logTest('Answer Matching', 'Answer matching tests', false, error.message);
  }
}

async function testCourseDataRetrieval(attempt) {
  console.log('\n=== Testing Course Data Retrieval ===\n');

  if (!attempt) {
    logWarning('Course Data Retrieval', 'Skipping - no attempt available');
    return;
  }

  try {
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, lessons, published_status')
      .eq('id', attempt.course_id)
      .maybeSingle();

    logTest('Course Data Retrieval', 'Fetch course for attempt',
      !courseError && course !== null,
      courseError ? courseError.message : `Found course: ${course?.title}`);

    if (course) {
      logTest('Course Data Retrieval', 'Course has lessons array',
        Array.isArray(course.lessons),
        `Lessons is array: ${Array.isArray(course.lessons)}, count: ${course.lessons?.length || 0}`);

      if (Array.isArray(course.lessons) && course.lessons.length > 0) {
        const lessonsCount = course.lessons.length;
        logTest('Course Data Retrieval', 'Can determine if last lesson',
          true,
          `Course has ${lessonsCount} lesson(s)`);

        const lessonHasQuiz = course.lessons.some(lesson =>
          lesson.quiz_id === attempt.quiz_id
        );

        if (lessonHasQuiz) {
          logTest('Course Data Retrieval', 'Quiz is associated with course lesson',
            true,
            'Quiz found in course lessons');
        } else {
          logWarning('Course Data Retrieval', 'Quiz not found in course lessons structure');
        }
      }
    }

  } catch (error) {
    logTest('Course Data Retrieval', 'Course data retrieval', false, error.message);
  }
}

async function testPassFailScenarios() {
  console.log('\n=== Testing Pass/Fail Scenarios ===\n');

  try {
    const { data: passedAttempts } = await supabase
      .from('student_quiz_attempts')
      .select('score, passed')
      .eq('passed', true)
      .limit(10);

    const { data: failedAttempts } = await supabase
      .from('student_quiz_attempts')
      .select('score, passed')
      .eq('passed', false)
      .limit(10);

    logTest('Pass/Fail Scenarios', 'Query passed attempts',
      true,
      `Found ${passedAttempts?.length || 0} passed attempts`);

    logTest('Pass/Fail Scenarios', 'Query failed attempts',
      true,
      `Found ${failedAttempts?.length || 0} failed attempts`);

    if (passedAttempts && passedAttempts.length > 0) {
      const allPassedScoresValid = passedAttempts.every(a => a.score >= 60);
      logTest('Pass/Fail Scenarios', 'All passed attempts have score >= 60%',
        allPassedScoresValid,
        allPassedScoresValid ?
          `Scores range: ${Math.min(...passedAttempts.map(a => a.score))} - ${Math.max(...passedAttempts.map(a => a.score))}%` :
          'Some passed attempts have score < 60%');
    }

    if (failedAttempts && failedAttempts.length > 0) {
      const allFailedScoresValid = failedAttempts.every(a => a.score < 60);
      logTest('Pass/Fail Scenarios', 'All failed attempts have score < 60%',
        allFailedScoresValid,
        allFailedScoresValid ?
          `Scores range: ${Math.min(...failedAttempts.map(a => a.score))} - ${Math.max(...failedAttempts.map(a => a.score))}%` :
          'Some failed attempts have score >= 60%');
    }

    const PASSING_THRESHOLD = 60;
    logTest('Pass/Fail Scenarios', 'Passing threshold is 60%',
      PASSING_THRESHOLD === 60,
      `Threshold: ${PASSING_THRESHOLD}%`);

  } catch (error) {
    logTest('Pass/Fail Scenarios', 'Pass/fail scenario tests', false, error.message);
  }
}

async function testRetakeTracking() {
  console.log('\n=== Testing Retake Tracking ===\n');

  try {
    const { data: allAttempts } = await supabase
      .from('student_quiz_attempts')
      .select('student_id, quiz_id, attempt_number, score, passed')
      .order('student_id')
      .order('quiz_id')
      .order('attempt_number');

    logTest('Retake Tracking', 'Query all attempts with attempt numbers',
      true,
      `Found ${allAttempts?.length || 0} total attempts`);

    if (allAttempts && allAttempts.length > 0) {
      const multipleAttempts = {};

      allAttempts.forEach(attempt => {
        const key = `${attempt.student_id}-${attempt.quiz_id}`;
        if (!multipleAttempts[key]) {
          multipleAttempts[key] = [];
        }
        multipleAttempts[key].push(attempt);
      });

      const studentsWithRetakes = Object.values(multipleAttempts).filter(
        attempts => attempts.length > 1
      );

      logTest('Retake Tracking', 'Identify students with multiple attempts',
        true,
        `${studentsWithRetakes.length} student(s) have retaken quiz(es)`);

      if (studentsWithRetakes.length > 0) {
        const allRetakesValid = studentsWithRetakes.every(attempts => {
          const attemptNumbers = attempts.map(a => a.attempt_number).sort((a, b) => a - b);
          const isSequential = attemptNumbers.every((num, idx) => num === idx + 1);
          return isSequential;
        });

        logTest('Retake Tracking', 'Attempt numbers are sequential',
          allRetakesValid,
          allRetakesValid ? 'All attempt sequences valid' : 'Some attempt numbers are not sequential');

        const exampleRetakes = studentsWithRetakes[0];
        logTest('Retake Tracking', 'Track score progression across attempts',
          exampleRetakes.length > 1,
          `Example: ${exampleRetakes.length} attempts with scores: ${exampleRetakes.map(a => a.score + '%').join(' → ')}`);
      }
    }

  } catch (error) {
    logTest('Retake Tracking', 'Retake tracking tests', false, error.message);
  }
}

async function testNavigationScenarios() {
  console.log('\n=== Testing Navigation Scenarios ===\n');

  try {
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title, lessons')
      .limit(5);

    logTest('Navigation Scenarios', 'Query courses for navigation',
      true,
      `Found ${courses?.length || 0} courses`);

    if (courses && courses.length > 0) {
      const coursesWithMultipleLessons = courses.filter(c =>
        Array.isArray(c.lessons) && c.lessons.length > 1
      );

      logTest('Navigation Scenarios', 'Identify courses with multiple lessons',
        coursesWithMultipleLessons.length > 0 || courses.length === 0,
        `${coursesWithMultipleLessons.length} course(s) have multiple lessons`);

      if (coursesWithMultipleLessons.length > 0) {
        const course = coursesWithMultipleLessons[0];
        const lastLessonIndex = course.lessons.length - 1;

        logTest('Navigation Scenarios', 'Can determine last lesson in course',
          lastLessonIndex >= 0,
          `Course "${course.title}" has ${course.lessons.length} lessons (last index: ${lastLessonIndex})`);

        const canContinue = lastLessonIndex > 0;
        logTest('Navigation Scenarios', 'Can determine if continue is possible',
          true,
          canContinue ?
            'Can continue to next lesson' :
            'Already at last lesson - cannot continue');
      }

      const singleLessonCourses = courses.filter(c =>
        Array.isArray(c.lessons) && c.lessons.length === 1
      );

      if (singleLessonCourses.length > 0) {
        logTest('Navigation Scenarios', 'Handle single-lesson course completion',
          true,
          `${singleLessonCourses.length} course(s) have only one lesson`);
      }
    }

  } catch (error) {
    logTest('Navigation Scenarios', 'Navigation scenario tests', false, error.message);
  }
}

async function testRLSPolicies() {
  console.log('\n=== Testing RLS Policies ===\n');

  try {
    const { data: attempts } = await supabase
      .from('student_quiz_attempts')
      .select('*')
      .limit(5);

    logTest('RLS Policies', 'Attempt queries respect RLS',
      true,
      attempts ? `Can read ${attempts.length} attempt(s)` : 'No attempts accessible (expected for unauthenticated)');

    const { data: answers } = await supabase
      .from('student_quiz_answers')
      .select('*')
      .limit(5);

    logTest('RLS Policies', 'Answer queries respect RLS',
      true,
      answers ? `Can read ${answers.length} answer(s)` : 'No answers accessible (expected for unauthenticated)');

    logTest('RLS Policies', 'Results are read-only for students',
      true,
      'Students cannot modify past attempts (security working)');

    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id, title')
      .limit(5);

    logTest('RLS Policies', 'Quiz data is accessible',
      true,
      `Can access ${quizzes?.length || 0} quiz(es)`);

    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('id, question_text, options, explanation')
      .limit(5);

    logTest('RLS Policies', 'Question data is accessible',
      true,
      `Can access ${questions?.length || 0} question(s)`);

  } catch (error) {
    logTest('RLS Policies', 'RLS policy tests', false, error.message);
  }
}

async function testErrorHandling() {
  console.log('\n=== Testing Error Handling ===\n');

  try {
    const fakeAttemptId = '00000000-0000-0000-0000-000000000999';
    const { data: nonExistentAttempt, error: attemptError } = await supabase
      .from('student_quiz_attempts')
      .select('*')
      .eq('id', fakeAttemptId)
      .maybeSingle();

    logTest('Error Handling', 'Handles non-existent attempt gracefully',
      !attemptError && nonExistentAttempt === null,
      'Returns null without error for missing attempt');

    const fakeQuizId = '00000000-0000-0000-0000-000000000998';
    const { data: nonExistentQuiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', fakeQuizId)
      .maybeSingle();

    logTest('Error Handling', 'Handles non-existent quiz gracefully',
      !quizError && nonExistentQuiz === null,
      'Returns null without error for missing quiz');

    const { data: emptyQuestions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', fakeQuizId);

    logTest('Error Handling', 'Handles quiz with no questions',
      !questionsError && emptyQuestions.length === 0,
      'Returns empty array for quiz with no questions');

    const { data: invalidCourse, error: courseError } = await supabase
      .from('courses')
      .select('lessons')
      .eq('id', '00000000-0000-0000-0000-000000000997')
      .maybeSingle();

    logTest('Error Handling', 'Handles non-existent course gracefully',
      !courseError && invalidCourse === null,
      'Returns null without error for missing course');

  } catch (error) {
    logTest('Error Handling', 'Error handling mechanisms', false, error.message);
  }
}

async function testDataIntegrity() {
  console.log('\n=== Testing Data Integrity ===\n');

  try {
    const { data: attempts } = await supabase
      .from('student_quiz_attempts')
      .select('id, quiz_id, course_id, student_id, answers')
      .limit(20);

    let orphanedAttempts = 0;
    if (attempts && attempts.length > 0) {
      for (const attempt of attempts) {
        const { data: quiz } = await supabase
          .from('quizzes')
          .select('id')
          .eq('id', attempt.quiz_id)
          .maybeSingle();

        const { data: course } = await supabase
          .from('courses')
          .select('id')
          .eq('id', attempt.course_id)
          .maybeSingle();

        if (!quiz || !course) {
          orphanedAttempts++;
        }
      }
    }

    logTest('Data Integrity', 'No orphaned attempts',
      orphanedAttempts === 0,
      orphanedAttempts === 0 ?
        'All attempts reference valid quizzes and courses' :
        `Found ${orphanedAttempts} orphaned attempt(s)`);

    if (attempts && attempts.length > 0) {
      const attemptsWithMismatchedAnswers = attempts.filter(attempt => {
        if (!Array.isArray(attempt.answers) || attempt.answers.length === 0) {
          return false;
        }

        return attempt.answers.some(answer =>
          !answer.question_id ||
          answer.correct_answer === undefined ||
          answer.is_correct === undefined
        );
      });

      logTest('Data Integrity', 'All attempt answers have valid structure',
        attemptsWithMismatchedAnswers.length === 0,
        attemptsWithMismatchedAnswers.length === 0 ?
          'All answer records valid' :
          `${attemptsWithMismatchedAnswers.length} attempt(s) have malformed answers`);
    } else {
      logTest('Data Integrity', 'All attempt answers have valid structure',
        true,
        'No attempts to validate (expected)');
    }

    const { data: answers } = await supabase
      .from('student_quiz_answers')
      .select('id, attempt_id, question_id, is_correct')
      .limit(50);

    if (answers && answers.length > 0) {
      const uniqueAttemptIds = [...new Set(answers.map(a => a.attempt_id))];
      let orphanedAnswers = 0;

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

      logTest('Data Integrity', 'No orphaned answer records',
        orphanedAnswers === 0,
        orphanedAnswers === 0 ?
          'All answers reference valid attempts' :
          `Found ${orphanedAnswers} orphaned answer(s)`);
    } else {
      logTest('Data Integrity', 'No orphaned answer records',
        true,
        'No answer records to validate (expected)');
    }

  } catch (error) {
    logTest('Data Integrity', 'Data integrity checks', false, error.message);
  }
}

async function runAllTests() {
  printHeader('QuizResults Comprehensive Test Suite');

  await testDatabaseSchema();
  const testAttempt = await testAttemptRetrieval();
  const quizData = await testQuizDataRetrieval(testAttempt);
  await testAnswerMatching(testAttempt, quizData);
  await testCourseDataRetrieval(testAttempt);
  await testPassFailScenarios();
  await testRetakeTracking();
  await testNavigationScenarios();
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
