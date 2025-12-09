/*
  # Add Video Status Background Check Helpers

  1. New Functions
    - `get_processing_videos()` - Returns all videos currently being processed
    - `get_stale_processing_videos()` - Returns videos stuck in processing for > 30 minutes
    - `get_courses_with_processing_videos()` - Returns courses that have videos currently processing

  2. Purpose
    - Support background job that checks video status when users are logged off
    - Identify stuck videos that may need manual intervention
    - Enable automated status updates for better UX

  3. Security
    - Functions are SECURITY DEFINER to allow background job access
    - Read-only operations, no data modification
*/

-- =====================================================
-- 1. FUNCTION TO GET ALL PROCESSING VIDEOS
-- =====================================================

CREATE OR REPLACE FUNCTION get_processing_videos()
RETURNS TABLE (
  id uuid,
  course_id uuid,
  provider_video_id text,
  asset_type text,
  asset_reference_id text,
  generation_started_at timestamptz,
  minutes_processing integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    va.id,
    va.course_id,
    va.provider_video_id,
    va.asset_type,
    va.asset_reference_id,
    va.generation_started_at,
    EXTRACT(EPOCH FROM (now() - va.generation_started_at)) / 60 AS minutes_processing
  FROM video_assets va
  WHERE va.generation_status = 'processing'
    AND va.provider_video_id IS NOT NULL
  ORDER BY va.generation_started_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_processing_videos() IS 'Returns all video assets currently being processed at HeyGen';

-- =====================================================
-- 2. FUNCTION TO GET STALE PROCESSING VIDEOS
-- =====================================================

CREATE OR REPLACE FUNCTION get_stale_processing_videos(
  stale_threshold_minutes integer DEFAULT 30
)
RETURNS TABLE (
  id uuid,
  course_id uuid,
  course_title text,
  provider_video_id text,
  asset_type text,
  asset_reference_id text,
  generation_started_at timestamptz,
  minutes_processing integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    va.id,
    va.course_id,
    c.title AS course_title,
    va.provider_video_id,
    va.asset_type,
    va.asset_reference_id,
    va.generation_started_at,
    EXTRACT(EPOCH FROM (now() - va.generation_started_at)) / 60 AS minutes_processing
  FROM video_assets va
  JOIN courses c ON c.id = va.course_id
  WHERE va.generation_status = 'processing'
    AND va.provider_video_id IS NOT NULL
    AND va.generation_started_at < (now() - (stale_threshold_minutes || ' minutes')::interval)
  ORDER BY va.generation_started_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_stale_processing_videos(integer) IS 'Returns videos that have been processing longer than the threshold (default 30 minutes)';

-- =====================================================
-- 3. FUNCTION TO GET COURSES WITH PROCESSING VIDEOS
-- =====================================================

CREATE OR REPLACE FUNCTION get_courses_with_processing_videos()
RETURNS TABLE (
  course_id uuid,
  course_title text,
  processing_count integer,
  total_videos integer,
  completed_count integer,
  failed_count integer,
  oldest_processing_started timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS course_id,
    c.title AS course_title,
    COUNT(*) FILTER (WHERE va.generation_status = 'processing')::integer AS processing_count,
    COUNT(*)::integer AS total_videos,
    COUNT(*) FILTER (WHERE va.generation_status = 'completed')::integer AS completed_count,
    COUNT(*) FILTER (WHERE va.generation_status = 'failed')::integer AS failed_count,
    MIN(va.generation_started_at) FILTER (WHERE va.generation_status = 'processing') AS oldest_processing_started
  FROM courses c
  JOIN video_assets va ON va.course_id = c.id
  WHERE EXISTS (
    SELECT 1 FROM video_assets
    WHERE video_assets.course_id = c.id
      AND video_assets.generation_status = 'processing'
  )
  GROUP BY c.id, c.title
  ORDER BY MIN(va.generation_started_at) ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_courses_with_processing_videos() IS 'Returns courses that have videos currently processing with statistics';

-- =====================================================
-- 4. FUNCTION TO CHECK IF BACKGROUND CHECK IS NEEDED
-- =====================================================

CREATE OR REPLACE FUNCTION should_run_background_video_check()
RETURNS boolean AS $$
DECLARE
  processing_count integer;
BEGIN
  SELECT COUNT(*)
  INTO processing_count
  FROM video_assets
  WHERE generation_status = 'processing'
    AND provider_video_id IS NOT NULL;

  RETURN processing_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION should_run_background_video_check() IS 'Returns true if there are any videos currently processing that need status checks';

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users for monitoring
GRANT EXECUTE ON FUNCTION get_processing_videos() TO authenticated;
GRANT EXECUTE ON FUNCTION get_stale_processing_videos(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_courses_with_processing_videos() TO authenticated;
GRANT EXECUTE ON FUNCTION should_run_background_video_check() TO authenticated;

-- Grant to service role for background jobs
GRANT EXECUTE ON FUNCTION get_processing_videos() TO service_role;
GRANT EXECUTE ON FUNCTION get_stale_processing_videos(integer) TO service_role;
GRANT EXECUTE ON FUNCTION get_courses_with_processing_videos() TO service_role;
GRANT EXECUTE ON FUNCTION should_run_background_video_check() TO service_role;
