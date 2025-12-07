/*
  # Update Voice IDs to Valid HeyGen Voices

  ## Summary
  Updates all courses using deprecated Azure TTS voice IDs to use current valid HeyGen voice IDs.
  The old voice ID format 'en-US-GuyNeural' and similar Azure TTS IDs are no longer valid in HeyGen's API.

  ## Changes Made
  - Updates all courses with Azure TTS voice IDs to HeyGen voice IDs
  - Default voice: Mason Finn (75af67cc2ceb498681d0085bb56bddc3) - Professional Male voice
  - Ensures all courses use valid, currently available HeyGen voices

  ## Valid Voice IDs Now in Use
  - 75af67cc2ceb498681d0085bb56bddc3: Mason Finn - Professional Male (default)
  - 77a8b81df32f482f851684c5e2ebb0d2: Calm Chloe - Female
  - 79d9a0758b1f406ebe8ac3e52e09adb1: Relaxed Ray - Male
  - 748d08eb00634e03b17c524d1e957fc6: June - Female (Lifelike)
  - 75a5a6de69204dc9ba448158d1b6a8de: Dominic - Male

  ## Impact
  This fixes 400 errors from HeyGen API when generating videos with invalid voice IDs.
*/

-- Update courses using the deprecated Azure TTS voice IDs
UPDATE courses
SET video_config = jsonb_set(
  video_config,
  '{voice_id}',
  '"75af67cc2ceb498681d0085bb56bddc3"'
)
WHERE video_config->>'voice_id' SIMILAR TO '%(en-US|en-GB|en-AU)%Neural';

-- Update any null voice IDs with default
UPDATE courses
SET video_config = jsonb_set(
  video_config,
  '{voice_id}',
  '"75af67cc2ceb498681d0085bb56bddc3"'
)
WHERE video_config IS NOT NULL
  AND (video_config->>'voice_id' IS NULL OR video_config->>'voice_id' = '');
