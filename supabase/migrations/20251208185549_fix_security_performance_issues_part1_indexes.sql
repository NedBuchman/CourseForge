/*
  # Fix Security and Performance Issues - Part 1: Missing Foreign Key Indexes

  ## Changes
  This migration addresses performance issues by adding missing indexes on foreign key columns.
  
  ### Missing Indexes Added:
  1. **course_access_control**
     - Index on `granted_by` foreign key
  
  2. **course_invitations**
     - Index on `course_id` foreign key
     - Index on `created_student_id` foreign key
     - Index on `creator_id` foreign key
  
  3. **user_roles**
     - Index on `created_by` foreign key
  
  ### Performance Impact:
  - Improves JOIN performance on foreign key relationships
  - Speeds up queries filtering by these columns
  - Reduces query execution time at scale
*/

-- Add index for course_access_control.granted_by
CREATE INDEX IF NOT EXISTS idx_course_access_granted_by 
ON public.course_access_control(granted_by);

-- Add indexes for course_invitations foreign keys
CREATE INDEX IF NOT EXISTS idx_course_invitations_course_id 
ON public.course_invitations(course_id);

CREATE INDEX IF NOT EXISTS idx_course_invitations_created_student_id 
ON public.course_invitations(created_student_id);

CREATE INDEX IF NOT EXISTS idx_course_invitations_creator_id 
ON public.course_invitations(creator_id);

-- Add index for user_roles.created_by
CREATE INDEX IF NOT EXISTS idx_user_roles_created_by 
ON public.user_roles(created_by);
