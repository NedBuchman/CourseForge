import { useState, useEffect } from 'react';
import { studentAuth } from './lib/studentAuth';
import { ErrorBoundary } from './components/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import Dashboard from './pages/Dashboard';
import CourseCatalog from './pages/CourseCatalog';
import LessonPlayer from './pages/LessonPlayer';
import QuizTaker from './pages/QuizTaker';
import QuizResults from './pages/QuizResults';
import CourseCompletion from './pages/CourseCompletion';

type Page = 'landing' | 'login' | 'register' | 'dashboard' | 'catalog' | 'lesson' | 'quiz' | 'results' | 'completion';

interface AppState {
  currentPage: Page;
  selectedCourseId?: string;
  lessonIndex?: number;
  quizId?: string;
  attemptId?: string;
  isAuthenticated: boolean;
}

function App() {
  const [appState, setAppState] = useState<AppState>({
    currentPage: 'landing',
    isAuthenticated: false,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await studentAuth.isAuthenticated();
      if (isAuth && appState.currentPage === 'landing') {
        setAppState(prev => ({ ...prev, currentPage: 'dashboard', isAuthenticated: true }));
      } else {
        setAppState(prev => ({ ...prev, isAuthenticated: isAuth }));
      }
    };
    checkAuth();
  }, []);

  const navigateTo = async (page: Page, courseIdOrLessonIndex?: string | number, quizIdOrAttemptId?: string) => {
    const isAuthenticated = await studentAuth.isAuthenticated();

    if (page === 'lesson' && typeof courseIdOrLessonIndex === 'string') {
      setAppState({
        currentPage: page,
        selectedCourseId: courseIdOrLessonIndex,
        lessonIndex: 0,
        isAuthenticated
      });
    } else if (page === 'quiz') {
      setAppState({
        currentPage: page,
        selectedCourseId: appState.selectedCourseId,
        lessonIndex: typeof courseIdOrLessonIndex === 'number' ? courseIdOrLessonIndex : appState.lessonIndex,
        quizId: quizIdOrAttemptId,
        isAuthenticated
      });
    } else if (page === 'results') {
      setAppState({
        currentPage: page,
        selectedCourseId: appState.selectedCourseId,
        lessonIndex: appState.lessonIndex,
        attemptId: typeof courseIdOrLessonIndex === 'string' ? courseIdOrLessonIndex : quizIdOrAttemptId,
        isAuthenticated
      });
    } else if (page === 'completion') {
      setAppState({
        currentPage: page,
        selectedCourseId: appState.selectedCourseId,
        isAuthenticated
      });
    } else {
      setAppState({
        currentPage: page,
        selectedCourseId: typeof courseIdOrLessonIndex === 'string' ? courseIdOrLessonIndex : appState.selectedCourseId,
        lessonIndex: typeof courseIdOrLessonIndex === 'number' ? courseIdOrLessonIndex : appState.lessonIndex,
        isAuthenticated
      });
    }
  };

  const handleLogout = async () => {
    await studentAuth.logout();
    setAppState({ currentPage: 'landing', isAuthenticated: false });
  };

  const handleLessonNavigation = (page: 'dashboard' | 'quiz', lessonIndex?: number, quizId?: string) => {
    if (page === 'dashboard') {
      navigateTo('dashboard');
    } else if (page === 'quiz' && lessonIndex !== undefined && quizId) {
      navigateTo('quiz', lessonIndex, quizId);
    }
  };

  const handleQuizNavigation = (page: 'lesson' | 'results', attemptId?: string) => {
    if (page === 'lesson') {
      navigateTo('lesson', appState.selectedCourseId);
    } else if (page === 'results' && attemptId) {
      navigateTo('results', attemptId);
    }
  };

  const handleResultsNavigation = (page: 'lesson' | 'quiz', lessonIndex?: number) => {
    if (page === 'lesson' && lessonIndex !== undefined) {
      setAppState(prev => ({
        ...prev,
        currentPage: 'lesson',
        lessonIndex
      }));
    } else if (page === 'quiz') {
      navigateTo('quiz', appState.lessonIndex, appState.quizId);
    }
  };

  switch (appState.currentPage) {
    case 'landing':
      return <LandingPage onNavigate={navigateTo} />;
    case 'login':
      return <LoginPage onNavigate={navigateTo} />;
    case 'register':
      return <RegistrationPage onNavigate={navigateTo} />;
    case 'dashboard':
      return <Dashboard onNavigate={navigateTo} onLogout={handleLogout} />;
    case 'catalog':
      return (
        <ErrorBoundary>
          <CourseCatalog onNavigate={navigateTo} onLogout={handleLogout} />
        </ErrorBoundary>
      );
    case 'lesson':
      return appState.selectedCourseId !== undefined && appState.lessonIndex !== undefined ? (
        <ErrorBoundary>
          <LessonPlayer
            courseId={appState.selectedCourseId}
            lessonIndex={appState.lessonIndex}
            onNavigate={handleLessonNavigation}
            onLogout={handleLogout}
          />
        </ErrorBoundary>
      ) : (
        <Dashboard onNavigate={navigateTo} onLogout={handleLogout} />
      );
    case 'quiz':
      return appState.selectedCourseId && appState.quizId && appState.lessonIndex !== undefined ? (
        <ErrorBoundary>
          <QuizTaker
            courseId={appState.selectedCourseId}
            quizId={appState.quizId}
            lessonIndex={appState.lessonIndex}
            onNavigate={handleQuizNavigation}
          />
        </ErrorBoundary>
      ) : (
        <Dashboard onNavigate={navigateTo} onLogout={handleLogout} />
      );
    case 'results':
      return appState.attemptId && appState.selectedCourseId && appState.lessonIndex !== undefined ? (
        <ErrorBoundary>
          <QuizResults
            attemptId={appState.attemptId}
            courseId={appState.selectedCourseId}
            lessonIndex={appState.lessonIndex}
            onNavigate={handleResultsNavigation}
          />
        </ErrorBoundary>
      ) : (
        <Dashboard onNavigate={navigateTo} onLogout={handleLogout} />
      );
    case 'completion':
      return appState.selectedCourseId ? (
        <ErrorBoundary>
          <CourseCompletion
            courseId={appState.selectedCourseId}
            onNavigate={navigateTo}
            onLogout={handleLogout}
          />
        </ErrorBoundary>
      ) : (
        <Dashboard onNavigate={navigateTo} onLogout={handleLogout} />
      );
    default:
      return <LandingPage onNavigate={navigateTo} />;
  }
}

export default App;
