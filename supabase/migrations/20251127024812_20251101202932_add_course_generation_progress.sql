/*
  # Add Course Generation Progress Tracking

  1. Changes to `courses` table
    - Add `generation_progress` column (integer 0-100) to track progress percentage
    - Add `generation_stage` column (text) to track current stage of generation
    - Add `generation_started_at` column (timestamptz) to track when generation started
    - Add `generation_completed_at` column (timestamptz) to track when generation completed
    - Add `generation_error` column (text) to store error details if generation fails
    - Add `retry_count` column (integer) to track number of retry attempts

  2. Purpose
    - Enable real-time progress tracking for course generation
    - Allow users to see what stage of generation is currently happening
    - Track generation time for analytics and timeout prevention
    - Store detailed error information for troubleshooting
    - Support retry logic by tracking attempt count
*/

-- Add progress tracking columns to courses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'generation_progress'
  ) THEN
    ALTER TABLE courses ADD COLUMN generation_progress integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'generation_stage'
  ) THEN
    ALTER TABLE courses ADD COLUMN generation_stage text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'generation_started_at'
  ) THEN
    ALTER TABLE courses ADD COLUMN generation_started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'generation_completed_at'
  ) THEN
    ALTER TABLE courses ADD COLUMN generation_completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'generation_error'
  ) THEN
    ALTER TABLE courses ADD COLUMN generation_error text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'retry_count'
  ) THEN
    ALTER TABLE courses ADD COLUMN retry_count integer DEFAULT 0;
  END IF;
END $$;