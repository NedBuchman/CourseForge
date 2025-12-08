/*
  # Fix Authentication and User Creation

  ## Problem
  The handle_new_user trigger function is failing due to:
  1. Empty search_path requiring fully qualified names
  2. RLS policies potentially blocking the insert
  
  ## Solution
  1. Update handle_new_user function to properly handle schema qualification
  2. Add policy to allow authenticated users to have their roles created during signup
  3. Ensure SECURITY DEFINER functions can bypass RLS for user creation
  
  ## Changes
  - Recreate handle_new_user function with proper error handling
  - Add policy for service role to insert user roles
*/

-- Drop and recreate the handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Insert into user_roles table with the default 'creator' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'creator');
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail user creation
    RAISE WARNING 'Failed to create user role: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the function has proper grants
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, authenticated, service_role;

-- Add a permissive policy to allow user_roles inserts during signup
-- This policy allows the service role (used by triggers) to insert roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND policyname = 'Service role can insert roles during signup'
  ) THEN
    CREATE POLICY "Service role can insert roles during signup"
      ON public.user_roles FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- Also ensure authenticated users can have roles inserted during their own signup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND policyname = 'Allow role creation during signup'
  ) THEN
    CREATE POLICY "Allow role creation during signup"
      ON public.user_roles FOR INSERT
      TO authenticated
      WITH CHECK (user_id = (select auth.uid()));
  END IF;
END $$;
