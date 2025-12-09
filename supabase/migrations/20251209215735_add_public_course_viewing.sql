/*
  # Add public course viewing for students

  1. Changes
    - Add SELECT policy for public users to view completed courses
    - This allows students (who aren't in the auth system) to browse courses

  2. Security
    - Only completed courses are visible
    - Students can only SELECT, not modify courses
    - Maintains existing policies for course creators
*/

-- Drop policy if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'courses' 
    AND policyname = 'Anyone can view completed courses'
  ) THEN
    DROP POLICY "Anyone can view completed courses" ON courses;
  END IF;
END $$;

-- Allow anyone to view completed courses
CREATE POLICY "Anyone can view completed courses"
  ON courses
  FOR SELECT
  TO public
  USING (status = 'completed');
