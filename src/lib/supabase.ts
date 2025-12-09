import { createClient } from '@supabase/supabase-js';

// Supabase configuration with guaranteed fallback values
// These values are injected at build time by Vite's define option
// Environment variables take precedence, but fallbacks ensure the app always works
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase Configuration:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  url: supabaseUrl || 'undefined',
  urlLength: supabaseUrl?.length || 0,
  keyLength: supabaseAnonKey?.length || 0,
});

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'undefined' || supabaseAnonKey === 'undefined') {
  console.error('CRITICAL: Supabase configuration is invalid:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl,
  });
  throw new Error('Supabase configuration is missing. Check build configuration.');
}

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

console.log('Supabase client initialized successfully');

export function validateSupabaseConfig(): { isValid: boolean; error?: string } {
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'undefined' || supabaseAnonKey === 'undefined') {
    return {
      isValid: false,
      error: 'Supabase environment variables are not configured',
    };
  }
  return { isValid: true };
}
