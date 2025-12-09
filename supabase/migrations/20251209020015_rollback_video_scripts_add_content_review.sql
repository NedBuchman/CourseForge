/*
  # Rollback Video Scripts and Add Content Review Support

  ## Overview
  This migration fixes the incorrect video scripts approach and implements
  proper lesson content review workflow.

  ## Changes

  1. Remove Incorrect Video Scripts Columns
    - Remove video_scripts (lesson content is already in generated_content)
    - Remove video_scripts_status (use content_status instead)
    - Remove video_scripts_approved_at
    - Remove video_scripts_generated_at

  2. Add Content Review Tracking
    - content_approved_at - When user approved the lesson content
    - video_generation_started_at - When video generation began (if video mode)
    - video_generation_background - Whether videos are generating in background

  ## Notes
  - Lesson content is already in generated_content (short for video, long for text)
  - Users review actual lesson content at step 2
  - Video generation starts AFTER content approval (if video mode)
  - Videos are reviewed at step 7 (before publish)
*/

-- =====================================================
-- 1. REMOVE INCORRECT VIDEO SCRIPTS COLUMNS
-- =====================================================

ALTER TABLE courses
DROP COLUMN IF EXISTS video_scripts CASCADE,
DROP COLUMN IF EXISTS video_scripts_status CASCADE,
DROP COLUMN IF EXISTS video_scripts_approved_at CASCADE,
DROP COLUMN IF EXISTS video_scripts_generated_at CASCADE;

-- Remove check constraint if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'courses_video_scripts_status_check'
  ) THEN
    ALTER TABLE courses DROP CONSTRAINT courses_video_scripts_status_check;
  END IF;
END $$;

-- Remove index if exists
DROP INDEX IF EXISTS idx_courses_video_scripts_status;

-- =====================================================
-- 2. ADD CONTENT REVIEW TRACKING
-- =====================================================

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS content_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS video_generation_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS video_generation_background BOOLEAN DEFAULT false;

-- =====================================================
-- 3. ADD COMMENTS
-- =====================================================

COMMENT ON COLUMN courses.content_approved_at IS 'Timestamp when user approved the lesson content (step 2)';
COMMENT ON COLUMN courses.video_generation_started_at IS 'Timestamp when background video generation started (if video mode)';
COMMENT ON COLUMN courses.video_generation_background IS 'Whether videos are currently generating in the background';
