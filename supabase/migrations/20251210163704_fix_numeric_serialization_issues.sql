/*
  # Fix Numeric Serialization Issues for Student Progress Tracking

  ## Problem
  PostgreSQL's `numeric` type doesn't serialize cleanly to JavaScript numbers.
  When Supabase returns these values, they can be returned as strings or objects
  instead of proper JavaScript numbers, breaking TypeScript type expectations.

  ## Changes
  1. Views Updated
     - `course_student_overview`: Cast `avg_quiz_score` to double precision
     - `quiz_question_difficulty`: Cast `success_rate` to double precision
     - `student_performance_summary`: Cast `avg_quiz_score` and `progress_percentage` to double precision

  2. Functions Updated
     - `get_difficult_questions()`: Change `success_rate` parameter and return type to double precision
     - `get_students_by_course()`: Change `progress_percentage` and `avg_quiz_score` return types to double precision

  ## Impact
  - All percentage and score fields now properly serialize as JavaScript numbers
  - TypeScript type expectations are met
  - `.toFixed()` and other number methods work correctly
  - Charts and progress calculations function properly
*/

-- =============================================================================
-- DROP EXISTING OBJECTS
-- =============================================================================

-- Drop functions first (they may depend on views)
DROP FUNCTION IF EXISTS get_course_metrics(uuid);
DROP FUNCTION IF EXISTS get_students_by_course(uuid);
DROP FUNCTION IF EXISTS get_difficult_questions(uuid, numeric);
DROP FUNCTION IF EXISTS get_difficult_questions(uuid, double precision);

-- Drop views
DROP VIEW IF EXISTS course_student_overview CASCADE;
DROP VIEW IF EXISTS quiz_question_difficulty CASCADE;
DROP VIEW IF EXISTS student_performance_summary CASCADE;

-- =============================================================================
-- RECREATE VIEWS WITH DOUBLE PRECISION
-- =============================================================================

-- Recreate course_student_overview view with double precision
CREATE VIEW course_student_overview AS
SELECT
  c.id as course_id,
  c.user_id as creator_id,
  c.title as course_title,
  COUNT(DISTINCT sce.student_id) as total_students,
  COUNT(DISTINCT CASE WHEN sce.completed_at IS NOT NULL THEN sce.student_id END) as completed_students,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN sce.completed_at IS NOT NULL THEN sce.student_id END) /
    NULLIF(COUNT(DISTINCT sce.student_id), 0),
    2
  )::double precision as completion_rate,
  AVG(
    (SELECT COUNT(*)
     FROM student_lesson_completions slc2
     WHERE slc2.student_id = sce.student_id
     AND slc2.course_id = c.id)
  ) as avg_lessons_completed,
  ROUND(
    AVG(
      (SELECT AVG(sqa.score)
       FROM student_quiz_attempts sqa
       WHERE sqa.student_id = sce.student_id
       AND sqa.course_id = c.id)
    ),
    2
  )::double precision as avg_quiz_score
FROM courses c
LEFT JOIN student_course_enrollments sce ON c.id = sce.course_id
LEFT JOIN student_lesson_views slv ON c.id = slv.course_id AND sce.student_id = slv.student_id
GROUP BY c.id, c.user_id, c.title;

GRANT SELECT ON course_student_overview TO authenticated;
ALTER VIEW course_student_overview SET (security_barrier = true);

-- Recreate quiz_question_difficulty view with double precision
CREATE VIEW quiz_question_difficulty AS
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
  )::double precision as success_rate,
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
ALTER VIEW quiz_question_difficulty SET (security_barrier = true);

-- Recreate student_performance_summary view with double precision
CREATE VIEW student_performance_summary AS
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
  ROUND(AVG(sqa.score), 2)::double precision as avg_quiz_score,
  COUNT(CASE WHEN sqa.passed = true THEN 1 END) as quizzes_passed,
  COUNT(CASE WHEN sqa.passed = false THEN 1 END) as quizzes_failed,
  MAX(slv.viewed_at) as last_activity_at,
  COUNT(DISTINCT DATE(slv.viewed_at)) as active_days,
  ROUND(
    100.0 * COUNT(DISTINCT slc.lesson_index) /
    NULLIF((SELECT COUNT(*) FROM jsonb_array_elements(c.generated_content->'lessons')), 0),
    2
  )::double precision as progress_percentage
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
ALTER VIEW student_performance_summary SET (security_barrier = true);

-- =============================================================================
-- RECREATE FUNCTIONS WITH DOUBLE PRECISION
-- =============================================================================

-- Recreate get_difficult_questions function
CREATE FUNCTION get_difficult_questions(
  p_course_id uuid,
  p_max_success_rate double precision DEFAULT 60
)
RETURNS TABLE(
  quiz_id uuid,
  quiz_title text,
  question_id uuid,
  question_text text,
  correct_answer text,
  question_number integer,
  total_answers bigint,
  correct_answers bigint,
  success_rate double precision,
  difficulty_rating text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    qqd.quiz_id,
    qqd.quiz_title,
    qqd.question_id,
    qqd.question_text,
    qqd.correct_answer,
    qqd.question_number,
    qqd.total_answers,
    qqd.correct_answers,
    qqd.success_rate,
    qqd.difficulty_rating
  FROM quiz_question_difficulty qqd
  WHERE qqd.course_id = p_course_id
  AND qqd.total_answers > 0
  AND qqd.success_rate <= p_max_success_rate
  ORDER BY qqd.success_rate ASC, qqd.total_answers DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION get_difficult_questions(uuid, double precision) TO authenticated;

-- Recreate get_students_by_course function
CREATE FUNCTION get_students_by_course(p_course_id uuid)
RETURNS TABLE(
  student_id uuid,
  student_email text,
  first_name text,
  last_name text,
  enrolled_at timestamptz,
  lessons_completed bigint,
  progress_percentage double precision,
  avg_quiz_score double precision,
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION get_students_by_course(uuid) TO authenticated;

-- Recreate get_course_metrics function
CREATE FUNCTION get_course_metrics(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  course_id uuid,
  creator_id uuid,
  course_title text,
  total_students bigint,
  completed_students bigint,
  completion_rate double precision,
  avg_lessons_completed numeric,
  avg_quiz_score double precision
) AS $$
DECLARE
  v_role text;
BEGIN
  -- Check user role
  SELECT role INTO v_role
  FROM user_roles
  WHERE user_id = COALESCE(p_user_id, (SELECT auth.uid()))
  LIMIT 1;

  -- If manager or admin, return all courses
  -- If creator, return only their courses
  IF v_role IN ('admin', 'manager') THEN
    RETURN QUERY
    SELECT
      cso.course_id,
      cso.creator_id,
      cso.course_title,
      cso.total_students,
      cso.completed_students,
      cso.completion_rate,
      cso.avg_lessons_completed,
      cso.avg_quiz_score
    FROM course_student_overview cso
    ORDER BY cso.total_students DESC;
  ELSE
    RETURN QUERY
    SELECT
      cso.course_id,
      cso.creator_id,
      cso.course_title,
      cso.total_students,
      cso.completed_students,
      cso.completion_rate,
      cso.avg_lessons_completed,
      cso.avg_quiz_score
    FROM course_student_overview cso
    WHERE cso.creator_id = COALESCE(p_user_id, (SELECT auth.uid()))
    ORDER BY cso.total_students DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION get_course_metrics(uuid) TO authenticated;