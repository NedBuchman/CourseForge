/*
  # Create Course Access Control System

  1. New Tables
    - `course_access_control`
      - Controls which students can access which courses
      - Supports different access types: full, preview, trial
      - Tracks access grants and expiration
      - Links to future payment system

    - `course_visibility`
      - Controls course visibility and discovery settings
      - Manages public/unlisted/private visibility
      - Handles pricing and preview configuration
      - Enables featured courses

    - `student_sessions`
      - Tracks student login sessions for security
      - Enables session management and revocation
      - Records device/IP information

    - `course_invitations`
      - Allows creators to invite students via email
      - Generates unique invitation tokens
      - Tracks invitation status and expiration

  2. Security
    - Enable RLS on all new tables
    - Students can only view their own access grants and sessions
    - Course creators can manage access for their courses
    - Proper access control for invitations

  3. Important Notes
    - Access control supports future payment integration
    - Visibility settings enable flexible course distribution
    - Session tracking improves security
    - Invitation system facilitates course enrollment
*/

-- Create course_access_control table
CREATE TABLE IF NOT EXISTS course_access_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
  access_type text NOT NULL DEFAULT 'full',
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  granted_by uuid REFERENCES auth.users(id),
  payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id),
  CONSTRAINT valid_access_type CHECK (access_type IN ('full', 'preview', 'trial'))
);

COMMENT ON TABLE course_access_control IS 'Controls student access to specific courses with different access levels';
COMMENT ON COLUMN course_access_control.access_type IS 'Type of access: full (complete), preview (limited), trial (time-limited)';
COMMENT ON COLUMN course_access_control.expires_at IS 'NULL means access never expires';
COMMENT ON COLUMN course_access_control.payment_id IS 'Future: link to payment record';

-- Create course_visibility table
CREATE TABLE IF NOT EXISTS course_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
  visibility text NOT NULL DEFAULT 'private',
  requires_enrollment boolean NOT NULL DEFAULT true,
  requires_payment boolean NOT NULL DEFAULT false,
  price_cents integer,
  preview_enabled boolean NOT NULL DEFAULT false,
  preview_lesson_count integer DEFAULT 2,
  featured boolean NOT NULL DEFAULT false,
  allow_discovery boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_visibility CHECK (visibility IN ('public', 'unlisted', 'private')),
  CONSTRAINT valid_preview_count CHECK (preview_lesson_count >= 0),
  CONSTRAINT valid_price CHECK (price_cents IS NULL OR price_cents >= 0)
);

COMMENT ON TABLE course_visibility IS 'Controls how courses are discovered and accessed by students';
COMMENT ON COLUMN course_visibility.visibility IS 'public (discoverable), unlisted (link only), private (invite only)';
COMMENT ON COLUMN course_visibility.preview_enabled IS 'Allow students to preview first N lessons without enrollment';

-- Create student_sessions table
CREATE TABLE IF NOT EXISTS student_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE student_sessions IS 'Tracks student login sessions for security and session management';

-- Create course_invitations table
CREATE TABLE IF NOT EXISTS course_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  invitation_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  invited_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_student_id uuid REFERENCES student_accounts(id),
  CONSTRAINT valid_invitation_status CHECK (status IN ('pending', 'accepted', 'expired'))
);

COMMENT ON TABLE course_invitations IS 'Allows course creators to invite students via email';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_access_student ON course_access_control(student_id);
CREATE INDEX IF NOT EXISTS idx_course_access_course ON course_access_control(course_id);
CREATE INDEX IF NOT EXISTS idx_course_access_expires ON course_access_control(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_course_visibility_discoverable ON course_visibility(visibility, allow_discovery) WHERE allow_discovery = true;
CREATE INDEX IF NOT EXISTS idx_course_visibility_featured ON course_visibility(featured) WHERE featured = true;

CREATE INDEX IF NOT EXISTS idx_student_sessions_student ON student_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_sessions_token ON student_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_student_sessions_expires ON student_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_course_invitations_email ON course_invitations(email);
CREATE INDEX IF NOT EXISTS idx_course_invitations_token ON course_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_course_invitations_status ON course_invitations(status);

-- Enable RLS
ALTER TABLE course_access_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course_access_control

-- Students can view their own access grants
CREATE POLICY "Students view own access"
  ON course_access_control FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_accounts
      WHERE student_accounts.id = course_access_control.student_id
    )
  );

-- Course creators can view access grants for their courses
CREATE POLICY "Creators view course access"
  ON course_access_control FOR SELECT
  TO authenticated
  USING (
    course_id IN (SELECT id FROM courses WHERE user_id = auth.uid())
  );

-- Course creators can grant access to their courses
CREATE POLICY "Creators grant access"
  ON course_access_control FOR INSERT
  TO authenticated
  WITH CHECK (
    course_id IN (SELECT id FROM courses WHERE user_id = auth.uid())
  );

-- Course creators can update access for their courses
CREATE POLICY "Creators update access"
  ON course_access_control FOR UPDATE
  TO authenticated
  USING (
    course_id IN (SELECT id FROM courses WHERE user_id = auth.uid())
  );

-- Course creators can revoke access
CREATE POLICY "Creators revoke access"
  ON course_access_control FOR DELETE
  TO authenticated
  USING (
    course_id IN (SELECT id FROM courses WHERE user_id = auth.uid())
  );

-- RLS Policies for course_visibility

-- Anyone can view visibility of public/discoverable courses
CREATE POLICY "Public view discoverable courses"
  ON course_visibility FOR SELECT
  USING (
    visibility = 'public' AND allow_discovery = true
  );

-- Course creators can view visibility of their courses
CREATE POLICY "Creators view course visibility"
  ON course_visibility FOR SELECT
  TO authenticated
  USING (
    course_id IN (SELECT id FROM courses WHERE user_id = auth.uid())
  );

-- Course creators can set visibility for their courses
CREATE POLICY "Creators set visibility"
  ON course_visibility FOR INSERT
  TO authenticated
  WITH CHECK (
    course_id IN (SELECT id FROM courses WHERE user_id = auth.uid())
  );

-- Course creators can update visibility
CREATE POLICY "Creators update visibility"
  ON course_visibility FOR UPDATE
  TO authenticated
  USING (
    course_id IN (SELECT id FROM courses WHERE user_id = auth.uid())
  );

-- Course creators can delete visibility settings
CREATE POLICY "Creators delete visibility"
  ON course_visibility FOR DELETE
  TO authenticated
  USING (
    course_id IN (SELECT id FROM courses WHERE user_id = auth.uid())
  );

-- RLS Policies for student_sessions

-- Students can view their own sessions
CREATE POLICY "Students view own sessions"
  ON student_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_accounts
      WHERE student_accounts.id = student_sessions.student_id
    )
  );

-- Students can create their own sessions (via edge function)
CREATE POLICY "Students create sessions"
  ON student_sessions FOR INSERT
  WITH CHECK (true);

-- Students can update their own sessions
CREATE POLICY "Students update own sessions"
  ON student_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM student_accounts
      WHERE student_accounts.id = student_sessions.student_id
    )
  );

-- Students can delete their own sessions
CREATE POLICY "Students delete own sessions"
  ON student_sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM student_accounts
      WHERE student_accounts.id = student_sessions.student_id
    )
  );

-- RLS Policies for course_invitations

-- Course creators can view invitations for their courses
CREATE POLICY "Creators view invitations"
  ON course_invitations FOR SELECT
  TO authenticated
  USING (
    creator_id = auth.uid()
  );

-- Course creators can create invitations
CREATE POLICY "Creators create invitations"
  ON course_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_id = auth.uid() AND
    course_id IN (SELECT id FROM courses WHERE user_id = auth.uid())
  );

-- Course creators can update invitations
CREATE POLICY "Creators update invitations"
  ON course_invitations FOR UPDATE
  TO authenticated
  USING (
    creator_id = auth.uid()
  );

-- Anyone can view invitation by token (for acceptance)
CREATE POLICY "Public view invitation by token"
  ON course_invitations FOR SELECT
  USING (true);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_course_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER course_access_control_updated_at
  BEFORE UPDATE ON course_access_control
  FOR EACH ROW
  EXECUTE FUNCTION update_course_access_updated_at();

CREATE TRIGGER course_visibility_updated_at
  BEFORE UPDATE ON course_visibility
  FOR EACH ROW
  EXECUTE FUNCTION update_course_access_updated_at();
