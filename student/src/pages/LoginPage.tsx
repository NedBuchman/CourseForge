import { useState } from 'react';
import { BookOpen, Mail, Lock, AlertCircle } from 'lucide-react';
import { studentAuth } from '../lib/studentAuth';
import { supabase } from '../lib/supabase';

interface LoginPageProps {
  onNavigate: (page: 'dashboard' | 'register' | 'landing' | 'lesson', courseId?: string) => void;
  pendingEnrollmentCourseId?: string;
}

export default function LoginPage({ onNavigate, pendingEnrollmentCourseId }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await studentAuth.login(email, password);

    if (result.success && result.data) {
      // If there's a pending course enrollment, enroll the user
      if (pendingEnrollmentCourseId) {
        try {
          // Check if already enrolled
          const { data: existingEnrollment } = await supabase
            .from('student_course_enrollments')
            .select('id')
            .eq('student_id', result.data.user_id)
            .eq('course_id', pendingEnrollmentCourseId)
            .maybeSingle();

          // Only enroll if not already enrolled
          if (!existingEnrollment) {
            // Get course details to populate enrollment
            const { data: courseData } = await supabase
              .from('courses')
              .select('lessons')
              .eq('id', pendingEnrollmentCourseId)
              .single();

            // Enroll the student in the course
            const { error: enrollError } = await supabase
              .from('student_course_enrollments')
              .insert({
                student_id: result.data.user_id,
                user_id: result.data.user_id,
                course_id: pendingEnrollmentCourseId,
                progress: {
                  completed_lessons: [],
                  total_lessons: courseData?.lessons?.length || 0,
                  last_accessed_lesson: null,
                  quiz_scores: {},
                },
              });

            if (enrollError) {
              console.error('Auto-enrollment error:', enrollError);
            }
          }

          // Navigate to the course lesson player
          onNavigate('lesson', pendingEnrollmentCourseId);
        } catch (error) {
          console.error('Error during auto-enrollment:', error);
          // Still navigate to dashboard if enrollment fails
          onNavigate('dashboard');
        }
      } else {
        onNavigate('dashboard');
      }
    } else {
      setError(result.error || 'Login failed');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-2 mb-4">
            <BookOpen className="h-10 w-10 text-blue-600" />
            <span className="text-3xl font-bold text-gray-900">CourseForge</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-600 mt-2">Log in to continue your learning journey</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-4">
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Forgot password?
            </button>
            <div className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={() => onNavigate('register')}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Sign up
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => onNavigate('landing')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
