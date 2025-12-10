import { useState, useEffect } from 'react';
import { CheckCircle, X, ChevronRight, Brain, BookOpen } from 'lucide-react';
import { studentAuth } from '../lib/studentAuth';
import { supabase } from '../lib/supabase';

interface QuizResultsProps {
  attemptId: string;
  courseId: string;
  lessonIndex: number;
  onNavigate: (page: 'lesson' | 'quiz', lessonIndex?: number) => void;
}

interface QuizAttempt {
  id: string;
  score: number;
  passed: boolean;
  answers: AnswerSummary[];
  quiz_id: string;
}

interface AnswerSummary {
  question_id: string;
  student_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  options: { [key: string]: string };
  correct_answer: string;
  explanation: string;
  order_index: number;
}

interface Quiz {
  id: string;
  title: string;
}

export default function QuizResults({ attemptId, courseId, lessonIndex, onNavigate }: QuizResultsProps) {
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLastLesson, setIsLastLesson] = useState(false);
  const session = studentAuth.getSession();

  const PASSING_THRESHOLD = 60;

  useEffect(() => {
    loadResults();
  }, [attemptId]);

  const loadResults = async () => {
    if (!session) return;

    try {
      const { data: attemptData, error: attemptError } = await supabase
        .from('student_quiz_attempts')
        .select('id, score, passed, answers, quiz_id')
        .eq('id', attemptId)
        .maybeSingle();

      if (attemptError) throw attemptError;
      if (!attemptData) {
        console.error('Attempt not found');
        setLoading(false);
        return;
      }

      setAttempt(attemptData);

      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('id, title')
        .eq('id', attemptData.quiz_id)
        .maybeSingle();

      if (quizError) throw quizError;
      if (quizData) {
        setQuiz(quizData);
      }

      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', attemptData.quiz_id)
        .order('order_index');

      if (questionsError) throw questionsError;
      if (questionsData) {
        setQuestions(questionsData);
      }

      const { data: courseData } = await supabase
        .from('courses')
        .select('lessons')
        .eq('id', courseId)
        .maybeSingle();

      if (courseData?.lessons) {
        setIsLastLesson(lessonIndex === courseData.lessons.length - 1);
      }
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const retakeQuiz = () => {
    if (attempt) {
      onNavigate('quiz', lessonIndex);
    }
  };

  const reviewLesson = () => {
    onNavigate('lesson', lessonIndex);
  };

  const continueToNextLesson = () => {
    onNavigate('lesson', lessonIndex + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!attempt || !quiz || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-4">
            <svg className="h-12 w-12 text-yellow-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Results Not Available</h3>
            <p className="text-gray-600 text-sm">
              Quiz results could not be loaded.
            </p>
          </div>
          <button
            onClick={() => onNavigate('lesson', lessonIndex)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Back to Lesson
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white text-center">
            <h1 className="text-3xl font-bold mb-2">{quiz.title}</h1>
            <p className="text-blue-100">Quiz Results</p>
          </div>

          <div className="p-8">
            <div className="text-center mb-8">
              <div className={`text-6xl font-bold mb-3 ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}>
                {attempt.score}%
              </div>
              <p className="text-gray-600 text-lg mb-3">Your Score</p>
              <div className={`inline-block px-6 py-3 rounded-full font-semibold text-lg ${
                attempt.passed
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {attempt.passed ? 'PASSED' : 'FAILED'}
              </div>
              <p className="text-gray-500 text-sm mt-3 max-w-md mx-auto">
                {attempt.passed
                  ? `Great job! You scored above the ${PASSING_THRESHOLD}% passing threshold.`
                  : `You need at least ${PASSING_THRESHOLD}% to pass. Review the lesson and try again.`
                }
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Question Review</h2>
              <div className="space-y-6">
                {questions.map((q, idx) => {
                  const answerSummary = attempt.answers.find(a => a.question_id === q.id);
                  const studentAnswer = answerSummary?.student_answer;
                  const isCorrect = answerSummary?.is_correct || false;

                  return (
                    <div
                      key={q.id}
                      className="p-6 rounded-lg border-2 border-gray-200 bg-white shadow-sm"
                    >
                      <div className="flex items-start gap-3 mb-4">
                        {isCorrect ? (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                            <X className="h-5 w-5 text-red-600" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-lg mb-2">
                            Question {idx + 1}
                          </p>
                          <p className="text-gray-700 mb-4">
                            {q.question_text}
                          </p>

                          <div className="space-y-2">
                            {Object.entries(q.options).map(([key, value]) => {
                              const isStudentAnswer = studentAnswer === key;
                              const isCorrectAnswer = q.correct_answer === key;

                              let optionStyle = 'bg-gray-50 border-gray-200';
                              let iconElement = null;

                              if (isStudentAnswer && isCorrectAnswer) {
                                optionStyle = 'bg-green-50 border-green-500 border-2';
                                iconElement = <CheckCircle className="h-5 w-5 text-green-600" />;
                              } else if (isStudentAnswer && !isCorrectAnswer) {
                                optionStyle = 'bg-red-50 border-red-500 border-2';
                                iconElement = <X className="h-5 w-5 text-red-600" />;
                              } else if (!isStudentAnswer && isCorrectAnswer) {
                                optionStyle = 'bg-green-50 border-green-400 border-2';
                                iconElement = <CheckCircle className="h-5 w-5 text-green-600" />;
                              }

                              return (
                                <div
                                  key={key}
                                  className={`p-3 rounded-lg border ${optionStyle} transition-colors`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-6 flex items-center justify-center">
                                      {iconElement}
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">{key}</div>
                                      <div className="text-gray-700">{value}</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {q.explanation && (
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-sm font-semibold text-blue-900 mb-1">
                                Explanation:
                              </p>
                              <p className="text-sm text-blue-800">
                                {q.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t pt-6">
              {attempt.passed ? (
                <div className="space-y-3">
                  <button
                    onClick={continueToNextLesson}
                    disabled={isLastLesson}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{isLastLesson ? 'Course Complete!' : 'Continue to Next Lesson'}</span>
                    {!isLastLesson && <ChevronRight className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={reviewLesson}
                    className="w-full px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Back to Lesson
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={retakeQuiz}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
                  >
                    <Brain className="h-5 w-5" />
                    <span>Retake Quiz</span>
                  </button>
                  <button
                    onClick={reviewLesson}
                    className="w-full px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center justify-center gap-2"
                  >
                    <BookOpen className="h-5 w-5" />
                    <span>Review Lesson</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
