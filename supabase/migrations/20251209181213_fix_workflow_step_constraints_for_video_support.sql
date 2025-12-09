/*
  # Fix Workflow Step Constraints for Video Support

  1. Problem
    - Current constraints limit steps to 0-6, preventing courses from reaching completion
    - Actual workflow has 7 steps for text-only courses, 8 steps for video/hybrid courses
    - This causes completed courses to show 67% or 83% instead of 100%

  2. Changes
    - Drop old step constraints (limited to 6)
    - Add new constraints allowing up to 8 steps
    - Ensures database can store all workflow steps for both formats

  3. Workflow Structure
    - Steps 1-5: Always present (Content Gen, Review Content, Quiz, Presentation, Landing Page)
    - Step 6: Review Videos (video/hybrid format only)
    - Step 6-7: Publish Course (step 6 for text, step 7 for video)
    - Step 7-8: Download Package (step 7 for text, step 8 for video)

  4. Security
    - No RLS changes required
    - Only updating check constraints
*/

-- Drop old constraints that limit steps to 6
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'current_step_check') THEN
    ALTER TABLE courses DROP CONSTRAINT current_step_check;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'last_completed_step_check') THEN
    ALTER TABLE courses DROP CONSTRAINT last_completed_step_check;
  END IF;
END $$;

-- Add new constraints allowing up to 8 steps
ALTER TABLE courses ADD CONSTRAINT current_step_check
  CHECK (current_step >= 1 AND current_step <= 8);

ALTER TABLE courses ADD CONSTRAINT last_completed_step_check
  CHECK (last_completed_step >= 0 AND last_completed_step <= 8);

-- Add helpful comments
COMMENT ON COLUMN courses.current_step IS 'Current workflow step (1-8). Text-only courses use steps 1-7, video/hybrid courses use steps 1-8';
COMMENT ON COLUMN courses.last_completed_step IS 'Highest completed workflow step (0-8). Text-only courses complete at step 7, video/hybrid courses complete at step 8';