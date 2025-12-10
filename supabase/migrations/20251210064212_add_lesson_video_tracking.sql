/*
  # Add Lesson Video Tracking

  1. New Tables
    - `lesson_video_views`
      - `id` (uuid, primary key)
      - `student_id` (uuid, references student_accounts)
      - `course_id` (uuid, references courses)
      - `lesson_index` (integer) - which lesson in the course
      - `started_at` (timestamptz) - when video playback started
      - `last_position` (integer) - last playback position in seconds
      - `watch_percentage` (integer) - percentage of video watched (0-100)
      - `completed` (boolean) - whether video was watched to the end
      - `total_watch_time` (integer) - total seconds spent watching
      - `video_duration` (integer) - total video duration in seconds
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `lesson_video_views` table
    - Students can read and update their own video view records
    - Course creators can read video view statistics for their courses
  
  3. Indexes
    - Index on (student_id, course_id, lesson_index) for quick lookups
    - Index on course_id for analytics queries
  
  4. Notes
    - Tracks individual student video watching behavior
    - Supports pause/resume with last_position
    - Calculates watch percentage for analytics
    - Separate from lesson completion (viewing video is optional)
*/

CREATE TABLE IF NOT EXISTS lesson_video_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_index integer NOT NULL CHECK (lesson_index >= 0),
  started_at timestamptz DEFAULT now(),
  last_position integer DEFAULT 0 CHECK (last_position >= 0),
  watch_percentage integer DEFAULT 0 CHECK (watch_percentage >= 0 AND watch_percentage <= 100),
  completed boolean DEFAULT false,
  total_watch_time integer DEFAULT 0 CHECK (total_watch_time >= 0),
  video_duration integer DEFAULT 0 CHECK (video_duration >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, course_id, lesson_index)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lesson_video_views_student_course_lesson 
  ON lesson_video_views(student_id, course_id, lesson_index);
CREATE INDEX IF NOT EXISTS idx_lesson_video_views_course 
  ON lesson_video_views(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_video_views_student
  ON lesson_video_views(student_id);

-- Enable RLS
ALTER TABLE lesson_video_views ENABLE ROW LEVEL SECURITY;

-- Students can view their own video tracking data
CREATE POLICY "Students can view own video tracking"
  ON lesson_video_views
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM student_accounts WHERE id = (
        SELECT student_id FROM student_sessions 
        WHERE session_token = current_setting('request.headers')::json->>'authorization'
      )
    )
  );

-- Students can insert their own video tracking records
CREATE POLICY "Students can create own video tracking"
  ON lesson_video_views
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT id FROM student_accounts WHERE id = (
        SELECT student_id FROM student_sessions 
        WHERE session_token = current_setting('request.headers')::json->>'authorization'
      )
    )
  );

-- Students can update their own video tracking records
CREATE POLICY "Students can update own video tracking"
  ON lesson_video_views
  FOR UPDATE
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM student_accounts WHERE id = (
        SELECT student_id FROM student_sessions 
        WHERE session_token = current_setting('request.headers')::json->>'authorization'
      )
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM student_accounts WHERE id = (
        SELECT student_id FROM student_sessions 
        WHERE session_token = current_setting('request.headers')::json->>'authorization'
      )
    )
  );

-- Course creators can view video statistics for their courses
CREATE POLICY "Course creators can view course video stats"
  ON lesson_video_views
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lesson_video_views.course_id
      AND courses.user_id = auth.uid()
    )
  );