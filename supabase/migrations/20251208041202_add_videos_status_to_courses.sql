/*
  # Add Video Review Status Tracking to Courses

  ## Overview
  This migration adds video review status tracking to the courses table to support
  the video preview and approval workflow.

  ## Changes

  1. New Column
    - `videos_status` - Tracks the status of video review and approval process
      Possible values: 'not_started', 'pending_review', 'approved', 'needs_redo', 'skipped'

  2. Update
    - Add check constraint for videos_status values
    - Set default value to 'not_started'

  ## Notes
  - This field is only relevant for courses with content_format = 'video' or 'hybrid'
  - Videos must be approved before proceeding to quiz generation
  - Status 'skipped' allows users to bypass video format and convert to text-only
*/

-- Add videos_status column to courses table
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS videos_status text DEFAULT 'not_started';

-- Add check constraint for videos_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'courses_videos_status_check'
  ) THEN
    ALTER TABLE courses ADD CONSTRAINT courses_videos_status_check
    CHECK (videos_status IN ('not_started', 'pending_review', 'approved', 'needs_redo', 'skipped'));
  END IF;
END $$;

-- Add index for videos_status queries
CREATE INDEX IF NOT EXISTS idx_courses_videos_status ON courses(videos_status);

-- Add comment for documentation
COMMENT ON COLUMN courses.videos_status IS 'Status of video review and approval process: not_started, pending_review, approved, needs_redo, or skipped';
