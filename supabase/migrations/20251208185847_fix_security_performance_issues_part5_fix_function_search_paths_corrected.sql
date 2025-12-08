/*
  # Fix Security and Performance Issues - Part 5: Fix Function Search Paths (Corrected)

  ## Changes
  This migration fixes security issues with functions that have mutable search paths.
  Functions with mutable search paths can be vulnerable to search_path manipulation attacks.
  
  ### Functions Fixed (20 total):
  - update_student_updated_at
  - update_course_access_updated_at
  - get_platform_stats
  - get_platform_overview
  - get_user_growth_daily
  - get_user_growth_by_period
  - get_course_creation_funnel
  - get_course_video_stats
  - get_next_video_in_queue
  - update_video_assets_updated_at
  - handle_new_user
  - handle_updated_at
  - get_course_metrics
  - log_security_event
  - is_manager_or_admin
  - get_next_quiz_attempt_number
  - get_course_analytics_overview
  - get_lesson_analytics
  - get_difficult_questions
  - get_students_by_course
  
  ### Security Impact:
  - Prevents search_path manipulation attacks
  - Ensures functions always resolve to correct schema objects
  - Follows PostgreSQL security best practices
  
  ### Implementation:
  All functions are altered to set `search_path = ''` which forces explicit schema qualification
  for all objects, preventing ambiguity and potential security issues.
*/

-- Set immutable search_path for trigger functions
ALTER FUNCTION public.update_student_updated_at() SET search_path = '';
ALTER FUNCTION public.update_course_access_updated_at() SET search_path = '';
ALTER FUNCTION public.update_video_assets_updated_at() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.handle_updated_at() SET search_path = '';

-- Set immutable search_path for analytics functions
ALTER FUNCTION public.get_platform_stats() SET search_path = '';
ALTER FUNCTION public.get_platform_overview() SET search_path = '';
ALTER FUNCTION public.get_user_growth_daily() SET search_path = '';
ALTER FUNCTION public.get_user_growth_by_period(integer) SET search_path = '';
ALTER FUNCTION public.get_course_creation_funnel() SET search_path = '';
ALTER FUNCTION public.get_course_video_stats(uuid) SET search_path = '';
ALTER FUNCTION public.get_course_metrics(uuid) SET search_path = '';
ALTER FUNCTION public.get_course_analytics_overview(uuid) SET search_path = '';
ALTER FUNCTION public.get_lesson_analytics(uuid) SET search_path = '';
ALTER FUNCTION public.get_difficult_questions(uuid, numeric) SET search_path = '';
ALTER FUNCTION public.get_students_by_course(uuid) SET search_path = '';

-- Set immutable search_path for queue management functions
ALTER FUNCTION public.get_next_video_in_queue() SET search_path = '';

-- Set immutable search_path for utility functions
ALTER FUNCTION public.log_security_event(text, text, text, text, text, jsonb) SET search_path = '';
ALTER FUNCTION public.is_manager_or_admin() SET search_path = '';
ALTER FUNCTION public.get_next_quiz_attempt_number(uuid, uuid) SET search_path = '';
