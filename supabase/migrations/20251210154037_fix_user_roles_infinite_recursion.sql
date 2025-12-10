/*
  # Fix User Roles Infinite Recursion Issue

  ## Problem
  The RLS policies on user_roles were causing infinite recursion because they query
  the user_roles table within their policy conditions, creating a circular dependency.

  ## Solution
  1. Drop the problematic recursive policies
  2. Create a SECURITY DEFINER function that bypasses RLS to check user roles
  3. Recreate policies using the safe function
  4. Simplify policies to avoid recursion

  ## Security
  - The helper function is SECURITY DEFINER but only returns a boolean
  - It's safe because it just checks if the current user has a specific role
  - All policies still properly restrict access
*/

-- Step 1: Drop all policies that cause recursion
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Managers can read all roles" ON user_roles;

-- Step 2: Create a safe helper function that bypasses RLS
CREATE OR REPLACE FUNCTION public.current_user_has_role(check_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  has_role boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = check_role
  ) INTO has_role;
  
  RETURN COALESCE(has_role, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_has_role(text) TO authenticated;

-- Step 3: Recreate admin policies using the safe function
CREATE POLICY "Admins can read all roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (current_user_has_role('admin'));

CREATE POLICY "Admins can insert roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (current_user_has_role('admin'));

CREATE POLICY "Admins can update roles"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (current_user_has_role('admin'))
  WITH CHECK (current_user_has_role('admin'));

CREATE POLICY "Admins can delete roles"
  ON user_roles FOR DELETE
  TO authenticated
  USING (current_user_has_role('admin'));

CREATE POLICY "Managers can read all roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (current_user_has_role('manager'));
