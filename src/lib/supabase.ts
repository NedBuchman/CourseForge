import { createClient } from '@supabase/supabase-js';

// Fallback values for bolt.host development environment
// In production, these are replaced by environment variables from bolt.toml
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ghlgqldbnanecodnkmkz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobGdxbGRibmFuZWNvZG5rbWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MjA3NTEsImV4cCI6MjA3NzQ5Njc1MX0.RI0zVuVpwVi0v0sNSTUbtIvvVSU5J54WHuuCXww5KxE';

console.log('Supabase Configuration:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  url: supabaseUrl ? supabaseUrl : 'undefined',
});

let supabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration error:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'undefined',
  });
  console.warn(
    'Missing Supabase environment variables. App will show configuration error.'
  );
  supabaseClient = null;
} else {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
  console.log('Supabase client initialized successfully');
}

export const supabase = supabaseClient as ReturnType<typeof createClient>;

export function validateSupabaseConfig(): { isValid: boolean; error?: string } {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      isValid: false,
      error: 'Supabase environment variables are not configured',
    };
  }
  return { isValid: true };
}
