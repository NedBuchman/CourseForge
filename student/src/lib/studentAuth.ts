import { supabase } from './supabase';

export interface StudentSession {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface StudentAuthResponse {
  success: boolean;
  data?: StudentSession;
  error?: string;
}

export const studentAuth = {
  async register(email: string, password: string, firstName: string, lastName: string): Promise<StudentAuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Registration failed' };
      }

      return {
        success: true,
        data: {
          user_id: data.user.id,
          email: data.user.email!,
          first_name: firstName,
          last_name: lastName,
        },
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error. Please check your connection and try again.' };
    }
  },

  async login(email: string, password: string): Promise<StudentAuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Invalid email or password' };
      }

      const firstName = data.user.user_metadata?.first_name || '';
      const lastName = data.user.user_metadata?.last_name || '';

      return {
        success: true,
        data: {
          user_id: data.user.id,
          email: data.user.email!,
          first_name: firstName,
          last_name: lastName,
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please check your connection and try again.' };
    }
  },

  async logout() {
    await supabase.auth.signOut();
  },

  async getSession(): Promise<StudentSession | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    return {
      user_id: session.user.id,
      email: session.user.email!,
      first_name: session.user.user_metadata?.first_name || '',
      last_name: session.user.user_metadata?.last_name || '',
    };
  },

  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  },

  async getUserId(): Promise<string | null> {
    const session = await this.getSession();
    return session?.user_id || null;
  },
};
