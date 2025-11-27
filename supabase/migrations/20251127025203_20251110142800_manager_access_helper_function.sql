/*
  # Manager Access Helper Function

  ## Overview
  This migration creates a helper function to check if the current user
  has manager or admin access. This can be used throughout the application
  to gate manager-only features.

  ## New Functions
    - `is_manager_or_admin()` - Returns true if current user has manager/admin role

  ## Notes
    - Analytics views inherit security from base tables
    - Views are readable by all authenticated users by default
    - Application-level checks using this function provide additional security
    - For production, consider making base tables more restrictive
*/

-- Function to check if current user is a manager or admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_manager_or_admin() TO authenticated;