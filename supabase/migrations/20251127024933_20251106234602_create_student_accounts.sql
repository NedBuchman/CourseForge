/*
  # Create Student Account System

  1. New Tables
    - `student_accounts`
      - `id` (uuid, primary key)
      - `email` (text, unique, not null)
      - `password_hash` (text, not null) - bcrypt hashed password
      - `first_name` (text)
      - `last_name` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `last_login_at` (timestamptz)
      - `email_verified` (boolean, default false)
      - `verification_token` (text)
      - `reset_password_token` (text)
      - `reset_password_expires` (timestamptz)

    - `student_course_enrollments`
      - `id` (uuid, primary key)
      - `student_id` (uuid, references student_accounts)
      - `course_id` (uuid, references courses)
      - `enrolled_at` (timestamptz)
      - `progress` (jsonb) - track lesson completion
      - `completed_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Students can only read/update their own account
    - Students can only read their own enrollments

  3. Important Notes
    - This is completely separate from the CourseForge creator accounts
    - Password hashing will be handled by edge functions
    - Students authenticate separately from course creators
*/

-- Create student_accounts table
CREATE TABLE IF NOT EXISTS student_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  first_name text,
  last_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login_at timestamptz,
  email_verified boolean DEFAULT false,
  verification_token text,
  reset_password_token text,
  reset_password_expires timestamptz
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_accounts_email ON student_accounts(email);

-- Create index on reset token for password reset flow
CREATE INDEX IF NOT EXISTS idx_student_accounts_reset_token ON student_accounts(reset_password_token);

-- Enable RLS
ALTER TABLE student_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_accounts
CREATE POLICY "Students can read own account"
  ON student_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Students can update own account"
  ON student_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create student_course_enrollments table
CREATE TABLE IF NOT EXISTS student_course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  progress jsonb DEFAULT '{"completed_lessons": [], "quiz_scores": {}, "last_accessed_lesson": null}'::jsonb,
  completed_at timestamptz,
  UNIQUE(student_id, course_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON student_course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON student_course_enrollments(course_id);

-- Enable RLS
ALTER TABLE student_course_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_course_enrollments
CREATE POLICY "Students can view own enrollments"
  ON student_course_enrollments FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students can update own enrollments"
  ON student_course_enrollments FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can enroll in courses"
  ON student_course_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

-- Add updated_at trigger for student_accounts
CREATE OR REPLACE FUNCTION update_student_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_student_accounts_updated_at'
  ) THEN
    CREATE TRIGGER update_student_accounts_updated_at
      BEFORE UPDATE ON student_accounts
      FOR EACH ROW
      EXECUTE FUNCTION update_student_updated_at();
  END IF;
END $$;