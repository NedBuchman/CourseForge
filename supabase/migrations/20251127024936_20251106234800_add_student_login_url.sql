/*
  # Add student login page URL to landing page configs

  1. Changes
    - Add `student_login_url` column to `landing_page_configs` table
    - This will store the URL for the student login page associated with each course
    - Typically this will be a path like /login or /student-login on the course domain

  2. Notes
    - Column is optional (nullable)
    - Generated automatically when landing page is created
    - Can be customized by the course creator
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'landing_page_configs' AND column_name = 'student_login_url'
  ) THEN
    ALTER TABLE landing_page_configs ADD COLUMN student_login_url text;
  END IF;
END $$;