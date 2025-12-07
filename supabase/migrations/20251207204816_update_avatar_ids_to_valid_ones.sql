/*
  # Update Avatar IDs to Valid HeyGen Avatars

  ## Summary
  Updates all courses using deprecated avatar IDs to use current valid HeyGen avatar IDs.
  The old avatar ID 'eric_public_3_20220815' is no longer available in HeyGen's API.

  ## Changes Made
  - Updates all courses with 'eric_public_3_20220815' to 'Adrian_public_3_20240312' (Adrian in Blue Shirt - Professional Male)
  - Updates background_style from 'professional' to 'color' with a professional blue-gray background
  - Ensures all courses use valid, currently available HeyGen avatars

  ## Valid Avatar IDs Now in Use
  - Adrian_public_3_20240312: Adrian in Blue Shirt (male, professional)
  - Andrew_public_pro1_20230614: Alex in Black Suit (male, business)
  - Anna_public_20240108: Anna in White T-shirt (female, professional)
  - Amanda_in_Blue_Shirt_Front: Amanda in Blue Shirt (female, business)

  ## Impact
  This fixes 404 errors from HeyGen API when generating videos for existing courses.
*/

-- Update courses using the deprecated 'eric_public_3_20220815' avatar
UPDATE courses
SET video_config = jsonb_set(
  jsonb_set(
    jsonb_set(
      video_config,
      '{avatar_id}',
      '"Adrian_public_3_20240312"'
    ),
    '{background_style}',
    '"color"'
  ),
  '{background_color}',
  '"#f0f4f8"'
)
WHERE video_config->>'avatar_id' = 'eric_public_3_20220815';

-- Update courses using other old/invalid avatar naming patterns
UPDATE courses
SET video_config = jsonb_set(
  jsonb_set(
    jsonb_set(
      video_config,
      '{avatar_id}',
      '"Adrian_public_3_20240312"'
    ),
    '{background_style}',
    '"color"'
  ),
  '{background_color}',
  '"#f0f4f8"'
)
WHERE video_config->>'avatar_id' SIMILAR TO '%(josh_lite|lisa_public|anna_public_3)%'
  AND video_config->>'avatar_id' != 'Anna_public_20240108';

-- Ensure all video configs have background_style set to 'color' instead of 'professional'
UPDATE courses
SET video_config = jsonb_set(
  jsonb_set(
    video_config,
    '{background_style}',
    '"color"'
  ),
  '{background_color}',
  COALESCE(video_config->>'background_color', '"#f0f4f8"')::jsonb
)
WHERE video_config->>'background_style' = 'professional';
