/*
  # Fix Security and Performance Issues - Part 3: Optimize RLS Policies

  ## Changes
  This migration optimizes all RLS policies to use `(select auth.uid())` instead of `auth.uid()`
  directly. This prevents the auth function from being re-evaluated for each row, significantly
  improving query performance at scale.
  
  ### Tables Updated:
  - courses
  - course_outlines
  - quizzes
  - quiz_questions
  - presentations
  - class_landing_pages
  - presentation_configs
  - landing_page_configs
  - student_accounts
  - student_course_enrollments
  - student_lesson_views
  - student_lesson_completions
  - student_quiz_attempts
  - student_quiz_answers
  - user_roles
  - video_assets
  - video_generation_queue
  - course_access_control
  - course_visibility
  - course_invitations
  - student_sessions
  
  ### Performance Impact:
  - Reduces CPU usage on large queries
  - Improves response time for filtered queries
  - Follows Supabase best practices for RLS optimization
*/

-- =====================================================
-- COURSES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own courses" ON public.courses;
CREATE POLICY "Users can view their own courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own courses" ON public.courses;
CREATE POLICY "Users can insert their own courses"
  ON public.courses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own courses" ON public.courses;
CREATE POLICY "Users can update their own courses"
  ON public.courses FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own courses" ON public.courses;
CREATE POLICY "Users can delete their own courses"
  ON public.courses FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- COURSE_OUTLINES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view own course outlines" ON public.course_outlines;
CREATE POLICY "Users can view own course outlines"
  ON public.course_outlines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_outlines.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create course outlines" ON public.course_outlines;
CREATE POLICY "Users can create course outlines"
  ON public.course_outlines FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_outlines.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own course outlines" ON public.course_outlines;
CREATE POLICY "Users can update own course outlines"
  ON public.course_outlines FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_outlines.course_id
      AND courses.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_outlines.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own course outlines" ON public.course_outlines;
CREATE POLICY "Users can delete own course outlines"
  ON public.course_outlines FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_outlines.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- QUIZZES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view quizzes for their courses" ON public.quizzes;
CREATE POLICY "Users can view quizzes for their courses"
  ON public.quizzes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = quizzes.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert quizzes for their courses" ON public.quizzes;
CREATE POLICY "Users can insert quizzes for their courses"
  ON public.quizzes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = quizzes.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update quizzes for their courses" ON public.quizzes;
CREATE POLICY "Users can update quizzes for their courses"
  ON public.quizzes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = quizzes.course_id
      AND courses.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = quizzes.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete quizzes for their courses" ON public.quizzes;
CREATE POLICY "Users can delete quizzes for their courses"
  ON public.quizzes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = quizzes.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- QUIZ_QUESTIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view questions for their quizzes" ON public.quiz_questions;
CREATE POLICY "Users can view questions for their quizzes"
  ON public.quiz_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes
      JOIN public.courses ON courses.id = quizzes.course_id
      WHERE quizzes.id = quiz_questions.quiz_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert questions for their quizzes" ON public.quiz_questions;
CREATE POLICY "Users can insert questions for their quizzes"
  ON public.quiz_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quizzes
      JOIN public.courses ON courses.id = quizzes.course_id
      WHERE quizzes.id = quiz_questions.quiz_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update questions for their quizzes" ON public.quiz_questions;
CREATE POLICY "Users can update questions for their quizzes"
  ON public.quiz_questions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes
      JOIN public.courses ON courses.id = quizzes.course_id
      WHERE quizzes.id = quiz_questions.quiz_id
      AND courses.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quizzes
      JOIN public.courses ON courses.id = quizzes.course_id
      WHERE quizzes.id = quiz_questions.quiz_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete questions for their quizzes" ON public.quiz_questions;
CREATE POLICY "Users can delete questions for their quizzes"
  ON public.quiz_questions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes
      JOIN public.courses ON courses.id = quizzes.course_id
      WHERE quizzes.id = quiz_questions.quiz_id
      AND courses.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- PRESENTATIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view own presentations" ON public.presentations;
CREATE POLICY "Users can view own presentations"
  ON public.presentations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = presentations.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create presentations" ON public.presentations;
CREATE POLICY "Users can create presentations"
  ON public.presentations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = presentations.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own presentations" ON public.presentations;
CREATE POLICY "Users can update own presentations"
  ON public.presentations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = presentations.course_id
      AND courses.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = presentations.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own presentations" ON public.presentations;
CREATE POLICY "Users can delete own presentations"
  ON public.presentations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = presentations.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- CLASS_LANDING_PAGES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view own class landing pages" ON public.class_landing_pages;
CREATE POLICY "Users can view own class landing pages"
  ON public.class_landing_pages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = class_landing_pages.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create class landing pages" ON public.class_landing_pages;
CREATE POLICY "Users can create class landing pages"
  ON public.class_landing_pages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = class_landing_pages.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own class landing pages" ON public.class_landing_pages;
CREATE POLICY "Users can update own class landing pages"
  ON public.class_landing_pages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = class_landing_pages.course_id
      AND courses.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = class_landing_pages.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own class landing pages" ON public.class_landing_pages;
CREATE POLICY "Users can delete own class landing pages"
  ON public.class_landing_pages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = class_landing_pages.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- PRESENTATION_CONFIGS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view presentation configs for their courses" ON public.presentation_configs;
CREATE POLICY "Users can view presentation configs for their courses"
  ON public.presentation_configs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = presentation_configs.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert presentation configs for their courses" ON public.presentation_configs;
CREATE POLICY "Users can insert presentation configs for their courses"
  ON public.presentation_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = presentation_configs.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update presentation configs for their courses" ON public.presentation_configs;
CREATE POLICY "Users can update presentation configs for their courses"
  ON public.presentation_configs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = presentation_configs.course_id
      AND courses.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = presentation_configs.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete presentation configs for their courses" ON public.presentation_configs;
CREATE POLICY "Users can delete presentation configs for their courses"
  ON public.presentation_configs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = presentation_configs.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- LANDING_PAGE_CONFIGS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view landing page configs for their courses" ON public.landing_page_configs;
CREATE POLICY "Users can view landing page configs for their courses"
  ON public.landing_page_configs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = landing_page_configs.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert landing page configs for their courses" ON public.landing_page_configs;
CREATE POLICY "Users can insert landing page configs for their courses"
  ON public.landing_page_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = landing_page_configs.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update landing page configs for their courses" ON public.landing_page_configs;
CREATE POLICY "Users can update landing page configs for their courses"
  ON public.landing_page_configs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = landing_page_configs.course_id
      AND courses.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = landing_page_configs.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete landing page configs for their courses" ON public.landing_page_configs;
CREATE POLICY "Users can delete landing page configs for their courses"
  ON public.landing_page_configs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = landing_page_configs.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- STUDENT_ACCOUNTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Students can read own account" ON public.student_accounts;
CREATE POLICY "Students can read own account"
  ON public.student_accounts FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Students can update own account" ON public.student_accounts;
CREATE POLICY "Students can update own account"
  ON public.student_accounts FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- =====================================================
-- STUDENT_COURSE_ENROLLMENTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Students can view own enrollments" ON public.student_course_enrollments;
CREATE POLICY "Students can view own enrollments"
  ON public.student_course_enrollments FOR SELECT
  TO authenticated
  USING (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "Students can enroll in courses" ON public.student_course_enrollments;
CREATE POLICY "Students can enroll in courses"
  ON public.student_course_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "Students can update own enrollments" ON public.student_course_enrollments;
CREATE POLICY "Students can update own enrollments"
  ON public.student_course_enrollments FOR UPDATE
  TO authenticated
  USING (student_id = (select auth.uid()))
  WITH CHECK (student_id = (select auth.uid()));

-- =====================================================
-- USER_ROLES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
CREATE POLICY "Admins can read all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Managers can read all roles" ON public.user_roles;
CREATE POLICY "Managers can read all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role = 'manager'
    )
  );

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
      AND ur.role = 'admin'
    )
  );

-- =====================================================
-- STUDENT_LESSON_VIEWS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Students can view own lesson views" ON public.student_lesson_views;
CREATE POLICY "Students can view own lesson views"
  ON public.student_lesson_views FOR SELECT
  TO authenticated
  USING (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "Students can insert own lesson views" ON public.student_lesson_views;
CREATE POLICY "Students can insert own lesson views"
  ON public.student_lesson_views FOR INSERT
  TO authenticated
  WITH CHECK (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "Course creators can view lesson views for their courses" ON public.student_lesson_views;
CREATE POLICY "Course creators can view lesson views for their courses"
  ON public.student_lesson_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = student_lesson_views.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- STUDENT_LESSON_COMPLETIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Students can view own lesson completions" ON public.student_lesson_completions;
CREATE POLICY "Students can view own lesson completions"
  ON public.student_lesson_completions FOR SELECT
  TO authenticated
  USING (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "Students can insert own lesson completions" ON public.student_lesson_completions;
CREATE POLICY "Students can insert own lesson completions"
  ON public.student_lesson_completions FOR INSERT
  TO authenticated
  WITH CHECK (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "Students can update own lesson completions" ON public.student_lesson_completions;
CREATE POLICY "Students can update own lesson completions"
  ON public.student_lesson_completions FOR UPDATE
  TO authenticated
  USING (student_id = (select auth.uid()))
  WITH CHECK (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "Course creators can view lesson completions for their courses" ON public.student_lesson_completions;
CREATE POLICY "Course creators can view lesson completions for their courses"
  ON public.student_lesson_completions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = student_lesson_completions.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- STUDENT_QUIZ_ATTEMPTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Students can view own quiz attempts" ON public.student_quiz_attempts;
CREATE POLICY "Students can view own quiz attempts"
  ON public.student_quiz_attempts FOR SELECT
  TO authenticated
  USING (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "Students can insert own quiz attempts" ON public.student_quiz_attempts;
CREATE POLICY "Students can insert own quiz attempts"
  ON public.student_quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "Students can update own quiz attempts" ON public.student_quiz_attempts;
CREATE POLICY "Students can update own quiz attempts"
  ON public.student_quiz_attempts FOR UPDATE
  TO authenticated
  USING (student_id = (select auth.uid()))
  WITH CHECK (student_id = (select auth.uid()));

DROP POLICY IF EXISTS "Course creators can view quiz attempts for their courses" ON public.student_quiz_attempts;
CREATE POLICY "Course creators can view quiz attempts for their courses"
  ON public.student_quiz_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes
      JOIN public.courses ON courses.id = quizzes.course_id
      WHERE quizzes.id = student_quiz_attempts.quiz_id
      AND courses.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- STUDENT_QUIZ_ANSWERS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Students can view own quiz answers" ON public.student_quiz_answers;
CREATE POLICY "Students can view own quiz answers"
  ON public.student_quiz_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_quiz_attempts
      WHERE student_quiz_attempts.id = student_quiz_answers.attempt_id
      AND student_quiz_attempts.student_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Students can insert own quiz answers" ON public.student_quiz_answers;
CREATE POLICY "Students can insert own quiz answers"
  ON public.student_quiz_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.student_quiz_attempts
      WHERE student_quiz_attempts.id = student_quiz_answers.attempt_id
      AND student_quiz_attempts.student_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Course creators can view quiz answers for their courses" ON public.student_quiz_answers;
CREATE POLICY "Course creators can view quiz answers for their courses"
  ON public.student_quiz_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_quiz_attempts
      JOIN public.quizzes ON quizzes.id = student_quiz_attempts.quiz_id
      JOIN public.courses ON courses.id = quizzes.course_id
      WHERE student_quiz_attempts.id = student_quiz_answers.attempt_id
      AND courses.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- VIDEO_ASSETS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view video assets for their courses" ON public.video_assets;
CREATE POLICY "Users can view video assets for their courses"
  ON public.video_assets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = video_assets.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert video assets for their courses" ON public.video_assets;
CREATE POLICY "Users can insert video assets for their courses"
  ON public.video_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = video_assets.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update video assets for their courses" ON public.video_assets;
CREATE POLICY "Users can update video assets for their courses"
  ON public.video_assets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = video_assets.course_id
      AND courses.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = video_assets.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete video assets for their courses" ON public.video_assets;
CREATE POLICY "Users can delete video assets for their courses"
  ON public.video_assets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = video_assets.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- VIDEO_GENERATION_QUEUE TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view queue items for their courses" ON public.video_generation_queue;
CREATE POLICY "Users can view queue items for their courses"
  ON public.video_generation_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = video_generation_queue.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert queue items for their courses" ON public.video_generation_queue;
CREATE POLICY "Users can insert queue items for their courses"
  ON public.video_generation_queue FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = video_generation_queue.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update queue items for their courses" ON public.video_generation_queue;
CREATE POLICY "Users can update queue items for their courses"
  ON public.video_generation_queue FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = video_generation_queue.course_id
      AND courses.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = video_generation_queue.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- COURSE_ACCESS_CONTROL TABLE
-- =====================================================
DROP POLICY IF EXISTS "Creators view course access" ON public.course_access_control;
CREATE POLICY "Creators view course access"
  ON public.course_access_control FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_access_control.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Creators grant access" ON public.course_access_control;
CREATE POLICY "Creators grant access"
  ON public.course_access_control FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_access_control.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Creators update access" ON public.course_access_control;
CREATE POLICY "Creators update access"
  ON public.course_access_control FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_access_control.course_id
      AND courses.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_access_control.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Creators revoke access" ON public.course_access_control;
CREATE POLICY "Creators revoke access"
  ON public.course_access_control FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_access_control.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- COURSE_VISIBILITY TABLE
-- =====================================================
DROP POLICY IF EXISTS "Creators view course visibility" ON public.course_visibility;
CREATE POLICY "Creators view course visibility"
  ON public.course_visibility FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_visibility.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Creators set visibility" ON public.course_visibility;
CREATE POLICY "Creators set visibility"
  ON public.course_visibility FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_visibility.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Creators update visibility" ON public.course_visibility;
CREATE POLICY "Creators update visibility"
  ON public.course_visibility FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_visibility.course_id
      AND courses.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_visibility.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Creators delete visibility" ON public.course_visibility;
CREATE POLICY "Creators delete visibility"
  ON public.course_visibility FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_visibility.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- COURSE_INVITATIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Creators view invitations" ON public.course_invitations;
CREATE POLICY "Creators view invitations"
  ON public.course_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_invitations.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Creators create invitations" ON public.course_invitations;
CREATE POLICY "Creators create invitations"
  ON public.course_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_invitations.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Creators update invitations" ON public.course_invitations;
CREATE POLICY "Creators update invitations"
  ON public.course_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_invitations.course_id
      AND courses.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_invitations.course_id
      AND courses.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- STUDENT_SESSIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Students create sessions" ON public.student_sessions;
CREATE POLICY "Students create sessions"
  ON public.student_sessions FOR INSERT
  TO authenticated
  WITH CHECK (student_id = (select auth.uid()));
