/*
  # Fix student video access policy role

  1. Changes
    - Drop the incorrect public role policy
    - Update the existing authenticated policy to include enrolled students
    - This allows both course creators and enrolled students to view videos

  2. Security
    - Students can only view completed videos
    - Students can only view videos for courses they're enrolled in
    - Course creators can view all their videos
*/

-- Drop the public role policy that doesn't work for authenticated users
DROP POLICY IF EXISTS "Enrolled students can view completed video assets" ON video_assets;

-- Update the existing authenticated policy to include enrolled students
DROP POLICY IF EXISTS "Users can view video assets for their courses" ON video_assets;

CREATE POLICY "Users and enrolled students can view video assets"
  ON video_assets
  FOR SELECT
  TO authenticated
  USING (
    -- Course creators can see all their videos
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = video_assets.course_id
      AND courses.user_id = auth.uid()
    )
    OR
    -- Enrolled students can see completed videos only
    (
      generation_status = 'completed'
      AND EXISTS (
        SELECT 1 FROM student_course_enrollments
        WHERE student_course_enrollments.course_id = video_assets.course_id
        AND student_course_enrollments.user_id = auth.uid()
      )
    )
  );
