/*
  # Add Video Script Review Support

  ## Overview
  This migration adds support for reviewing video scripts before generating videos,
  allowing users to approve shortened lesson text before expensive video generation begins.

  ## Changes

  1. New Columns Added to `courses` Table
    - `video_scripts` (JSONB) - Stores approved video scripts for each lesson
    - `video_scripts_status` (text) - Tracks script generation and approval status
    - `video_scripts_approved_at` (timestamptz) - When scripts were approved
    - `video_scripts_generated_at` (timestamptz) - When scripts were first generated

  2. Check Constraints
    - Validates video_scripts_status values

  3. Indexes
    - Performance index on video_scripts_status for filtering

  ## Notes
  - Scripts are generated during content generation phase
  - Users review and approve scripts before video generation starts
  - Videos generate in background after script approval
  - This reduces blocking wait time from 10-15 minutes to under 30 seconds
*/

-- =====================================================
-- 1. ADD VIDEO SCRIPT COLUMNS TO COURSES TABLE
-- =====================================================

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS video_scripts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS video_scripts_status TEXT DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS video_scripts_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS video_scripts_generated_at TIMESTAMPTZ;

-- =====================================================
-- 2. ADD CHECK CONSTRAINT
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'courses_video_scripts_status_check'
  ) THEN
    ALTER TABLE courses ADD CONSTRAINT courses_video_scripts_status_check
    CHECK (video_scripts_status IN ('not_started', 'generating', 'generated', 'approved', 'needs_revision'));
  END IF;
END $$;

-- =====================================================
-- 3. CREATE INDEX
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_courses_video_scripts_status ON courses(video_scripts_status);

-- =====================================================
-- 4. ADD COMMENTS
-- =====================================================

COMMENT ON COLUMN courses.video_scripts IS 'Shortened lesson scripts optimized for video narration (array of {lesson_number, title, script, word_count, estimated_duration})';
COMMENT ON COLUMN courses.video_scripts_status IS 'Status of video script generation and approval process';
COMMENT ON COLUMN courses.video_scripts_approved_at IS 'Timestamp when video scripts were approved by course creator';
COMMENT ON COLUMN courses.video_scripts_generated_at IS 'Timestamp when video scripts were first generated';
