/*
  # Add video configuration to all courses

  1. Updates
    - Ensures all courses have a complete video_config structure
    - Sets default values for courses with null or incomplete video_config
    - Video is disabled by default but can be enabled by regenerating the course
  
  2. Default Configuration
    - enabled: false (video disabled by default)
    - avatar_id: eric_public_3_20220815 (default HeyGen avatar)
    - voice_id: en-US-GuyNeural (default voice)
    - background_style: professional
    - include_lesson_videos: true
    - include_quiz_explanation_videos: true
  
  3. Notes
    - This makes video capability available for all courses
    - Course creators can enable video by regenerating their course
    - Existing courses maintain their current video_config if already set
*/

-- Update courses with null video_config
UPDATE courses
SET video_config = jsonb_build_object(
  'enabled', false,
  'avatar_id', 'eric_public_3_20220815',
  'voice_id', 'en-US-GuyNeural',
  'background_style', 'professional',
  'include_lesson_videos', true,
  'include_quiz_explanation_videos', true
)
WHERE video_config IS NULL;

-- Update courses with incomplete video_config (missing avatar_id or voice_id)
UPDATE courses
SET video_config = video_config || jsonb_build_object(
  'avatar_id', COALESCE(video_config->>'avatar_id', 'eric_public_3_20220815'),
  'voice_id', COALESCE(video_config->>'voice_id', 'en-US-GuyNeural')
)
WHERE video_config IS NOT NULL
  AND (
    video_config->>'avatar_id' IS NULL
    OR video_config->>'voice_id' IS NULL
  );