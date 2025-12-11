import { useState, useEffect } from 'react';
import { BookOpen, ArrowLeft, LogOut, Check } from 'lucide-react';
import { studentAuth } from '../lib/studentAuth';
import { supabase } from '../lib/supabase';

interface CustomCourseLandingPageProps {
  courseId: string;
  onNavigate: (page: 'catalog' | 'lesson' | 'login' | 'register', courseId?: string) => void;
  onLogout: () => void;
}

interface LandingPageConfig {
  course_headline: string;
  value_proposition: string;
  audience_description: string;
  hero_image_url: string | null;
  course_benefits: Array<{
    icon?: string;
    title?: string;
    description: string;
  }> | null;
  cta_button_text: string;
  pricing_info: string | null;
  testimonials: string | null;
  special_message: string | null;
  primary_color: string;
  secondary_color: string;
  page_style: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty_level: string;
  duration: string;
  lessons: any[];
}

export default function CustomCourseLandingPage({
  courseId,
  onNavigate,
  onLogout,
}: CustomCourseLandingPageProps) {
  const [landingConfig, setLandingConfig] = useState<LandingPageConfig | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [courseId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const currentSession = await studentAuth.getSession();
      setSession(currentSession);

      const [landingResult, courseResult] = await Promise.all([
        supabase
          .from('landing_page_configs')
          .select('*')
          .eq('course_id', courseId)
          .maybeSingle(),
        supabase
          .from('courses')
          .select('id, title, description, difficulty_level, duration, lessons')
          .eq('id', courseId)
          .maybeSingle(),
      ]);

      if (landingResult.error) throw landingResult.error;
      if (courseResult.error) throw courseResult.error;

      if (!landingResult.data || !courseResult.data) {
        throw new Error('Course or landing page not found');
      }

      setLandingConfig(landingResult.data);
      setCourse(courseResult.data);

      if (currentSession) {
        const { data: enrollment } = await supabase
          .from('student_course_enrollments')
          .select('id')
          .eq('user_id', currentSession.user_id)
          .eq('course_id', courseId)
          .maybeSingle();

        setIsEnrolled(!!enrollment);
      }
    } catch (err: any) {
      console.error('Error loading landing page:', err);
      setError(err.message || 'Failed to load course landing page');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollAndStart = async () => {
    if (!session) {
      onNavigate('register');
      return;
    }

    setEnrolling(true);
    try {
      const { error: enrollError } = await supabase
        .from('student_course_enrollments')
        .insert({
          user_id: session.user_id,
          course_id: courseId,
          progress: {
            completed_lessons: [],
            total_lessons: course?.lessons?.length || 0,
            last_accessed_lesson: null,
            quiz_scores: {},
          },
        });

      if (enrollError) throw enrollError;

      onNavigate('lesson', courseId);
    } catch (err: any) {
      console.error('Error enrolling:', err);
      alert('Failed to enroll in course. Please try again.');
    } finally {
      setEnrolling(false);
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

  if (error || !landingConfig || !course) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-2">
                <img
                  src="/courseforge-logo.svg"
                  alt="CourseForge"
                  className="h-8 w-8"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <BookOpen className="h-7 w-7 text-blue-600 hidden" />
                <span className="text-xl font-bold text-gray-900">CourseForge</span>
              </div>
              <button
                onClick={() => onNavigate('catalog')}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Catalog</span>
              </button>
            </div>
          </div>
        </nav>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Course</h3>
            <p className="text-gray-600 mb-4">{error || 'Course not found'}</p>
            <button
              onClick={() => onNavigate('catalog')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Back to Catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <img
                  src="/courseforge-logo.svg"
                  alt="CourseForge"
                  className="h-8 w-8"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <BookOpen className="h-7 w-7 hidden" style={{ color: landingConfig?.primary_color || '#2563eb' }} />
                <span className="text-xl font-bold text-gray-900">CourseForge</span>
              </div>
              <button
                onClick={() => onNavigate('catalog')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline">Back to Catalog</span>
              </button>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {session ? (
                <>
                  <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[120px] sm:max-w-none">
                    {session.first_name} {session.last_name}
                  </span>
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-1 sm:gap-2 p-2 sm:px-4 sm:py-2 text-gray-700 hover:text-gray-900"
                    title="Log Out"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="hidden sm:inline">Log Out</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onNavigate('login')}
                    className="px-3 sm:px-4 py-2 text-blue-600 hover:text-blue-700 font-medium text-sm sm:text-base"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => onNavigate('register')}
                    className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm sm:text-base"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {landingConfig.hero_image_url && (
            <div className="w-full h-64 md:h-96 overflow-hidden bg-gray-100">
              <img
                src={landingConfig.hero_image_url}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-8 md:p-12">
            <div className="mb-8">
              <span
                className="inline-block px-3 py-1 text-sm font-medium rounded-full mb-4"
                style={{
                  backgroundColor: `${landingConfig.primary_color}20`,
                  color: landingConfig.primary_color,
                }}
              >
                {course.difficulty_level}
              </span>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                {landingConfig.course_headline || course.title}
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                {landingConfig.value_proposition}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Who is this for?</h2>
                <p className="text-gray-700 leading-relaxed">
                  {landingConfig.audience_description}
                </p>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Course Details</h2>
                <div className="space-y-2 text-gray-700">
                  <p><span className="font-medium">Duration:</span> {course.duration}</p>
                  <p><span className="font-medium">Lessons:</span> {course.lessons?.length || 0}</p>
                  <p><span className="font-medium">Level:</span> {course.difficulty_level}</p>
                </div>
              </div>
            </div>

            {landingConfig.course_benefits && landingConfig.course_benefits.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">What you'll learn</h2>
                <ul className="grid md:grid-cols-2 gap-3">
                  {landingConfig.course_benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      {benefit.icon ? (
                        <span className="text-xl flex-shrink-0">{benefit.icon}</span>
                      ) : (
                        <Check className="h-5 w-5 flex-shrink-0 mt-1" style={{ color: landingConfig.secondary_color }} />
                      )}
                      <span className="text-gray-700">{benefit.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {landingConfig.special_message && (
              <div
                className="mb-8 p-6 border rounded-xl"
                style={{
                  backgroundColor: `${landingConfig.primary_color}10`,
                  borderColor: `${landingConfig.primary_color}40`,
                }}
              >
                <p className="text-gray-800 text-center font-medium">
                  {landingConfig.special_message}
                </p>
              </div>
            )}

            {landingConfig.testimonials && (
              <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-xl">
                <blockquote className="text-gray-700 italic">
                  "{landingConfig.testimonials}"
                </blockquote>
              </div>
            )}

            <div className="text-center pt-8 border-t">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                Ready to Get Started?
              </h3>
              {landingConfig.pricing_info && (
                <p className="text-gray-600 mb-6">{landingConfig.pricing_info}</p>
              )}

              {!session ? (
                <button
                  onClick={() => onNavigate('register')}
                  className="px-8 py-4 text-white rounded-lg font-semibold text-lg shadow-lg transition-all hover:scale-105"
                  style={{
                    backgroundColor: landingConfig.primary_color,
                    filter: 'brightness(1)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.9)'}
                  onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                >
                  Sign Up to Enroll
                </button>
              ) : isEnrolled ? (
                <button
                  onClick={() => onNavigate('lesson', courseId)}
                  className="px-8 py-4 text-white rounded-lg font-semibold text-lg shadow-lg transition-all hover:scale-105"
                  style={{
                    backgroundColor: landingConfig.secondary_color,
                    filter: 'brightness(1)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.9)'}
                  onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                >
                  Go to Course
                </button>
              ) : (
                <button
                  onClick={handleEnrollAndStart}
                  disabled={enrolling}
                  className="px-8 py-4 text-white rounded-lg font-semibold text-lg shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{
                    backgroundColor: landingConfig.primary_color,
                    filter: enrolling ? 'brightness(0.7)' : 'brightness(1)',
                  }}
                  onMouseEnter={(e) => !enrolling && (e.currentTarget.style.filter = 'brightness(0.9)')}
                  onMouseLeave={(e) => !enrolling && (e.currentTarget.style.filter = 'brightness(1)')}
                >
                  {enrolling ? 'Enrolling...' : landingConfig.cta_button_text}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
