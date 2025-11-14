/*
  # Add generated_content column to courses table
  
  1. Changes
    - Add `generated_content` column to `courses` table to store AI-generated course content
    - This column stores the complete course structure including lessons, objectives, and metadata
    
  2. Notes
    - Uses JSONB for efficient storage and querying of structured data
    - Default value is empty object to prevent null issues
    - This is a critical column that the application code depends on
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'generated_content'
  ) THEN
    ALTER TABLE courses ADD COLUMN generated_content jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;