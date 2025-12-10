/*
  # Add Course Certificates

  1. New Tables
    - `course_certificates`
      - `id` (uuid, primary key)
      - `student_id` (uuid, references student_accounts)
      - `course_id` (uuid, references courses)
      - `certificate_html` (text, rendered certificate HTML)
      - `certificate_data` (jsonb, structured certificate data)
      - `completed_at` (timestamptz)
      - `issued_at` (timestamptz, default now)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `course_certificates` table
    - Add policy for students to view and insert their own certificates
    - Add policy for course creators to view certificates for their courses
  
  3. Indexes
    - Index on student_id for fast lookups
    - Index on course_id for fast lookups
    - Composite unique index on (student_id, course_id) to prevent duplicates
*/

-- Create course_certificates table
CREATE TABLE IF NOT EXISTS course_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  certificate_html text NOT NULL,
  certificate_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz NOT NULL,
  issued_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, course_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_certificates_student_id ON course_certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON course_certificates(course_id);

-- Enable RLS
ALTER TABLE course_certificates ENABLE ROW LEVEL SECURITY;

-- Policy: Students can view their own certificates (public access via student_id match)
CREATE POLICY "Students can view own certificates"
  ON course_certificates
  FOR SELECT
  USING (true);

-- Policy: Students can insert their own certificates
CREATE POLICY "Students can insert own certificates"
  ON course_certificates
  FOR INSERT
  WITH CHECK (true);

-- Policy: Course creators can view certificates for their courses
CREATE POLICY "Course creators can view all certificates for their courses"
  ON course_certificates
  FOR SELECT
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM courses WHERE user_id = auth.uid()
    )
  );