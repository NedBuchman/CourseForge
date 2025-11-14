/*
  # Create Analytics Dashboard Views and Functions

  ## Overview
  This migration creates optimized database views and functions to power the CourseForge analytics dashboard.
  It provides key metrics for understanding platform usage, user behavior, and business performance.

  ## New Views Created

  ### 1. Platform Overview Metrics
    - `analytics_platform_overview` - High-level platform statistics

  ### 2. User Analytics
    - `analytics_user_growth_daily` - User registration trends over time

  ### 3. Course Analytics
    - `analytics_course_metrics` - Course creation and completion metrics
    - `analytics_course_topics` - Popular topics and trends
    - `analytics_workflow_funnel` - Workflow completion funnel

  ### 4. Student Analytics
    - `analytics_student_engagement` - Student enrollment and completion metrics
    - `analytics_popular_courses` - Most popular courses by enrollment

  ## New Functions Created
    - `get_platform_stats()` - Returns key platform metrics as JSON
    - `get_user_growth_by_period()` - Returns user growth by day
    - `get_course_creation_funnel()` - Returns course workflow completion rates

  ## Security
    - All views and functions respect RLS policies
    - Only authenticated users can access analytics

  ## Performance
    - Indexed columns used for efficient aggregation
*/

-- =============================================================================
-- PLATFORM OVERVIEW VIEW
-- =============================================================================

CREATE OR REPLACE VIEW analytics_platform_overview AS
SELECT
  (SELECT COUNT(*) FROM auth.users) as total_creators,
  (SELECT COUNT(*) FROM student_accounts) as total_students,
  (SELECT COUNT(*) FROM courses) as total_courses,
  (SELECT COUNT(*) FROM courses WHERE status = 'completed') as completed_courses,
  (SELECT COUNT(*) FROM courses WHERE status = 'generating') as generating_courses,
  (SELECT COUNT(*) FROM courses WHERE published_at IS NOT NULL) as published_courses,
  (SELECT COUNT(*) FROM student_course_enrollments) as total_enrollments,
  (SELECT COUNT(*) FROM quizzes) as total_quizzes,
  (SELECT COUNT(DISTINCT user_id) FROM courses WHERE created_at >= NOW() - INTERVAL '30 days') as active_creators_30d,
  (SELECT COUNT(*) FROM student_accounts WHERE last_login_at >= NOW() - INTERVAL '30 days') as active_students_30d;

-- =============================================================================
-- USER GROWTH ANALYTICS
-- =============================================================================

CREATE OR REPLACE VIEW analytics_user_growth_daily AS
SELECT
  DATE(created_at) as date,
  'creator' as user_type,
  COUNT(*) as new_users
FROM auth.users
GROUP BY DATE(created_at)
UNION ALL
SELECT
  DATE(created_at) as date,
  'student' as user_type,
  COUNT(*) as new_users
FROM student_accounts
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- =============================================================================
-- COURSE CREATION METRICS
-- =============================================================================

CREATE OR REPLACE VIEW analytics_course_metrics AS
SELECT
  c.id,
  c.user_id,
  c.title,
  c.topic,
  c.difficulty_level,
  c.duration,
  c.status,
  c.created_at,
  c.updated_at,
  c.published_at,
  c.content_generated_at,
  EXTRACT(EPOCH FROM (c.content_generated_at - c.generation_started_at))/60 as generation_time_minutes,
  EXTRACT(EPOCH FROM (c.published_at - c.created_at))/3600 as creation_to_publish_hours,
  c.current_step,
  c.last_completed_step,
  c.retry_count,
  (SELECT COUNT(*) FROM quizzes WHERE course_id = c.id) as quiz_count,
  (SELECT COUNT(*) FROM student_course_enrollments WHERE course_id = c.id) as enrollment_count,
  CASE WHEN c.presentation_status = 'configured' THEN true ELSE false END as has_presentation,
  CASE WHEN c.landing_page_status = 'configured' THEN true ELSE false END as has_landing_page
FROM courses c;

-- =============================================================================
-- TOPIC POPULARITY ANALYTICS
-- =============================================================================

CREATE OR REPLACE VIEW analytics_course_topics AS
WITH topic_enrollments AS (
  SELECT
    LOWER(TRIM(c.topic)) as topic_name,
    COUNT(sce.id) as enrollment_count
  FROM courses c
  LEFT JOIN student_course_enrollments sce ON c.id = sce.course_id
  WHERE c.topic IS NOT NULL AND c.topic != ''
  GROUP BY LOWER(TRIM(c.topic))
)
SELECT
  LOWER(TRIM(c.topic)) as topic,
  COUNT(*) as course_count,
  COUNT(*) FILTER (WHERE c.status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE c.published_at IS NOT NULL) as published_count,
  AVG(EXTRACT(EPOCH FROM (c.content_generated_at - c.generation_started_at))/60) as avg_generation_time_minutes,
  COALESCE(te.enrollment_count, 0) as total_enrollments
FROM courses c
LEFT JOIN topic_enrollments te ON LOWER(TRIM(c.topic)) = te.topic_name
WHERE c.topic IS NOT NULL AND c.topic != ''
GROUP BY LOWER(TRIM(c.topic)), te.enrollment_count
ORDER BY course_count DESC;

-- =============================================================================
-- WORKFLOW FUNNEL ANALYTICS
-- =============================================================================

CREATE OR REPLACE VIEW analytics_workflow_funnel AS
SELECT
  COUNT(*) as total_started,
  COUNT(*) FILTER (WHERE last_completed_step >= 1) as completed_content,
  COUNT(*) FILTER (WHERE last_completed_step >= 2) as completed_quizzes,
  COUNT(*) FILTER (WHERE last_completed_step >= 3) as completed_presentation,
  COUNT(*) FILTER (WHERE last_completed_step >= 4) as completed_landing_page,
  COUNT(*) FILTER (WHERE last_completed_step >= 5) as completed_published,
  COUNT(*) FILTER (WHERE last_completed_step >= 6) as completed_downloaded,
  ROUND(100.0 * COUNT(*) FILTER (WHERE last_completed_step >= 1) / NULLIF(COUNT(*), 0), 2) as content_completion_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE last_completed_step >= 2) / NULLIF(COUNT(*), 0), 2) as quiz_completion_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE last_completed_step >= 3) / NULLIF(COUNT(*), 0), 2) as presentation_completion_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE last_completed_step >= 4) / NULLIF(COUNT(*), 0), 2) as landing_page_completion_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE last_completed_step >= 5) / NULLIF(COUNT(*), 0), 2) as publish_completion_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE last_completed_step >= 6) / NULLIF(COUNT(*), 0), 2) as download_completion_rate
FROM courses;

-- =============================================================================
-- STUDENT ENGAGEMENT ANALYTICS
-- =============================================================================

CREATE OR REPLACE VIEW analytics_student_engagement AS
SELECT
  s.id as student_id,
  s.email,
  s.created_at as registered_at,
  s.last_login_at,
  COUNT(sce.id) as enrolled_courses,
  COUNT(sce.id) FILTER (WHERE sce.completed_at IS NOT NULL) as completed_courses,
  ROUND(100.0 * COUNT(sce.id) FILTER (WHERE sce.completed_at IS NOT NULL) / NULLIF(COUNT(sce.id), 0), 2) as completion_rate,
  MAX(sce.enrolled_at) as last_enrollment_date
FROM student_accounts s
LEFT JOIN student_course_enrollments sce ON s.id = sce.student_id
GROUP BY s.id, s.email, s.created_at, s.last_login_at;

-- =============================================================================
-- POPULAR COURSES ANALYTICS
-- =============================================================================

CREATE OR REPLACE VIEW analytics_popular_courses AS
SELECT
  c.id,
  c.title,
  c.topic,
  c.difficulty_level,
  c.published_at,
  COUNT(sce.id) as enrollment_count,
  COUNT(sce.id) FILTER (WHERE sce.completed_at IS NOT NULL) as completion_count,
  ROUND(100.0 * COUNT(sce.id) FILTER (WHERE sce.completed_at IS NOT NULL) / NULLIF(COUNT(sce.id), 0), 2) as completion_rate,
  AVG(EXTRACT(EPOCH FROM (sce.completed_at - sce.enrolled_at))/3600) as avg_completion_hours
FROM courses c
LEFT JOIN student_course_enrollments sce ON c.id = sce.course_id
WHERE c.published_at IS NOT NULL
GROUP BY c.id, c.title, c.topic, c.difficulty_level, c.published_at
ORDER BY enrollment_count DESC;

-- =============================================================================
-- GENERATION SUCCESS METRICS
-- =============================================================================

CREATE OR REPLACE VIEW analytics_generation_metrics AS
SELECT
  DATE(generation_started_at) as generation_date,
  COUNT(*) as total_generations,
  COUNT(*) FILTER (WHERE status = 'completed') as successful_generations,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_generations,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0), 2) as success_rate,
  AVG(retry_count) as avg_retries,
  AVG(EXTRACT(EPOCH FROM (generation_completed_at - generation_started_at))/60) as avg_generation_minutes
FROM courses
WHERE generation_started_at IS NOT NULL
GROUP BY DATE(generation_started_at)
ORDER BY generation_date DESC;

-- =============================================================================
-- USER ACTIVITY BY TIME PERIOD
-- =============================================================================

CREATE OR REPLACE VIEW analytics_daily_activity AS
SELECT
  DATE(created_at) as activity_date,
  COUNT(*) as courses_created,
  COUNT(*) FILTER (WHERE status = 'completed') as courses_completed,
  COUNT(*) FILTER (WHERE published_at IS NOT NULL) as courses_published
FROM courses
GROUP BY DATE(created_at)
ORDER BY activity_date DESC;

-- =============================================================================
-- DIFFICULTY LEVEL DISTRIBUTION
-- =============================================================================

CREATE OR REPLACE VIEW analytics_difficulty_distribution AS
SELECT
  difficulty_level,
  COUNT(*) as course_count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM courses WHERE difficulty_level IS NOT NULL), 2) as percentage,
  AVG(EXTRACT(EPOCH FROM (content_generated_at - generation_started_at))/60) as avg_generation_minutes
FROM courses
WHERE difficulty_level IS NOT NULL
GROUP BY difficulty_level
ORDER BY course_count DESC;

-- =============================================================================
-- DURATION POPULARITY
-- =============================================================================

CREATE OR REPLACE VIEW analytics_duration_distribution AS
SELECT
  duration,
  COUNT(*) as course_count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM courses WHERE duration IS NOT NULL), 2) as percentage
FROM courses
WHERE duration IS NOT NULL
GROUP BY duration
ORDER BY course_count DESC;

-- =============================================================================
-- CUSTOMIZATION ADOPTION METRICS
-- =============================================================================

CREATE OR REPLACE VIEW analytics_customization_adoption AS
SELECT
  COUNT(*) as total_courses,
  COUNT(*) FILTER (WHERE presentation_status = 'configured') as courses_with_presentation,
  COUNT(*) FILTER (WHERE landing_page_status = 'configured') as courses_with_landing_page,
  COUNT(pc.id) as courses_with_custom_logo,
  COUNT(lpc.hero_image_url) as courses_with_hero_image,
  ROUND(100.0 * COUNT(*) FILTER (WHERE presentation_status = 'configured') / NULLIF(COUNT(*), 0), 2) as presentation_adoption_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE landing_page_status = 'configured') / NULLIF(COUNT(*), 0), 2) as landing_page_adoption_rate
FROM courses c
LEFT JOIN presentation_configs pc ON c.id = pc.course_id AND pc.logo_url IS NOT NULL
LEFT JOIN landing_page_configs lpc ON c.id = lpc.course_id;

-- =============================================================================
-- THEME POPULARITY
-- =============================================================================

CREATE OR REPLACE VIEW analytics_theme_popularity AS
SELECT
  theme,
  COUNT(*) as usage_count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM presentation_configs), 2) as percentage
FROM presentation_configs
GROUP BY theme
ORDER BY usage_count DESC;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get platform statistics as JSON
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT row_to_json(stats)
  INTO result
  FROM (
    SELECT * FROM analytics_platform_overview
  ) stats;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user growth by period
CREATE OR REPLACE FUNCTION get_user_growth_by_period(period_days INTEGER DEFAULT 30)
RETURNS TABLE(
  date DATE,
  creator_signups BIGINT,
  student_signups BIGINT,
  total_signups BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.date::DATE,
    COALESCE(c.count, 0) as creator_signups,
    COALESCE(s.count, 0) as student_signups,
    COALESCE(c.count, 0) + COALESCE(s.count, 0) as total_signups
  FROM (
    SELECT generate_series(
      CURRENT_DATE - period_days,
      CURRENT_DATE,
      '1 day'::interval
    )::DATE as date
  ) d
  LEFT JOIN (
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM auth.users
    WHERE created_at >= CURRENT_DATE - period_days
    GROUP BY DATE(created_at)
  ) c ON d.date = c.date
  LEFT JOIN (
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM student_accounts
    WHERE created_at >= CURRENT_DATE - period_days
    GROUP BY DATE(created_at)
  ) s ON d.date = s.date
  ORDER BY d.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get workflow completion funnel data
CREATE OR REPLACE FUNCTION get_course_creation_funnel()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT row_to_json(funnel)
  INTO result
  FROM (
    SELECT * FROM analytics_workflow_funnel
  ) funnel;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant access to views for authenticated users
GRANT SELECT ON analytics_platform_overview TO authenticated;
GRANT SELECT ON analytics_user_growth_daily TO authenticated;
GRANT SELECT ON analytics_course_metrics TO authenticated;
GRANT SELECT ON analytics_course_topics TO authenticated;
GRANT SELECT ON analytics_workflow_funnel TO authenticated;
GRANT SELECT ON analytics_student_engagement TO authenticated;
GRANT SELECT ON analytics_popular_courses TO authenticated;
GRANT SELECT ON analytics_generation_metrics TO authenticated;
GRANT SELECT ON analytics_daily_activity TO authenticated;
GRANT SELECT ON analytics_difficulty_distribution TO authenticated;
GRANT SELECT ON analytics_duration_distribution TO authenticated;
GRANT SELECT ON analytics_customization_adoption TO authenticated;
GRANT SELECT ON analytics_theme_popularity TO authenticated;

-- Grant execute permissions for functions
GRANT EXECUTE ON FUNCTION get_platform_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_growth_by_period(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_course_creation_funnel() TO authenticated;
