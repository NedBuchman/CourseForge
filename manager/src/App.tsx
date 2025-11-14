import { useState, useEffect } from 'react';
import { BarChart3, Users, LogOut, ShieldCheck, BookOpen } from 'lucide-react';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import UserManagement from './pages/UserManagement';
import CourseCreatorInsights from './pages/CourseCreatorInsights';

type Page = 'analytics' | 'users' | 'courses';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('analytics');
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkAuth();
      } else {
        setIsAuthenticated(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (roleData && (roleData.role === 'admin' || roleData.role === 'manager')) {
          setUserRole(roleData.role);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentPage('analytics');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white shadow-lg border-b-2 border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900">CourseForge Manager</h1>
                <p className="text-xs text-slate-600">
                  {userRole === 'admin' ? 'Administrator' : 'Manager'} Portal
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage('analytics')}
                className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 ${
                  currentPage === 'analytics'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>

              <button
                onClick={() => setCurrentPage('courses')}
                className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 ${
                  currentPage === 'courses'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Courses
              </button>

              {userRole === 'admin' && (
                <button
                  onClick={() => setCurrentPage('users')}
                  className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 ${
                    currentPage === 'users'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Users
                </button>
              )}

              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {currentPage === 'analytics' && (
          <AnalyticsDashboard onBack={() => {}} />
        )}
        {currentPage === 'courses' && (
          <CourseCreatorInsights onBack={() => setCurrentPage('analytics')} />
        )}
        {currentPage === 'users' && userRole === 'admin' && <UserManagement />}
      </div>
    </div>
  );
}

export default App;
