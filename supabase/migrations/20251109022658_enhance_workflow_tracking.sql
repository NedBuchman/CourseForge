/*
  # Enhance Workflow Status Tracking

  1. Purpose
    - Add granular status tracking for all workflow steps
    - Add current_step and last_completed_step for smart navigation
    - Support cascading invalidation when editing completed steps

  2. New Columns
    - content_status (text) - Content generation status: not_started, in_progress, completed, needs_redo
    - current_step (integer) - Current workflow step user is on (1-6)
    - last_completed_step (integer) - Highest step completed (0-6)
    - published_status (text) - Publication status: not_published, published, needs_republish
    - downloaded_status (text) - Download status: not_downloaded, downloaded

  3. Updated Constraints
    - Add 'needs_redo' status to existing status columns
    - Add constraints for new status columns
    - Add indexes for navigation queries

  4. Workflow Steps
    1. Content Generation
    2. Quiz Generation
    3. Presentation Generation
    4. Landing Page Generation
    5. Published
    6. Downloaded
*/

-- Add content_status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'content_status'
  ) THEN
    ALTER TABLE courses ADD COLUMN content_status text DEFAULT 'not_started';
  END IF;
END $$;

-- Add current_step column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'current_step'
  ) THEN
    ALTER TABLE courses ADD COLUMN current_step integer DEFAULT 1;
  END IF;
END $$;

-- Add last_completed_step column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'last_completed_step'
  ) THEN
    ALTER TABLE courses ADD COLUMN last_completed_step integer DEFAULT 0;
  END IF;
END $$;

-- Add published_status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'published_status'
  ) THEN
    ALTER TABLE courses ADD COLUMN published_status text DEFAULT 'not_published';
  END IF;
END $$;

-- Add downloaded_status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'downloaded_status'
  ) THEN
    ALTER TABLE courses ADD COLUMN downloaded_status text DEFAULT 'not_downloaded';
  END IF;
END $$;

-- Drop existing constraints to update them
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quizzes_status_check') THEN
    ALTER TABLE courses DROP CONSTRAINT quizzes_status_check;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'presentation_status_check') THEN
    ALTER TABLE courses DROP CONSTRAINT presentation_status_check;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'landing_page_status_check') THEN
    ALTER TABLE courses DROP CONSTRAINT landing_page_status_check;
  END IF;
END $$;

-- Add updated constraints with needs_redo status
ALTER TABLE courses ADD CONSTRAINT content_status_check
  CHECK (content_status IN ('not_started', 'in_progress', 'completed', 'needs_redo'));

ALTER TABLE courses ADD CONSTRAINT quizzes_status_check
  CHECK (quizzes_status IN ('not_started', 'in_progress', 'completed', 'needs_redo'));

ALTER TABLE courses ADD CONSTRAINT presentation_status_check
  CHECK (presentation_status IN ('not_configured', 'configured', 'needs_redo'));

ALTER TABLE courses ADD CONSTRAINT landing_page_status_check
  CHECK (landing_page_status IN ('not_configured', 'configured', 'needs_redo'));

ALTER TABLE courses ADD CONSTRAINT published_status_check
  CHECK (published_status IN ('not_published', 'published', 'needs_republish'));

ALTER TABLE courses ADD CONSTRAINT downloaded_status_check
  CHECK (downloaded_status IN ('not_downloaded', 'downloaded'));

ALTER TABLE courses ADD CONSTRAINT current_step_check
  CHECK (current_step >= 1 AND current_step <= 6);

ALTER TABLE courses ADD CONSTRAINT last_completed_step_check
  CHECK (last_completed_step >= 0 AND last_completed_step <= 6);

-- Create indexes for navigation and filtering
CREATE INDEX IF NOT EXISTS idx_courses_content_status ON courses(content_status);
CREATE INDEX IF NOT EXISTS idx_courses_current_step ON courses(current_step);
CREATE INDEX IF NOT EXISTS idx_courses_last_completed_step ON courses(last_completed_step);
CREATE INDEX IF NOT EXISTS idx_courses_published_status ON courses(published_status);
CREATE INDEX IF NOT EXISTS idx_courses_downloaded_status ON courses(downloaded_status);

-- Update existing courses to have proper initial statuses based on their current state
DO $$
BEGIN
  -- For courses that have generated_content, set content_status to completed
  UPDATE courses
  SET content_status = 'completed',
      last_completed_step = GREATEST(last_completed_step, 1),
      current_step = CASE
        WHEN current_step = 1 THEN 2
        ELSE current_step
      END
  WHERE generated_content IS NOT NULL
    AND generated_content->>'lessons' IS NOT NULL
    AND status = 'completed'
    AND content_status = 'not_started';

  -- For courses with quizzes, update quizzes_status and steps
  UPDATE courses c
  SET quizzes_status = 'completed',
      last_completed_step = GREATEST(c.last_completed_step, 2),
      current_step = CASE
        WHEN c.current_step <= 2 THEN 3
        ELSE c.current_step
      END
  WHERE EXISTS (
    SELECT 1 FROM quizzes q WHERE q.course_id = c.id
  )
  AND c.quizzes_status = 'not_started';

  -- For courses with presentation config, update presentation_status and steps
  UPDATE courses c
  SET presentation_status = 'configured',
      last_completed_step = GREATEST(c.last_completed_step, 3),
      current_step = CASE
        WHEN c.current_step <= 3 THEN 4
        ELSE c.current_step
      END
  WHERE EXISTS (
    SELECT 1 FROM presentation_configs pc WHERE pc.course_id = c.id
  )
  AND c.presentation_status != 'configured';

  -- For courses with landing page config, update landing_page_status and steps
  UPDATE courses c
  SET landing_page_status = 'configured',
      last_completed_step = GREATEST(c.last_completed_step, 4),
      current_step = CASE
        WHEN c.current_step <= 4 THEN 5
        ELSE c.current_step
      END
  WHERE EXISTS (
    SELECT 1 FROM landing_page_configs lpc WHERE lpc.course_id = c.id
  )
  AND c.landing_page_status != 'configured';

  -- For courses that have been published, update published_status and steps
  UPDATE courses
  SET published_status = 'published',
      last_completed_step = GREATEST(last_completed_step, 5),
      current_step = 6
  WHERE published_at IS NOT NULL
    AND published_status = 'not_published';
END $$;
