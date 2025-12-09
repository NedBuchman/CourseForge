import { createClient } from '@supabase/supabase-js';

// Fallback values for bolt.host development environment
// In production, these are replaced by environment variables from bolt.toml
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ghlgqldbnanecodnkmkz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobGdxbGRibmFuZWNvZG5rbWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MjA3NTEsImV4cCI6MjA3NzQ5Njc1MX0.RI0zVuVpwVi0v0sNSTUbtIvvVSU5J54WHuuCXww5KxE';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration error:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'undefined',
  });
  throw new Error(
    'Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export function validateSupabaseConfig(): { isValid: boolean; error?: string } {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      isValid: false,
      error: 'Supabase environment variables are not configured',
    };
  }
  return { isValid: true };
}
