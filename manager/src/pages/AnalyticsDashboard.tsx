import { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  TrendingUp,
  Award,
  Target,
  Activity,
  BarChart3,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MetricCard } from '../components/MetricCard';
import { SimpleBarChart } from '../components/SimpleBarChart';
import { FunnelChart } from '../components/FunnelChart';
import { DataTable } from '../components/DataTable';

interface AnalyticsDashboardProps {
  onBack: () => void;
}

interface PlatformStats {
  total_creators: number;
  total_students: number;
  total_courses: number;
  completed_courses: number;
  generating_courses: number;
  published_courses: number;
  total_enrollments: number;
  total_quizzes: number;
  active_creators_30d: number;
  active_students_30d: number;
}

interface TopicData {
  topic: string;
  course_count: number;
  completed_count: number;
  published_count: number;
  total_enrollments: number;
}

interface WorkflowFunnel {
  total_started: number;
  completed_content: number;
  completed_quizzes: number;
  completed_presentation: number;
  completed_landing_page: number;
  completed_published: number;
  completed_downloaded: number;
  content_completion_rate: number;
  quiz_completion_rate: number;
  presentation_completion_rate: number;
  landing_page_completion_rate: number;
  publish_completion_rate: number;
  download_completion_rate: number;
}

interface DifficultyData {
  difficulty_level: string;
  course_count: number;
  percentage: number;
}

interface PopularCourse {
  title: string;
  topic: string;
  enrollment_count: number;
  completion_count: number;
  completion_rate: number;
}

export default function AnalyticsDashboard({ onBack }: AnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [topicData, setTopicData] = useState<TopicData[]>([]);
  const [workflowFunnel, setWorkflowFunnel] = useState<WorkflowFunnel | null>(null);
  const [difficultyData, setDifficultyData] = useState<DifficultyData[]>([]);
  const [popularCourses, setPopularCourses] = useState<PopularCourse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        onBack();
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleError || !roleData || (roleData.role !== 'admin' && roleData.role !== 'manager')) {
        setError('Unauthorized: Manager or Admin access required to view analytics');
        setLoading(false);
        return;
      }

      const [statsResult, topicsResult, funnelResult, difficultyResult, coursesResult] =
        await Promise.all([
          supabase.rpc('get_platform_overview'),
          supabase.from('analytics_course_topics').select('*').limit(10),
          supabase.from('analytics_workflow_funnel').select('*').single(),
          supabase.from('analytics_difficulty_distribution').select('*'),
          supabase.from('analytics_popular_courses').select('*').limit(10),
        ]);

      if (statsResult.error) {
        if (statsResult.error.message?.includes('Unauthorized')) {
          setError('Access Denied: You do not have permission to view platform analytics');
          return;
        }
        throw statsResult.error;
      }
      if (topicsResult.error) throw topicsResult.error;
      if (funnelResult.error) throw funnelResult.error;
      if (difficultyResult.error) throw difficultyResult.error;
      if (coursesResult.error) throw coursesResult.error;

      setPlatformStats(statsResult.data?.[0] || null);
      setTopicData(topicsResult.data || []);
      setWorkflowFunnel(funnelResult.data);
      setDifficultyData(difficultyResult.data || []);
      setPopularCourses(coursesResult.data || []);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6 max-w-md w-full">
          <div className="text-red-600 font-semibold mb-2">Error Loading Analytics</div>
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

  const funnelSteps = workflowFunnel
    ? [
        { label: 'Started', value: workflowFunnel.total_started, percentage: 100 },
        {
          label: 'Content Generated',
          value: workflowFunnel.completed_content,
          percentage: workflowFunnel.content_completion_rate,
        },
        {
          label: 'Quizzes Added',
          value: workflowFunnel.completed_quizzes,
          percentage: workflowFunnel.quiz_completion_rate,
        },
        {
          label: 'Presentation Configured',
          value: workflowFunnel.completed_presentation,
          percentage: workflowFunnel.presentation_completion_rate,
        },
        {
          label: 'Landing Page Created',
          value: workflowFunnel.completed_landing_page,
          percentage: workflowFunnel.landing_page_completion_rate,
        },
        {
          label: 'Published',
          value: workflowFunnel.completed_published,
          percentage: workflowFunnel.publish_completion_rate,
        },
      ]
    : [];

  const topicChartData = topicData.map((t) => ({
    label: t.topic,
    value: t.course_count,
    color: '#3B82F6',
  }));

  const difficultyChartData = difficultyData.map((d) => ({
    label: d.difficulty_level || 'Not Set',
    value: d.course_count,
    color: '#8B5CF6',
  }));

  const enrollmentChartData = topicData.map((t) => ({
    label: t.topic,
    value: t.total_enrollments,
    color: '#10B981',
  }));

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
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">Platform insights and performance metrics</p>
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

        {platformStats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Total Users"
                value={(platformStats.total_creators + platformStats.total_students).toLocaleString()}
                subtitle={`${platformStats.total_creators} creators, ${platformStats.total_students} students`}
                icon={<Users className="w-6 h-6" />}
                color="blue"
              />
              <MetricCard
                title="Total Courses"
                value={platformStats.total_courses.toLocaleString()}
                subtitle={`${platformStats.published_courses} published`}
                icon={<BookOpen className="w-6 h-6" />}
                color="green"
              />
              <MetricCard
                title="Total Enrollments"
                value={platformStats.total_enrollments.toLocaleString()}
                icon={<Award className="w-6 h-6" />}
                color="purple"
              />
              <MetricCard
                title="Active Users (30d)"
                value={(platformStats.active_creators_30d + platformStats.active_students_30d).toLocaleString()}
                subtitle={`${platformStats.active_creators_30d} creators, ${platformStats.active_students_30d} students`}
                icon={<Activity className="w-6 h-6" />}
                color="orange"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <MetricCard
                title="Completed Courses"
                value={platformStats.completed_courses.toLocaleString()}
                subtitle={`${((platformStats.completed_courses / platformStats.total_courses) * 100).toFixed(1)}% completion rate`}
                icon={<Target className="w-6 h-6" />}
                color="green"
              />
              <MetricCard
                title="Generating Courses"
                value={platformStats.generating_courses.toLocaleString()}
                subtitle="Currently in progress"
                icon={<TrendingUp className="w-6 h-6" />}
                color="blue"
              />
              <MetricCard
                title="Total Quizzes"
                value={platformStats.total_quizzes.toLocaleString()}
                subtitle="Across all courses"
                icon={<BarChart3 className="w-6 h-6" />}
                color="purple"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <FunnelChart steps={funnelSteps} title="Course Creation Funnel" />
              <SimpleBarChart data={difficultyChartData} title="Courses by Difficulty Level" height={300} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <SimpleBarChart data={topicChartData} title="Top 10 Course Topics" height={300} />
              <SimpleBarChart data={enrollmentChartData} title="Enrollments by Topic" height={300} />
            </div>

            <div className="mb-8">
              <DataTable
                title="Most Popular Courses"
                columns={[
                  { key: 'title', label: 'Course Title', align: 'left' },
                  { key: 'topic', label: 'Topic', align: 'left' },
                  { key: 'enrollment_count', label: 'Enrollments', align: 'right' },
                  { key: 'completion_count', label: 'Completed', align: 'right' },
                  {
                    key: 'completion_rate',
                    label: 'Completion Rate',
                    align: 'right',
                    render: (value) => (value ? `${value.toFixed(1)}%` : '-'),
                  },
                ]}
                data={popularCourses}
                maxRows={10}
              />
            </div>

            <div className="mb-8">
              <DataTable
                title="Top Course Topics"
                columns={[
                  { key: 'topic', label: 'Topic', align: 'left' },
                  { key: 'course_count', label: 'Total Courses', align: 'right' },
                  { key: 'completed_count', label: 'Completed', align: 'right' },
                  { key: 'published_count', label: 'Published', align: 'right' },
                  { key: 'total_enrollments', label: 'Enrollments', align: 'right' },
                ]}
                data={topicData}
                maxRows={10}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
