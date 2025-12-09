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
      console.log('Attempting registration for:', email);
      const response = await fetch(`${SUPABASE_URL}/functions/v1/student-auth?action=register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (!responseText) {
        return { success: false, error: 'Server returned empty response. Please try again.' };
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('JSON parse error:', e);
        return { success: false, error: 'Invalid server response. Please try again.' };
      }

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      const sessionData: StudentSession = {
        student_id: data.student.id,
        email: data.student.email,
        first_name: firstName,
        last_name: lastName,
        session_token: crypto.randomUUID(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      this.setSession(sessionData);
      return { success: true, data: sessionData };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error. Please check your connection and try again.' };
    }
  },

  async login(email: string, password: string): Promise<StudentAuthResponse> {
    try {
      console.log('Attempting login for:', email);
      const response = await fetch(`${SUPABASE_URL}/functions/v1/student-auth?action=login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      console.log('Response status:', response.status);

      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (!responseText) {
        return { success: false, error: 'Server returned empty response. Please try again.' };
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('JSON parse error:', e);
        return { success: false, error: 'Invalid server response. Please try again.' };
      }

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Invalid email or password' };
      }

      const sessionData: StudentSession = {
        student_id: data.student.id,
        email: data.student.email,
        first_name: data.student.first_name,
        last_name: data.student.last_name,
        session_token: crypto.randomUUID(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      this.setSession(sessionData);
      return { success: true, data: sessionData };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please check your connection and try again.' };
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
