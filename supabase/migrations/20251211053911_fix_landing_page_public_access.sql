/*
  # Fix Landing Page Public Access

  1. Changes
    - Add public SELECT policy for landing_page_configs so students can view them
    - Add public SELECT policy for course-logos storage so hero images are visible
    - This allows landing pages to display properly for non-authenticated users

  2. Security
    - Only SELECT (read) access is granted to public
    - INSERT, UPDATE, DELETE remain restricted to course owners
*/

-- Allow public (unauthenticated) users to view landing page configs
CREATE POLICY "Public can view published landing pages"
  ON landing_page_configs FOR SELECT
  TO anon
  USING (true);

-- Allow public (unauthenticated) users to view course logos/hero images
CREATE POLICY "Public can view course logos"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'course-logos');