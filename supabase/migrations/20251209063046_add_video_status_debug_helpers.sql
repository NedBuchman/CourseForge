/*
  # Add Video Status Debugging Helper Functions

  1. New Functions
    - `get_videos_by_status(course_id, status)` - Get videos filtered by status
    - `get_videos_needing_sync(course_id)` - Get videos that should be synced
    - `compare_video_counts(course_id)` - Compare expected vs actual video counts
    - `get_video_status_summary(course_id)` - Get summary of video statuses

  2. Purpose
    - Provide debugging tools for video status issues
    - Help diagnose sync problems between HeyGen and database
    - Enable quick status checks from SQL console

  3. Security
    - All functions use SECURITY DEFINER to bypass RLS for debugging
    - Should only be called by authenticated users or service role
*/

-- Function to get videos by status for a course
CREATE OR REPLACE FUNCTION get_videos_by_status(
  p_course_id uuid,
  p_status text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  asset_type text,
  asset_reference_id text,
  generation_status text,
  has_video_url boolean,
  has_provider_id boolean,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_status IS NULL THEN
    RETURN QUERY
    SELECT
      va.id,
      va.asset_type,
      va.asset_reference_id,
      va.generation_status,
      (va.video_url IS NOT NULL) as has_video_url,
      (va.provider_video_id IS NOT NULL) as has_provider_id,
      va.created_at,
      va.updated_at
    FROM video_assets va
    WHERE va.course_id = p_course_id
    ORDER BY va.created_at;
  ELSE
    RETURN QUERY
    SELECT
      va.id,
      va.asset_type,
      va.asset_reference_id,
      va.generation_status,
      (va.video_url IS NOT NULL) as has_video_url,
      (va.provider_video_id IS NOT NULL) as has_provider_id,
      va.created_at,
      va.updated_at
    FROM video_assets va
    WHERE va.course_id = p_course_id
      AND va.generation_status = p_status
    ORDER BY va.created_at;
  END IF;
END;
$$;

-- Function to get videos that match the sync query criteria
CREATE OR REPLACE FUNCTION get_videos_needing_sync(p_course_id uuid)
RETURNS TABLE (
  id uuid,
  asset_reference_id text,
  generation_status text,
  has_video_url boolean,
  has_provider_id boolean,
  provider_video_id text,
  reason text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    va.id,
    va.asset_reference_id,
    va.generation_status,
    (va.video_url IS NOT NULL) as has_video_url,
    (va.provider_video_id IS NOT NULL) as has_provider_id,
    va.provider_video_id,
    CASE
      WHEN va.generation_status = 'processing' AND va.video_url IS NULL
        THEN 'Processing with no URL'
      WHEN va.generation_status = 'processing' AND va.video_url IS NOT NULL
        THEN 'Processing but has URL'
      WHEN va.generation_status != 'processing' AND va.video_url IS NULL
        THEN 'Not processing but no URL'
      ELSE 'Other'
    END as reason
  FROM video_assets va
  WHERE va.course_id = p_course_id
    AND (va.generation_status = 'processing' OR va.video_url IS NULL)
    AND va.generation_status != 'failed'
  ORDER BY va.created_at;
END;
$$;

-- Function to get video status summary
CREATE OR REPLACE FUNCTION get_video_status_summary(p_course_id uuid)
RETURNS TABLE (
  total_videos integer,
  pending integer,
  queued integer,
  processing integer,
  completed integer,
  failed integer,
  cancelled integer,
  with_video_url integer,
  without_video_url integer,
  with_provider_id integer,
  without_provider_id integer,
  needing_sync integer
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::integer as total_videos,
    COUNT(*) FILTER (WHERE generation_status = 'pending')::integer as pending,
    COUNT(*) FILTER (WHERE generation_status = 'queued')::integer as queued,
    COUNT(*) FILTER (WHERE generation_status = 'processing')::integer as processing,
    COUNT(*) FILTER (WHERE generation_status = 'completed')::integer as completed,
    COUNT(*) FILTER (WHERE generation_status = 'failed')::integer as failed,
    COUNT(*) FILTER (WHERE generation_status = 'cancelled')::integer as cancelled,
    COUNT(*) FILTER (WHERE video_url IS NOT NULL)::integer as with_video_url,
    COUNT(*) FILTER (WHERE video_url IS NULL)::integer as without_video_url,
    COUNT(*) FILTER (WHERE provider_video_id IS NOT NULL)::integer as with_provider_id,
    COUNT(*) FILTER (WHERE provider_video_id IS NULL)::integer as without_provider_id,
    COUNT(*) FILTER (
      WHERE (generation_status = 'processing' OR video_url IS NULL)
        AND generation_status != 'failed'
    )::integer as needing_sync
  FROM video_assets
  WHERE course_id = p_course_id;
END;
$$;

-- Function to compare course-level counts with actual video counts
CREATE OR REPLACE FUNCTION compare_video_counts(p_course_id uuid)
RETURNS TABLE (
  metric text,
  course_value integer,
  actual_value integer,
  matches boolean
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_course_record record;
  v_actual_completed integer;
  v_actual_total integer;
BEGIN
  SELECT
    videos_generated_count,
    video_generation_status
  INTO v_course_record
  FROM courses
  WHERE id = p_course_id;

  SELECT
    COUNT(*) FILTER (WHERE generation_status = 'completed'),
    COUNT(*)
  INTO v_actual_completed, v_actual_total
  FROM video_assets
  WHERE course_id = p_course_id;

  RETURN QUERY
  SELECT
    'videos_generated_count'::text,
    COALESCE(v_course_record.videos_generated_count, 0),
    v_actual_completed,
    COALESCE(v_course_record.videos_generated_count, 0) = v_actual_completed;

  RETURN QUERY
  SELECT
    'total_videos'::text,
    v_actual_total,
    v_actual_total,
    true;
END;
$$;

-- Add helpful comments
COMMENT ON FUNCTION get_videos_by_status IS 'Debug helper: Get all videos for a course, optionally filtered by status';
COMMENT ON FUNCTION get_videos_needing_sync IS 'Debug helper: Get videos that match the sync query criteria used by check-video-status';
COMMENT ON FUNCTION get_video_status_summary IS 'Debug helper: Get comprehensive status summary for all videos in a course';
COMMENT ON FUNCTION compare_video_counts IS 'Debug helper: Compare course-level video counts with actual video asset counts';
