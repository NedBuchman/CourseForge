const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SESSION_KEY = 'courseforge_student_session';

export interface StudentSession {
  student_id: string;
  email: string;
  first_name: string;
  last_name: string;
  session_token: string;
  expires_at: string;
}

export interface StudentAuthResponse {
  success: boolean;
  data?: StudentSession;
  error?: string;
}

export const studentAuth = {
  async register(email: string, password: string, firstName: string, lastName: string): Promise<StudentAuthResponse> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/student-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'register',
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      this.setSession(data);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Network error during registration' };
    }
  },

  async login(email: string, password: string): Promise<StudentAuthResponse> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/student-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      this.setSession(data);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Network error during login' };
    }
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
  },

  getSession(): StudentSession | null {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    if (!sessionStr) return null;

    try {
      const session: StudentSession = JSON.parse(sessionStr);

      if (new Date(session.expires_at) < new Date()) {
        this.logout();
        return null;
      }

      return session;
    } catch {
      return null;
    }
  },

  setSession(session: StudentSession) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  isAuthenticated(): boolean {
    return this.getSession() !== null;
  },

  getStudentId(): string | null {
    const session = this.getSession();
    return session?.student_id || null;
  },
};
