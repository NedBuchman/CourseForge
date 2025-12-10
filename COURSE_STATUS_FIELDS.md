# Courses Table Status Fields Documentation

## Overview
The courses table tracks course creation through a multi-step workflow. Each workflow stage has dedicated status fields, plus additional fields for step tracking and timestamps.

## Workflow Navigation Fields

### 1. current_step (integer)

- **Type**: Integer (1-8 depending on content format)
- **Default**: 1
- **Constraint**: Must be between 1 and 6 (or higher for video courses)
- **Purpose**: Indicates which workflow step the user is currently on
- **Values**:
  - 1 = Content Generation
  - 2 = Review Lesson Content
  - 3 = Quiz Generation
  - 4 = Presentation Setup
  - 5 = Landing Page
  - 6 = Review Videos (video/hybrid only)
  - 7/6 = Publish Course
  - 8/7 = Download Package
- **Updated**: When user progresses to next step or edits a completed step

### 2. last_completed_step (integer)

- **Type**: Integer (0-8)
- **Default**: 0
- **Constraint**: Must be between 0 and 6 (or higher for video courses)
- **Purpose**: Tracks the highest workflow step that has been completed
- **Values**: 0-8 (0 means no steps completed)
- **Updated**: When a step is successfully completed; used to determine which steps can be edited

## Primary Course Status

### 3. status (text)

- **Values**:
  - `draft` - Initial state, course being configured
  - `generating` - AI content generation in progress
  - `completed` - Content generation finished successfully
  - `failed` - Content generation encountered an error
- **Default**: `draft`
- **Updated**:
  - Set to `generating` when course generation starts
  - Set to `completed` when content generation finishes
  - Set to `failed` if content generation fails
- **Location**: Updated in `generate-course-content` edge function

## Content Format Field

### 4. content_format (text)

- **Values**:
  - `text` - Text-only lessons
  - `video` - Video lessons with AI avatar
  - `hybrid` - Both text and video
- **Default**: `text`
- **Constraint**: Must be one of the three values above
- **Purpose**: Determines if video generation workflow is included
- **Updated**: Set during course creation, determines workflow steps

## Step-Specific Status Fields

### 5. content_status (text)

- **Values**:
  - `not_started` - Content generation not begun
  - `in_progress` - Content being generated
  - `completed` - Content generation finished and reviewed
  - `needs_redo` - Content needs to be regenerated (after edit)
- **Default**: `not_started`
- **Updated**:
  - `in_progress` when generation starts
  - `completed` when content generation finishes (Step 1 complete)
  - `needs_redo` if user goes back to edit content

### 6. videos_status (text)

- **Values**:
  - `not_started` - Videos not generated yet
  - `pending_review` - Videos generated, awaiting review
  - `approved` - Creator approved videos
  - `needs_redo` - Videos need regeneration
  - `skipped` - User bypassed video format
- **Default**: `not_started`
- **Constraint**: Only applies to courses with `content_format` = `video` or `hybrid`
- **Updated**:
  - `pending_review` when video generation completes
  - `approved` when creator accepts videos
  - `needs_redo` if regeneration requested
  - `skipped` if user converts to text-only

### 7. quizzes_status (text)

- **Values**:
  - `not_started` - Quiz generation not begun
  - `in_progress` - Quizzes being generated
  - `completed` - Quizzes generated and approved
  - `needs_redo` - Quizzes need regeneration
- **Default**: `not_started`
- **Updated**:
  - `in_progress` during quiz generation
  - `completed` when creator clicks "Accept & Continue" on quiz review page
  - `needs_redo` if user goes back to edit quizzes

### 8. presentation_status (text)

- **Values**:
  - `not_configured` - Presentation settings not set up
  - `configured` - Presentation configured and saved
  - `needs_redo` - Presentation config needs updating
- **Default**: `not_configured`
- **Updated**:
  - `configured` when user saves presentation settings
  - `needs_redo` if earlier steps are edited

### 9. landing_page_status (text)

- **Values**:
  - `not_configured` - Landing page not created
  - `configured` - Landing page configured and saved
  - `needs_redo` - Landing page needs updating
- **Default**: `not_configured`
- **Updated**:
  - `configured` when user saves landing page settings
  - `needs_redo` if earlier steps are edited

### 10. published_status (text)

- **Values**:
  - `not_published` - Course not yet published
  - `published` - Course is live for students
  - `needs_republish` - Course edited after publishing
- **Default**: `not_published`
- **Updated**:
  - `published` when course is published
  - `needs_republish` if any workflow step is edited after publishing

### 11. downloaded_status (text)

- **Values**:
  - `not_downloaded` - Course package not downloaded
  - `downloaded` - Course package has been downloaded
- **Default**: `not_downloaded`
- **Updated**: Set to `downloaded` when user downloads course package

## Video-Specific Status Fields

### 12. video_generation_status (text)

- **Values**:
  - `not_started` - Video generation not initiated
  - `pending` - Video generation queued
  - `in_progress` - Videos currently being generated
  - `completed` - All videos generated successfully
  - `failed` - Video generation failed
  - `partial` - Some videos completed, some failed
- **Default**: `not_started`
- **Purpose**: Tracks overall video generation progress (separate from `videos_status` which is for review/approval)
- **Updated**: By video generation edge functions

## Timestamp Fields

These fields record when key events occur:

- `content_generated_at` (timestamptz) - When content generation completed
- `quizzes_accepted_at` (timestamptz) - When quizzes were approved
- `presentation_accepted_at` (timestamptz) - When presentation config was saved
- `landing_page_accepted_at` (timestamptz) - When landing page was saved
- `published_at` (timestamptz) - When course was published
- `last_downloaded_at` (timestamptz) - Last time course was downloaded
- `video_generation_started_at` (timestamptz) - When video generation began
- `video_generation_completed_at` (timestamptz) - When video generation finished

## Workflow Logic

- **Linear Progression**: Steps must be completed in order (1 → 2 → 3 → 4 → 5 → 6/7/8)
- **Cascading Invalidation**: Editing a completed step sets all subsequent steps to `needs_redo`
- **Video Workflow**: If `content_format` = `video` or `hybrid`, adds a "Review Videos" step after Landing Page
- **Status Dependencies**:
  - Quizzes require `content_status` = `completed`
  - Videos require content review completion
  - Publishing requires all preceding steps = `completed`

## Database Indexes

The following indexes optimize status field queries:

- `idx_courses_status` on `status`
- `idx_courses_content_status` on `content_status`
- `idx_courses_quizzes_status` on `quizzes_status`
- `idx_courses_presentation_status` on `presentation_status`
- `idx_courses_landing_page_status` on `landing_page_status`
- `idx_courses_published_status` on `published_status`
- `idx_courses_downloaded_status` on `downloaded_status`
- `idx_courses_videos_status` on `videos_status`
- `idx_courses_video_generation_status` on `video_generation_status`
- `idx_courses_current_step` on `current_step`
- `idx_courses_last_completed_step` on `last_completed_step`
