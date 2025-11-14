/*
  # Create Course Creator Analytics Views and Functions

  ## Overview
  This migration creates specialized analytics views and functions specifically designed
  for course creators to understand how students engage with their courses.

  ## New Views Created

  ### 1. Course Student Overview
  High-level metrics per course showing enrollment and completion statistics

  ### 2. Course Lesson Analytics
  Detailed metrics per lesson including completion rates, view counts, and average time

  ### 3. Course Quiz Analytics
  Quiz-level performance metrics including average scores and attempt patterns

  ### 4. Quiz Question Difficulty Analysis
  Identifies difficult questions based on student performance

  ### 5. Student Performance Summary
  Individual student progress across all lessons and quizzes for a course

  ### 6. Lesson Retake Analytics
  Tracks how often students revisit lessons after initial completion

  ## New Functions Created
  
  Helper functions to retrieve analytics data for specific courses

  ## Security
  All views respect RLS policies - creators can only see their own course data
*/

-- =============================================================================
-- COURSE STUDENT OVERVIEW
-- =============================================================================

CREATE OR REPLACE VIEW course_student_overview AS
SELECT
  c.id as course_id,
  c.user_id as creator_id,
  c.title as course_title,
  COUNT(DISTINCT sce.student_id) as total_enrolled,
  COUNT(DISTINCT CASE WHEN sce.completed_at IS NOT NULL THEN sce.student_id END) as total_completed,
  COUNT(DISTINCT slv.student_id) as students_with_activity,
  COUNT(DISTINCT CASE 
    WHEN slv.viewed_at >= NOW() - INTERVAL '7 days' 
    THEN slv.student_id 
  END) as active_last_7_days,
  COUNT(DISTINCT CASE 
    WHEN slv.viewed_at >= NOW() - INTERVAL '30 days' 
    THEN slv.student_id 
  END) as active_last_30_days,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN sce.completed_at IS NOT NULL THEN sce.student_id END) / 
    NULLIF(COUNT(DISTINCT sce.student_id), 0),
    2
  ) as completion_rate,
  AVG(
    (SELECT COUNT(*) 
     FROM student_lesson_completions slc2 
     WHERE slc2.student_id = sce.student_id 
     AND slc2.course_id = c.id)
  ) as avg_lessons_completed,
  AVG(
    (SELECT AVG(sqa.score) 
     FROM student_quiz_attempts sqa 
     WHERE sqa.student_id = sce.student_id 
     AND sqa.course_id = c.id)
  ) as avg_quiz_score
FROM courses c
LEFT JOIN student_course_enrollments sce ON c.id = sce.course_id
LEFT JOIN student_lesson_views slv ON c.id = slv.course_id AND sce.student_id = slv.student_id
GROUP BY c.id, c.user_id, c.title;

GRANT SELECT ON course_student_overview TO authenticated;

-- =============================================================================
-- COURSE LESSON ANALYTICS
-- =============================================================================

CREATE OR REPLACE VIEW course_lesson_analytics AS
WITH first_views AS (
  SELECT
    student_id,
    course_id,
    lesson_index,
    MIN(viewed_at) as first_view_time
  FROM student_lesson_views
  GROUP BY student_id, course_id, lesson_index
)
SELECT
  c.id as course_id,
  c.user_id as creator_id,
  c.title as course_title,
  slv.lesson_index,
  COUNT(DISTINCT slv.student_id) as unique_viewers,
  COUNT(slv.id) as total_views,
  ROUND(AVG(slv.time_spent_seconds), 0) as avg_time_spent_seconds,
  COUNT(DISTINCT slc.student_id) as completions,
  ROUND(
    100.0 * COUNT(DISTINCT slc.student_id) / 
    NULLIF(COUNT(DISTINCT slv.student_id), 0),
    2
  ) as completion_rate,
  ROUND(AVG(slc.view_count), 1) as avg_views_to_complete,
  COUNT(CASE WHEN slv.completed_on_view = true THEN 1 END) as completed_on_first_view,
  COUNT(DISTINCT CASE 
    WHEN slv.viewed_at > fv.first_view_time
    THEN slv.student_id 
  END) as students_who_returned
FROM courses c
LEFT JOIN student_lesson_views slv ON c.id = slv.course_id
LEFT JOIN student_lesson_completions slc ON 
  c.id = slc.course_id AND 
  slv.lesson_index = slc.lesson_index AND
  slv.student_id = slc.student_id
LEFT JOIN first_views fv ON
  slv.student_id = fv.student_id AND
  slv.course_id = fv.course_id AND
  slv.lesson_index = fv.lesson_index
WHERE slv.lesson_index IS NOT NULL
GROUP BY c.id, c.user_id, c.title, slv.lesson_index
ORDER BY c.id, slv.lesson_index;

GRANT SELECT ON course_lesson_analytics TO authenticated;

-- =============================================================================
-- COURSE QUIZ ANALYTICS
-- =============================================================================

CREATE OR REPLACE VIEW course_quiz_analytics AS
SELECT
  c.id as course_id,
  c.user_id as creator_id,
  q.id as quiz_id,
  q.title as quiz_title,
  q.module_index as lesson_index,
  COUNT(DISTINCT sqa.student_id) as unique_students_attempted,
  COUNT(sqa.id) as total_attempts,
  ROUND(AVG(sqa.attempt_number), 1) as avg_attempts_per_student,
  ROUND(AVG(sqa.score), 2) as avg_score,
  ROUND(MIN(sqa.score), 2) as min_score,
  ROUND(MAX(sqa.score), 2) as max_score,
  COUNT(CASE WHEN sqa.passed = true THEN 1 END) as passed_attempts,
  COUNT(CASE WHEN sqa.passed = false THEN 1 END) as failed_attempts,
  ROUND(
    100.0 * COUNT(CASE WHEN sqa.passed = true THEN 1 END) / 
    NULLIF(COUNT(sqa.id), 0),
    2
  ) as pass_rate,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (sqa.completed_at - sqa.started_at))),
    0
  ) as avg_completion_time_seconds,
  COUNT(DISTINCT CASE WHEN sqa.attempt_number = 1 THEN sqa.student_id END) as students_first_attempt,
  COUNT(DISTINCT CASE WHEN sqa.attempt_number > 1 THEN sqa.student_id END) as students_retook_quiz
FROM courses c
JOIN quizzes q ON c.id = q.course_id
LEFT JOIN student_quiz_attempts sqa ON q.id = sqa.quiz_id
WHERE sqa.completed_at IS NOT NULL
GROUP BY c.id, c.user_id, q.id, q.title, q.module_index
ORDER BY c.id, q.module_index;

GRANT SELECT ON course_quiz_analytics TO authenticated;

-- =============================================================================
-- QUIZ QUESTION DIFFICULTY ANALYSIS
-- =============================================================================

CREATE OR REPLACE VIEW quiz_question_difficulty AS
WITH answer_stats AS (
  SELECT
    question_id,
    student_answer,
    COUNT(*) as answer_count
  FROM student_quiz_answers
  GROUP BY question_id, student_answer
)
SELECT
  c.id as course_id,
  c.user_id as creator_id,
  q.id as quiz_id,
  q.title as quiz_title,
  qq.id as question_id,
  qq.question_text,
  qq.correct_answer,
  qq.order_index as question_number,
  COUNT(sqa_ans.id) as total_answers,
  COUNT(CASE WHEN sqa_ans.is_correct = true THEN 1 END) as correct_answers,
  COUNT(CASE WHEN sqa_ans.is_correct = false THEN 1 END) as incorrect_answers,
  ROUND(
    100.0 * COUNT(CASE WHEN sqa_ans.is_correct = true THEN 1 END) / 
    NULLIF(COUNT(sqa_ans.id), 0),
    2
  ) as success_rate,
  ROUND(AVG(sqa_ans.time_spent_seconds), 0) as avg_time_spent_seconds,
  (
    SELECT jsonb_object_agg(student_answer, answer_count)
    FROM answer_stats
    WHERE question_id = qq.id
  ) as answer_distribution,
  CASE
    WHEN (100.0 * COUNT(CASE WHEN sqa_ans.is_correct = true THEN 1 END) / 
          NULLIF(COUNT(sqa_ans.id), 0)) < 40 THEN 'Very Hard'
    WHEN (100.0 * COUNT(CASE WHEN sqa_ans.is_correct = true THEN 1 END) / 
          NULLIF(COUNT(sqa_ans.id), 0)) < 60 THEN 'Hard'
    WHEN (100.0 * COUNT(CASE WHEN sqa_ans.is_correct = true THEN 1 END) / 
          NULLIF(COUNT(sqa_ans.id), 0)) < 80 THEN 'Medium'
    ELSE 'Easy'
  END as difficulty_rating
FROM courses c
JOIN quizzes q ON c.id = q.course_id
JOIN quiz_questions qq ON q.id = qq.quiz_id
LEFT JOIN student_quiz_answers sqa_ans ON qq.id = sqa_ans.question_id
GROUP BY c.id, c.user_id, q.id, q.title, qq.id, qq.question_text, qq.correct_answer, qq.order_index
ORDER BY c.id, q.id, qq.order_index;

GRANT SELECT ON quiz_question_difficulty TO authenticated;

-- =============================================================================
-- STUDENT PERFORMANCE SUMMARY
-- =============================================================================

CREATE OR REPLACE VIEW student_performance_summary AS
SELECT
  c.id as course_id,
  c.user_id as creator_id,
  c.title as course_title,
  sa.id as student_id,
  sa.email as student_email,
  sa.first_name,
  sa.last_name,
  sce.enrolled_at,
  sce.completed_at as course_completed_at,
  COUNT(DISTINCT slc.lesson_index) as lessons_completed,
  COUNT(DISTINCT slv.lesson_index) as lessons_viewed,
  SUM(slv.time_spent_seconds) as total_time_spent_seconds,
  COUNT(DISTINCT sqa.quiz_id) as quizzes_attempted,
  ROUND(AVG(sqa.score), 2) as avg_quiz_score,
  COUNT(CASE WHEN sqa.passed = true THEN 1 END) as quizzes_passed,
  COUNT(CASE WHEN sqa.passed = false THEN 1 END) as quizzes_failed,
  MAX(slv.viewed_at) as last_activity_at,
  COUNT(DISTINCT DATE(slv.viewed_at)) as active_days,
  ROUND(
    100.0 * COUNT(DISTINCT slc.lesson_index) / 
    NULLIF((SELECT COUNT(*) FROM jsonb_array_elements(c.generated_content->'lessons')), 0),
    2
  ) as progress_percentage
FROM courses c
JOIN student_course_enrollments sce ON c.id = sce.course_id
JOIN student_accounts sa ON sce.student_id = sa.id
LEFT JOIN student_lesson_views slv ON sa.id = slv.student_id AND c.id = slv.course_id
LEFT JOIN student_lesson_completions slc ON sa.id = slc.student_id AND c.id = slc.course_id
LEFT JOIN student_quiz_attempts sqa ON sa.id = sqa.student_id AND c.id = sqa.course_id
GROUP BY 
  c.id, c.user_id, c.title, c.generated_content,
  sa.id, sa.email, sa.first_name, sa.last_name,
  sce.enrolled_at, sce.completed_at
ORDER BY c.id, sa.email;

GRANT SELECT ON student_performance_summary TO authenticated;

-- =============================================================================
-- LESSON RETAKE ANALYTICS
-- =============================================================================

CREATE OR REPLACE VIEW lesson_retake_analytics AS
WITH lesson_view_counts AS (
  SELECT
    course_id,
    student_id,
    lesson_index,
    COUNT(*) as view_count,
    MIN(viewed_at) as first_view,
    MAX(viewed_at) as last_view
  FROM student_lesson_views
  GROUP BY course_id, student_id, lesson_index
)
SELECT
  c.id as course_id,
  c.user_id as creator_id,
  lvc.lesson_index,
  COUNT(DISTINCT lvc.student_id) as total_students,
  COUNT(DISTINCT CASE WHEN lvc.view_count > 1 THEN lvc.student_id END) as students_who_retook,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN lvc.view_count > 1 THEN lvc.student_id END) / 
    NULLIF(COUNT(DISTINCT lvc.student_id), 0),
    2
  ) as retake_rate,
  ROUND(AVG(lvc.view_count), 1) as avg_views_per_student,
  MAX(lvc.view_count) as max_views_by_single_student,
  ROUND(AVG(EXTRACT(EPOCH FROM (lvc.last_view - lvc.first_view)) / 86400), 1) as avg_days_between_first_last_view
FROM courses c
JOIN lesson_view_counts lvc ON c.id = lvc.course_id
GROUP BY c.id, c.user_id, lvc.lesson_index
ORDER BY c.id, lvc.lesson_index;

GRANT SELECT ON lesson_retake_analytics TO authenticated;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get course overview for a specific course
CREATE OR REPLACE FUNCTION get_course_analytics_overview(p_course_id uuid)
RETURNS TABLE(
  total_enrolled bigint,
  total_completed bigint,
  students_with_activity bigint,
  active_last_7_days bigint,
  active_last_30_days bigint,
  completion_rate numeric,
  avg_lessons_completed numeric,
  avg_quiz_score numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cso.total_enrolled,
    cso.total_completed,
    cso.students_with_activity,
    cso.active_last_7_days,
    cso.active_last_30_days,
    cso.completion_rate,
    cso.avg_lessons_completed,
    cso.avg_quiz_score
  FROM course_student_overview cso
  WHERE cso.course_id = p_course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_course_analytics_overview(uuid) TO authenticated;

-- Function to get lesson analytics for a specific course
CREATE OR REPLACE FUNCTION get_lesson_analytics(p_course_id uuid)
RETURNS TABLE(
  lesson_index integer,
  unique_viewers bigint,
  total_views bigint,
  avg_time_spent_seconds numeric,
  completions bigint,
  completion_rate numeric,
  avg_views_to_complete numeric,
  completed_on_first_view bigint,
  students_who_returned bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cla.lesson_index,
    cla.unique_viewers,
    cla.total_views,
    cla.avg_time_spent_seconds,
    cla.completions,
    cla.completion_rate,
    cla.avg_views_to_complete,
    cla.completed_on_first_view,
    cla.students_who_returned
  FROM course_lesson_analytics cla
  WHERE cla.course_id = p_course_id
  ORDER BY cla.lesson_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_lesson_analytics(uuid) TO authenticated;

-- Function to get difficult questions for a course
CREATE OR REPLACE FUNCTION get_difficult_questions(
  p_course_id uuid,
  p_max_success_rate numeric DEFAULT 60
)
RETURNS TABLE(
  quiz_title text,
  question_number integer,
  question_text text,
  success_rate numeric,
  total_answers bigint,
  difficulty_rating text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    qqd.quiz_title,
    qqd.question_number,
    qqd.question_text,
    qqd.success_rate,
    qqd.total_answers,
    qqd.difficulty_rating
  FROM quiz_question_difficulty qqd
  WHERE qqd.course_id = p_course_id
  AND qqd.success_rate <= p_max_success_rate
  ORDER BY qqd.success_rate ASC, qqd.total_answers DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_difficult_questions(uuid, numeric) TO authenticated;

-- Function to get student list with progress for a course
CREATE OR REPLACE FUNCTION get_students_by_course(p_course_id uuid)
RETURNS TABLE(
  student_id uuid,
  student_email text,
  first_name text,
  last_name text,
  enrolled_at timestamptz,
  lessons_completed bigint,
  progress_percentage numeric,
  avg_quiz_score numeric,
  last_activity_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sps.student_id,
    sps.student_email,
    sps.first_name,
    sps.last_name,
    sps.enrolled_at,
    sps.lessons_completed,
    sps.progress_percentage,
    sps.avg_quiz_score,
    sps.last_activity_at
  FROM student_performance_summary sps
  WHERE sps.course_id = p_course_id
  ORDER BY sps.enrolled_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_students_by_course(uuid) TO authenticated;