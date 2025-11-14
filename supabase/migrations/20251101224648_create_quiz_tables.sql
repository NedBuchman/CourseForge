/*
  # Create Quiz Tables

  1. New Tables
    - `quizzes`
      - `id` (uuid, primary key) - Unique identifier for each quiz
      - `course_id` (uuid, foreign key) - Links quiz to a course
      - `title` (text) - Quiz title/name (e.g., "Introduction to Python Quiz")
      - `module_index` (integer) - Lesson number this quiz belongs to
      - `approved` (boolean) - Whether the quiz has been reviewed and approved
      - `created_at` (timestamp) - When the quiz was created
      - `updated_at` (timestamp) - Last update timestamp

    - `quiz_questions`
      - `id` (uuid, primary key) - Unique identifier for each question
      - `quiz_id` (uuid, foreign key) - Links question to a quiz
      - `question_text` (text) - The actual question text
      - `question_type` (text) - Type of question (default: 'single-answer')
      - `options` (jsonb) - Array of 4 answer options (A, B, C, D)
      - `correct_answer` (text) - Single letter indicating correct option (A/B/C/D)
      - `explanation` (text) - Explanation of why the answer is correct
      - `order_index` (integer) - Order of question within the quiz
      - `created_at` (timestamp) - When the question was created
      - `updated_at` (timestamp) - Last update timestamp

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage quizzes for their courses only
    - Cascade deletes when parent records are removed

  3. Indexes
    - Index on course_id for efficient quiz lookups by course
    - Index on quiz_id for efficient question lookups by quiz
*/

-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  module_index integer NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create quiz_questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'single-answer',
  options jsonb NOT NULL,
  correct_answer text NOT NULL,
  explanation text NOT NULL DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on quizzes table
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on quiz_questions table
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quizzes table

CREATE POLICY "Users can view quizzes for their courses"
  ON quizzes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = quizzes.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert quizzes for their courses"
  ON quizzes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = quizzes.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update quizzes for their courses"
  ON quizzes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = quizzes.course_id
      AND courses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = quizzes.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete quizzes for their courses"
  ON quizzes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = quizzes.course_id
      AND courses.user_id = auth.uid()
    )
  );

-- RLS Policies for quiz_questions table

CREATE POLICY "Users can view questions for their quizzes"
  ON quiz_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      JOIN courses ON courses.id = quizzes.course_id
      WHERE quizzes.id = quiz_questions.quiz_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert questions for their quizzes"
  ON quiz_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes
      JOIN courses ON courses.id = quizzes.course_id
      WHERE quizzes.id = quiz_questions.quiz_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update questions for their quizzes"
  ON quiz_questions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      JOIN courses ON courses.id = quizzes.course_id
      WHERE quizzes.id = quiz_questions.quiz_id
      AND courses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes
      JOIN courses ON courses.id = quizzes.course_id
      WHERE quizzes.id = quiz_questions.quiz_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete questions for their quizzes"
  ON quiz_questions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      JOIN courses ON courses.id = quizzes.course_id
      WHERE quizzes.id = quiz_questions.quiz_id
      AND courses.user_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_module_index ON quizzes(module_index);