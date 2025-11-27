/*
  # Add Missing Course Columns

  1. New Columns
    - `duration` (text) - Course duration (e.g., "1-hour", "2-hours")
    - `learning_objectives` (text) - What learners will be able to do after completion
    - `additional_context` (text) - Specific topics or areas to emphasize
    - `uploaded_files` (jsonb) - Array of file URLs uploaded by user
    - `restrict_to_files` (boolean) - Whether to restrict search to uploaded files only
    - `chat_history` (jsonb) - Chat messages for course refinement

  2. Security
    - Existing RLS policies automatically apply to new columns
*/

-- Add duration field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'duration'
  ) THEN
    ALTER TABLE courses ADD COLUMN duration text;
  END IF;
END $$;

-- Add learning_objectives field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'learning_objectives'
  ) THEN
    ALTER TABLE courses ADD COLUMN learning_objectives text;
  END IF;
END $$;

-- Add additional_context field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'additional_context'
  ) THEN
    ALTER TABLE courses ADD COLUMN additional_context text;
  END IF;
END $$;

-- Add uploaded_files field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'uploaded_files'
  ) THEN
    ALTER TABLE courses ADD COLUMN uploaded_files jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add restrict_to_files field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'restrict_to_files'
  ) THEN
    ALTER TABLE courses ADD COLUMN restrict_to_files boolean DEFAULT false;
  END IF;
END $$;

-- Add chat_history field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'chat_history'
  ) THEN
    ALTER TABLE courses ADD COLUMN chat_history jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;