import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, CheckCircle, XCircle, Award, TrendingUp, Calendar, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import StatCard from '../components/StatCard';
import ProgressBar from '../components/ProgressBar';
import DataTableSimple from '../components/DataTableSimple';

interface StudentProgressDetailProps {
  courseId: string;
  studentId: string;
  courseTitle: string;
  onBack: () => void;
  onLogout?: () => void;
}

interface StudentInfo {
  student_email: string;
  first_name: string;
  last_name: string;
  enrolled_at: string;
  lessons_completed: number;
  progress_percentage: number;
  avg_quiz_score: number;
  last_activity_at: string;
  total_time_spent_seconds: number;
  quizzes_attempted: number;
  quizzes_passed: number;
  quizzes_failed: number;
  active_days: number;
}

interface LessonActivity {
  lesson_index: number;
  view_count: number;
  completed: boolean;
  completed_at: string | null;
  total_time_seconds: number;
  first_viewed: string;
  last_viewed: string;
}

interface QuizAttempt {
  quiz_id: string;
  quiz_title: string;
  attempt_number: number;
  started_at: string;
  completed_at: string;
  score: number;
  passed: boolean;
}

export default function StudentProgressDetail({
  courseId,
  studentId,
  courseTitle,
  onBack,
  onLogout
}: StudentProgressDetailProps) {
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [lessonActivity, setLessonActivity] = useState<LessonActivity[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentData();
  }, [courseId, studentId]);

  const fetchStudentData = async () => {
    try {
      setError(null);

      const [infoResult, lessonsResult, viewsResult, attemptsResult] = await Promise.all([
        supabase
          .from('student_performance_summary')
          .select('*')
          .eq('course_id', courseId)
          .eq('user_id', studentId)
          .maybeSingle(),
        supabase
          .from('student_lesson_completions')
          .select('*')
          .eq('course_id', courseId)
          .eq('user_id', studentId)
          .order('lesson_index'),
        supabase
          .from('student_lesson_views')
          .select('*')
          .eq('course_id', courseId)
          .eq('user_id', studentId)
          .order('viewed_at'),
        supabase
          .from('student_quiz_attempts')
          .select(`
            *,
            quizzes (
              title
            )
          `)
          .eq('course_id', courseId)
          .eq('user_id', studentId)
          .order('started_at', { ascending: false })
      ]);

      if (infoResult.error) throw infoResult.error;
      if (lessonsResult.error) throw lessonsResult.error;
      if (viewsResult.error) throw viewsResult.error;
      if (attemptsResult.error) throw attemptsResult.error;

      setStudentInfo(infoResult.data);

      const completions = lessonsResult.data || [];
      const views = viewsResult.data || [];

      const lessonMap = new Map<number, LessonActivity>();

      views.forEach(view => {
        const existing = lessonMap.get(view.lesson_index);
        if (!existing) {
          lessonMap.set(view.lesson_index, {
            lesson_index: view.lesson_index,
            view_count: 1,
            completed: false,
            completed_at: null,
            total_time_seconds: view.time_spent_seconds || 0,
            first_viewed: view.viewed_at,
            last_viewed: view.viewed_at
          });
        } else {
          existing.view_count++;
          existing.total_time_seconds += view.time_spent_seconds || 0;
          if (new Date(view.viewed_at) > new Date(existing.last_viewed)) {
            existing.last_viewed = view.viewed_at;
          }
        }
      });

      completions.forEach(completion => {
        const activity = lessonMap.get(completion.lesson_index);
        if (activity) {
          activity.completed = true;
          activity.completed_at = completion.completed_at;
        }
      });

      const lessonActivities = Array.from(lessonMap.values()).sort(
        (a, b) => a.lesson_index - b.lesson_index
      );

      setLessonActivity(lessonActivities);

      const mappedAttempts = (attemptsResult.data || []).map(attempt => ({
        quiz_id: attempt.quiz_id,
        quiz_title: attempt.quizzes?.title || 'Unknown Quiz',
        attempt_number: attempt.attempt_number,
        started_at: attempt.started_at,
        completed_at: attempt.completed_at,
        score: attempt.score,
        passed: attempt.passed
      }));

      setQuizAttempts(mappedAttempts);
    } catch (err: any) {
      console.error('Error fetching student data:', err);
      setError(err.message || 'Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString();
  };

  const formatDateTime = (dateString: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading student data...</p>
        </div>
      </div>
    );
  }

  if (error || !studentInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
          <div className="text-red-900 font-bold mb-2">Error Loading Student Data</div>
          <p className="text-slate-600 text-sm mb-4">{error || 'Student not found'}</p>
          <button
            onClick={onBack}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <header className="bg-gradient-to-r from-blue-800 to-blue-900 text-white py-4 shadow-lg">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-black">
                  {studentInfo.first_name} {studentInfo.last_name}
                </h1>
                <p className="text-blue-200 text-sm">{courseTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Progress"
            value={`${studentInfo.progress_percentage?.toFixed(1) || 0}%`}
            subtitle={`${studentInfo.lessons_completed} lessons completed`}
            icon={<TrendingUp className="w-6 h-6" />}
            color="blue"
          />
          <StatCard
            title="Quiz Average"
            value={studentInfo.avg_quiz_score ? `${studentInfo.avg_quiz_score.toFixed(1)}%` : 'N/A'}
            subtitle={`${studentInfo.quizzes_passed}/${studentInfo.quizzes_attempted} passed`}
            icon={<Award className="w-6 h-6" />}
            color={studentInfo.avg_quiz_score >= 70 ? 'green' : 'orange'}
          />
          <StatCard
            title="Time Spent"
            value={formatTime(studentInfo.total_time_spent_seconds)}
            subtitle={`${studentInfo.active_days} active days`}
            icon={<Clock className="w-6 h-6" />}
            color="purple"
          />
          <StatCard
            title="Last Active"
            value={formatDate(studentInfo.last_activity_at)}
            subtitle={`Enrolled: ${formatDate(studentInfo.enrolled_at)}`}
            icon={<Calendar className="w-6 h-6" />}
            color="slate"
          />
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Student Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-600">Email:</span>
              <span className="ml-2 font-semibold text-slate-900">{studentInfo.student_email}</span>
            </div>
            <div>
              <span className="text-slate-600">Enrolled:</span>
              <span className="ml-2 font-semibold text-slate-900">{formatDate(studentInfo.enrolled_at)}</span>
            </div>
            <div>
              <span className="text-slate-600">Lessons Viewed:</span>
              <span className="ml-2 font-semibold text-slate-900">{lessonActivity.length}</span>
            </div>
            <div>
              <span className="text-slate-600">Quiz Attempts:</span>
              <span className="ml-2 font-semibold text-slate-900">{studentInfo.quizzes_attempted}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Overall Progress</h3>
          <ProgressBar
            label="Course Completion"
            percentage={studentInfo.progress_percentage || 0}
            color="blue"
            height="lg"
          />
        </div>

        {lessonActivity.length > 0 && (
          <div className="mb-8">
            <DataTableSimple
              title="Lesson Activity"
              columns={[
                {
                  key: 'lesson_index',
                  label: 'Lesson',
                  align: 'left',
                  render: (value) => `Lesson ${value + 1}`
                },
                {
                  key: 'completed',
                  label: 'Status',
                  align: 'center',
                  render: (value) =>
                    value ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                        <CheckCircle className="w-3 h-3" />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                        <Clock className="w-3 h-3" />
                        In Progress
                      </span>
                    )
                },
                { key: 'view_count', label: 'Views', align: 'center' },
                {
                  key: 'total_time_seconds',
                  label: 'Time Spent',
                  align: 'center',
                  render: (value) => formatTime(value)
                },
                {
                  key: 'first_viewed',
                  label: 'First Viewed',
                  align: 'center',
                  render: (value) => formatDate(value)
                },
                {
                  key: 'completed_at',
                  label: 'Completed',
                  align: 'center',
                  render: (value) => (value ? formatDate(value) : '-')
                }
              ]}
              data={lessonActivity}
            />
          </div>
        )}

        {quizAttempts.length > 0 && (
          <div className="mb-8">
            <DataTableSimple
              title="Quiz Attempts"
              columns={[
                { key: 'quiz_title', label: 'Quiz', align: 'left' },
                {
                  key: 'attempt_number',
                  label: 'Attempt',
                  align: 'center',
                  render: (value) => `#${value}`
                },
                {
                  key: 'score',
                  label: 'Score',
                  align: 'center',
                  render: (value) => `${value?.toFixed(1) || 0}%`
                },
                {
                  key: 'passed',
                  label: 'Result',
                  align: 'center',
                  render: (value) =>
                    value ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                        <CheckCircle className="w-3 h-3" />
                        Passed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                        <XCircle className="w-3 h-3" />
                        Failed
                      </span>
                    )
                },
                {
                  key: 'started_at',
                  label: 'Started',
                  align: 'center',
                  render: (value) => formatDateTime(value)
                },
                {
                  key: 'completed_at',
                  label: 'Completed',
                  align: 'center',
                  render: (value) => (value ? formatDateTime(value) : 'In Progress')
                }
              ]}
              data={quizAttempts}
            />
          </div>
        )}

        {lessonActivity.length === 0 && quizAttempts.length === 0 && (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Activity Yet</h3>
            <p className="text-slate-600">
              This student has not started engaging with the course content.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
