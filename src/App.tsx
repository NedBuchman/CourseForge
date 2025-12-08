import { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import Registration from './pages/Registration';
import Login from './pages/Login';
import CreateCourse from './pages/CreateCourse';
import StudentLogin from './pages/StudentLogin';
import CourseAnalytics from './pages/CourseAnalytics';
import StudentProgressDetail from './pages/StudentProgressDetail';
import { supabase, validateSupabaseConfig } from './lib/supabase';
import { AlertCircle } from 'lucide-react';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
  const [currentCourseTitle, setCurrentCourseTitle] = useState<string>('');
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);

  const configValidation = validateSupabaseConfig();

  if (!configValidation.isValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Configuration Error</h1>
              <p className="text-slate-600">CourseForge cannot start</p>
            </div>
          </div>

          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-semibold mb-2">Missing Supabase Environment Variables</p>
            <p className="text-red-700 text-sm">
              The application requires Supabase configuration to function. Please ensure the following environment variables are set:
            </p>
            <ul className="mt-3 space-y-1 text-sm text-red-700">
              <li className="font-mono">VITE_SUPABASE_URL</li>
              <li className="font-mono">VITE_SUPABASE_ANON_KEY</li>
            </ul>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 font-semibold mb-2">Setup Instructions</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
              <li>Create a <span className="font-mono">.env</span> file in the project root</li>
              <li>Add your Supabase credentials to the file</li>
              <li>Restart the development server</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentPage('login');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage onGetStarted={() => setCurrentPage('login')} />;
      case 'login':
        return (
          <Login
            onLoginSuccess={() => setCurrentPage('create-course')}
            onNavigateToRegister={() => setCurrentPage('registration')}
          />
        );
      case 'registration':
        return <Registration onComplete={() => setCurrentPage('create-course')} />;
      case 'create-course':
        return (
          <CreateCourse
            onComplete={(courseId) => {
              setCurrentCourseId(courseId);
              setCurrentPage('course-dashboard');
            }}
            onBack={() => setCurrentPage('login')}
            onViewAnalytics={(courseId, courseTitle) => {
              setCurrentCourseId(courseId);
              setCurrentCourseTitle(courseTitle);
              setCurrentPage('course-analytics');
            }}
          />
        );
      case 'course-dashboard':
        return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold mb-4">Course Generated Successfully!</p>
              <p className="text-gray-600">Course ID: {currentCourseId}</p>
              <p className="text-gray-500 mt-4">Dashboard coming soon...</p>
            </div>
          </div>
        );
      case 'course-analytics':
        return currentCourseId ? (
          <CourseAnalytics
            courseId={currentCourseId}
            courseTitle={currentCourseTitle}
            onBack={() => setCurrentPage('create-course')}
            onViewStudent={(studentId) => {
              setCurrentStudentId(studentId);
              setCurrentPage('student-progress');
            }}
            onViewLesson={(lessonIndex) => {
              console.log('View lesson:', lessonIndex);
            }}
            onViewQuiz={(quizId) => {
              console.log('View quiz:', quizId);
            }}
            onBackToCourses={() => setCurrentPage('create-course')}
            onLogout={handleLogout}
          />
        ) : (
          <div>No course selected</div>
        );
      case 'student-progress':
        return currentCourseId && currentStudentId ? (
          <StudentProgressDetail
            courseId={currentCourseId}
            studentId={currentStudentId}
            courseTitle={currentCourseTitle}
            onBack={() => setCurrentPage('course-analytics')}
            onLogout={handleLogout}
          />
        ) : (
          <div>No student selected</div>
        );
      case 'student-login':
        return (
          <StudentLogin
            courseTitle="Demo Course"
            onLoginSuccess={() => {
              alert('Student login successful!');
            }}
          />
        );
      default:
        return <LandingPage onGetStarted={() => setCurrentPage('login')} />;
    }
  };

  return <div className="min-h-screen">{renderPage()}</div>;
}

export default App;
