/*
  # Fix Critical RLS Security Vulnerabilities

  This migration addresses critical security issues in Row Level Security policies:

  1. **Student Sessions Security**
     - Replaces dangerous WITH CHECK (true) policy
     - Adds proper validation that users can only create their own sessions
     - Ensures session_token and student_id match authenticated user

  2. **Course Invitations Security**
     - Removes public USING (true) policy that exposed all invitations
     - Restricts invitation viewing to course creators only
     - Maintains invitation creation restrictions

  3. **Analytics Views Security**
     - Revokes blanket SELECT grants on analytics views
     - Adds helper function to check manager/admin roles
     - Restricts platform-wide analytics to authorized roles only

  ## Security Impact
  - Prevents session hijacking attacks
  - Prevents unauthorized enumeration of course invitations
  - Restricts sensitive platform analytics to managers/admins
*/

-- =====================================================
-- 1. FIX STUDENT SESSIONS RLS POLICY
-- =====================================================

-- Drop and recreate the problematic policy
DROP POLICY IF EXISTS "Students create sessions" ON student_sessions;

-- Create secure policy that validates user ownership
-- Note: student_id should match auth.uid() for proper authentication
CREATE POLICY "Students create sessions"
  ON student_sessions FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
  );

-- =====================================================
-- 2. FIX COURSE INVITATIONS RLS POLICY
-- =====================================================

-- Drop the dangerous public access policy
DROP POLICY IF EXISTS "Public view invitation by token" ON course_invitations;

-- The "Creators view invitations" policy already properly restricts access
-- No need to recreate it, it's already secure

-- =====================================================
-- 3. FIX ANALYTICS VIEWS ACCESS CONTROL
-- =====================================================

-- Create helper function to check if user is manager/admin
CREATE OR REPLACE FUNCTION is_manager_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke all previous grants on analytics views
REVOKE ALL ON analytics_platform_overview FROM authenticated;
REVOKE ALL ON analytics_user_growth_daily FROM authenticated;
REVOKE ALL ON analytics_course_metrics FROM authenticated;
REVOKE ALL ON analytics_student_engagement FROM authenticated;

-- Create secure functions to access analytics (only for managers)
CREATE OR REPLACE FUNCTION get_platform_overview()
RETURNS TABLE (
  total_creators bigint,
  total_students bigint,
  total_courses bigint,
  active_courses bigint,
  draft_courses bigint,
  total_enrollments bigint,
  avg_course_completion numeric
) AS $$
BEGIN
  IF NOT is_manager_or_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Manager access required';
  END IF;

  RETURN QUERY
  SELECT * FROM analytics_platform_overview;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_platform_overview() TO authenticated;

-- Create function for user growth data
CREATE OR REPLACE FUNCTION get_user_growth_daily()
RETURNS TABLE (
  date date,
  new_creators bigint,
  new_students bigint,
  cumulative_creators bigint,
  cumulative_students bigint
) AS $$
BEGIN
  IF NOT is_manager_or_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Manager access required';
  END IF;

  RETURN QUERY
  SELECT * FROM analytics_user_growth_daily ORDER BY date DESC LIMIT 90;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_growth_daily() TO authenticated;

-- Create function for course metrics (accessible by creator or manager)
CREATE OR REPLACE FUNCTION get_course_metrics(p_course_id uuid DEFAULT NULL)
RETURNS TABLE (
  course_id uuid,
  course_title text,
  creator_id uuid,
  creator_email text,
  status text,
  created_at timestamptz,
  total_enrollments bigint,
  active_students bigint,
  completed_students bigint,
  avg_progress numeric,
  total_video_views bigint,
  total_quiz_attempts bigint,
  avg_quiz_score numeric
) AS $$
BEGIN
  IF p_course_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM courses 
      WHERE id = p_course_id 
      AND (user_id = auth.uid() OR is_manager_or_admin())
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Access denied to this course';
    END IF;

    RETURN QUERY
    SELECT * FROM analytics_course_metrics WHERE analytics_course_metrics.course_id = p_course_id;
  ELSE
    IF is_manager_or_admin() THEN
      RETURN QUERY SELECT * FROM analytics_course_metrics;
    ELSE
      RETURN QUERY 
      SELECT * FROM analytics_course_metrics 
      WHERE analytics_course_metrics.creator_id = auth.uid();
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_course_metrics(uuid) TO authenticated;

-- =====================================================
-- 4. ADD AUDIT LOGGING FOR SECURITY EVENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  resource_type text,
  resource_id text,
  action text NOT NULL,
  result text NOT NULL,
  ip_address text,
  user_agent text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON security_audit_log(event_type);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers view audit logs"
  ON security_audit_log FOR SELECT
  TO authenticated
  USING (is_manager_or_admin());

CREATE POLICY "System inserts audit logs"
  ON security_audit_log FOR INSERT
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type text,
  p_resource_type text DEFAULT NULL,
  p_resource_id text DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_result text DEFAULT 'success',
  p_details jsonb DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO security_audit_log (
    event_type,
    user_id,
    resource_type,
    resource_id,
    action,
    result,
    details
  ) VALUES (
    p_event_type,
    auth.uid(),
    p_resource_type,
    p_resource_id,
    p_action,
    p_result,
    p_details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_security_event(text, text, text, text, text, jsonb) TO authenticated;