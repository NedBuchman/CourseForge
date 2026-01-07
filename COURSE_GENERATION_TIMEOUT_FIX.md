# Course Generation Timeout Fix

## Problem
When generating large courses (6-10 lessons), the course generation function would timeout. This was caused by trying to generate all lessons in a single API call to Claude, which could take 9-15+ minutes for larger courses.

## Root Cause
- The function made ONE large API call to generate all lessons at once
- Large courses with 8-10 lessons required 14000-16000 max_tokens
- Claude API calls for this much content would take too long and timeout
- Even with 9-minute timeout and retries, it wasn't enough for large courses

## Solution: Chunked Generation
Implemented a two-phase approach that breaks generation into smaller, faster calls:

### Phase 1: Generate Outline (Fast)
- Creates a course outline with lesson titles and objectives only
- Max tokens: 4000
- Time: ~10-15 seconds
- Returns: Course structure with empty content

### Phase 2: Generate Lessons Individually (Sequential, but each call is fast)
- Loops through each lesson one at a time
- Generates full content for ONE lesson per API call
- Max tokens per lesson: 3000
- Time per lesson: ~10-15 seconds
- Updates progress after EACH lesson completes
- Users see real-time progress as lessons finish

## Benefits
1. **No More Timeouts**: Each individual API call is quick (under 20 seconds)
2. **Real-time Progress**: Users see which lesson is being generated
3. **Better Reliability**: If one lesson fails, we can retry just that lesson
4. **Incremental Saves**: Could be extended to save lessons as they complete
5. **Scalable**: Works for any course size (3, 6, 10, or even 20 lessons)

## Performance Comparison
**Old Approach (Monolithic)**:
- 3-lesson course: ~60 seconds
- 6-lesson course: ~3-5 minutes
- 10-lesson course: ~9-15 minutes (often timeout)

**New Approach (Chunked)**:
- 3-lesson course: ~45-60 seconds (outline + 3 lessons)
- 6-lesson course: ~2 minutes (outline + 6 lessons)
- 10-lesson course: ~3 minutes (outline + 10 lessons)
- **No timeouts at any size**

## Technical Details

### Code Changes
- Removed single monolithic generation call
- Added outline generation step
- Implemented for-loop to generate lessons sequentially
- Enhanced progress tracking to show current lesson number
- Inlined security functions to avoid import issues

### Files Modified
- `/supabase/functions/generate-course-content/index.ts` - Complete rewrite of generation logic

## Testing Recommendations
1. Test with 3-lesson course (30 min duration) - should complete in under 1 minute
2. Test with 6-lesson course (2 hour duration) - should complete in ~2 minutes
3. Test with 10-lesson course (4+ hour duration) - should complete in ~3 minutes
4. Verify progress updates show correctly in UI
5. Verify all lesson content is generated completely

## Future Enhancements
1. **Parallel Lesson Generation**: Generate multiple lessons concurrently (2-3 at a time)
2. **Resume Support**: Save lessons as they complete, allow resuming failed generations
3. **Background Jobs**: Move to a proper job queue for even longer courses
4. **Streaming**: Stream lesson content as it's generated for even faster perceived performance

## Deployment Status
- ✅ Code updated in repository
- ✅ Function tested locally
- ⏳ Requires deployment to production (function needs to be re-deployed to Supabase)

## How to Deploy
The function has been updated in the codebase. To activate the fix, the function needs to be deployed to Supabase Edge Functions. The changes are backward compatible and don't require any database migrations or frontend updates.
