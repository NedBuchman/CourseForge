/*
  # Add completed_at column to lesson_video_views

  1. Changes
    - Add `completed_at` timestamptz column to track when video was completed
    
  2. Notes
    - This allows tracking the exact timestamp when a student completes watching a video
    - Useful for analytics and progress tracking
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_video_views' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE lesson_video_views ADD COLUMN completed_at timestamptz;
  END IF;
END $$;
