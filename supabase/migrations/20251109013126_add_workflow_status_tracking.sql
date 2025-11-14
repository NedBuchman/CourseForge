/*
  Add Workflow Status Tracking to Courses

  1. Changes
    - Add workflow status fields to track progress through course creation
    - Add timestamps for each major workflow milestone
    
  2. New Columns
    - content_generated_at (timestamptz) - When course content generation completed
    - quizzes_status (text) - Quiz workflow status: not_started, generating, completed, failed
    - quizzes_accepted_at (timestamptz) - When user accepted/approved quizzes
    - presentation_status (text) - Presentation workflow status: not_configured, configured
    - presentation_accepted_at (timestamptz) - When user accepted presentation configuration
    - landing_page_status (text) - Landing page workflow status: not_configured, configured
    - landing_page_accepted_at (timestamptz) - When user accepted landing page configuration
    - published_at (timestamptz) - When course was published
    - last_downloaded_at (timestamptz) - When course package was last downloaded

  3. Important Notes
    - Status fields use TEXT with constraints for flexibility
    - All new fields are nullable to support existing courses
    - Timestamps are set manually when workflows complete
*/

-- Add content generation timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'content_generated_at'
  ) THEN
    ALTER TABLE courses ADD COLUMN content_generated_at timestamptz;
  END IF;
END $$;

-- Add quizzes workflow tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'quizzes_status'
  ) THEN
    ALTER TABLE courses ADD COLUMN quizzes_status text DEFAULT 'not_started';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'quizzes_accepted_at'
  ) THEN
    ALTER TABLE courses ADD COLUMN quizzes_accepted_at timestamptz;
  END IF;
END $$;

-- Add presentation workflow tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'presentation_status'
  ) THEN
    ALTER TABLE courses ADD COLUMN presentation_status text DEFAULT 'not_configured';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'presentation_accepted_at'
  ) THEN
    ALTER TABLE courses ADD COLUMN presentation_accepted_at timestamptz;
  END IF;
END $$;

-- Add landing page workflow tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'landing_page_status'
  ) THEN
    ALTER TABLE courses ADD COLUMN landing_page_status text DEFAULT 'not_configured';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'landing_page_accepted_at'
  ) THEN
    ALTER TABLE courses ADD COLUMN landing_page_accepted_at timestamptz;
  END IF;
END $$;

-- Add publication tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'published_at'
  ) THEN
    ALTER TABLE courses ADD COLUMN published_at timestamptz;
  END IF;
END $$;

-- Add download tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'last_downloaded_at'
  ) THEN
    ALTER TABLE courses ADD COLUMN last_downloaded_at timestamptz;
  END IF;
END $$;

-- Add check constraints for status fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quizzes_status_check'
  ) THEN
    ALTER TABLE courses ADD CONSTRAINT quizzes_status_check 
      CHECK (quizzes_status IN ('not_started', 'generating', 'completed', 'failed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'presentation_status_check'
  ) THEN
    ALTER TABLE courses ADD CONSTRAINT presentation_status_check 
      CHECK (presentation_status IN ('not_configured', 'configured'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'landing_page_status_check'
  ) THEN
    ALTER TABLE courses ADD CONSTRAINT landing_page_status_check 
      CHECK (landing_page_status IN ('not_configured', 'configured'));
  END IF;
END $$;

-- Create indexes for status fields
CREATE INDEX IF NOT EXISTS idx_courses_quizzes_status ON courses(quizzes_status);
CREATE INDEX IF NOT EXISTS idx_courses_presentation_status ON courses(presentation_status);
CREATE INDEX IF NOT EXISTS idx_courses_landing_page_status ON courses(landing_page_status);
CREATE INDEX IF NOT EXISTS idx_courses_published_at ON courses(published_at DESC);
