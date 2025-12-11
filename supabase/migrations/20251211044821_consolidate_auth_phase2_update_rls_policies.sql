/*
  # Auth Consolidation Phase 2: Update All RLS Policies for Unified Auth

  ## Overview
  This migration replaces ALL RLS policies to use Supabase Auth (auth.uid()) exclusively.
  Removes broken student policies that relied on custom authentication.

  ## Changes
  
  ### 1. Student Table Policies
  - Replace student_id checks with user_id = auth.uid()
  - Remove hacky session token workarounds
  - Use consistent auth.uid() checks
  
  ### 2. Enrollment & Progress Policies  
  - Update to use user_id instead of student_id
  - Ensure proper creator access via courses.user_id
  
  ### 3. Remove Deprecated Policies
  - Drop all policies referencing student_accounts
  - Drop policies using custom session tokens
  
  ## Security
  - All policies now use auth.uid() consistently
  - Creators access via courses.user_id = auth.uid()
  - Students access via user_id = auth.uid()
  - Managers/admins use role-based checks
*/

-- ============================================================================
-- STUDENT ACCOUNTS: Remove old policies, add simple auth.uid() based ones
-- ============================================================================

DROP POLICY IF EXISTS "Students can read own account" ON student_accounts;
DROP POLICY IF EXISTS "Students can update own account" ON student_accounts;

-- Mark table for deprecation (will be removed in later migration)
COMMENT ON TABLE student_accounts IS 'DEPRECATED: Will be removed. Use auth.users + user_roles instead.';

-- ============================================================================
-- STUDENT COURSE ENROLLMENTS: Use user_id with auth.uid()
-- ============================================================================

DROP POLICY IF EXISTS "Users can enroll in courses" ON student_course_enrollments;
DROP POLICY IF EXISTS "Users can view own enrollments" ON student_course_enrollments;
DROP POLICY IF EXISTS "Users can update own enrollment progress" ON student_course_enrollments;
DROP POLICY IF EXISTS "Course creators can view enrollments in their courses" ON student_course_enrollments;

CREATE POLICY "Students can enroll in courses"
  ON student_course_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can view own enrollments"
  ON student_course_enrollments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Students can update own enrollment progress"
  ON student_course_enrollments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creators can view enrollments in their courses"
  ON student_course_enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = student_course_enrollments.course_id
        AND courses.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STUDENT LESSON COMPLETIONS: Use user_id with auth.uid()
-- ============================================================================

DROP POLICY IF EXISTS "Students can insert own lesson completions" ON student_lesson_completions;
DROP POLICY IF EXISTS "Students can view own lesson completions" ON student_lesson_completions;
DROP POLICY IF EXISTS "Students can update own lesson completions" ON student_lesson_completions;
DROP POLICY IF EXISTS "Course creators can view lesson completions for their courses" ON student_lesson_completions;

CREATE POLICY "Students can insert own lesson completions"
  ON student_lesson_completions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can view own lesson completions"
  ON student_lesson_completions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Students can update own lesson completions"
  ON student_lesson_completions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creators can view lesson completions in their courses"
  ON student_lesson_completions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = student_lesson_completions.course_id
        AND courses.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STUDENT LESSON VIEWS: Use user_id with auth.uid()
-- ============================================================================

DROP POLICY IF EXISTS "Students can insert own lesson views" ON student_lesson_views;
DROP POLICY IF EXISTS "Students can view own lesson views" ON student_lesson_views;
DROP POLICY IF EXISTS "Course creators can view lesson views for their courses" ON student_lesson_views;

CREATE POLICY "Students can insert own lesson views"
  ON student_lesson_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can view own lesson views"
  ON student_lesson_views FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Creators can view lesson views in their courses"
  ON student_lesson_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = student_lesson_views.course_id
        AND courses.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STUDENT QUIZ ATTEMPTS: Use user_id with auth.uid()
-- ============================================================================

DROP POLICY IF EXISTS "Students can insert own quiz attempts" ON student_quiz_attempts;
DROP POLICY IF EXISTS "Students can view own quiz attempts" ON student_quiz_attempts;
DROP POLICY IF EXISTS "Students can update own quiz attempts" ON student_quiz_attempts;
DROP POLICY IF EXISTS "Course creators can view quiz attempts for their courses" ON student_quiz_attempts;

CREATE POLICY "Students can insert own quiz attempts"
  ON student_quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can view own quiz attempts"
  ON student_quiz_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Students can update own quiz attempts"
  ON student_quiz_attempts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creators can view quiz attempts in their courses"
  ON student_quiz_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      JOIN courses ON courses.id = quizzes.course_id
      WHERE quizzes.id = student_quiz_attempts.quiz_id
        AND courses.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STUDENT QUIZ ANSWERS: Use user_id via attempts
-- ============================================================================

DROP POLICY IF EXISTS "Students can insert own quiz answers" ON student_quiz_answers;
DROP POLICY IF EXISTS "Students can view own quiz answers" ON student_quiz_answers;
DROP POLICY IF EXISTS "Course creators can view quiz answers for their courses" ON student_quiz_answers;

CREATE POLICY "Students can insert own quiz answers"
  ON student_quiz_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_quiz_attempts
      WHERE student_quiz_attempts.id = student_quiz_answers.attempt_id
        AND student_quiz_attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own quiz answers"
  ON student_quiz_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_quiz_attempts
      WHERE student_quiz_attempts.id = student_quiz_answers.attempt_id
        AND student_quiz_attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can view quiz answers in their courses"
  ON student_quiz_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_quiz_attempts
      JOIN quizzes ON quizzes.id = student_quiz_attempts.quiz_id
      JOIN courses ON courses.id = quizzes.course_id
      WHERE student_quiz_attempts.id = student_quiz_answers.attempt_id
        AND courses.user_id = auth.uid()
    )
  );

-- ============================================================================
-- QUIZ ACCESS: Update student access policies
-- ============================================================================

DROP POLICY IF EXISTS "Students can view approved quizzes for enrolled courses" ON quizzes;

CREATE POLICY "Students can view approved quizzes for enrolled courses"
  ON quizzes FOR SELECT
  TO authenticated
  USING (
    approved = true
    AND EXISTS (
      SELECT 1 FROM student_course_enrollments
      WHERE student_course_enrollments.course_id = quizzes.course_id
        AND student_course_enrollments.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can view questions for approved quizzes" ON quiz_questions;

CREATE POLICY "Students can view questions for approved quizzes"
  ON quiz_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      JOIN student_course_enrollments ON student_course_enrollments.course_id = quizzes.course_id
      WHERE quizzes.id = quiz_questions.quiz_id
        AND quizzes.approved = true
        AND student_course_enrollments.user_id = auth.uid()
    )
  );

-- ============================================================================
-- LESSON VIDEO VIEWS: Replace hacky session token check with auth.uid()
-- ============================================================================

DROP POLICY IF EXISTS "Students can create own video tracking" ON lesson_video_views;
DROP POLICY IF EXISTS "Students can update own video tracking" ON lesson_video_views;
DROP POLICY IF EXISTS "Students can view own video tracking" ON lesson_video_views;
DROP POLICY IF EXISTS "Course creators can view course video stats" ON lesson_video_views;

CREATE POLICY "Students can create own video tracking"
  ON lesson_video_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update own video tracking"
  ON lesson_video_views FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can view own video tracking"
  ON lesson_video_views FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Creators can view video stats for their courses"
  ON lesson_video_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lesson_video_views.course_id
        AND courses.user_id = auth.uid()
    )
  );

-- ============================================================================
-- COURSE ACCESS CONTROL: Use user_id with auth.uid()
-- ============================================================================

DROP POLICY IF EXISTS "Students view own access" ON course_access_control;

CREATE POLICY "Students can view own access"
  ON course_access_control FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- COURSE CERTIFICATES: Use user_id with auth.uid()
-- ============================================================================

DROP POLICY IF EXISTS "Students can insert own certificates" ON course_certificates;
DROP POLICY IF EXISTS "Students can view own certificates" ON course_certificates;

CREATE POLICY "Students can insert own certificates"
  ON course_certificates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can view own certificates"
  ON course_certificates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- STUDENT SESSIONS: Mark table for deprecation
-- ============================================================================

-- Drop all custom session policies
DROP POLICY IF EXISTS "Students create sessions" ON student_sessions;
DROP POLICY IF EXISTS "Students view own sessions" ON student_sessions;
DROP POLICY IF EXISTS "Students update own sessions" ON student_sessions;
DROP POLICY IF EXISTS "Students delete own sessions" ON student_sessions;

COMMENT ON TABLE student_sessions IS 'DEPRECATED: Will be removed. Supabase Auth handles sessions.';

-- ============================================================================
-- VIDEO ASSETS: Update student access to use user_id
-- ============================================================================

DROP POLICY IF EXISTS "Users and enrolled students can view video assets" ON video_assets;

CREATE POLICY "Creators and enrolled students can view video assets"
  ON video_assets FOR SELECT
  TO authenticated
  USING (
    -- Creators can see all videos for their courses
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = video_assets.course_id
        AND courses.user_id = auth.uid()
    )
    OR
    -- Students can see completed videos for enrolled courses
    (
      generation_status = 'completed'
      AND EXISTS (
        SELECT 1 FROM student_course_enrollments
        WHERE student_course_enrollments.course_id = video_assets.course_id
          AND student_course_enrollments.user_id = auth.uid()
      )
    )
  );
