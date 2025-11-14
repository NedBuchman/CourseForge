/*
  # Create User Roles System

  ## Overview
  This migration creates a role-based access control system for CourseForge Manager.
  It allows designating specific users as administrators or managers who can access
  the manager portal and analytics dashboard.

  ## New Tables
  
  ### 1. user_roles
    - `id` (uuid, primary key) - Unique identifier
    - `user_id` (uuid, foreign key) - References auth.users
    - `role` (text) - Role type: 'admin', 'manager', or 'creator'
    - `created_at` (timestamptz) - When role was assigned
    - `updated_at` (timestamptz) - When role was last modified
    - `created_by` (uuid, nullable) - Who assigned the role

  ## Security
    - Enable RLS on user_roles table
    - Only admins can modify roles
    - Users can read their own role
    - Managers can read all roles

  ## Notes
    - By default, all new users are 'creator' role
    - Admins must manually promote users to 'manager' or 'admin'
    - A function will automatically assign 'creator' role to new users
*/

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'creator')) DEFAULT 'creator',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own role
CREATE POLICY "Users can read own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all roles
CREATE POLICY "Admins can read all roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Managers can read all roles
CREATE POLICY "Managers can read all roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- Only admins can insert roles
CREATE POLICY "Admins can insert roles"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update roles
CREATE POLICY "Admins can update roles"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete roles
CREATE POLICY "Admins can delete roles"
  ON user_roles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to auto-assign creator role to new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'creator');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS on_user_roles_updated ON user_roles;
CREATE TRIGGER on_user_roles_updated
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();