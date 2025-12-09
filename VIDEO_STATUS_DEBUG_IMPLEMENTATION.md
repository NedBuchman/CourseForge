# Video Status Debugging Implementation Summary

## Overview

This document summarizes the comprehensive debugging and testing tools implemented for the check-video-status edge function.

## Problem Statement

The check-video-status function was experiencing issues where:
- Videos completed at HeyGen but database wasn't updating
- Unclear why updates were failing
- No visibility into the sync process
- Difficult to diagnose production issues

## Solution Implemented

### 1. Enhanced check-video-status Function

**File:** `supabase/functions/check-video-status/index.ts`

**New Features:**

#### Comprehensive Logging System
- Structured debug logs with timestamps
- Three log levels: INFO, WARN, ERROR
- Detailed logging for every operation:
  - Database queries with timing
  - HeyGen API calls with responses
  - Update operations with results
  - Verification reads after updates

#### Dry-Run Mode
- Test the function without making database changes
- See exactly what would be updated
- Perfect for production testing
- Usage: `{ "courseId": "...", "dryRun": true }`

#### Verbose Mode
- Returns complete debug logs in response
- Shows detailed execution trace
- Includes update plans for each video
- Usage: `{ "courseId": "...", "verbose": true }`

#### Verification Reads
- After each database update, reads back the record
- Confirms the update was persisted
- Logs if expected vs actual values don't match
- Helps identify silent update failures

#### Enhanced Response Format
```json
{
  "success": true,
  "status": "processing",
  "message": "Updated 3 video statuses",
  "dryRun": false,
  "stats": {
    "total": 10,
    "completed": 7,
    "failed": 0,
    "processing": 3
  },
  "timing": {
    "totalDurationMs": 4523,
    "avgPerVideoMs": 1507
  },
  "updateResults": [...],  // if verbose
  "debugLogs": [...]        // if verbose
}
```

### 2. Debug-Video-Status Function

**File:** `supabase/functions/debug-video-status/index.ts`

**Purpose:** Comprehensive diagnostics for a course's video status

**Features:**
- Shows all video assets with complete details
- Compares database status vs HeyGen status (optional)
- Shows which videos match the sync query
- Displays queue items
- Provides status counts and summaries

**Usage:**

Basic diagnostics:
```bash
POST /functions/v1/debug-video-status
{
  "courseId": "uuid"
}
```

With HeyGen comparison:
```bash
POST /functions/v1/debug-video-status
{
  "courseId": "uuid",
  "checkHeyGen": true
}
```

**Response Includes:**
- Course-level status and progress
- Complete list of video assets
- Database vs HeyGen comparison (if requested)
- Videos needing sync
- Status counts by type

### 3. Database Helper Functions

**Migration:** `add_video_status_debug_helpers`

Four new SQL functions for quick debugging:

#### get_videos_by_status(course_id, status)
Get all videos for a course, optionally filtered by status
```sql
SELECT * FROM get_videos_by_status('course-id', 'completed');
SELECT * FROM get_videos_by_status('course-id');  -- all statuses
```

#### get_videos_needing_sync(course_id)
Shows videos that match the sync query logic
```sql
SELECT * FROM get_videos_needing_sync('course-id');
```

Returns:
- Video ID and reference
- Current status
- Whether it has URL/provider ID
- Reason why it needs syncing

#### get_video_status_summary(course_id)
Comprehensive status counts
```sql
SELECT * FROM get_video_status_summary('course-id');
```

Returns counts for:
- Total videos
- Each status type (pending, processing, completed, etc.)
- Videos with/without URLs
- Videos with/without provider IDs
- Total needing sync

#### compare_video_counts(course_id)
Validates course-level counts match actual data
```sql
SELECT * FROM compare_video_counts('course-id');
```

Shows if `videos_generated_count` on course record matches actual completed videos.

### 4. Comprehensive Documentation

**File:** `VIDEO_STATUS_DEBUG_GUIDE.md`

Complete guide covering:
- Quick diagnosis steps
- Testing procedures
- Common issues and solutions
- Understanding logs
- Advanced debugging techniques
- Performance testing
- Best practices
- Troubleshooting checklist

## How to Use These Tools

### Quick Diagnosis Workflow

1. **Get Overview**
   ```bash
   curl -X POST .../debug-video-status \
     -d '{"courseId": "...", "checkHeyGen": true}'
   ```

2. **Test What Would Happen**
   ```bash
   curl -X POST .../check-video-status \
     -d '{"courseId": "...", "dryRun": true, "verbose": true}'
   ```

3. **Run with Detailed Logging**
   ```bash
   curl -X POST .../check-video-status \
     -d '{"courseId": "...", "verbose": true}'
   ```

4. **Check Database Directly**
   ```sql
   SELECT * FROM get_video_status_summary('course-id');
   SELECT * FROM get_videos_needing_sync('course-id');
   ```

### Common Debugging Scenarios

#### Scenario 1: Video Stuck in Processing

1. Check debug endpoint to see HeyGen status
2. Run check-video-status in dry-run mode
3. Look for errors in verbose logs
4. Check verification reads for update confirmation

#### Scenario 2: Query Not Finding Videos

1. Use `get_videos_needing_sync()` to see what matches
2. Compare with actual video statuses
3. Understand the OR logic: processing OR no URL
4. Check if videos are marked as failed (excluded from query)

#### Scenario 3: Updates Not Persisting

1. Run in dry-run mode to see update plan
2. Run with verbose mode to see errors
3. Check for RLS policy violations
4. Look at verification read results
5. Check error codes in debug logs

## Technical Details

### Query Logic

The sync query finds videos where:
```sql
(generation_status = 'processing' OR video_url IS NULL)
AND generation_status != 'failed'
```

This catches:
- Videos actively processing
- Videos completed but URL not yet synced
- Videos pending that were never submitted

### Update Flow

1. Query for videos needing sync
2. For each video:
   - Call HeyGen API
   - Log API response
   - Determine if update needed
   - Execute update (unless dry-run)
   - Verify update with read
   - Update queue table
3. Recalculate course-level stats
4. Update course progress

### Logging Architecture

All logs go to two places:
1. Console (visible in Supabase Functions logs)
2. In-memory array (returned if verbose mode)

Log format:
```typescript
{
  timestamp: ISO8601 string,
  level: 'info' | 'warn' | 'error',
  message: descriptive string,
  data: contextual object
}
```

## Deployment

Both edge functions have been deployed:
- ✅ check-video-status (updated with debugging features)
- ✅ debug-video-status (new diagnostic function)

Database migration applied:
- ✅ add_video_status_debug_helpers (4 SQL functions)

## Testing

The implementation has been validated:
- ✅ Code compiles successfully
- ✅ Functions deployed to Supabase
- ✅ Database helpers created
- ✅ Documentation complete

## Next Steps for Usage

1. **Test with a real course:**
   - Start with debug-video-status to see current state
   - Run check-video-status in dry-run mode
   - Run check-video-status normally with verbose
   - Verify videos update correctly

2. **Monitor in production:**
   - Check Supabase Functions logs regularly
   - Use database helpers for quick checks
   - Enable verbose mode when investigating issues

3. **Iterate based on findings:**
   - If specific errors appear, add more targeted logging
   - If performance is slow, optimize queries
   - If updates fail, investigate RLS policies

## Benefits

1. **Visibility** - See exactly what's happening during sync
2. **Safety** - Test with dry-run before making changes
3. **Diagnosis** - Quickly identify root cause of issues
4. **Verification** - Confirm updates are persisting
5. **Comparison** - Check database vs HeyGen status
6. **Performance** - Track timing and identify bottlenecks

## Files Modified/Created

### Modified
- `supabase/functions/check-video-status/index.ts` - Added logging, dry-run, verbose mode

### Created
- `supabase/functions/debug-video-status/index.ts` - New diagnostic endpoint
- `VIDEO_STATUS_DEBUG_GUIDE.md` - Comprehensive testing guide
- `VIDEO_STATUS_DEBUG_IMPLEMENTATION.md` - This summary
- Database migration: `add_video_status_debug_helpers` - SQL helper functions

## Conclusion

The check-video-status function now has comprehensive debugging capabilities. Use the dry-run mode for safe testing, verbose mode for detailed insights, and the debug endpoint for quick diagnosis. The database helper functions provide SQL-based visibility into video status.

All tools are production-ready and can be used immediately to diagnose and fix video status sync issues.
