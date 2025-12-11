import { useState, useEffect } from 'react';
import { X, ChevronLeft, CheckCircle } from 'lucide-react';
import { studentAuth } from '../lib/studentAuth';
import { supabase } from '../lib/supabase';

interface QuizTakerProps {
  courseId: string;
  quizId: string;
  lessonIndex: number;
  onNavigate: (page: 'lesson' | 'results', attemptId?: string) => void;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  options: string[] | { [key: string]: string };
  correct_answer: string;
  explanation: string;
  order_index: number;
}

interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

export default function QuizTaker({ courseId, quizId, lessonIndex, onNavigate }: QuizTakerProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  const PASSING_THRESHOLD = 60;

  useEffect(() => {
    loadSession();
  }, [quizId]);

  const loadSession = async () => {
    const currentSession = await studentAuth.getSession();
    setSession(currentSession);
    if (currentSession) {
      loadQuiz(currentSession);
    } else {
      setLoading(false);
    }
  };

  const loadQuiz = async (currentSession: any) => {

    try {
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('id, title')
        .eq('id', quizId)
        .maybeSingle();

      if (quizError) throw quizError;
      if (!quizData) {
        console.error('Quiz not found');
        setQuiz(null);
        setLoading(false);
        return;
      }

      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index');

      if (questionsError) throw questionsError;

      // Convert array options to object format with A, B, C, D keys
      const normalizedQuestions = (questions || []).map(q => {
        if (Array.isArray(q.options)) {
          const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
          const optionsObj: { [key: string]: string } = {};
          q.options.forEach((option: string, index: number) => {
            optionsObj[labels[index]] = option;
          });
          return { ...q, options: optionsObj };
        }
        return q;
      });

      setQuiz({
        ...quizData,
        questions: normalizedQuestions
      });
    } catch (error) {
      console.error('Error loading quiz:', error);
      setQuiz(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const submitQuiz = async () => {
    if (!session || !quiz) return;

    let correct = 0;
    quiz.questions.forEach(q => {
      if (selectedAnswers[q.id] && selectedAnswers[q.id] === q.correct_answer) {
        correct++;
      }
    });

    const score = Math.round((correct / quiz.questions.length) * 100);
    const passed = score >= PASSING_THRESHOLD;

    try {
      const { data: existingAttempts } = await supabase
        .from('student_quiz_attempts')
        .select('attempt_number')
        .eq('student_id', session.user_id)
        .eq('quiz_id', quiz.id)
        .order('attempt_number', { ascending: false })
        .limit(1);

      const attemptNumber = existingAttempts && existingAttempts.length > 0
        ? existingAttempts[0].attempt_number + 1
        : 1;

      const { data: attemptData, error: attemptError } = await supabase
        .from('student_quiz_attempts')
        .insert({
          student_id: session.user_id,
          quiz_id: quiz.id,
          course_id: courseId,
          attempt_number: attemptNumber,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          score: score,
          passed: passed,
          answers: quiz.questions.map(q => ({
            question_id: q.id,
            student_answer: selectedAnswers[q.id] || null,
            correct_answer: q.correct_answer,
            is_correct: selectedAnswers[q.id] ? selectedAnswers[q.id] === q.correct_answer : false
          }))
        })
        .select('id')
        .single();

      if (attemptError) {
        console.error('Error saving quiz attempt:', attemptError);
        return;
      }

      const answersToInsert = quiz.questions.map(q => ({
        attempt_id: attemptData.id,
        question_id: q.id,
        student_answer: selectedAnswers[q.id] || null,
        is_correct: selectedAnswers[q.id] ? selectedAnswers[q.id] === q.correct_answer : false,
        answered_at: new Date().toISOString()
      }));

      const { error: answersError } = await supabase
        .from('student_quiz_answers')
        .insert(answersToInsert);

      if (answersError) {
        console.error('Error saving quiz answers:', answersError);
      }

      if (passed) {
        const { data: enrollment } = await supabase
          .from('student_course_enrollments')
          .select('progress')
          .eq('user_id', session.user_id)
          .eq('course_id', courseId)
          .maybeSingle();

        const currentProgress = enrollment?.progress || {};
        const completedLessons = currentProgress.completed_lessons || [];
        const quizScores = currentProgress.quiz_scores || {};

        quizScores[lessonIndex] = score;

        await supabase
          .from('student_course_enrollments')
          .update({
            progress: {
              completed_lessons: completedLessons,
              total_lessons: currentProgress.total_lessons || 0,
              last_accessed_lesson: lessonIndex,
              quiz_scores: quizScores,
            }
          })
          .eq('user_id', session.user_id)
          .eq('course_id', courseId);
      }

      onNavigate('results', attemptData.id);
    } catch (error) {
      console.error('Error submitting quiz:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz || quiz.questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-4">
            <svg className="h-12 w-12 text-yellow-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quiz Not Available</h3>
            <p className="text-gray-600 text-sm">
              This quiz could not be loaded.
            </p>
          </div>
          <button
            onClick={() => onNavigate('lesson')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Back to Lesson
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const answeredCount = Object.keys(selectedAnswers).length;
  const progressPercent = Math.round((answeredCount / quiz.questions.length) * 100);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full">
        <div className="bg-white border-b p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{quiz.title}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </p>
            </div>
            <button
              onClick={() => onNavigate('lesson')}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
            />
          </div>

          <p className="text-xs text-gray-500 mt-2">
            {answeredCount} of {quiz.questions.length} questions answered ({progressPercent}%)
          </p>
        </div>

        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {currentQuestion.question_text}
          </h3>

          <div className="space-y-3">
            {Object.entries(currentQuestion.options).map(([key, value]) => (
              <button
                key={key}
                onClick={() => handleAnswer(currentQuestion.id, key)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  selectedAnswers[currentQuestion.id] === key
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    selectedAnswers[currentQuestion.id] === key
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300'
                  }`}>
                    {selectedAnswers[currentQuestion.id] === key && (
                      <CheckCircle className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{key}</div>
                    <div className="text-gray-700">{value}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2 px-6 py-3 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Previous</span>
            </button>

            {currentQuestionIndex < quiz.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next Question
              </button>
            ) : (
              <button
                onClick={submitQuiz}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Submit Quiz
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
