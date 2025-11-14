import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, BookOpen, Users, TrendingUp, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MetricCard } from '../components/MetricCard';
import { DataTable } from '../components/DataTable';

interface CourseCreatorInsightsProps {
  onBack: () => void;
}

interface CourseWithStats {
  course_id: string;
  course_title: string;
  creator_email: string;
  total_enrolled: number;
  total_completed: number;
  completion_rate: number;
  avg_quiz_score: number;
  students_with_activity: number;
  active_last_7_days: number;
}

export default function CourseCreatorInsights({ onBack }: CourseCreatorInsightsProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState<CourseWithStats[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);

      const { data, error: queryError } = await supabase
        .from('course_student_overview')
        .select(`
          course_id,
          course_title,
          total_enrolled,
          total_completed,
          completion_rate,
          avg_quiz_score,
          students_with_activity,
          active_last_7_days,
          creator:courses!inner(user_id, users:auth.users(email))
        `)
        .order('total_enrolled', { ascending: false });

      if (queryError) throw queryError;

      const mappedData = (data || []).map((item: any) => ({
        course_id: item.course_id,
        course_title: item.course_title,
        creator_email: item.creator?.users?.email || 'Unknown',
        total_enrolled: item.total_enrolled,
        total_completed: item.total_completed,
        completion_rate: item.completion_rate,
        avg_quiz_score: item.avg_quiz_score,
        students_with_activity: item.students_with_activity,
        active_last_7_days: item.active_last_7_days
      }));

      setCourses(mappedData);
    } catch (err: any) {
      console.error('Error fetching course insights:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const totalEnrollments = courses.reduce((sum, c) => sum + c.total_enrolled, 0);
  const totalCompletions = courses.reduce((sum, c) => sum + c.total_completed, 0);
  const avgCompletionRate =
    courses.length > 0
      ? courses.reduce((sum, c) => sum + (c.completion_rate || 0), 0) / courses.length
      : 0;
  const avgQuizScore =
    courses.filter(c => c.avg_quiz_score).length > 0
      ? courses
          .filter(c => c.avg_quiz_score)
          .reduce((sum, c) => sum + c.avg_quiz_score, 0) /
        courses.filter(c => c.avg_quiz_score).length
      : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6 max-w-md w-full">
          <div className="text-red-600 font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Course Creator Insights</h1>
              <p className="text-gray-600 mt-1">Performance metrics by course</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Courses"
            value={courses.length.toLocaleString()}
            icon={<BookOpen className="w-6 h-6" />}
            color="blue"
          />
          <MetricCard
            title="Total Enrollments"
            value={totalEnrollments.toLocaleString()}
            icon={<Users className="w-6 h-6" />}
            color="green"
          />
          <MetricCard
            title="Avg Completion Rate"
            value={`${avgCompletionRate.toFixed(1)}%`}
            subtitle={`${totalCompletions} completions`}
            icon={<TrendingUp className="w-6 h-6" />}
            color="purple"
          />
          <MetricCard
            title="Avg Quiz Score"
            value={`${avgQuizScore.toFixed(1)}%`}
            subtitle="Across all courses"
            icon={<Award className="w-6 h-6" />}
            color="orange"
          />
        </div>

        <div className="mb-8">
          <DataTable
            title="All Courses"
            columns={[
              { key: 'course_title', label: 'Course', align: 'left' },
              { key: 'creator_email', label: 'Creator', align: 'left' },
              { key: 'total_enrolled', label: 'Enrolled', align: 'right' },
              { key: 'total_completed', label: 'Completed', align: 'right' },
              {
                key: 'completion_rate',
                label: 'Completion %',
                align: 'right',
                render: (value) => (value ? `${value.toFixed(1)}%` : '-')
              },
              {
                key: 'avg_quiz_score',
                label: 'Quiz Avg',
                align: 'right',
                render: (value) => (value ? `${value.toFixed(1)}%` : '-')
              },
              { key: 'students_with_activity', label: 'Active', align: 'right' },
              { key: 'active_last_7_days', label: '7d Active', align: 'right' }
            ]}
            data={courses}
          />
        </div>
      </div>
    </div>
  );
}
