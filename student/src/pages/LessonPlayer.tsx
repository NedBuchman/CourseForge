import { useState, useEffect } from 'react';
import { BookOpen, LogOut, ChevronLeft, ChevronRight, CheckCircle, PlayCircle, Brain, ChevronDown, ChevronUp, FileText, Menu, X } from 'lucide-react';
import { studentAuth } from '../lib/studentAuth';
import { supabase } from '../lib/supabase';
import LessonAIChat from '../components/LessonAIChat';
import VideoPlayer from '../components/VideoPlayer';

interface LessonPlayerProps {
  courseId: string;
  lessonIndex: number;
  onNavigate: (page: 'dashboard' | 'quiz', lessonIndex?: number, quizId?: string) => void;
  onLogout: () => void;
}

interface Course {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

interface Lesson {
  lessonNumber: number;
  title: string;
  content: string;
  video_url?: string;
}

interface Quiz {
  id: string;
  title: string;
  module_index: number;
}

export default function LessonPlayer({ courseId, lessonIndex, onNavigate, onLogout }: LessonPlayerProps) {
  const [course, setCourse] = useState<Course | null>(null);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(lessonIndex);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [completedQuizzes, setCompletedQuizzes] = useState<Set<number>>(new Set());
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoCollapsed, setVideoCollapsed] = useState(false);
  const [textCollapsed, setTextCollapsed] = useState(false);
  const [videoTracking, setVideoTracking] = useState({
    started: false,
    lastPosition: 0,
    watchPercentage: 0,
    completed: false
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const session = studentAuth.getSession();

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  useEffect(() => {
    setCurrentLessonIndex(lessonIndex);
    loadVideoForLesson(lessonIndex);
  }, [lessonIndex]);

  useEffect(() => {
    if (session && courseId && currentLessonIndex >= 0) {
      loadVideoForLesson(currentLessonIndex);
    }
  }, [currentLessonIndex, courseId, session]);

  const loadCourse = async () => {
    if (!session) return;

    try {
      const [courseResponse, enrollmentResponse, quizzesResponse] = await Promise.all([
        supabase
          .from('courses')
          .select('id, title, description, lessons')
          .eq('id', courseId)
          .maybeSingle(),
        supabase
          .from('student_course_enrollments')
          .select('progress')
          .eq('student_id', session.student_id)
          .eq('course_id', courseId)
          .maybeSingle(),
        supabase
          .from('quizzes')
          .select('id, title, module_index')
          .eq('course_id', courseId)
          .eq('approved', true)
          .order('module_index')
      ]);

      if (courseResponse.error) throw courseResponse.error;

      if (!courseResponse.data) {
        console.error('Course not found');
        setCourse(null);
        setLoading(false);
        return;
      }

      const courseData = courseResponse.data;

      if (!courseData.lessons || !Array.isArray(courseData.lessons) || courseData.lessons.length === 0) {
        console.error('Course has no lessons');
        setCourse(null);
        setLoading(false);
        return;
      }

      setCourse({
        ...courseData,
        lessons: courseData.lessons
      });

      if (quizzesResponse.data && quizzesResponse.data.length > 0) {
        setQuizzes(quizzesResponse.data);
      }

      if (enrollmentResponse.data?.progress) {
        const completed = new Set<number>(enrollmentResponse.data.progress.completed_lessons || []);
        setCompletedLessons(completed);

        const completedQuizIndices = new Set<number>(
          enrollmentResponse.data.progress.quiz_scores
            ? Object.keys(enrollmentResponse.data.progress.quiz_scores).map(Number)
            : []
        );
        setCompletedQuizzes(completedQuizIndices);
      }
    } catch (error) {
      console.error('Error loading course:', error);
      setCourse(null);
    } finally {
      setLoading(false);
    }
  };

  const loadVideoForLesson = async (lessonIdx: number) => {
    if (!session || !courseId) return;

    try {
      const { data, error } = await supabase
        .from('video_assets')
        .select('video_url')
        .eq('course_id', courseId)
        .eq('asset_type', 'lesson')
        .eq('asset_reference_id', (lessonIdx + 1).toString())
        .eq('generation_status', 'completed')
        .maybeSingle();

      if (error) {
        console.error('Error loading video:', error);
        setVideoUrl(null);
        return;
      }

      setVideoUrl(data?.video_url || null);

      const { data: trackingData } = await supabase
        .from('lesson_video_views')
        .select('*')
        .eq('student_id', session.student_id)
        .eq('course_id', courseId)
        .eq('lesson_index', lessonIdx)
        .maybeSingle();

      if (trackingData) {
        setVideoTracking({
          started: true,
          lastPosition: trackingData.last_position || 0,
          watchPercentage: trackingData.watch_percentage || 0,
          completed: trackingData.completed || false
        });
      } else {
        setVideoTracking({
          started: false,
          lastPosition: 0,
          watchPercentage: 0,
          completed: false
        });
      }
    } catch (error) {
      console.error('Error loading video:', error);
      setVideoUrl(null);
    }
  };

  const handleVideoStart = async () => {
    if (!session) return;

    setVideoTracking(prev => ({ ...prev, started: true }));

    try {
      await supabase
        .from('lesson_video_views')
        .upsert({
          student_id: session.student_id,
          course_id: courseId,
          lesson_index: currentLessonIndex,
          started_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error tracking video start:', error);
    }
  };

  const handleVideoProgress = async (data: { position: number; percentage: number; duration: number }) => {
    if (!session) return;

    setVideoTracking(prev => ({
      ...prev,
      lastPosition: data.position,
      watchPercentage: data.percentage,
      completed: data.percentage >= 95
    }));

    try {
      await supabase
        .from('lesson_video_views')
        .upsert({
          student_id: session.student_id,
          course_id: courseId,
          lesson_index: currentLessonIndex,
          last_position: Math.floor(data.position),
          watch_percentage: data.percentage,
          video_duration: Math.floor(data.duration),
          completed: data.percentage >= 95,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error tracking video progress:', error);
    }
  };

  const markLessonComplete = async (lessonIdx: number) => {
    if (!session || !course) return;

    const newCompleted = new Set(completedLessons);
    newCompleted.add(lessonIdx);
    setCompletedLessons(newCompleted);

    try {
      await supabase
        .from('student_course_enrollments')
        .update({
          progress: {
            completed_lessons: Array.from(newCompleted),
            total_lessons: course.lessons.length,
            last_accessed_lesson: lessonIdx,
            quiz_scores: {},
          }
        })
        .eq('student_id', session.student_id)
        .eq('course_id', courseId);

      await supabase
        .from('student_lesson_completions')
        .insert({
          student_id: session.student_id,
          course_id: courseId,
          lesson_index: lessonIdx,
        });
    } catch (error) {
      console.error('Error marking lesson complete:', error);
    }
  };

  const navigateToLesson = (index: number) => {
    setCurrentLessonIndex(index);
  };

  const nextLesson = () => {
    if (course && currentLessonIndex < course.lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    }
  };

  const previousLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
    }
  };

  const getQuizForLesson = (lessonIdx: number): Quiz | null => {
    return quizzes.find(q => q.module_index === lessonIdx + 1) || null;
  };

  const startQuiz = () => {
    const quiz = getQuizForLesson(currentLessonIndex);
    if (quiz) {
      onNavigate('quiz', currentLessonIndex, quiz.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-4">
            <svg className="h-12 w-12 text-yellow-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Not Available</h3>
            <p className="text-gray-600 text-sm">
              This course could not be loaded. It may be incomplete or not yet published.
            </p>
          </div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentLesson = course.lessons[currentLessonIndex];
  const progress = Math.round((completedLessons.size / course.lessons.length) * 100);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
              >
                <Menu className="h-6 w-6" />
              </button>
              <button
                onClick={() => onNavigate('dashboard')}
                className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-900 flex-shrink-0"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <div className="h-6 w-px bg-gray-300 hidden sm:block flex-shrink-0" />
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
                <span className="font-semibold text-gray-900 text-sm sm:text-base truncate">{course.title}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="text-xs sm:text-sm">
                <span className="text-gray-600 hidden sm:inline">Progress: </span>
                <span className="font-semibold text-gray-900">{progress}%</span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 sm:gap-2 p-2 sm:px-4 sm:py-2 text-gray-700 hover:text-gray-900"
                title="Log Out"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden md:inline">Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="flex max-w-7xl mx-auto relative">
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-80 bg-white border-r min-h-screen p-6
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-y-auto
        `}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Course Content</h3>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-2">
            {course.lessons.map((lesson, index) => (
              <button
                key={index}
                onClick={() => {
                  navigateToLesson(index);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  index === currentLessonIndex
                    ? 'bg-blue-50 border-2 border-blue-600'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                <div className="flex items-start gap-2">
                  {completedLessons.has(index) ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <PlayCircle className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-1">Lesson {index + 1}</div>
                    <div className="text-sm font-medium text-gray-900 line-clamp-2">
                      {lesson.title}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full lg:w-auto">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 lg:p-8 mb-6">
              <div className="flex items-start sm:items-center justify-between mb-4 gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-gray-500 mb-1">
                    Lesson {currentLessonIndex + 1} of {course.lessons.length}
                  </div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{currentLesson.title}</h2>
                </div>
                {completedLessons.has(currentLessonIndex) && (
                  <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
                )}
              </div>

              {videoUrl && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <PlayCircle className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Lesson Video</h3>
                      {videoTracking.completed && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          Watched
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setVideoCollapsed(!videoCollapsed)}
                      className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm"
                    >
                      {videoCollapsed ? (
                        <>
                          <span>Show Video</span>
                          <ChevronDown className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          <span>Hide Video</span>
                          <ChevronUp className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>

                  {!videoCollapsed && (
                    <div className="rounded-lg overflow-hidden shadow-lg">
                      <VideoPlayer
                        videoUrl={videoUrl}
                        title={currentLesson.title}
                        onStart={handleVideoStart}
                        onProgress={handleVideoProgress}
                        className="w-full aspect-video"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Lesson Content</h3>
                  </div>
                  <button
                    onClick={() => setTextCollapsed(!textCollapsed)}
                    className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm"
                  >
                    {textCollapsed ? (
                      <>
                        <span>Show Content</span>
                        <ChevronDown className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        <span>Hide Content</span>
                        <ChevronUp className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>

                {!textCollapsed && (
                  <div className="prose prose-lg max-w-none">
                    <div
                      className="text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: currentLesson.content }}
                    />
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={() => markLessonComplete(currentLessonIndex)}
                  disabled={completedLessons.has(currentLessonIndex)}
                  className="px-4 sm:px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{completedLessons.has(currentLessonIndex) ? 'Completed' : 'Mark as Complete'}</span>
                </button>

                {getQuizForLesson(currentLessonIndex) && (
                  <button
                    onClick={startQuiz}
                    disabled={!completedLessons.has(currentLessonIndex)}
                    className="px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    <Brain className="h-5 w-5 flex-shrink-0" />
                    <span>{completedQuizzes.has(currentLessonIndex) ? 'Quiz Passed ✓' : 'Take Quiz'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
              <button
                onClick={previousLesson}
                disabled={currentLessonIndex === 0}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                <ChevronLeft className="h-5 w-5 flex-shrink-0" />
                <span>Previous Lesson</span>
              </button>

              <button
                onClick={nextLesson}
                disabled={currentLessonIndex === course.lessons.length - 1}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                <span>Next Lesson</span>
                <ChevronRight className="h-5 w-5 flex-shrink-0" />
              </button>
            </div>
          </div>
        </main>
      </div>

      <LessonAIChat
        lessonTitle={currentLesson.title}
        lessonContent={currentLesson.content}
        supabaseUrl={import.meta.env.VITE_SUPABASE_URL}
        supabaseAnonKey={import.meta.env.VITE_SUPABASE_ANON_KEY}
      />
    </div>
  );
}
