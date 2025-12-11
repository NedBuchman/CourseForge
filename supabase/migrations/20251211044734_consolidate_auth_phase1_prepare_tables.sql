/*
  # Auth Consolidation Phase 1: Prepare Tables for Unified Authentication

  ## Overview
  This migration prepares all tables to use Supabase Auth exclusively.
  Students will migrate from custom `student_accounts` to `auth.users`.

  ## Changes
  
  ### 1. Add user_id columns where missing
  - Add `user_id` to tables that only have `student_id`
  - Make nullable initially for transition period
  
  ### 2. Update constraints
  - Ensure all user_id columns will reference auth.users
  
  ### 3. Preserve existing data
  - No data deletion in this phase
  - Maintain backward compatibility temporarily
  
  ## Security
  - RLS policies updated in subsequent migration
  - No breaking changes to existing functionality yet
*/

-- Add user_id to student_lesson_completions (currently only has student_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_lesson_completions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE student_lesson_completions ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_student_lesson_completions_user_id ON student_lesson_completions(user_id);
  END IF;
END $$;

-- Add user_id to student_lesson_views (currently only has student_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_lesson_views' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE student_lesson_views ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_student_lesson_views_user_id ON student_lesson_views(user_id);
  END IF;
END $$;

-- Add user_id to student_quiz_attempts (currently only has student_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_quiz_attempts' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE student_quiz_attempts ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_student_quiz_attempts_user_id ON student_quiz_attempts(user_id);
  END IF;
END $$;

-- Add user_id to lesson_video_views if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_video_views' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE lesson_video_views ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_lesson_video_views_user_id ON lesson_video_views(user_id);
  END IF;
END $$;

-- Add user_id to course_access_control if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_access_control' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE course_access_control ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_course_access_control_user_id ON course_access_control(user_id);
  END IF;
END $$;

-- Add user_id to course_certificates if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_certificates' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE course_certificates ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_course_certificates_user_id ON course_certificates(user_id);
  END IF;
END $$;

-- Update student_course_enrollments to ensure proper foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_course_enrollments' AND column_name = 'user_id'
  ) THEN
    -- Drop existing constraint if any
    ALTER TABLE student_course_enrollments DROP CONSTRAINT IF EXISTS student_course_enrollments_user_id_fkey;
    -- Add proper foreign key constraint
    ALTER TABLE student_course_enrollments ADD CONSTRAINT student_course_enrollments_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS idx_student_course_enrollments_user_id ON student_course_enrollments(user_id);

-- Add comment explaining the transition
COMMENT ON TABLE student_accounts IS 'DEPRECATED: Migrating to auth.users. This table will be removed after data migration.';
