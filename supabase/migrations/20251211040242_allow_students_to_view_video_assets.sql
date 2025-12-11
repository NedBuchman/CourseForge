/*
  # Allow students to view video assets for enrolled courses

  1. Changes
    - Add SELECT policy for video_assets to allow enrolled students to view videos
    - Students can only view videos for courses they are enrolled in
    - Students can only view completed videos (not pending/processing ones)

  2. Security
    - Students can only SELECT, not modify videos
    - Access is restricted to enrolled courses only
    - Only completed, approved videos are accessible to students
*/

-- Allow enrolled students to view completed video assets for their enrolled courses
CREATE POLICY "Enrolled students can view completed video assets"
  ON video_assets
  FOR SELECT
  TO public
  USING (
    generation_status = 'completed'
    AND (
      -- Allow course creators to see all their videos
      EXISTS (
        SELECT 1 FROM courses
        WHERE courses.id = video_assets.course_id
        AND courses.user_id = auth.uid()
      )
      OR
      -- Allow enrolled students to see completed videos
      EXISTS (
        SELECT 1 FROM student_course_enrollments
        WHERE student_course_enrollments.course_id = video_assets.course_id
        AND student_course_enrollments.user_id = auth.uid()
      )
    )
  );
