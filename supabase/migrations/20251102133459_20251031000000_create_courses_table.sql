/*
  # Create Courses Table

  1. New Tables
    - `courses`
      - `id` (uuid, primary key) - Unique identifier for each course
      - `user_id` (uuid, foreign key) - Links course to the user who created it
      - `title` (text, nullable) - Course title/name
      - `topic` (text, nullable) - Course subject/topic
      - `status` (text, not null, default 'draft') - Course status (draft/generating/completed/failed)
      - `difficulty_level` (text, nullable) - Course difficulty (beginner/intermediate/advanced)
      - `target_audience` (text, nullable) - Description of intended audience
      - `created_at` (timestamp) - When the course was created
      - `updated_at` (timestamp) - Last update timestamp

  2. Security
    - Enable RLS on courses table
    - Add policies for authenticated users to manage only their own courses
    - Cascade deletes when user is deleted

  3. Indexes
    - Index on user_id for efficient course lookups by user
    - Index on status for filtering courses by status
*/

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  topic text,
  status text NOT NULL DEFAULT 'draft',
  difficulty_level text,
  target_audience text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses table

CREATE POLICY "Users can view their own courses"
  ON courses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own courses"
  ON courses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own courses"
  ON courses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at DESC);