/*
  # Add publish URL to landing page configs

  1. Changes
    - Add `publish_url` column to `landing_page_configs` table
    - This will store the custom URL where the course landing page will be published
    - The URL can be a custom domain, subdomain, or path

  2. Notes
    - Column is optional (nullable)
    - Users can specify where they want their course published
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'landing_page_configs' AND column_name = 'publish_url'
  ) THEN
    ALTER TABLE landing_page_configs ADD COLUMN publish_url text;
  END IF;
END $$;