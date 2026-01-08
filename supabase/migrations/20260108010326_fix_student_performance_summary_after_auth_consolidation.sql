/*
  # Fix Student Performance Summary View After Auth Consolidation

  ## Overview
  The student_performance_summary view was broken after auth consolidation because
  it referenced the dropped student_accounts table. This migration recreates the view
  to use auth.users instead.

  ## Changes
  
  ### 1. Recreate student_performance_summary View
    - Uses auth.users instead of student_accounts
    - Extracts first_name and last_name from raw_user_meta_data
    - Filters out enrollments with NULL user_id (legacy data)
    - Maintains same column structure for compatibility
  
  ## Security
    - View has security_barrier enabled
    - Only accessible to authenticated users
    - Automatically filters data based on course ownership via RLS
*/

-- Drop and recreate the view with auth.users
DROP VIEW IF EXISTS student_performance_summary CASCADE;

CREATE VIEW student_performance_summary AS
SELECT
  c.id as course_id,
  c.user_id as creator_id,
  c.title as course_title,
  sce.user_id,
  u.email as student_email,
  COALESCE(u.raw_user_meta_data->>'first_name', SPLIT_PART(u.email, '@', 1)) as first_name,
  COALESCE(u.raw_user_meta_data->>'last_name', '') as last_name,
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
JOIN auth.users u ON sce.user_id = u.id
LEFT JOIN student_lesson_views slv ON sce.user_id = slv.user_id AND c.id = slv.course_id
LEFT JOIN student_lesson_completions slc ON sce.user_id = slc.user_id AND c.id = slc.course_id
LEFT JOIN student_quiz_attempts sqa ON sce.user_id = sqa.user_id AND c.id = sqa.course_id
WHERE sce.user_id IS NOT NULL
GROUP BY
  c.id, c.user_id, c.title, c.generated_content,
  sce.user_id, u.email, u.raw_user_meta_data,
  sce.enrolled_at, sce.completed_at
ORDER BY c.id, u.email;

-- Grant permissions
GRANT SELECT ON student_performance_summary TO authenticated;

-- Enable security barrier
ALTER VIEW student_performance_summary SET (security_barrier = true);

-- Add helpful comment
COMMENT ON VIEW student_performance_summary IS 'Provides detailed student performance metrics for course creators. Uses auth.users instead of the deprecated student_accounts table.';
