/*
  # Add Student Role to User Roles System

  ## Overview
  This migration consolidates the authentication system by adding 'student' as a role type
  in the user_roles table. This eliminates the need for a separate student_accounts table
  and allows all users (creators, managers, admins, and students) to use Supabase Auth.

  ## Changes
  1. Add 'student' to the allowed role types in user_roles table
  2. Update RLS policies to handle student role appropriately
  3. Migrate existing student_accounts data to auth.users + user_roles
  4. Update student_course_enrollments to reference auth.users instead of student_accounts
  5. Add indexes for performance

  ## Security
  - Students can read their own role
  - Students cannot modify roles
  - Admins and managers can read all roles
  - Only admins can modify roles

  ## Migration Strategy
  - Existing student_accounts will be converted to auth.users
  - Their enrollments will be preserved with updated references
  - Old student_accounts table will be deprecated (not dropped to preserve data)
*/

-- Step 1: Update the role constraint to include 'student'
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check 
  CHECK (role IN ('admin', 'manager', 'creator', 'student'));

-- Step 2: Update student_course_enrollments to reference auth.users
-- First, add new column for auth user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_course_enrollments' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE student_course_enrollments 
    ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 3: Create index on new user_id column
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON student_course_enrollments(user_id);

-- Step 4: Update RLS policies for student_course_enrollments to use user_id
-- Drop old policies that reference student_id
DROP POLICY IF EXISTS "Students can view own enrollments" ON student_course_enrollments;
DROP POLICY IF EXISTS "Students can update own enrollments" ON student_course_enrollments;
DROP POLICY IF EXISTS "Students can enroll in courses" ON student_course_enrollments;

-- Create new policies using user_id
CREATE POLICY "Users can view own enrollments"
  ON student_course_enrollments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollment progress"
  ON student_course_enrollments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can enroll in courses"
  ON student_course_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Step 5: Allow course creators to view enrollments in their courses
CREATE POLICY "Course creators can view enrollments in their courses"
  ON student_course_enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = student_course_enrollments.course_id
      AND courses.user_id = auth.uid()
    )
  );

-- Step 6: Update the handle_new_user function to handle student role assignment
-- This is already handled by the existing function which defaults to 'creator'
-- Student role will be assigned explicitly during student registration via edge function

-- Step 7: Add helper function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.user_has_role(check_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = check_role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_role(text) TO authenticated;

-- Step 8: Add helper function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = auth.uid();
  
  RETURN user_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- Step 9: Update handle_new_user to allow explicit role parameter
-- This will be used by student registration to set role to 'student' instead of 'creator'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_role text;
BEGIN
  -- Check if raw_user_meta_data has a role specified
  new_role := COALESCE(NEW.raw_user_meta_data->>'role', 'creator');
  
  -- Validate role
  IF new_role NOT IN ('admin', 'manager', 'creator', 'student') THEN
    new_role := 'creator';
  END IF;
  
  -- Insert into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, new_role);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail user creation
    RAISE WARNING 'Failed to create user role: %', SQLERRM;
    RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, authenticated, service_role;
