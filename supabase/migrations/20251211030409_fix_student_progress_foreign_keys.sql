/*
  # Fix Student Progress Tables Foreign Keys

  1. Changes
    - Fix foreign key constraints in student progress tracking tables
    - Change from referencing `student_accounts(id)` to `auth.users(id)`
    - This aligns with using Supabase Auth for all authentication
    
  2. Tables Updated
    - student_lesson_views
    - student_lesson_completions
    - student_quiz_attempts

  3. Security
    - Maintains existing RLS policies
    - Cleans up any orphaned records first
*/

-- Clean up any orphaned records in student_lesson_views
DELETE FROM student_lesson_views
WHERE student_id NOT IN (SELECT id FROM auth.users);

-- Fix student_lesson_views foreign key
ALTER TABLE student_lesson_views
DROP CONSTRAINT IF EXISTS student_lesson_views_student_id_fkey;

ALTER TABLE student_lesson_views
ADD CONSTRAINT student_lesson_views_student_id_fkey
FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Clean up any orphaned records in student_lesson_completions
DELETE FROM student_lesson_completions
WHERE student_id NOT IN (SELECT id FROM auth.users);

-- Fix student_lesson_completions foreign key
ALTER TABLE student_lesson_completions
DROP CONSTRAINT IF EXISTS student_lesson_completions_student_id_fkey;

ALTER TABLE student_lesson_completions
ADD CONSTRAINT student_lesson_completions_student_id_fkey
FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Clean up any orphaned records in student_quiz_attempts
DELETE FROM student_quiz_attempts
WHERE student_id NOT IN (SELECT id FROM auth.users);

-- Fix student_quiz_attempts foreign key
ALTER TABLE student_quiz_attempts
DROP CONSTRAINT IF EXISTS student_quiz_attempts_student_id_fkey;

ALTER TABLE student_quiz_attempts
ADD CONSTRAINT student_quiz_attempts_student_id_fkey
FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;
