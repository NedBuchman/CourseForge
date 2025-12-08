/*
  # Fix Security and Performance Issues - Part 4: Remove Unused Indexes

  ## Changes
  This migration removes unused indexes that add storage overhead and slow down write operations
  without providing query benefits.
  
  ### Indexes Removed (43 total):
  
  **Quizzes:**
  - idx_quizzes_module_index
  
  **Student Accounts:**
  - idx_student_accounts_email
  - idx_student_accounts_reset_token
  
  **Student Course Enrollments:**
  - idx_enrollments_student
  
  **Course Access Control:**
  - idx_course_access_student
  - idx_course_access_course
  - idx_course_access_expires
  
  **Course Visibility:**
  - idx_course_visibility_discoverable
  - idx_course_visibility_featured
  
  **Student Sessions:**
  - idx_student_sessions_student
  - idx_student_sessions_token
  - idx_student_sessions_expires
  
  **Course Invitations:**
  - idx_course_invitations_email
  - idx_course_invitations_token
  - idx_course_invitations_status
  
  **Security Audit Log:**
  - idx_security_audit_log_created_at
  - idx_security_audit_log_user_id
  - idx_security_audit_log_event_type
  
  **Student Lesson Views:**
  - idx_lesson_views_student
  - idx_lesson_views_course
  - idx_lesson_views_lesson
  - idx_lesson_views_viewed_at
  
  **Student Lesson Completions:**
  - idx_lesson_completions_student
  - idx_lesson_completions_lesson
  - idx_lesson_completions_completed_at
  
  **User Roles:**
  - idx_user_roles_user_id
  - idx_user_roles_role
  
  **Student Quiz Attempts:**
  - idx_quiz_attempts_student
  - idx_quiz_attempts_started_at
  - idx_quiz_attempts_student_quiz
  
  **Student Quiz Answers:**
  - idx_quiz_answers_attempt
  - idx_quiz_answers_correct
  
  **Courses:**
  - idx_courses_verification_status
  - idx_courses_generation_job_id
  - idx_courses_presentation_status
  - idx_courses_landing_page_status
  - idx_courses_current_step
  - idx_courses_content_format
  - idx_courses_video_generation_status
  - idx_courses_video_generation_started
  - idx_courses_videos_status
  
  **Video Assets:**
  - idx_video_assets_asset_type
  - idx_video_assets_provider_id
  
  **Video Generation Queue:**
  - idx_video_queue_status
  - idx_video_queue_priority
  
  ### Performance Impact:
  - Reduces storage footprint
  - Improves INSERT/UPDATE/DELETE performance
  - Reduces index maintenance overhead
  
  ### Note:
  These indexes were identified as unused by Supabase monitoring.
  If query patterns change in the future, indexes can be re-added as needed.
*/

-- Quizzes
DROP INDEX IF EXISTS public.idx_quizzes_module_index;

-- Student Accounts
DROP INDEX IF EXISTS public.idx_student_accounts_email;
DROP INDEX IF EXISTS public.idx_student_accounts_reset_token;

-- Student Course Enrollments
DROP INDEX IF EXISTS public.idx_enrollments_student;

-- Course Access Control
DROP INDEX IF EXISTS public.idx_course_access_student;
DROP INDEX IF EXISTS public.idx_course_access_course;
DROP INDEX IF EXISTS public.idx_course_access_expires;

-- Course Visibility
DROP INDEX IF EXISTS public.idx_course_visibility_discoverable;
DROP INDEX IF EXISTS public.idx_course_visibility_featured;

-- Student Sessions
DROP INDEX IF EXISTS public.idx_student_sessions_student;
DROP INDEX IF EXISTS public.idx_student_sessions_token;
DROP INDEX IF EXISTS public.idx_student_sessions_expires;

-- Course Invitations
DROP INDEX IF EXISTS public.idx_course_invitations_email;
DROP INDEX IF EXISTS public.idx_course_invitations_token;
DROP INDEX IF EXISTS public.idx_course_invitations_status;

-- Security Audit Log
DROP INDEX IF EXISTS public.idx_security_audit_log_created_at;
DROP INDEX IF EXISTS public.idx_security_audit_log_user_id;
DROP INDEX IF EXISTS public.idx_security_audit_log_event_type;

-- Student Lesson Views
DROP INDEX IF EXISTS public.idx_lesson_views_student;
DROP INDEX IF EXISTS public.idx_lesson_views_course;
DROP INDEX IF EXISTS public.idx_lesson_views_lesson;
DROP INDEX IF EXISTS public.idx_lesson_views_viewed_at;

-- Student Lesson Completions
DROP INDEX IF EXISTS public.idx_lesson_completions_student;
DROP INDEX IF EXISTS public.idx_lesson_completions_lesson;
DROP INDEX IF EXISTS public.idx_lesson_completions_completed_at;

-- User Roles
DROP INDEX IF EXISTS public.idx_user_roles_user_id;
DROP INDEX IF EXISTS public.idx_user_roles_role;

-- Student Quiz Attempts
DROP INDEX IF EXISTS public.idx_quiz_attempts_student;
DROP INDEX IF EXISTS public.idx_quiz_attempts_started_at;
DROP INDEX IF EXISTS public.idx_quiz_attempts_student_quiz;

-- Student Quiz Answers
DROP INDEX IF EXISTS public.idx_quiz_answers_attempt;
DROP INDEX IF EXISTS public.idx_quiz_answers_correct;

-- Courses
DROP INDEX IF EXISTS public.idx_courses_verification_status;
DROP INDEX IF EXISTS public.idx_courses_generation_job_id;
DROP INDEX IF EXISTS public.idx_courses_presentation_status;
DROP INDEX IF EXISTS public.idx_courses_landing_page_status;
DROP INDEX IF EXISTS public.idx_courses_current_step;
DROP INDEX IF EXISTS public.idx_courses_content_format;
DROP INDEX IF EXISTS public.idx_courses_video_generation_status;
DROP INDEX IF EXISTS public.idx_courses_video_generation_started;
DROP INDEX IF EXISTS public.idx_courses_videos_status;

-- Video Assets
DROP INDEX IF EXISTS public.idx_video_assets_asset_type;
DROP INDEX IF EXISTS public.idx_video_assets_provider_id;

-- Video Generation Queue
DROP INDEX IF EXISTS public.idx_video_queue_status;
DROP INDEX IF EXISTS public.idx_video_queue_priority;
