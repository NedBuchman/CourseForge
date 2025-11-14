/*
  # Add course benefits field to landing page configurations

  1. Changes
    - Add `course_benefits` column to `landing_page_configs` table
      - Stores JSON array of benefit objects (icon, title, description)
      - Nullable field (optional for existing records)
  
  2. Purpose
    - Allow users to specify key course benefits/learning outcomes
    - Display user-provided benefits instead of generic placeholders
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'landing_page_configs' AND column_name = 'course_benefits'
  ) THEN
    ALTER TABLE landing_page_configs ADD COLUMN course_benefits jsonb;
  END IF;
END $$;