/*
  # Create Course Materials Storage Bucket

  1. Storage
    - Create storage bucket for course reference materials uploaded by users
    - Private bucket (not publicly accessible)
    - Files organized by user_id/course_id structure

  2. Security
    - Add RLS policies for storage objects
    - Users can only upload to their own folder
    - Users can only view their own files
    - Users can update and delete their own files
*/

-- Create storage bucket for course materials
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for course materials

CREATE POLICY "Users can upload their own course materials"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'course-materials' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own course materials"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'course-materials'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own course materials"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'course-materials'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own course materials"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'course-materials'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );