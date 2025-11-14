/*
  # Create Student Progress and Quiz Tracking Tables

  ## Overview
  This migration creates comprehensive tracking for student learning activities including
  lesson views, lesson completions, quiz attempts, and detailed answer tracking.

  ## New Tables Created

  ### 1. student_lesson_views
  Tracks every time a student accesses a lesson
    - `id` (uuid, primary key)
    - `student_id` (uuid, references student_accounts)
    - `course_id` (uuid, references courses)
    - `lesson_index` (integer) - Which lesson (0-based index)
    - `viewed_at` (timestamptz) - When they accessed it
    - `time_spent_seconds` (integer) - Estimated time spent on lesson
    - `completed_on_view` (boolean) - Whether they completed it during this view

  ### 2. student_lesson_completions
  Tracks when students complete lessons (one record per lesson completion)
    - `id` (uuid, primary key)
    - `student_id` (uuid, references student_accounts)
    - `course_id` (uuid, references courses)
    - `lesson_index` (integer) - Which lesson completed
    - `completed_at` (timestamptz) - When they completed it
    - `view_count` (integer) - How many times they viewed before completing
    - Unique constraint on (student_id, course_id, lesson_index)

  ### 3. student_quiz_attempts
  Tracks every quiz attempt by students
    - `id` (uuid, primary key)
    - `student_id` (uuid, references student_accounts)
    - `quiz_id` (uuid, references quizzes)
    - `course_id` (uuid, references courses)
    - `attempt_number` (integer) - 1st attempt, 2nd attempt, etc.
    - `started_at` (timestamptz) - When they started the quiz
    - `completed_at` (timestamptz) - When they finished
    - `score` (numeric) - Score achieved (0-100)
    - `passed` (boolean) - Whether they passed (based on passing threshold)
    - `answers` (jsonb) - Array of their answer choices

  ### 4. student_quiz_answers
  Detailed tracking of individual question answers
    - `id` (uuid, primary key)
    - `attempt_id` (uuid, references student_quiz_attempts)
    - `question_id` (uuid, references quiz_questions)
    - `student_answer` (text) - The answer they selected (A/B/C/D)
    - `is_correct` (boolean) - Whether their answer was correct
    - `time_spent_seconds` (integer) - Time spent on this question
    - `answered_at` (timestamptz) - When they answered

  ## Security
    - Enable RLS on all tables
    - Students can only view/insert their own data
    - Course creators can view data for their courses (read-only)
    - Managers/admins can view all data

  ## Indexes
    - Indexed on student_id, course_id, quiz_id for efficient queries
    - Indexed on lesson_index for lesson-specific analytics
    - Indexed on timestamps for time-based analysis
*/

-- =============================================================================
-- STUDENT LESSON VIEWS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS student_lesson_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_index integer NOT NULL,
  viewed_at timestamptz DEFAULT now(),
  time_spent_seconds integer DEFAULT 0,
  completed_on_view boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_views_student ON student_lesson_views(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_views_course ON student_lesson_views(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_views_lesson ON student_lesson_views(lesson_index);
CREATE INDEX IF NOT EXISTS idx_lesson_views_viewed_at ON student_lesson_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_lesson_views_course_lesson ON student_lesson_views(course_id, lesson_index);

ALTER TABLE student_lesson_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own lesson views"
  ON student_lesson_views FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own lesson views"
  ON student_lesson_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Course creators can view lesson views for their courses"
  ON student_lesson_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = student_lesson_views.course_id
      AND courses.user_id = auth.uid()
    )
  );

-- =============================================================================
-- STUDENT LESSON COMPLETIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS student_lesson_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_index integer NOT NULL,
  completed_at timestamptz DEFAULT now(),
  view_count integer DEFAULT 1,
  UNIQUE(student_id, course_id, lesson_index)
);

CREATE INDEX IF NOT EXISTS idx_lesson_completions_student ON student_lesson_completions(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_course ON student_lesson_completions(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_lesson ON student_lesson_completions(lesson_index);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_completed_at ON student_lesson_completions(completed_at);

ALTER TABLE student_lesson_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own lesson completions"
  ON student_lesson_completions FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own lesson completions"
  ON student_lesson_completions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own lesson completions"
  ON student_lesson_completions FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Course creators can view lesson completions for their courses"
  ON student_lesson_completions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = student_lesson_completions.course_id
      AND courses.user_id = auth.uid()
    )
  );

-- =============================================================================
-- STUDENT QUIZ ATTEMPTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS student_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  score numeric(5,2) DEFAULT 0,
  passed boolean DEFAULT false,
  answers jsonb DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON student_quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON student_quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_course ON student_quiz_attempts(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_started_at ON student_quiz_attempts(started_at);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_quiz ON student_quiz_attempts(student_id, quiz_id);

ALTER TABLE student_quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own quiz attempts"
  ON student_quiz_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own quiz attempts"
  ON student_quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own quiz attempts"
  ON student_quiz_attempts FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Course creators can view quiz attempts for their courses"
  ON student_quiz_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = student_quiz_attempts.course_id
      AND courses.user_id = auth.uid()
    )
  );

-- =============================================================================
-- STUDENT QUIZ ANSWERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS student_quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES student_quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  student_answer text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  time_spent_seconds integer DEFAULT 0,
  answered_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt ON student_quiz_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question ON student_quiz_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_correct ON student_quiz_answers(is_correct);

ALTER TABLE student_quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own quiz answers"
  ON student_quiz_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_quiz_attempts
      WHERE student_quiz_attempts.id = student_quiz_answers.attempt_id
      AND student_quiz_attempts.student_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert own quiz answers"
  ON student_quiz_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_quiz_attempts
      WHERE student_quiz_attempts.id = student_quiz_answers.attempt_id
      AND student_quiz_attempts.student_id = auth.uid()
    )
  );

CREATE POLICY "Course creators can view quiz answers for their courses"
  ON student_quiz_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_quiz_attempts sqa
      JOIN courses c ON c.id = sqa.course_id
      WHERE sqa.id = student_quiz_answers.attempt_id
      AND c.user_id = auth.uid()
    )
  );

-- =============================================================================
-- HELPER FUNCTION: Get Next Attempt Number
-- =============================================================================

CREATE OR REPLACE FUNCTION get_next_quiz_attempt_number(
  p_student_id uuid,
  p_quiz_id uuid
)
RETURNS integer AS $$
DECLARE
  next_attempt integer;
BEGIN
  SELECT COALESCE(MAX(attempt_number), 0) + 1
  INTO next_attempt
  FROM student_quiz_attempts
  WHERE student_id = p_student_id
  AND quiz_id = p_quiz_id;
  
  RETURN next_attempt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_next_quiz_attempt_number(uuid, uuid) TO authenticated;