import { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import Registration from './pages/Registration';
import Login from './pages/Login';
import CreateCourse from './pages/CreateCourse';
import StudentLogin from './pages/StudentLogin';
import CourseAnalytics from './pages/CourseAnalytics';
import StudentProgressDetail from './pages/StudentProgressDetail';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
  const [currentCourseTitle, setCurrentCourseTitle] = useState<string>('');
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

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
