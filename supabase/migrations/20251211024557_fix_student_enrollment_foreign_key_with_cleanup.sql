/*
  # Fix Student Enrollment Foreign Key with Data Cleanup

  1. Changes
    - Remove invalid enrollment records that reference non-existent users
    - Drop the foreign key constraint from `student_id` to `student_accounts` table
    - Add a new foreign key constraint from `student_id` to `auth.users(id)`
    - Since we're using Supabase Auth for student authentication, this aligns the schema with the implementation

  2. Security
    - Maintains existing RLS policies
    - No changes to data access patterns
*/

-- First, clean up any enrollments with invalid student_ids or user_ids
DELETE FROM student_course_enrollments
WHERE student_id NOT IN (SELECT id FROM auth.users)
   OR user_id IS NULL
   OR user_id NOT IN (SELECT id FROM auth.users);

-- Drop the old foreign key constraint that references student_accounts
ALTER TABLE student_course_enrollments
DROP CONSTRAINT IF EXISTS student_course_enrollments_student_id_fkey;

-- Add a new foreign key constraint that references auth.users
ALTER TABLE student_course_enrollments
ADD CONSTRAINT student_course_enrollments_student_id_fkey
FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;
