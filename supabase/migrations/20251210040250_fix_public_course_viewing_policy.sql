/*
  # Fix public course viewing policy

  1. Changes
    - Update RLS policy to check published_status = 'published' instead of status = 'completed'
    - This aligns with the actual field used in the application
    
  2. Security
    - Only published courses are visible to public
    - Students can only SELECT, not modify courses
    - Maintains existing policies for course creators
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can view completed courses" ON courses;

-- Allow anyone to view published courses
CREATE POLICY "Anyone can view published courses"
  ON courses
  FOR SELECT
  TO public
  USING (published_status = 'published');
