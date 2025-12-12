/*
  # Add Unique Constraint to Course Certificates

  1. Changes
    - Add unique constraint on (user_id, course_id) to prevent duplicate certificates
  
  2. Security
    - Prevents race conditions from creating duplicate certificates
*/

-- Add unique constraint to prevent duplicate certificates
ALTER TABLE course_certificates
ADD CONSTRAINT course_certificates_user_course_unique 
UNIQUE (user_id, course_id);
