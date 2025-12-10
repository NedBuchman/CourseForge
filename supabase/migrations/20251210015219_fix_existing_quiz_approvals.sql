/*
  # Fix Existing Quiz Approvals

  This migration fixes a bug where quizzes were generated and reviewed but never
  marked as approved in the database. This prevents students from seeing quizzes
  in completed courses.

  ## Changes
  - Updates all quizzes to `approved = true` for courses where `quizzes_status = 'completed'`
  - This is a one-time data migration to fix existing courses
  - Going forward, the creator app will properly mark quizzes as approved when accepting them

  ## Tables Modified
  - `quizzes` - Sets `approved = true` for all quizzes in completed courses
*/

-- Update all quizzes to approved for courses that have completed quiz generation
UPDATE quizzes
SET approved = true
WHERE course_id IN (
  SELECT id 
  FROM courses 
  WHERE quizzes_status = 'completed'
)
AND approved = false;