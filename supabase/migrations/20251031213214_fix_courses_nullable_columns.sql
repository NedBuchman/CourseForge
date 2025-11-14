/*
  # Fix Courses Table Nullable Columns

  1. Changes
    - Make `topic` column nullable (was NOT NULL)
    - Make `title` column nullable (to handle partial saves)
    
  2. Reason
    - The course creation form doesn't always have all fields filled
    - Users should be able to save draft courses without complete information
*/

-- Remove NOT NULL constraint from topic column
ALTER TABLE courses ALTER COLUMN topic DROP NOT NULL;

-- Remove NOT NULL constraint from title column if it exists
ALTER TABLE courses ALTER COLUMN title DROP NOT NULL;
