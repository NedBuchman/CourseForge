import { useState, useEffect } from 'react';
import { BookOpen, LogOut, Search, Clock, Star } from 'lucide-react';
import { studentAuth } from '../lib/studentAuth';
import { supabase } from '../lib/supabase';

interface CourseCatalogProps {
  onNavigate: (page: 'landing' | 'login' | 'dashboard' | 'lesson', courseId?: string) => void;
  onLogout: () => void;
}

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty_level: string;
  duration: string;
  target_audience: string;
  lessons: any[];
  isEnrolled: boolean;
}

export default function CourseCatalog({ onNavigate, onLogout }: CourseCatalogProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const session = studentAuth.getSession();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    setError(null);

    try {
      const coursesResponse = await supabase
        .from('courses')
        .select('id, title, description, difficulty_level, duration, target_audience, lessons')
        .eq('published_status', 'published')
        .order('created_at', { ascending: false });

      if (coursesResponse.error) {
        console.error('Courses query error:', coursesResponse.error);
        throw new Error('Failed to load courses. Please try again.');
      }

      let enrolledCourseIds = new Set<string>();

      if (session) {
        const enrollmentsResponse = await supabase
          .from('student_course_enrollments')
          .select('course_id')
          .eq('student_id', session.student_id);

        enrolledCourseIds = new Set(
          enrollmentsResponse.data?.map(e => e.course_id) || []
        );
      }

      const coursesWithEnrollment = (coursesResponse.data || [])
        .filter(course => {
          if (!course.lessons || !Array.isArray(course.lessons) || course.lessons.length === 0) {
            console.warn(`Course ${course.id} (${course.title}) has no valid lessons, filtering out`);
            return false;
          }
          return true;
        })
        .map(course => ({
          ...course,
          lessons: course.lessons || [],
          isEnrolled: enrolledCourseIds.has(course.id),
        }));

      setCourses(coursesWithEnrollment);
    } catch (error: any) {
      console.error('Error loading courses:', error);
      setError(error.message || 'Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    if (!session) return;

    setEnrolling(courseId);

    try {
      const { error } = await supabase
        .from('student_course_enrollments')
        .insert({
          student_id: session.student_id,
          course_id: courseId,
          progress: {
            completed_lessons: [],
            total_lessons: courses.find(c => c.id === courseId)?.lessons.length || 0,
            last_accessed_lesson: null,
            quiz_scores: {},
          },
        });

      if (error) throw error;

      setCourses(prev =>
        prev.map(course =>
          course.id === courseId ? { ...course, isEnrolled: true } : course
        )
      );
    } catch (error) {
      console.error('Error enrolling:', error);
      alert('Failed to enroll in course');
    } finally {
      setEnrolling(null);
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <BookOpen className="h-7 w-7 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">CourseForge</span>
              </div>
              {session ? (
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  My Dashboard
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('landing')}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Home
                </button>
              )}
            </div>
            <div className="flex items-center gap-4">
              {session ? (
                <>
                  <span className="text-sm text-gray-600">
                    {session.first_name} {session.last_name}
                  </span>
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Log Out</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onNavigate('login')}
                    className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => onNavigate('login')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Course Catalog</h1>
          <p className="text-gray-600">Discover and enroll in courses</p>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search courses..."
            />
          </div>
        </div>

        {error ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <div className="text-red-600 mb-4">
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Courses</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadCourses}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Try Again
            </button>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading courses...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Courses Found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try adjusting your search' : 'No courses are available yet. Check back soon!'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map(course => (
              <div
                key={course.id}
                className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow overflow-hidden flex flex-col"
              >
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
                      {course.title}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded ml-2 ${
                      course.difficulty_level === 'beginner' ? 'bg-green-100 text-green-700' :
                      course.difficulty_level === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {course.difficulty_level}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-1">
                    {course.description}
                  </p>

                  <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>{course.lessons.length} lessons</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      <span className="text-xs">{course.target_audience}</span>
                    </div>
                  </div>

                  {!session ? (
                    <button
                      onClick={() => onNavigate('login')}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Login to Enroll
                    </button>
                  ) : course.isEnrolled ? (
                    <button
                      onClick={() => onNavigate('lesson', course.id)}
                      className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      Go to Course
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEnroll(course.id)}
                      disabled={enrolling === course.id}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {enrolling === course.id ? 'Enrolling...' : 'Enroll Now'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
