import { useState, useEffect } from 'react';
import { studentAuth } from './lib/studentAuth';
import { ErrorBoundary } from './components/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import Dashboard from './pages/Dashboard';
import CourseCatalog from './pages/CourseCatalog';
import CoursePlayer from './pages/CoursePlayer';

type Page = 'landing' | 'login' | 'register' | 'dashboard' | 'catalog' | 'course';

interface AppState {
  currentPage: Page;
  selectedCourseId?: string;
  isAuthenticated: boolean;
}

function App() {
  const [appState, setAppState] = useState<AppState>({
    currentPage: 'landing',
    isAuthenticated: studentAuth.isAuthenticated(),
  });

  useEffect(() => {
    const isAuth = studentAuth.isAuthenticated();
    if (isAuth && appState.currentPage === 'landing') {
      setAppState(prev => ({ ...prev, currentPage: 'dashboard', isAuthenticated: true }));
    }
  }, []);

  const navigateTo = (page: Page, courseId?: string) => {
    setAppState({
      currentPage: page,
      selectedCourseId: courseId,
      isAuthenticated: studentAuth.isAuthenticated()
    });
  };

  const handleLogout = () => {
    studentAuth.logout();
    setAppState({ currentPage: 'landing', isAuthenticated: false });
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
    case 'course':
      return appState.selectedCourseId ? (
        <ErrorBoundary>
          <CoursePlayer courseId={appState.selectedCourseId} onNavigate={navigateTo} onLogout={handleLogout} />
        </ErrorBoundary>
      ) : (
        <Dashboard onNavigate={navigateTo} onLogout={handleLogout} />
      );
    default:
      return <LandingPage onNavigate={navigateTo} />;
  }
}

export default App;
