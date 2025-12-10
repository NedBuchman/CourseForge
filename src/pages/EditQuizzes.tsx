import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Save, RefreshCw, Trash2, Edit2, CheckCircle, XCircle, AlertCircle, Plus, Home, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Lesson {
  lesson_number: number;
  title: string;
  content: string;
  duration: string;
  objectives: string[];
}

interface CourseContent {
  course_title: string;
  total_lessons: number;
  estimated_duration: string;
  lessons: Lesson[];
}

interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  order_index: number;
  is_ai_generated: boolean;
  version: number;
}

interface Quiz {
  id: string;
  module_index: number;
  title: string;
  approved: boolean;
}

interface EditQuizzesProps {
  courseId: string;
  courseContent: CourseContent;
  onBack: () => void;
  onComplete: () => void;
  onBackToCourses?: () => void;
  onLogout?: () => void;
}

export default function EditQuizzes({
  courseId,
  courseContent,
  onBack,
  onComplete,
  onBackToCourses,
  onLogout
}: EditQuizzesProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [selectedLesson, setSelectedLesson] = useState<number>(1);
  const [quizzes, setQuizzes] = useState<Record<number, Quiz>>({});
  const [questions, setQuestions] = useState<Record<number, QuizQuestion[]>>({});
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<QuizQuestion>>({});
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadQuizzes();
  }, [courseId]);

  const loadQuizzes = async () => {
    try {
      setIsLoading(true);

      const { data: quizzesData, error: quizzesError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('course_id', courseId)
        .order('module_index');

      if (quizzesError) throw quizzesError;

      const quizzesMap: Record<number, Quiz> = {};
      for (const quiz of quizzesData || []) {
        quizzesMap[quiz.module_index] = quiz;
      }
      setQuizzes(quizzesMap);

      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .in('quiz_id', Object.values(quizzesMap).map(q => q.id))
        .order('order_index');

      if (questionsError) throw questionsError;

      const questionsMap: Record<number, QuizQuestion[]> = {};
      for (const question of questionsData || []) {
        const quiz = Object.values(quizzesMap).find(q => q.id === question.quiz_id);
        if (quiz) {
          if (!questionsMap[quiz.module_index]) {
            questionsMap[quiz.module_index] = [];
          }
          questionsMap[quiz.module_index].push(question);
        }
      }
      setQuestions(questionsMap);

    } catch (err) {
      console.error('Error loading quizzes:', err);
      alert('Failed to load quizzes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (question: QuizQuestion) => {
    setEditingQuestion(question.id);
    setEditForm({
      question_text: question.question_text,
      options: [...question.options],
      correct_answer: question.correct_answer,
      explanation: question.explanation
    });
  };

  const cancelEdit = () => {
    setEditingQuestion(null);
    setEditForm({});
  };

  const saveEdit = async (questionId: string, lessonNumber: number) => {
    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('quiz_questions')
        .update({
          question_text: editForm.question_text,
          options: editForm.options,
          correct_answer: editForm.correct_answer,
          explanation: editForm.explanation,
          is_ai_generated: false
        })
        .eq('id', questionId);

      if (error) throw error;

      setQuestions(prev => ({
        ...prev,
        [lessonNumber]: prev[lessonNumber].map(q =>
          q.id === questionId
            ? { ...q, ...editForm, is_ai_generated: false }
            : q
        )
      }));

      setEditingQuestion(null);
      setEditForm({});
    } catch (err) {
      console.error('Error saving question:', err);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const regenerateQuestion = async (questionId: string, lessonNumber: number) => {
    try {
      setIsRegenerating(questionId);

      const lesson = courseContent.lessons.find(l => l.lesson_number === lessonNumber);
      if (!lesson) throw new Error('Lesson not found');

      // Get user session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication error: Please log out and log back in.');
      }

      const existingQuestions = questions[lessonNumber] || [];

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/regenerate-quiz-question`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            questionId,
            lessonContent: lesson.content,
            lessonTitle: lesson.title,
            objectives: lesson.objectives,
            existingQuestions: existingQuestions.map(q => ({
              question_text: q.question_text,
              correct_answer: q.correct_answer
            }))
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to regenerate question');
      }

      const data = await response.json();

      setQuestions(prev => ({
        ...prev,
        [lessonNumber]: prev[lessonNumber].map(q =>
          q.id === questionId ? data.question : q
        )
      }));

    } catch (err) {
      console.error('Error regenerating question:', err);
      alert(`Failed to regenerate question: ${(err as Error).message}`);
    } finally {
      setIsRegenerating(null);
    }
  };

  const deleteQuestion = async (questionId: string, lessonNumber: number) => {
    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      setQuestions(prev => ({
        ...prev,
        [lessonNumber]: prev[lessonNumber].filter(q => q.id !== questionId)
      }));

    } catch (err) {
      console.error('Error deleting question:', err);
      alert('Failed to delete question. Please try again.');
    }
  };

  const approveQuiz = async (lessonNumber: number) => {
    const quiz = quizzes[lessonNumber];
    if (!quiz) return;

    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ approved: true })
        .eq('id', quiz.id);

      if (error) throw error;

      setQuizzes(prev => ({
        ...prev,
        [lessonNumber]: { ...prev[lessonNumber], approved: true }
      }));

    } catch (err) {
      console.error('Error approving quiz:', err);
      alert('Failed to approve quiz. Please try again.');
    }
  };

  const unapproveQuiz = async (lessonNumber: number) => {
    const quiz = quizzes[lessonNumber];
    if (!quiz) return;

    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ approved: false })
        .eq('id', quiz.id);

      if (error) throw error;

      setQuizzes(prev => ({
        ...prev,
        [lessonNumber]: { ...prev[lessonNumber], approved: false }
      }));

    } catch (err) {
      console.error('Error unapproving quiz:', err);
      alert('Failed to unapprove quiz. Please try again.');
    }
  };

  const handleComplete = async () => {
    const unapprovedQuizzes = Object.values(quizzes).filter(q => !q.approved);

    if (unapprovedQuizzes.length > 0) {
      if (!confirm(`${unapprovedQuizzes.length} quiz(es) are not yet approved. Continue anyway?`)) {
        return;
      }
    }

    onComplete();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  const selectedLessonData = courseContent.lessons.find(l => l.lesson_number === selectedLesson);
  const lessonQuestions = questions[selectedLesson] || [];
  const lessonQuiz = quizzes[selectedLesson];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col">
      <header className="bg-gradient-to-r from-blue-800 to-blue-900 text-white py-4 shadow-lg">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/CourseForgeLogo.png" alt="CourseForge" className="h-8 w-auto" />
            <span className="text-2xl font-black">COURSEFORGE</span>
          </div>
          <div className="flex items-center gap-4">
            {onBackToCourses && (
              <button
                onClick={onBackToCourses}
                className="text-blue-100 hover:text-white transition-colors flex items-center gap-2"
              >
                <Home className="w-5 h-5" />
                <span>Back to Courses</span>
              </button>
            )}
            <button
              onClick={onBack}
              className="text-white hover:text-blue-200 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="text-blue-100 hover:text-white transition-colors flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className="w-80 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Review & Edit Quizzes</h2>
            <p className="text-sm text-slate-600">{courseContent.total_lessons} lessons</p>
          </div>

          <div className="p-4 space-y-2">
            {courseContent.lessons.map((lesson) => {
              const quiz = quizzes[lesson.lesson_number];
              const questionCount = questions[lesson.lesson_number]?.length || 0;
              const isApproved = quiz?.approved || false;

              return (
                <button
                  key={lesson.lesson_number}
                  onClick={() => setSelectedLesson(lesson.lesson_number)}
                  className={`w-full text-left p-4 rounded-lg transition-all ${
                    selectedLesson === lesson.lesson_number
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {lesson.lesson_number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm mb-1 line-clamp-2">{lesson.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600">{questionCount} questions</span>
                        {isApproved ? (
                          <div className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            <span>Approved</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
                            <AlertCircle className="w-3 h-3" />
                            <span>Pending</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          {selectedLessonData && (
            <>
              <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                        {selectedLessonData.lesson_number}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">{selectedLessonData.title}</h2>
                        <p className="text-slate-600">{lessonQuestions.length} questions in pool</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    {lessonQuiz?.approved ? (
                      <button
                        onClick={() => unapproveQuiz(selectedLesson)}
                        className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition-colors flex items-center gap-2"
                      >
                        <XCircle className="w-5 h-5" />
                        Unapprove
                      </button>
                    ) : (
                      <button
                        onClick={() => approveQuiz(selectedLesson)}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Approve Quiz
                      </button>
                    )}
                  </div>
                </div>

                {lessonQuiz?.approved && (
                  <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold">This quiz has been approved and is ready for students</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {lessonQuestions.map((question, idx) => {
                  const isEditing = editingQuestion === question.id;
                  const isRegeneratingThis = isRegenerating === question.id;

                  return (
                    <div key={question.id} className="bg-white rounded-xl p-6 shadow-lg border-2 border-slate-200">
                      {!isEditing ? (
                        <>
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                                {idx + 1}
                              </div>
                              <p className="font-semibold text-slate-900 text-lg flex-1 pt-1">{question.question_text}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {question.is_ai_generated && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded">
                                  AI
                                </span>
                              )}
                              <button
                                onClick={() => startEdit(question)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit question"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => regenerateQuestion(question.id, selectedLesson)}
                                disabled={isRegeneratingThis}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Regenerate with AI"
                              >
                                {isRegeneratingThis ? (
                                  <div className="w-5 h-5 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
                                ) : (
                                  <RefreshCw className="w-5 h-5" />
                                )}
                              </button>
                              <button
                                onClick={() => deleteQuestion(question.id, selectedLesson)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete question"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          <div className="ml-13 space-y-3 mb-4">
                            {question.options.map((option, optIdx) => {
                              const letter = String.fromCharCode(65 + optIdx);
                              const isCorrect = letter === question.correct_answer;
                              return (
                                <div
                                  key={optIdx}
                                  className={`p-4 rounded-lg border-2 ${
                                    isCorrect
                                      ? 'bg-green-50 border-green-400'
                                      : 'bg-white border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    {isCorrect && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
                                    <span className={isCorrect ? 'text-green-900 font-semibold' : 'text-slate-700'}>
                                      <strong>{letter}.</strong> {option}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="ml-13 pt-4 border-t-2 border-slate-300">
                            <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-600">
                              <p className="text-sm text-blue-900">
                                <strong>Explanation:</strong> {question.explanation}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                              Question Text
                            </label>
                            <textarea
                              value={editForm.question_text || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, question_text: e.target.value }))}
                              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                              rows={3}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                              Answer Options
                            </label>
                            {['A', 'B', 'C', 'D'].map((letter, idx) => (
                              <div key={letter} className="mb-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <input
                                    type="radio"
                                    name="correct_answer"
                                    checked={editForm.correct_answer === letter}
                                    onChange={() => setEditForm(prev => ({ ...prev, correct_answer: letter }))}
                                    className="w-4 h-4"
                                  />
                                  <label className="text-sm font-bold text-slate-700">
                                    Option {letter} (Correct Answer)
                                  </label>
                                </div>
                                <input
                                  type="text"
                                  value={editForm.options?.[idx] || ''}
                                  onChange={(e) => {
                                    const newOptions = [...(editForm.options || [])];
                                    newOptions[idx] = e.target.value;
                                    setEditForm(prev => ({ ...prev, options: newOptions }));
                                  }}
                                  className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                                />
                              </div>
                            ))}
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                              Explanation
                            </label>
                            <textarea
                              value={editForm.explanation || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, explanation: e.target.value }))}
                              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                              rows={3}
                            />
                          </div>

                          <div className="flex gap-3 pt-4">
                            <button
                              onClick={() => saveEdit(question.id, selectedLesson)}
                              disabled={isSaving}
                              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              <Save className="w-5 h-5" />
                              Save Changes
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-8 bg-white rounded-xl p-6 shadow-lg">
            <div className="flex gap-4">
              <button
                onClick={onBack}
                className="px-6 py-3 border-2 border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-bold hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                Continue to Presentation
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
