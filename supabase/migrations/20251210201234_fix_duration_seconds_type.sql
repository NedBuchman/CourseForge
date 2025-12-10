/*
  # Fix duration_seconds column type to support decimal values

  1. Changes
    - Change duration_seconds from INTEGER to NUMERIC(10,3)
    - This allows storing durations with millisecond precision like 129.717 seconds
  
  2. Reason
    - HeyGen API returns video durations as decimal numbers (e.g., 129.717)
    - The INTEGER type was causing "invalid input syntax for type integer" errors
    - This prevents video status updates from completing successfully
*/

-- Change duration_seconds to support decimal values
ALTER TABLE video_assets 
  ALTER COLUMN duration_seconds TYPE NUMERIC(10,3);

-- Add comment explaining the precision
COMMENT ON COLUMN video_assets.duration_seconds IS 'Video duration in seconds with millisecond precision (up to 3 decimal places)';
