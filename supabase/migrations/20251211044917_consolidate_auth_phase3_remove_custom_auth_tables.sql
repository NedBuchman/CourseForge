/*
  # Auth Consolidation Phase 3: Remove Custom Authentication Tables

  ## Overview
  This migration removes the custom student authentication system.
  All authentication now goes through Supabase Auth.

  ## Changes
  
  ### 1. Drop Custom Auth Tables
  - Drop student_sessions (Supabase Auth handles sessions)
  - Drop student_accounts (users now in auth.users)
  
  ### 2. Update Functions
  - Update get_next_quiz_attempt_number to use user_id
  - Remove student_id parameters
  
  ### 3. Clean up foreign keys
  - Remove broken student_id foreign key references
  
  ## Security
  - All authentication now through Supabase Auth
  - RLS policies already updated to use auth.uid()
*/

-- ============================================================================
-- DROP CUSTOM AUTH TABLES
-- ============================================================================

-- Drop student_sessions table (Supabase Auth handles sessions)
DROP TABLE IF EXISTS student_sessions CASCADE;

-- Drop student_accounts table (users now in auth.users with roles)
DROP TABLE IF EXISTS student_accounts CASCADE;

-- ============================================================================
-- UPDATE DATABASE FUNCTIONS
-- ============================================================================

-- Drop old function and recreate with user_id parameter
DROP FUNCTION IF EXISTS get_next_quiz_attempt_number(uuid, uuid);

CREATE OR REPLACE FUNCTION get_next_quiz_attempt_number(
  p_user_id uuid,
  p_quiz_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_attempt integer;
BEGIN
  SELECT COALESCE(MAX(attempt_number), 0) INTO v_max_attempt
  FROM student_quiz_attempts
  WHERE user_id = p_user_id
    AND quiz_id = p_quiz_id;
  
  RETURN v_max_attempt + 1;
END;
$$;

-- ============================================================================
-- REMOVE student_id COLUMNS (keep for now, will be dropped after data sync)
-- ============================================================================

-- Make student_id nullable since we're transitioning to user_id
DO $$
BEGIN
  -- student_course_enrollments
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_course_enrollments' AND column_name = 'student_id'
  ) THEN
    ALTER TABLE student_course_enrollments ALTER COLUMN student_id DROP NOT NULL;
    COMMENT ON COLUMN student_course_enrollments.student_id IS 'DEPRECATED: Use user_id instead';
  END IF;

  -- student_lesson_completions
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_lesson_completions' AND column_name = 'student_id'
  ) THEN
    ALTER TABLE student_lesson_completions ALTER COLUMN student_id DROP NOT NULL;
    COMMENT ON COLUMN student_lesson_completions.student_id IS 'DEPRECATED: Use user_id instead';
  END IF;

  -- student_lesson_views
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_lesson_views' AND column_name = 'student_id'
  ) THEN
    ALTER TABLE student_lesson_views ALTER COLUMN student_id DROP NOT NULL;
    COMMENT ON COLUMN student_lesson_views.student_id IS 'DEPRECATED: Use user_id instead';
  END IF;

  -- student_quiz_attempts
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_quiz_attempts' AND column_name = 'student_id'
  ) THEN
    ALTER TABLE student_quiz_attempts ALTER COLUMN student_id DROP NOT NULL;
    COMMENT ON COLUMN student_quiz_attempts.student_id IS 'DEPRECATED: Use user_id instead';
  END IF;

  -- lesson_video_views
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_video_views' AND column_name = 'student_id'
  ) THEN
    ALTER TABLE lesson_video_views ALTER COLUMN student_id DROP NOT NULL;
    COMMENT ON COLUMN lesson_video_views.student_id IS 'DEPRECATED: Use user_id instead';
  END IF;

  -- course_access_control
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_access_control' AND column_name = 'student_id'
  ) THEN
    ALTER TABLE course_access_control ALTER COLUMN student_id DROP NOT NULL;
    COMMENT ON COLUMN course_access_control.student_id IS 'DEPRECATED: Use user_id instead';
  END IF;

  -- course_certificates
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_certificates' AND column_name = 'student_id'
  ) THEN
    ALTER TABLE course_certificates ALTER COLUMN student_id DROP NOT NULL;
    COMMENT ON COLUMN course_certificates.student_id IS 'DEPRECATED: Use user_id instead';
  END IF;
END $$;

-- ============================================================================
-- ENSURE user_id columns exist and have proper defaults
-- ============================================================================

-- Set default for user_id columns to use auth.uid()
DO $$
BEGIN
  -- student_course_enrollments
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_course_enrollments' 
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE student_course_enrollments ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;

  -- student_lesson_completions
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_lesson_completions' 
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE student_lesson_completions ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;

  -- student_lesson_views
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_lesson_views' 
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE student_lesson_views ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;

  -- student_quiz_attempts
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_quiz_attempts' 
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE student_quiz_attempts ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;

  -- lesson_video_views
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_video_views' 
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE lesson_video_views ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;

  -- course_access_control
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_access_control' 
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE course_access_control ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;

  -- course_certificates
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_certificates' 
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE course_certificates ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;
