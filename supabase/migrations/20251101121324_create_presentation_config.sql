/*
  # Create Presentation Configuration Table

  1. New Tables
    - `presentation_configs`
      - `id` (uuid, primary key)
      - `course_id` (uuid, foreign key to courses, unique)
      - `theme` (text, selected theme: 'modern', 'vibrant', 'academic', 'tech')
      - `logo_url` (text, URL to uploaded logo, nullable)
      - `primary_color` (text, hex color code)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Storage
    - Create storage bucket for course logos
    - Enable public access for logo files

  3. Security
    - Enable RLS on presentation_configs table
    - Add policies for authenticated users to manage their course presentation configs
    - Add storage policies for logo uploads
*/

-- Create presentation_configs table
CREATE TABLE IF NOT EXISTS presentation_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'modern',
  logo_url text,
  primary_color text NOT NULL DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE presentation_configs ENABLE ROW LEVEL SECURITY;

-- Policies for presentation_configs
CREATE POLICY "Users can view presentation configs for their courses"
  ON presentation_configs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = presentation_configs.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert presentation configs for their courses"
  ON presentation_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = presentation_configs.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update presentation configs for their courses"
  ON presentation_configs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = presentation_configs.course_id
      AND courses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = presentation_configs.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete presentation configs for their courses"
  ON presentation_configs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = presentation_configs.course_id
      AND courses.user_id = auth.uid()
    )
  );

-- Create storage bucket for course logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-logos', 'course-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for course logos
CREATE POLICY "Users can upload logos for their courses"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'course-logos'
  );

CREATE POLICY "Users can view all logos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'course-logos');

CREATE POLICY "Users can update their logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'course-logos');

CREATE POLICY "Users can delete their logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'course-logos');

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_presentation_configs_course_id ON presentation_configs(course_id);