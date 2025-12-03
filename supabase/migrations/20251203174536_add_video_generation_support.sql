/*
  # Add Video Generation Support to CourseForge

  ## Overview
  This migration adds comprehensive video generation capabilities to CourseForge,
  allowing courses to include AI-generated avatar videos for lessons and quiz explanations.

  ## Changes

  1. New Tables
    - `video_assets` - Stores generated video files and metadata
    - `video_generation_queue` - Manages async video generation jobs

  2. Updates to Existing Tables
    - `courses` - Add video configuration and status fields
    - `quiz_questions` - Add video explanation URL field

  3. Storage
    - Create video-content bucket for video files
    - Create video-thumbnails bucket for preview images

  4. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users
    - Add storage policies for video content

  5. Indexes
    - Performance indexes on video-related queries
*/

-- =====================================================
-- 1. UPDATE COURSES TABLE
-- =====================================================

-- Add video generation configuration fields
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS content_format text DEFAULT 'text',
ADD COLUMN IF NOT EXISTS video_config jsonb DEFAULT '{
  "enabled": false,
  "avatar_id": null,
  "voice_id": null,
  "background_style": "professional",
  "include_lesson_videos": true,
  "include_quiz_explanation_videos": true
}'::jsonb,
ADD COLUMN IF NOT EXISTS video_generation_status text DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS video_generation_progress integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_generation_stage text DEFAULT '',
ADD COLUMN IF NOT EXISTS video_generation_started_at timestamptz,
ADD COLUMN IF NOT EXISTS video_generation_completed_at timestamptz,
ADD COLUMN IF NOT EXISTS video_generation_error text,
ADD COLUMN IF NOT EXISTS videos_generated_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS videos_total_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_service_provider text DEFAULT 'heygen';

-- Add check constraint for content_format
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'courses_content_format_check'
  ) THEN
    ALTER TABLE courses ADD CONSTRAINT courses_content_format_check
    CHECK (content_format IN ('text', 'video', 'hybrid'));
  END IF;
END $$;

-- Add check constraint for video_generation_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'courses_video_generation_status_check'
  ) THEN
    ALTER TABLE courses ADD CONSTRAINT courses_video_generation_status_check
    CHECK (video_generation_status IN ('not_started', 'pending', 'in_progress', 'completed', 'failed', 'partial'));
  END IF;
END $$;

-- Add indexes for video-related queries
CREATE INDEX IF NOT EXISTS idx_courses_content_format ON courses(content_format);
CREATE INDEX IF NOT EXISTS idx_courses_video_generation_status ON courses(video_generation_status);
CREATE INDEX IF NOT EXISTS idx_courses_video_generation_started ON courses(video_generation_started_at);

-- =====================================================
-- 2. CREATE VIDEO_ASSETS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS video_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  asset_reference_id text NOT NULL,
  video_url text,
  thumbnail_url text,
  duration_seconds integer DEFAULT 0,
  video_provider text NOT NULL DEFAULT 'heygen',
  provider_video_id text,
  generation_status text NOT NULL DEFAULT 'pending',
  generation_started_at timestamptz,
  generation_completed_at timestamptz,
  generation_error text,
  script_text text NOT NULL,
  video_config jsonb DEFAULT '{}',
  file_size_bytes bigint DEFAULT 0,
  video_width integer,
  video_height integer,
  video_format text DEFAULT 'mp4',
  approved boolean DEFAULT false,
  approved_at timestamptz,
  retry_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add check constraints
ALTER TABLE video_assets ADD CONSTRAINT video_assets_asset_type_check
CHECK (asset_type IN ('lesson', 'quiz_explanation', 'intro', 'outro', 'custom'));

ALTER TABLE video_assets ADD CONSTRAINT video_assets_generation_status_check
CHECK (generation_status IN ('pending', 'queued', 'processing', 'completed', 'failed', 'cancelled'));

-- Enable RLS
ALTER TABLE video_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_assets
CREATE POLICY "Users can view video assets for their courses"
  ON video_assets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = video_assets.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert video assets for their courses"
  ON video_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = video_assets.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update video assets for their courses"
  ON video_assets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = video_assets.course_id
      AND courses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = video_assets.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete video assets for their courses"
  ON video_assets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = video_assets.course_id
      AND courses.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_video_assets_course_id ON video_assets(course_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_asset_type ON video_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_video_assets_status ON video_assets(generation_status);
CREATE INDEX IF NOT EXISTS idx_video_assets_reference ON video_assets(asset_reference_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_course_type ON video_assets(course_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_video_assets_provider_id ON video_assets(provider_video_id);

-- =====================================================
-- 3. CREATE VIDEO_GENERATION_QUEUE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS video_generation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  video_asset_id uuid REFERENCES video_assets(id) ON DELETE CASCADE,
  priority integer DEFAULT 5,
  status text NOT NULL DEFAULT 'queued',
  queued_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  estimated_duration_seconds integer,
  webhook_url text,
  webhook_secret text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add check constraint
ALTER TABLE video_generation_queue ADD CONSTRAINT video_generation_queue_status_check
CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled'));

-- Enable RLS
ALTER TABLE video_generation_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_generation_queue
CREATE POLICY "Users can view queue items for their courses"
  ON video_generation_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = video_generation_queue.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert queue items for their courses"
  ON video_generation_queue FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = video_generation_queue.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update queue items for their courses"
  ON video_generation_queue FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = video_generation_queue.course_id
      AND courses.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_video_queue_course_id ON video_generation_queue(course_id);
CREATE INDEX IF NOT EXISTS idx_video_queue_status ON video_generation_queue(status);
CREATE INDEX IF NOT EXISTS idx_video_queue_priority ON video_generation_queue(priority DESC, queued_at ASC);
CREATE INDEX IF NOT EXISTS idx_video_queue_video_asset ON video_generation_queue(video_asset_id);

-- =====================================================
-- 4. UPDATE QUIZ_QUESTIONS TABLE
-- =====================================================

-- Add video explanation URL to quiz questions
ALTER TABLE quiz_questions
ADD COLUMN IF NOT EXISTS explanation_video_url text,
ADD COLUMN IF NOT EXISTS explanation_video_asset_id uuid REFERENCES video_assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quiz_questions_video_asset ON quiz_questions(explanation_video_asset_id);

-- =====================================================
-- 5. CREATE STORAGE BUCKETS
-- =====================================================

-- Create bucket for video content
INSERT INTO storage.buckets (id, name, public)
VALUES ('video-content', 'video-content', true)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for video thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('video-thumbnails', 'video-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for video-content bucket
CREATE POLICY "Authenticated users can upload videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'video-content');

CREATE POLICY "Everyone can view videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'video-content');

CREATE POLICY "Authenticated users can update their videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'video-content');

CREATE POLICY "Authenticated users can delete their videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'video-content');

-- Storage policies for video-thumbnails bucket
CREATE POLICY "Authenticated users can upload thumbnails"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'video-thumbnails');

CREATE POLICY "Everyone can view thumbnails"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'video-thumbnails');

CREATE POLICY "Authenticated users can update their thumbnails"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'video-thumbnails');

CREATE POLICY "Authenticated users can delete their thumbnails"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'video-thumbnails');

-- =====================================================
-- 6. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get video generation statistics for a course
CREATE OR REPLACE FUNCTION get_course_video_stats(course_id_param uuid)
RETURNS TABLE (
  total_videos integer,
  completed_videos integer,
  failed_videos integer,
  pending_videos integer,
  total_duration_seconds integer,
  total_file_size_bytes bigint,
  lesson_videos_count integer,
  quiz_videos_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::integer as total_videos,
    COUNT(*) FILTER (WHERE generation_status = 'completed')::integer as completed_videos,
    COUNT(*) FILTER (WHERE generation_status = 'failed')::integer as failed_videos,
    COUNT(*) FILTER (WHERE generation_status IN ('pending', 'queued', 'processing'))::integer as pending_videos,
    COALESCE(SUM(duration_seconds), 0)::integer as total_duration_seconds,
    COALESCE(SUM(file_size_bytes), 0)::bigint as total_file_size_bytes,
    COUNT(*) FILTER (WHERE asset_type = 'lesson')::integer as lesson_videos_count,
    COUNT(*) FILTER (WHERE asset_type = 'quiz_explanation')::integer as quiz_videos_count
  FROM video_assets
  WHERE course_id = course_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next video in generation queue
CREATE OR REPLACE FUNCTION get_next_video_in_queue()
RETURNS TABLE (
  queue_id uuid,
  course_id uuid,
  video_asset_id uuid,
  priority integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id as queue_id,
    q.course_id,
    q.video_asset_id,
    q.priority
  FROM video_generation_queue q
  WHERE q.status = 'queued'
  AND q.retry_count < q.max_retries
  ORDER BY q.priority DESC, q.queued_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. CREATE TRIGGERS
-- =====================================================

-- Trigger to update video_assets updated_at
CREATE OR REPLACE FUNCTION update_video_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_assets_updated_at
  BEFORE UPDATE ON video_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_video_assets_updated_at();

-- Trigger to update video_generation_queue updated_at
CREATE TRIGGER video_generation_queue_updated_at
  BEFORE UPDATE ON video_generation_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_video_assets_updated_at();

-- =====================================================
-- 8. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE video_assets IS 'Stores generated video files and metadata for course content';
COMMENT ON TABLE video_generation_queue IS 'Manages async video generation job queue with priority support';
COMMENT ON COLUMN courses.content_format IS 'Content delivery format: text, video, or hybrid';
COMMENT ON COLUMN courses.video_config IS 'JSON configuration for video generation (avatar, voice, style)';
COMMENT ON COLUMN courses.video_generation_status IS 'Overall status of video generation for the course';
COMMENT ON COLUMN video_assets.asset_type IS 'Type of video: lesson, quiz_explanation, intro, outro, or custom';
COMMENT ON COLUMN video_assets.asset_reference_id IS 'Reference to the source content (lesson number, question ID, etc)';
COMMENT ON COLUMN video_assets.script_text IS 'Original text content that was converted to video';
COMMENT ON COLUMN video_generation_queue.priority IS 'Priority level (1-10, higher = more urgent)';
