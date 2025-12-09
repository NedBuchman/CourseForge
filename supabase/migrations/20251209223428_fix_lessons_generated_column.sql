/*
  # Fix lessons generated column to properly extract from generated_content

  1. Problem
    - The lessons generated column exists but shows empty arrays
    - Lessons data is present in generated_content->'lessons'
    - Generated columns don't auto-populate for existing rows in some cases

  2. Solution
    - Drop the existing generated column
    - Recreate it with proper syntax
    - Force update all rows to populate the column

  3. Note
    - This ensures all existing courses have their lessons properly extracted
*/

-- Drop the existing generated lessons column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'lessons'
  ) THEN
    ALTER TABLE courses DROP COLUMN lessons;
  END IF;
END $$;

-- Add lessons as a properly configured generated column
ALTER TABLE courses ADD COLUMN lessons jsonb 
  GENERATED ALWAYS AS (generated_content -> 'lessons') STORED;

-- Force PostgreSQL to populate the generated column for all existing rows
-- by updating the generated_content column (even though we're not changing it)
UPDATE courses 
SET generated_content = generated_content 
WHERE generated_content IS NOT NULL;
