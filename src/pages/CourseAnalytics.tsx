import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Users,
  TrendingUp,
  Award,
  BarChart3,
  Clock,
  Target,
  AlertCircle,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import StatCard from '../components/StatCard';
import ProgressBar from '../components/ProgressBar';
import HorizontalBarChart from '../components/HorizontalBarChart';
import DataTableSimple from '../components/DataTableSimple';
import SimpleLineChart from '../components/SimpleLineChart';

interface CourseAnalyticsProps {
  courseId: string;
  courseTitle: string;
  onBack: () => void;
  onViewStudent: (studentId: string) => void;
  onViewLesson: (lessonIndex: number) => void;
  onViewQuiz: (quizId: string) => void;
}

interface CourseOverview {
  total_enrolled: number;
  total_completed: number;
  students_with_activity: number;
  active_last_7_days: number;
  active_last_30_days: number;
  completion_rate: number;
  avg_lessons_completed: number;
  avg_quiz_score: number;
}

interface LessonAnalytics {
  lesson_index: number;
  unique_viewers: number;
  total_views: number;
  avg_time_spent_seconds: number;
  completions: number;
  completion_rate: number;
  avg_views_to_complete: number;
  completed_on_first_view: number;
  students_who_returned: number;
}

interface QuizAnalytics {
  quiz_id: string;
  quiz_title: string;
  lesson_index: number;
  unique_students_attempted: number;
  total_attempts: number;
  avg_attempts_per_student: number;
  avg_score: number;
  pass_rate: number;
  students_retook_quiz: number;
}

interface StudentSummary {
  student_id: string;
  student_email: string;
  first_name: string;
  last_name: string;
  enrolled_at: string;
  lessons_completed: number;
  progress_percentage: number;
  avg_quiz_score: number;
  last_activity_at: string;
}

interface DifficultQuestion {
  quiz_title: string;
  question_number: number;
  question_text: string;
  success_rate: number;
  total_answers: number;
  difficulty_rating: string;
}

export default function CourseAnalytics({
  courseId,
  courseTitle,
  onBack,
  onViewStudent,
  onViewLesson,
  onViewQuiz
}: CourseAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<CourseOverview | null>(null);
  const [lessonData, setLessonData] = useState<LessonAnalytics[]>([]);
  const [quizData, setQuizData] = useState<QuizAnalytics[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [difficultQuestions, setDifficultQuestions] = useState<DifficultQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setError(null);

      const [overviewResult, lessonsResult, quizzesResult, studentsResult, questionsResult] = await Promise.all([
        supabase
          .from('course_student_overview')
          .select('*')
          .eq('course_id', courseId)
          .maybeSingle(),
        supabase
          .from('course_lesson_analytics')
          .select('*')
          .eq('course_id', courseId)
          .order('lesson_index'),
        supabase
          .from('course_quiz_analytics')
          .select('*')
          .eq('course_id', courseId)
          .order('lesson_index'),
        supabase
          .from('student_performance_summary')
          .select('*')
          .eq('course_id', courseId)
          .order('enrolled_at', { ascending: false }),
        supabase.rpc('get_difficult_questions', {
          p_course_id: courseId,
          p_max_success_rate: 60
        })
      ]);

      if (overviewResult.error) throw overviewResult.error;
      if (lessonsResult.error) throw lessonsResult.error;
      if (quizzesResult.error) throw quizzesResult.error;
      if (studentsResult.error) throw studentsResult.error;

      setOverview(overviewResult.data);
      setLessonData(lessonsResult.data || []);
      setQuizData(quizzesResult.data || []);
      setStudents(studentsResult.data || []);
      setDifficultQuestions(questionsResult.data || []);
    } catch (err: any) {
      console.error('Error fetching course analytics:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [courseId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const formatTime = (seconds: number): string => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <div className="text-red-900 font-bold mb-2">Error Loading Analytics</div>
              <p className="text-slate-600 text-sm">{error}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const lessonCompletionData = lessonData.map((lesson, index) => ({
    label: `L${index + 1}`,
    value: lesson.completion_rate || 0
  }));

  const lessonViewsChart = lessonData.map((lesson, index) => ({
    label: `Lesson ${index + 1}`,
    value: lesson.unique_viewers,
    color: '#3B82F6'
  }));

  const strugglingStudents = students
    .filter(s => s.progress_percentage < 30 || (s.avg_quiz_score && s.avg_quiz_score < 60))
    .slice(0, 5);

  const topPerformers = students
    .filter(s => s.avg_quiz_score >= 80)
    .sort((a, b) => (b.avg_quiz_score || 0) - (a.avg_quiz_score || 0))
    .slice(0, 5);

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
                <h1 className="text-2xl font-black">{courseTitle}</h1>
                <p className="text-blue-200 text-sm">Student Analytics Dashboard</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {overview && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Enrolled"
                value={overview.total_enrolled.toLocaleString()}
                subtitle={`${overview.students_with_activity} active`}
                icon={<Users className="w-6 h-6" />}
                color="blue"
              />
              <StatCard
                title="Course Completion"
                value={`${overview.completion_rate?.toFixed(1) || 0}%`}
                subtitle={`${overview.total_completed} students completed`}
                icon={<Target className="w-6 h-6" />}
                color="green"
              />
              <StatCard
                title="Avg Quiz Score"
                value={`${overview.avg_quiz_score?.toFixed(1) || 0}%`}
                subtitle="Across all quizzes"
                icon={<Award className="w-6 h-6" />}
                color="purple"
              />
              <StatCard
                title="Active Last 7 Days"
                value={overview.active_last_7_days.toLocaleString()}
                subtitle={`${overview.active_last_30_days} in last 30 days`}
                icon={<TrendingUp className="w-6 h-6" />}
                color="orange"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Engagement Overview</h3>
                <div className="space-y-4">
                  <ProgressBar
                    label="Course Completion Rate"
                    percentage={overview.completion_rate || 0}
                    color="green"
                  />
                  <ProgressBar
                    label="Student Activity Rate"
                    percentage={
                      overview.total_enrolled > 0
                        ? (overview.students_with_activity / overview.total_enrolled) * 100
                        : 0
                    }
                    color="blue"
                  />
                  <ProgressBar
                    label="7-Day Active Rate"
                    percentage={
                      overview.total_enrolled > 0
                        ? (overview.active_last_7_days / overview.total_enrolled) * 100
                        : 0
                    }
                    color="orange"
                  />
                </div>
              </div>

              <SimpleLineChart
                title="Lesson Completion Rate"
                data={lessonCompletionData}
                height={200}
                color="#10B981"
              />
            </div>

            {lessonData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <HorizontalBarChart
                  title="Students Viewing Each Lesson"
                  data={lessonViewsChart}
                  showValues={true}
                />

                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Lesson Performance</h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {lessonData.map((lesson, index) => (
                      <div
                        key={index}
                        onClick={() => onViewLesson(lesson.lesson_index)}
                        className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-900">Lesson {index + 1}</span>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                          <div>Viewers: {lesson.unique_viewers}</div>
                          <div>Completed: {lesson.completions}</div>
                          <div>Avg Time: {formatTime(lesson.avg_time_spent_seconds)}</div>
                          <div>Completion: {lesson.completion_rate?.toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {quizData.length > 0 && (
              <div className="mb-8">
                <DataTableSimple
                  title="Quiz Performance"
                  columns={[
                    { key: 'quiz_title', label: 'Quiz', align: 'left' },
                    { key: 'unique_students_attempted', label: 'Students', align: 'center' },
                    { key: 'total_attempts', label: 'Attempts', align: 'center' },
                    {
                      key: 'avg_score',
                      label: 'Avg Score',
                      align: 'center',
                      render: (value) => `${value?.toFixed(1) || 0}%`
                    },
                    {
                      key: 'pass_rate',
                      label: 'Pass Rate',
                      align: 'center',
                      render: (value) => `${value?.toFixed(1) || 0}%`
                    },
                    {
                      key: 'students_retook_quiz',
                      label: 'Retakes',
                      align: 'center'
                    }
                  ]}
                  data={quizData}
                  onRowClick={(quiz) => onViewQuiz(quiz.quiz_id)}
                />
              </div>
            )}

            {difficultQuestions.length > 0 && (
              <div className="mb-8">
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-bold text-orange-900 mb-1">
                        Questions Students Find Difficult
                      </h3>
                      <p className="text-sm text-orange-800">
                        These questions have a success rate below 60%. Consider reviewing or clarifying them.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {difficultQuestions.slice(0, 5).map((q, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-orange-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <span className="text-xs font-bold text-orange-600 uppercase">
                              {q.quiz_title} - Q{q.question_number}
                            </span>
                            <p className="text-sm text-slate-900 mt-1">{q.question_text}</p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${
                              q.difficulty_rating === 'Very Hard'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {q.difficulty_rating}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-600">
                          <span>Success Rate: {q.success_rate?.toFixed(1)}%</span>
                          <span>Attempts: {q.total_answers}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {strugglingStudents.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Students Who May Need Help</h3>
                  <div className="space-y-3">
                    {strugglingStudents.map((student, index) => (
                      <div
                        key={index}
                        onClick={() => onViewStudent(student.student_id)}
                        className="p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer border border-red-200"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900">
                            {student.first_name} {student.last_name}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="text-xs text-slate-600">
                          Progress: {student.progress_percentage?.toFixed(1)}% • Score: {student.avg_quiz_score?.toFixed(1) || 0}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {topPerformers.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Top Performers</h3>
                  <div className="space-y-3">
                    {topPerformers.map((student, index) => (
                      <div
                        key={index}
                        onClick={() => onViewStudent(student.student_id)}
                        className="p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer border border-green-200"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900">
                            {student.first_name} {student.last_name}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="text-xs text-slate-600">
                          Progress: {student.progress_percentage?.toFixed(1)}% • Score: {student.avg_quiz_score?.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {students.length > 0 && (
              <div className="mb-8">
                <DataTableSimple
                  title="All Students"
                  columns={[
                    {
                      key: 'student_email',
                      label: 'Student',
                      align: 'left',
                      render: (value, row) => (
                        <div>
                          <div className="font-semibold">{row.first_name} {row.last_name}</div>
                          <div className="text-xs text-slate-500">{value}</div>
                        </div>
                      )
                    },
                    {
                      key: 'enrolled_at',
                      label: 'Enrolled',
                      align: 'center',
                      render: (value) => formatDate(value)
                    },
                    { key: 'lessons_completed', label: 'Lessons', align: 'center' },
                    {
                      key: 'progress_percentage',
                      label: 'Progress',
                      align: 'center',
                      render: (value) => `${value?.toFixed(1) || 0}%`
                    },
                    {
                      key: 'avg_quiz_score',
                      label: 'Quiz Avg',
                      align: 'center',
                      render: (value) => value ? `${value.toFixed(1)}%` : '-'
                    },
                    {
                      key: 'last_activity_at',
                      label: 'Last Active',
                      align: 'center',
                      render: (value) => formatDate(value)
                    }
                  ]}
                  data={students}
                  maxRows={10}
                  onRowClick={(student) => onViewStudent(student.student_id)}
                />
              </div>
            )}
          </>
        )}

        {overview && overview.total_enrolled === 0 && (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Students Enrolled Yet</h3>
            <p className="text-slate-600">
              Once students enroll in your course, their analytics will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
