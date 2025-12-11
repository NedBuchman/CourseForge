import { useState, useEffect } from 'react';
import { BookOpen, LogOut, Search, TrendingUp, Award, Clock } from 'lucide-react';
import { studentAuth } from '../lib/studentAuth';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  onNavigate: (page: 'catalog' | 'lesson', courseId?: string) => void;
  onLogout: () => void;
}

interface EnrolledCourse {
  id: string;
  title: string;
  description: string;
  difficulty_level: string;
  duration: string;
  progress: number;
  lessons: any[];
}

export default function Dashboard({ onNavigate, onLogout }: DashboardProps) {
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    const currentSession = await studentAuth.getSession();
    setSession(currentSession);
    if (currentSession) {
      loadEnrolledCourses(currentSession);
    } else {
      setLoading(false);
    }
  };

  const loadEnrolledCourses = async (currentSession: any) => {
    try {
      const { data: enrollments, error } = await supabase
        .from('student_course_enrollments')
        .select(`
          course_id,
          progress,
          courses (
            id,
            title,
            description,
            difficulty_level,
            duration,
            lessons
          )
        `)
        .eq('user_id', currentSession.student_id);

      if (error) throw error;

      const courses = enrollments?.map((enrollment: any) => ({
        id: enrollment.courses.id,
        title: enrollment.courses.title,
        description: enrollment.courses.description,
        difficulty_level: enrollment.courses.difficulty_level,
        duration: enrollment.courses.duration,
        lessons: enrollment.courses.lessons || [],
        progress: calculateProgress(enrollment.progress),
      })) || [];

      setEnrolledCourses(courses);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (progressData: any): number => {
    if (!progressData || !progressData.completed_lessons) return 0;
    const completed = progressData.completed_lessons.length;
    const total = progressData.total_lessons || 1;
    return Math.round((completed / total) * 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">CourseForge</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[120px] sm:max-w-none">
                {session?.first_name} {session?.last_name}
              </span>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 sm:gap-2 p-2 sm:px-4 sm:py-2 text-gray-700 hover:text-gray-900"
                title="Log Out"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {session?.first_name}
          </h1>
          <p className="text-gray-600">Continue your learning journey</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Enrolled Courses</span>
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{enrolledCourses.length}</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">In Progress</span>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {enrolledCourses.filter(c => c.progress > 0 && c.progress < 100).length}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Completed</span>
              <Award className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {enrolledCourses.filter(c => c.progress === 100).length}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">My Courses</h2>
          <button
            onClick={() => onNavigate('catalog')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Search className="h-4 w-4" />
            <span>Browse Courses</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading your courses...</p>
          </div>
        ) : enrolledCourses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Courses Yet</h3>
            <p className="text-gray-600 mb-6">Start learning by enrolling in your first course</p>
            <button
              onClick={() => onNavigate('catalog')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Browse Available Courses
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map(course => (
              <div
                key={course.id}
                className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {course.title}
                    </h3>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      {course.difficulty_level}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {course.description}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{course.lessons.length} lessons</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium text-gray-900">{course.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate('lesson', course.id)}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    {course.progress === 0 ? 'Start Course' : 'Continue Learning'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
