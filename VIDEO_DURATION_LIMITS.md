# Video Duration Limits Implementation

## Overview

This document explains how CourseForge handles HeyGen's 3-minute video duration limit to ensure all lesson videos are generated successfully without exceeding the maximum allowed length.

## HeyGen Constraint

- **Hard Limit**: 3 minutes (180 seconds) maximum per video
- **System Target**: 2.5 minutes (150 seconds) to provide safety buffer
- **Warning Threshold**: Videos over 2.5 minutes get marked as "Getting long"
- **Critical Threshold**: Videos over 2.75 minutes (165 seconds) get marked as "Near limit"

## Implementation Strategy

### 1. Content Format-Aware Generation

The course generation system now adjusts content length based on the selected format:

- **Video Format**: ~350 words per lesson (optimized for 2.5 minute narration)
- **Text Format**: ~600 words per lesson (standard educational content)

**Location**: `supabase/functions/generate-course-content/index.ts`

```typescript
const isVideoFormat = contentFormat === 'video';
const targetWordCount = isVideoFormat ? 350 : 600;
```

The AI prompt is adjusted to generate shorter, more concise content when video format is selected, with specific instructions to keep content conversational and suitable for narration.

### 2. Dynamic Word Limit Calculation

**Location**: `supabase/functions/generate-lesson-videos/index.ts`

The video script generation uses intelligent word counting and truncation:

```typescript
const MAX_SAFE_WORDS = 350;  // Total script words
const TARGET_DURATION_SECONDS = 150;  // 2.5 minutes
const WORDS_PER_MINUTE = 140;  // Conservative speaking rate
```

**Script Components**:
- Intro: ~5-10 words ("Welcome to [Lesson Title]")
- Objectives: ~30-50 words (listing 3-4 learning objectives)
- Content: Variable (calculated to fit remaining space)
- Outro: ~15 words ("That concludes this lesson...")

### 3. Intelligent Content Truncation

The system uses sentence-aware truncation to maintain content quality:

1. Calculate fixed word count (intro + objectives + outro)
2. Determine available words for main content
3. If content exceeds limit, truncate by complete sentences
4. Preserve sentence integrity (no mid-sentence cuts)

**Example**:
```typescript
// Available words for content = MAX_SAFE_WORDS - fixedWords
// If content is 400 words but only 275 available:
// - Split into sentences
// - Add complete sentences until limit reached
// - Result: coherent, properly ended content
```

### 4. Duration Estimation and Logging

Every generated script includes duration metadata:

```typescript
{
  script: string,
  wordCount: number,
  estimatedSeconds: number
}
```

This metadata is:
- Logged during generation for monitoring
- Stored in video_assets table metadata field
- Used for UI warnings and indicators

### 5. User Interface Updates

#### CreateCourse.tsx
Added information box in video settings section explaining:
- HeyGen's 3-minute maximum
- Automatic optimization to 2.5 minutes
- Content condensation while maintaining educational value

#### ReviewVideos.tsx
Enhanced video duration display with:
- Color-coded duration indicators
  - Green/Gray: Under 2.5 minutes (safe)
  - Amber: 2.5-2.75 minutes ("Getting long")
  - Red: Over 2.75 minutes ("Near limit")
- Visual badges for at-risk videos
- Information banner explaining optimization

## Speaking Rate Calculation

The system uses a conservative speaking rate of **140 words per minute**:

- **Industry Standard**: 150-160 WPM for professional narration
- **Our Conservative Rate**: 140 WPM
- **Reason**: Accounts for pauses, emphasis, and AI voice variations
- **Safety Buffer**: Provides ~10-15 seconds cushion at 350 words

**Duration Formula**:
```
Estimated Seconds = (Word Count / 140) × 60
```

**Example Calculation**:
- 350 words ÷ 140 WPM = 2.5 minutes = 150 seconds
- Safety buffer: 180 seconds (max) - 150 seconds (target) = 30 seconds

## Word Count Targets by Course Duration

The system automatically adjusts lesson counts and maintains consistent per-lesson word targets:

| Course Duration | Lessons | Words per Lesson | Estimated Video Length |
|----------------|---------|------------------|------------------------|
| 30 minutes     | 3       | ~350 (video)     | ~2.5 min each         |
| 1 hour         | 4       | ~350 (video)     | ~2.5 min each         |
| 2 hours        | 6       | ~350 (video)     | ~2.5 min each         |
| 3+ hours       | 8-10    | ~350 (video)     | ~2.5 min each         |

## Monitoring and Warnings

### Generation Time Logging

The system logs detailed information during video script generation:

```
Video script calculation for lesson 1:
  - introWords: 6
  - objectivesWords: 42
  - outroWords: 13
  - fixedWords: 61
  - availableWordsForContent: 289
  - originalContentWords: 380

Final script stats for lesson 1:
  - totalWords: 347
  - estimatedSeconds: 148
  - estimatedMinutes: 2.47
  - withinLimit: true
```

### Warning System

If a script exceeds safe limits during generation:
```
WARNING: Script exceeds safe word limit! 375 > 350
```

### UI Indicators

Users see clear visual feedback:
- **Duration Display**: Shows actual video length
- **Color Coding**: Green (safe), Amber (warning), Red (critical)
- **Badges**: "Getting long" or "Near limit" for at-risk videos
- **Information Banners**: Explain the optimization and limits

## Best Practices

1. **Always use video format** when generating courses intended for video narration
2. **Monitor duration indicators** during video review
3. **Regenerate if needed** - videos marked "Near limit" can be regenerated with more aggressive content reduction
4. **Trust the system** - the 350-word target has been carefully calibrated to stay well under the 3-minute limit

## Technical Details

### Files Modified

1. **generate-course-content/index.ts**
   - Added contentFormat parameter
   - Dynamic word count targets
   - Video-optimized prompts

2. **generate-lesson-videos/index.ts**
   - Word counting utilities
   - Duration estimation function
   - Intelligent script generation with truncation
   - Metadata storage

3. **CreateCourse.tsx**
   - Pass contentFormat to edge function
   - Information box about duration limits

4. **ReviewVideos.tsx**
   - Duration warnings and indicators
   - Color-coded display
   - Information banner

### Database Schema

Video assets now store duration metadata:
```json
{
  "metadata": {
    "wordCount": 347,
    "estimatedSeconds": 148,
    "estimatedMinutes": "2.47"
  }
}
```

## Future Enhancements

Potential improvements for consideration:

1. **User-selectable duration targets** - Allow users to choose between short (1-2 min), standard (2-3 min), or custom length
2. **Real-time duration estimation** - Show estimated video length during course creation
3. **Automatic regeneration** - Offer one-click regeneration for videos exceeding thresholds
4. **Analytics** - Track actual vs. estimated durations to refine calculations
5. **Per-lesson customization** - Allow users to specify different lengths for different lessons

## Testing Recommendations

When testing video generation:

1. Create a course with video format selected
2. Verify generated content is ~350 words per lesson
3. Check that video scripts stay under 350 words total
4. Confirm duration estimates are logged correctly
5. Verify UI displays duration warnings appropriately
6. Test regeneration for any videos near the limit

## Support

If videos consistently exceed the 3-minute limit:

1. Check that contentFormat is being passed correctly
2. Verify course generation is using video-optimized prompts
3. Review logged word counts and duration estimates
4. Consider reducing MAX_SAFE_WORDS in generate-lesson-videos/index.ts if needed

## Summary

This implementation provides a comprehensive solution to HeyGen's 3-minute video limit by:
- Generating shorter content for video format (~350 vs 600 words)
- Using intelligent sentence-aware truncation
- Calculating safe word limits based on conservative speaking rates
- Providing clear user feedback through duration indicators
- Maintaining educational quality through focused, concise lessons

The 350-word target with 140 WPM speaking rate provides approximately 30 seconds of safety buffer, ensuring videos reliably stay under the 3-minute maximum while delivering valuable educational content.
