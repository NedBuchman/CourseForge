/*
  # Add public access to landing page configs

  1. Changes
    - Add SELECT policy for public users to view landing page configs for published courses
    - This allows students to preview course landing pages before enrolling

  2. Security
    - Only landing pages for published courses are viewable
    - Users can only SELECT, not modify landing pages
    - Maintains existing policies for course creators
*/

-- Drop policy if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'landing_page_configs' 
    AND policyname = 'Anyone can view landing pages for published courses'
  ) THEN
    DROP POLICY "Anyone can view landing pages for published courses" ON landing_page_configs;
  END IF;
END $$;

-- Allow anyone to view landing pages for published courses
CREATE POLICY "Anyone can view landing pages for published courses"
  ON landing_page_configs
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = landing_page_configs.course_id
      AND courses.published_status = 'published'
    )
  );
