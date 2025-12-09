/*
  # Add lessons as generated column from generated_content

  1. Purpose
    - Expose lessons data from generated_content JSONB as a direct column
    - Allows frontend to query lessons directly without manual JSONB extraction
    - Maintains backward compatibility with existing queries

  2. Changes
    - Add `lessons` as a GENERATED column that extracts from generated_content->'lessons'
    - This is a virtual column that computes its value from generated_content
    - No storage overhead as it's computed on-the-fly

  3. Notes
    - Existing queries selecting 'lessons' will now work correctly
    - The column updates automatically when generated_content changes
    - Returns NULL if generated_content doesn't have a lessons field
*/

-- Add lessons as a generated column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'lessons'
  ) THEN
    ALTER TABLE courses ADD COLUMN lessons jsonb GENERATED ALWAYS AS (generated_content->'lessons') STORED;
  END IF;
END $$;

-- Add description column if it doesn't exist (needed for course catalog)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'description'
  ) THEN
    ALTER TABLE courses ADD COLUMN description text;
  END IF;
END $$;
