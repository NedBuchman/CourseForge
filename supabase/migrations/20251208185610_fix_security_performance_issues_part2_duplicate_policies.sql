/*
  # Fix Security and Performance Issues - Part 2: Remove Duplicate RLS Policies

  ## Changes
  This migration removes duplicate RLS policies that can cause confusion and potential security issues.
  
  ### Duplicate Policies Removed:
  
  1. **courses table** - Remove older duplicate policies, keep the newer ones:
     - Removing: "Users can view own courses", "Users can create own courses", etc.
     - Keeping: "Users can view their own courses", "Users can insert their own courses", etc.
  
  2. **quizzes table** - Remove older general policies, keep course-specific ones:
     - Removing: "Users can view own quizzes", "Users can create quizzes", etc.
     - Keeping: "Users can view quizzes for their courses", etc.
  
  3. **quiz_questions table** - Remove older general policies, keep quiz-specific ones:
     - Removing: "Users can view own quiz questions", "Users can create quiz questions", etc.
     - Keeping: "Users can view questions for their quizzes", etc.
  
  4. **Other tables** - Keep most permissive policies for read access, specific ones for writes
  
  ### Security Impact:
  - Eliminates policy conflicts
  - Makes access control more predictable
  - Maintains same security level with cleaner implementation
*/

-- Drop duplicate policies on courses table (keep the "their own" versions)
DROP POLICY IF EXISTS "Users can view own courses" ON public.courses;
DROP POLICY IF EXISTS "Users can create own courses" ON public.courses;
DROP POLICY IF EXISTS "Users can update own courses" ON public.courses;
DROP POLICY IF EXISTS "Users can delete own courses" ON public.courses;

-- Drop duplicate policies on quizzes table (keep the "for their courses" versions)
DROP POLICY IF EXISTS "Users can view own quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can create quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can update own quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can delete own quizzes" ON public.quizzes;

-- Drop duplicate policies on quiz_questions table (keep the "for their quizzes" versions)
DROP POLICY IF EXISTS "Users can view own quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Users can create quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Users can update own quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Users can delete own quiz questions" ON public.quiz_questions;

-- Note: For tables with multiple permissive SELECT policies (like user_roles, student_lesson_views, etc.),
-- we keep all of them as they serve different use cases (e.g., students viewing their own data,
-- creators viewing their course data, admins viewing all data). Multiple permissive policies
-- with different conditions are intentional and provide proper access control.
