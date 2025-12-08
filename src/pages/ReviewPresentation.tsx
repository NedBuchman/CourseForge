import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, Home } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Lesson {
  lesson_number: number;
  title: string;
  content: string;
  duration: string;
  objectives: string[];
}

interface QuizQuestion {
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface CourseContent {
  course_title: string;
  total_lessons: number;
  estimated_duration: string;
  lessons: Lesson[];
}

interface PresentationConfig {
  theme: 'modern' | 'vibrant' | 'academic' | 'tech';
  logo_url: string | null;
  primary_color: string;
}

interface ReviewPresentationProps {
  courseId: string;
  courseContent: CourseContent;
  onBack: () => void;
  onComplete: () => void;
  onBackToCourses?: () => void;
}

type TabType = 'overview' | `lesson${number}` | `quiz${number}` | 'certificate';

const themeStyles = {
  modern: {
    bg: 'bg-gradient-to-br from-blue-50 to-slate-100',
    card: 'bg-white border-2 border-blue-200',
    button: 'bg-gradient-to-r from-blue-600 to-blue-700',
    accent: '#3B82F6'
  },
  vibrant: {
    bg: 'bg-gradient-to-br from-pink-100 via-purple-100 to-orange-100',
    card: 'bg-white border-2 border-pink-300',
    button: 'bg-gradient-to-r from-pink-500 to-purple-600',
    accent: '#EC4899'
  },
  academic: {
    bg: 'bg-gradient-to-br from-slate-100 to-amber-50',
    card: 'bg-white border-2 border-slate-300',
    button: 'bg-gradient-to-r from-slate-700 to-slate-800',
    accent: '#1F2937'
  },
  tech: {
    bg: 'bg-gradient-to-br from-cyan-50 to-teal-50',
    card: 'bg-white border-2 border-cyan-200',
    button: 'bg-gradient-to-r from-cyan-600 to-teal-600',
    accent: '#0EA5E9'
  }
};

export default function ReviewPresentation({
  courseId,
  courseContent,
  onBack,
  onComplete,
  onBackToCourses
}: ReviewPresentationProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [presentationConfig, setPresentationConfig] = useState<PresentationConfig | null>(null);
  const [quizzes, setQuizzes] = useState<Record<number, QuizQuestion[]>>({});
  const [loading, setLoading] = useState(true);

  const quizCount = Object.keys(quizzes).length;
  const totalPages = 1 + courseContent.total_lessons + quizCount + 1;
  const theme = presentationConfig?.theme || 'modern';
  const styles = themeStyles[theme];

  useEffect(() => {
    loadPresentationData();
  }, [courseId]);

  const loadPresentationData = async () => {
    try {
      const { data: configData } = await supabase
        .from('presentation_configs')
        .select('*')
        .eq('course_id', courseId)
        .maybeSingle();

      if (configData) {
        setPresentationConfig(configData);
      }

      const { data: quizzesData } = await supabase
        .from('quizzes')
        .select('*, quiz_questions(*)')
        .eq('course_id', courseId)
        .order('module_index');

      if (quizzesData) {
        const quizMap: Record<number, QuizQuestion[]> = {};
        quizzesData.forEach((quiz: any) => {
          quizMap[quiz.module_index] = quiz.quiz_questions || [];
        });
        setQuizzes(quizMap);
      }
    } catch (err) {
      console.error('Error loading presentation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderTabButtons = () => {
    const tabs: { id: TabType; icon: string; label: string }[] = [
      { id: 'overview', icon: '🏠', label: 'Course Overview' }
    ];

    courseContent.lessons.forEach(lesson => {
      tabs.push({
        id: `lesson${lesson.lesson_number}` as TabType,
        icon: '📖',
        label: `Lesson ${lesson.lesson_number}`
      });
      if (quizzes[lesson.lesson_number] && quizzes[lesson.lesson_number].length > 0) {
        tabs.push({
          id: `quiz${lesson.lesson_number}` as TabType,
          icon: '✏️',
          label: `Quiz ${lesson.lesson_number}`
        });
      }
    });

    tabs.push({
      id: 'certificate',
      icon: '🎓',
      label: 'Completion Certificate'
    });

    return tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={`px-4 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
          activeTab === tab.id
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
      >
        <span className="text-lg">{tab.icon}</span>
        <span>{tab.label}</span>
      </button>
    ));
  };

  const renderOverviewTab = () => (
    <div className="max-w-4xl mx-auto">
      <div className={`${styles.card} rounded-2xl p-8 mb-6 shadow-lg`}>
        {presentationConfig?.logo_url && (
          <div className="flex justify-center mb-6">
            <img
              src={presentationConfig.logo_url}
              alt="Course Logo"
              className="h-20 object-contain"
            />
          </div>
        )}
        <div className={`${styles.button} text-white rounded-xl p-8 text-center mb-6`}>
          <h1 className="text-3xl font-black mb-3">{courseContent.course_title}</h1>
          <p className="text-lg opacity-95">
            Master the fundamentals in {courseContent.estimated_duration}. Start your learning journey today!
          </p>
        </div>

        <div className="bg-slate-50 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-700">YOUR PROGRESS: 0% COMPLETE</span>
          </div>
          <div className="bg-slate-200 h-3 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full rounded-full" style={{ width: '0%' }} />
          </div>
        </div>

        <div className="space-y-3">
          {courseContent.lessons.map((lesson, idx) => (
            <div
              key={lesson.lesson_number}
              className="border-2 border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-blue-400 transition-colors cursor-pointer"
            >
              <div
                className={`w-12 h-12 ${styles.button} text-white rounded-full flex items-center justify-center font-bold flex-shrink-0`}
              >
                {lesson.lesson_number}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">{lesson.title}</h3>
                <p className="text-sm text-slate-600">
                  📖 {lesson.duration} • ✏️ 5 question quiz
                </p>
              </div>
              <div
                className={`px-4 py-2 rounded-full text-sm font-bold ${
                  idx === 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {idx === 0 ? 'START →' : '🔒 LOCKED'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLessonTab = (lessonNumber: number) => {
    const lesson = courseContent.lessons.find(l => l.lesson_number === lessonNumber);
    if (!lesson) return null;

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl p-6 mb-6 border-l-4 border-blue-600">
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            Lesson {lesson.lesson_number}: {lesson.title}
          </h1>
          <p className="text-slate-600">📖 Estimated time: {lesson.duration}</p>
        </div>

        {lesson.objectives.length > 0 && (
          <div className="mb-6 p-6 bg-blue-50 rounded-lg border-l-4 border-blue-600">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Learning Objectives:</h3>
            <ul className="space-y-2">
              {lesson.objectives.map((objective, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{objective}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white rounded-xl p-8 shadow-lg mb-6">
          <div className="prose max-w-none">
            <div
              className="text-slate-700 leading-relaxed lesson-content"
              dangerouslySetInnerHTML={{ __html: lesson.content }}
              style={{
                fontSize: '16px',
                lineHeight: '1.8'
              }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-6 border-t-2 border-slate-200">
          <button
            onClick={() => setActiveTab('overview')}
            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors"
          >
            ← Back to Overview
          </button>
          <button
            onClick={() => setActiveTab(`quiz${lessonNumber}` as TabType)}
            className={`px-6 py-3 ${styles.button} text-white rounded-lg font-bold hover:shadow-lg transition-all`}
          >
            Take Quiz {lessonNumber} →
          </button>
        </div>
      </div>
    );
  };

  const renderQuizTab = (lessonNumber: number) => {
    const lesson = courseContent.lessons.find(l => l.lesson_number === lessonNumber);
    const questions = quizzes[lessonNumber] || [];
    const firstQuestion = questions[0];

    if (!lesson || !firstQuestion) return null;

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-amber-100 to-yellow-100 rounded-xl p-6 text-center mb-6">
          <h1 className="text-3xl font-black text-amber-900 mb-2">
            Quiz {lessonNumber}: {lesson.title}
          </h1>
          <p className="text-amber-800 text-lg">
            {questions.length} questions • Pass with 80% ({Math.ceil(questions.length * 0.8)}/{questions.length} correct)
          </p>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-lg mb-6">
          <div className="mb-6">
            <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-bold mb-4">
              Question 1 of {questions.length}
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              {firstQuestion.question_text}
            </h2>
          </div>

          <div className="space-y-3 mb-8">
            {firstQuestion.options.map((option, idx) => {
              const letter = String.fromCharCode(65 + idx);
              return (
                <div
                  key={idx}
                  className="border-2 border-slate-200 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-700">
                      {letter}
                    </div>
                    <span className="text-slate-900">{option.replace(/^Option [A-D]: /, '')}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            className={`w-full py-4 ${styles.button} text-white rounded-lg font-bold text-lg hover:shadow-lg transition-all`}
          >
            Submit Answer
          </button>

          <p className="text-center text-slate-500 text-sm mt-6">
            Note: This is a preview. In the actual course, students can select answers and submit for grading.
          </p>
        </div>

        <div className="flex justify-between items-center pt-6 border-t-2 border-slate-200">
          <button
            onClick={() => setActiveTab(`lesson${lessonNumber}` as TabType)}
            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors"
          >
            ← Back to Lesson
          </button>
          {lessonNumber < courseContent.total_lessons && (
            <button
              onClick={() => setActiveTab(`lesson${lessonNumber + 1}` as TabType)}
              className={`px-6 py-3 ${styles.button} text-white rounded-lg font-bold hover:shadow-lg transition-all`}
            >
              Next Lesson →
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderCertificateTab = () => {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border-8 border-double border-amber-600 rounded-2xl p-12 shadow-2xl text-center">
          <div className="mb-8">
            <div className="text-7xl mb-4">🎓</div>
            <h1 className="text-5xl font-black text-slate-900 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              Certificate of Completion
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-amber-400 to-amber-600 mx-auto mb-8"></div>
          </div>

          <div className="mb-8">
            <p className="text-xl text-slate-700 mb-6">This certifies that</p>
            <div className="py-4 px-8 bg-gradient-to-r from-blue-50 to-slate-50 rounded-lg mb-6 inline-block">
              <p className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>
                [Student Name]
              </p>
            </div>
            <p className="text-xl text-slate-700 mb-6">has successfully completed</p>
            <h2 className="text-3xl font-black text-blue-600 mb-8">
              {courseContent.course_title}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8 max-w-2xl mx-auto">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Course Duration</p>
              <p className="text-xl font-bold text-slate-900">{courseContent.estimated_duration}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Total Lessons</p>
              <p className="text-xl font-bold text-slate-900">{courseContent.total_lessons}</p>
            </div>
          </div>

          <div className="border-t-2 border-slate-200 pt-8 mt-8">
            <div className="grid grid-cols-2 gap-8 max-w-2xl mx-auto">
              <div>
                <div className="border-t-2 border-slate-900 w-48 mx-auto mb-2"></div>
                <p className="text-sm text-slate-600">Date of Completion</p>
                <p className="text-slate-900 font-semibold">{currentDate}</p>
              </div>
              <div>
                <div className="border-t-2 border-slate-900 w-48 mx-auto mb-2"></div>
                <p className="text-sm text-slate-600">Instructor Signature</p>
                <p className="text-slate-900 font-semibold">[Instructor Name]</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t-2 border-slate-200">
            <p className="text-xs text-slate-500">
              Certificate ID: {courseId.substring(0, 8).toUpperCase()}-{Math.random().toString(36).substring(2, 8).toUpperCase()}
            </p>
          </div>
        </div>

        <div className="mt-6 p-6 bg-blue-50 rounded-xl text-center">
          <p className="text-slate-700">
            <strong>Note:</strong> This certificate will be automatically generated and downloadable when students complete all course requirements.
          </p>
        </div>

        <div className="flex justify-between items-center pt-6 border-t-2 border-slate-200 mt-8">
          <button
            onClick={() => setActiveTab('overview')}
            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors"
          >
            ← Back to Overview
          </button>
          <button
            onClick={onComplete}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-bold hover:shadow-lg transition-all"
          >
            Approve & Continue →
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-semibold">Loading presentation...</p>
        </div>
      </div>
    );
  }

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
              <span>Back to Design</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto py-12">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl p-8 text-center mb-8 shadow-lg">
            <div className="text-5xl mb-3">✅</div>
            <h1 className="text-3xl font-black mb-2">Course Presentation Generated!</h1>
            <p className="text-lg opacity-95">
              Your complete student-facing course with {totalPages} pages is ready to review
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 text-center shadow-md">
              <div className="text-4xl font-black text-blue-600 mb-2">{totalPages}</div>
              <div className="text-sm text-slate-600 font-semibold">Total Pages</div>
            </div>
            <div className="bg-white rounded-xl p-6 text-center shadow-md">
              <div className="text-4xl font-black text-blue-600 mb-2">{courseContent.total_lessons}</div>
              <div className="text-sm text-slate-600 font-semibold">Lesson Pages</div>
            </div>
            <div className="bg-white rounded-xl p-6 text-center shadow-md">
              <div className="text-4xl font-black text-blue-600 mb-2">{courseContent.total_lessons}</div>
              <div className="text-sm text-slate-600 font-semibold">Quiz Pages</div>
            </div>
            <div className="bg-white rounded-xl p-6 text-center shadow-md">
              <div className="text-4xl font-black text-blue-600 mb-2">1</div>
              <div className="text-sm text-slate-600 font-semibold">Overview Page</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-100 to-blue-200 border-l-4 border-blue-600 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="font-bold text-blue-900 mb-2">Interactive Preview</h3>
                <p className="text-blue-800 leading-relaxed">
                  Use the tabs below to preview each page of your course. This is exactly what students will see. Click through the overview, lessons, and quizzes to experience the complete learning journey.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
            <div className="flex gap-3 overflow-x-auto pb-4 border-b-2 border-slate-200">
              {renderTabButtons()}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-xl mb-8 min-h-[600px]">
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab.startsWith('lesson') && renderLessonTab(parseInt(activeTab.replace('lesson', '')))}
            {activeTab.startsWith('quiz') && renderQuizTab(parseInt(activeTab.replace('quiz', '')))}
            {activeTab === 'certificate' && renderCertificateTab()}
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-900 text-center mb-8">
              What would you like to do?
            </h2>

            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              <div className="bg-white border-3 border-slate-200 rounded-2xl p-8 text-center hover:border-amber-500 hover:shadow-2xl transition-all cursor-pointer">
                <div className="text-6xl mb-4">✏️</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Refine & Regenerate</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Go back to adjust presentation settings like theme or logo, then regenerate all pages.
                </p>
                <button
                  onClick={onBack}
                  className="w-full px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Refine Settings
                </button>
              </div>

              <div className="bg-white border-3 border-slate-200 rounded-2xl p-8 text-center hover:border-green-500 hover:shadow-2xl transition-all cursor-pointer">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Accept & Continue</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Presentation looks great! Proceed to create your course landing page for marketing and enrollment.
                </p>
                <button
                  onClick={onComplete}
                  className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  Accept & Create Landing Page
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
