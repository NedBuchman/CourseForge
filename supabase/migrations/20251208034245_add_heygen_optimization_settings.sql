/*
  # Add HeyGen Optimization Settings

  1. Changes
    - Add `heygen_plan_tier` column to courses table to track concurrency limits
    - Add `video_resolution` column to courses table for resolution selection
    - Add `video_generation_started_at` column to track when video generation started
    - Add `estimated_completion_time` column for user feedback
    
  2. Plan Tiers and Concurrency Limits
    - free: 1 concurrent video
    - pro: 3 concurrent videos
    - scale: 6 concurrent videos
    - enterprise: 20 concurrent videos
    
  3. Resolution Options
    - 480p: 854x480 (fastest)
    - 540p: 960x540 (faster)
    - 720p: 1280x720 (default, balanced)
    - 1080p: 1920x1080 (highest quality, pro+ plans only)
*/

-- Add HeyGen plan tier column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'heygen_plan_tier'
  ) THEN
    ALTER TABLE courses ADD COLUMN heygen_plan_tier text DEFAULT 'free' CHECK (heygen_plan_tier IN ('free', 'pro', 'scale', 'enterprise'));
  END IF;
END $$;

-- Add video resolution column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'video_resolution'
  ) THEN
    ALTER TABLE courses ADD COLUMN video_resolution text DEFAULT '720p' CHECK (video_resolution IN ('480p', '540p', '720p', '1080p'));
  END IF;
END $$;

-- Add video generation started timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'video_generation_started_at'
  ) THEN
    ALTER TABLE courses ADD COLUMN video_generation_started_at timestamptz;
  END IF;
END $$;

-- Add estimated completion time
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'estimated_completion_time'
  ) THEN
    ALTER TABLE courses ADD COLUMN estimated_completion_time timestamptz;
  END IF;
END $$;

-- Create index for faster queries on video generation status
CREATE INDEX IF NOT EXISTS idx_courses_video_generation_status 
  ON courses(video_generation_status) 
  WHERE video_generation_status IN ('processing', 'in_progress');

-- Add comment for documentation
COMMENT ON COLUMN courses.heygen_plan_tier IS 'HeyGen API plan tier determining concurrent video processing limits';
COMMENT ON COLUMN courses.video_resolution IS 'Target video resolution for generation (lower = faster processing)';
COMMENT ON COLUMN courses.video_generation_started_at IS 'Timestamp when video generation batch started';
COMMENT ON COLUMN courses.estimated_completion_time IS 'Estimated time when all videos will complete processing';
