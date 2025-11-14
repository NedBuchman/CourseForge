/*
  # Create Landing Page Configuration Table

  1. New Tables
    - `landing_page_configs`
      - `id` (uuid, primary key)
      - `course_id` (uuid, foreign key to courses, unique)
      - `course_headline` (text, catchy headline)
      - `value_proposition` (text, why take this course)
      - `audience_description` (text, who is this for)
      - `instructor_bio` (text, instructor credentials, nullable)
      - `page_style` (text, visual style: professional/modern/minimal/friendly)
      - `primary_color` (text, hex color code)
      - `secondary_color` (text, hex color code)
      - `hero_image_url` (text, uploaded hero image, nullable)
      - `cta_button_text` (text, enrollment button text)
      - `pricing_info` (text, pricing or access details, nullable)
      - `testimonials` (text, student testimonials, nullable)
      - `special_message` (text, unique selling point, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on landing_page_configs table
    - Add policies for authenticated users to manage their course landing page configs
    - Storage policies already exist for course-logos bucket (will be used for hero images)
*/

-- Create landing_page_configs table
CREATE TABLE IF NOT EXISTS landing_page_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
  course_headline text NOT NULL,
  value_proposition text NOT NULL,
  audience_description text NOT NULL,
  instructor_bio text,
  page_style text NOT NULL DEFAULT 'professional',
  primary_color text NOT NULL DEFAULT '#2d5a8c',
  secondary_color text NOT NULL DEFAULT '#10b981',
  hero_image_url text,
  cta_button_text text NOT NULL DEFAULT 'Enroll in Course',
  pricing_info text,
  testimonials text,
  special_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE landing_page_configs ENABLE ROW LEVEL SECURITY;

-- Policies for landing_page_configs
CREATE POLICY "Users can view landing page configs for their courses"
  ON landing_page_configs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = landing_page_configs.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert landing page configs for their courses"
  ON landing_page_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = landing_page_configs.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update landing page configs for their courses"
  ON landing_page_configs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = landing_page_configs.course_id
      AND courses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = landing_page_configs.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete landing page configs for their courses"
  ON landing_page_configs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = landing_page_configs.course_id
      AND courses.user_id = auth.uid()
    )
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_landing_page_configs_course_id ON landing_page_configs(course_id);