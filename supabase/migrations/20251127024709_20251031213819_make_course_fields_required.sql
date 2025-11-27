/*
  # Make Course Required Fields NOT NULL

  1. Changes
    - Make `topic` column NOT NULL (was nullable)
    - Make `target_audience` column NOT NULL (was nullable)
    - Make `difficulty_level` column NOT NULL (was nullable)
    - Make `duration` column NOT NULL (was nullable)
    
  2. Reason
    - These fields are now required in the form validation
    - Ensures data integrity at the database level
    - Prevents creation of courses without essential information
    
  3. Notes
    - Update any existing NULL values to default values before applying constraints
    - This migration assumes the form now prevents submission without these fields
*/

-- Update any existing NULL values with defaults before adding NOT NULL constraints
UPDATE courses 
SET topic = title 
WHERE topic IS NULL;

UPDATE courses 
SET target_audience = 'General audience' 
WHERE target_audience IS NULL;

UPDATE courses 
SET difficulty_level = 'beginner' 
WHERE difficulty_level IS NULL;

UPDATE courses 
SET duration = '1-hour' 
WHERE duration IS NULL;

-- Now add NOT NULL constraints
ALTER TABLE courses ALTER COLUMN topic SET NOT NULL;
ALTER TABLE courses ALTER COLUMN target_audience SET NOT NULL;
ALTER TABLE courses ALTER COLUMN difficulty_level SET NOT NULL;
ALTER TABLE courses ALTER COLUMN duration SET NOT NULL;