/*
  # Add Generation Job Tracking for Async Course Generation

  ## Overview
  This migration adds enhanced tracking for long-running course generation jobs.
  It enables asynchronous processing with real-time progress updates to eliminate timeout issues.

  ## Changes Made
  
  ### 1. Enhanced Columns in courses table
    - `generation_job_id` - Unique identifier for the generation job
    - `current_lesson_generating` - Track which lesson is currently being generated
    - `lessons_generated` - Array of completed lesson numbers
    - `generation_started_at` - Already exists
    - `generation_last_heartbeat` - Last time the job reported progress
    - `generation_estimated_completion` - Estimated completion timestamp
    
  ### 2. New Indexes
    - Index on `generation_job_id` for fast job lookups
    - Index on `user_id, status` for efficient user course queries
    - Index on `generation_last_heartbeat` for stale job detection

  ## Security
    - RLS policies already exist on courses table
    - All new columns follow existing security model
*/

-- Add new columns for async generation tracking
DO $$ 
BEGIN
  -- Add generation_job_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'generation_job_id'
  ) THEN
    ALTER TABLE courses ADD COLUMN generation_job_id uuid DEFAULT gen_random_uuid();
  END IF;

  -- Add current_lesson_generating if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'current_lesson_generating'
  ) THEN
    ALTER TABLE courses ADD COLUMN current_lesson_generating integer;
  END IF;

  -- Add lessons_generated array if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'lessons_generated'
  ) THEN
    ALTER TABLE courses ADD COLUMN lessons_generated integer[] DEFAULT '{}';
  END IF;

  -- Add generation_last_heartbeat if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'generation_last_heartbeat'
  ) THEN
    ALTER TABLE courses ADD COLUMN generation_last_heartbeat timestamptz;
  END IF;

  -- Add generation_estimated_completion if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'generation_estimated_completion'
  ) THEN
    ALTER TABLE courses ADD COLUMN generation_estimated_completion timestamptz;
  END IF;
END $$;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_courses_generation_job_id ON courses(generation_job_id);
CREATE INDEX IF NOT EXISTS idx_courses_user_status ON courses(user_id, status);
CREATE INDEX IF NOT EXISTS idx_courses_heartbeat ON courses(generation_last_heartbeat) WHERE status = 'generating';

-- Add comment for documentation
COMMENT ON COLUMN courses.generation_job_id IS 'Unique identifier for async generation job tracking';
COMMENT ON COLUMN courses.current_lesson_generating IS 'Lesson number currently being generated';
COMMENT ON COLUMN courses.lessons_generated IS 'Array of lesson numbers that have been completed';
COMMENT ON COLUMN courses.generation_last_heartbeat IS 'Last progress update timestamp for stale job detection';
COMMENT ON COLUMN courses.generation_estimated_completion IS 'Estimated completion time based on progress rate';