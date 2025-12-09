# Video Status Debugging Guide

This guide provides comprehensive instructions for debugging and testing the check-video-status function using the new diagnostic tools.

## Overview

The enhanced check-video-status function now includes:
- **Comprehensive logging** - Detailed logs for every operation
- **Dry-run mode** - Test without making database changes
- **Verbose mode** - Get detailed execution information
- **Verification reads** - Confirm database updates were successful

New diagnostic tools:
- **debug-video-status** - Compare database state with HeyGen status
- **Database helper functions** - SQL functions for quick status checks

## Quick Diagnosis

### Step 1: Check Overall Status

Use the debug endpoint to get a complete picture:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/debug-video-status \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"courseId": "YOUR_COURSE_ID"}'
```

This returns:
- Course-level status
- All video assets with their current status
- Videos matching the sync query
- Queue items status

### Step 2: Compare with HeyGen

Add `checkHeyGen: true` to compare database vs HeyGen:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/debug-video-status \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"courseId": "YOUR_COURSE_ID", "checkHeyGen": true}'
```

This will show:
- Database status for each video
- HeyGen status for each video
- Whether they match
- Which videos need syncing

## Testing the Check-Video-Status Function

### Test 1: Dry Run Mode

Test what would be updated WITHOUT making changes:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/check-video-status \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "YOUR_COURSE_ID",
    "dryRun": true,
    "verbose": true
  }'
```

Response includes:
- `updateResults` - What would be updated for each video
- `debugLogs` - Detailed execution logs
- `dryRun: true` - Confirms no changes were made

### Test 2: Verbose Mode

Get detailed logs from actual execution:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/check-video-status \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "YOUR_COURSE_ID",
    "verbose": true
  }'
```

The response will include:
- Complete debug logs with timestamps
- Database query timing
- HeyGen API response details
- Update success/failure for each video

### Test 3: Normal Execution

Run the function normally:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/check-video-status \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"courseId": "YOUR_COURSE_ID"}'
```

## Using Database Helper Functions

### Check Videos by Status

```sql
-- Get all completed videos
SELECT * FROM get_videos_by_status('YOUR_COURSE_ID', 'completed');

-- Get all videos (any status)
SELECT * FROM get_videos_by_status('YOUR_COURSE_ID');
```

### Check What Needs Syncing

```sql
-- See which videos match the sync query
SELECT * FROM get_videos_needing_sync('YOUR_COURSE_ID');
```

Output columns:
- `id` - Video asset ID
- `asset_reference_id` - Lesson or quiz reference
- `generation_status` - Current database status
- `has_video_url` - Whether video URL exists
- `has_provider_id` - Whether HeyGen video ID exists
- `provider_video_id` - The HeyGen video ID
- `reason` - Why this video needs syncing

### Get Status Summary

```sql
-- Get comprehensive status counts
SELECT * FROM get_video_status_summary('YOUR_COURSE_ID');
```

Returns:
- Total videos
- Count by status (pending, processing, completed, failed, etc.)
- Videos with/without URLs
- Videos with/without provider IDs
- Total needing sync

### Compare Course Counts

```sql
-- Check if course-level counts match reality
SELECT * FROM compare_video_counts('YOUR_COURSE_ID');
```

Shows if the course.videos_generated_count matches actual completed videos.

## Common Issues & Solutions

### Issue 1: Videos Stuck in Processing

**Symptoms:**
- Videos show "processing" in database
- HeyGen shows "completed"
- Video URLs not updating

**Diagnosis:**
```bash
# Check current state
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/debug-video-status \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"courseId": "YOUR_COURSE_ID", "checkHeyGen": true}' | jq .
```

Look for videos where:
- `database.generation_status` = "processing"
- `heygen.status` = "completed"
- `statusMatch` = false
- `needsSync` = true

**Solution:**
```bash
# Run check-video-status with verbose logging
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/check-video-status \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"courseId": "YOUR_COURSE_ID", "verbose": true}' | jq .
```

Check the `debugLogs` for:
- Database update errors
- Permission issues
- RLS policy blocks

### Issue 2: Query Not Finding Videos

**Symptoms:**
- check-video-status returns "No videos currently processing"
- But you know videos are processing

**Diagnosis:**
```sql
-- Check what the sync query finds
SELECT * FROM get_videos_needing_sync('YOUR_COURSE_ID');

-- Compare with actual video statuses
SELECT generation_status, video_url IS NULL as no_url, COUNT(*)
FROM video_assets
WHERE course_id = 'YOUR_COURSE_ID'
GROUP BY generation_status, video_url IS NULL;
```

**Understanding the Query Logic:**

The function searches for videos where:
```
(generation_status = 'processing' OR video_url IS NULL)
AND generation_status != 'failed'
```

This means:
- Videos with status "processing" (even if they have a URL)
- Videos without URLs (regardless of status, except failed)

### Issue 3: Updates Not Persisting

**Symptoms:**
- Function says it updated videos
- Database still shows old values

**Diagnosis:**
```bash
# Run in dry-run mode first
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/check-video-status \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"courseId": "YOUR_COURSE_ID", "dryRun": true, "verbose": true}' \
  | jq '.updateResults'
```

Then run with verbose mode:
```bash
# Run for real with verbose logging
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/check-video-status \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"courseId": "YOUR_COURSE_ID", "verbose": true}' \
  | jq '.debugLogs[] | select(.level == "error")'
```

Look for:
- `"Failed to update asset"` messages
- Error codes (RLS violations, constraint violations)
- Verification read mismatches

### Issue 4: Course Progress Not Updating

**Symptoms:**
- Videos complete successfully
- Course-level status doesn't update

**Diagnosis:**
```sql
-- Check if counts match
SELECT * FROM compare_video_counts('YOUR_COURSE_ID');

-- Check course status
SELECT
  video_generation_status,
  video_generation_progress,
  videos_generated_count,
  video_generation_completed_at
FROM courses
WHERE id = 'YOUR_COURSE_ID';
```

**Solution:**
The function updates course status when all processing is complete. If videos are stuck, course status won't update until they're resolved.

## Understanding the Logs

### Log Levels

- **INFO** - Normal operations (query results, status checks)
- **WARN** - Potential issues (missing provider IDs, skipped videos)
- **ERROR** - Failures (database errors, API errors, update failures)

### Key Log Messages

**"Initializing Supabase client"**
- Confirms service role key is present
- Shows Supabase URL

**"Query for processing assets completed"**
- Shows how many videos matched the sync query
- Includes query execution time

**"Processing assets found"**
- Lists each video that will be checked
- Shows current status and whether it has a URL

**"Calling HeyGen API for video"**
- About to call HeyGen for this video

**"HeyGen API responded in Xms"**
- HeyGen response time
- HTTP status code

**"Successfully updated asset"**
- Database update succeeded
- Shows how many rows were updated

**"Verification read for asset"**
- Confirms database reflects the update
- Shows if expected status matches actual

**"Failed to update asset"**
- Database update failed
- Includes error code, message, details

## Advanced Debugging

### Trace a Single Video

1. Get the provider_video_id from the database
2. Use the diagnose-heygen-video function:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/diagnose-heygen-video \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"providerVideoId": "HEYGEN_VIDEO_ID"}'
```

3. Compare with database:

```sql
SELECT * FROM video_assets
WHERE provider_video_id = 'HEYGEN_VIDEO_ID';
```

### Monitor Real-Time Updates

Use Supabase Realtime to watch for changes:

```javascript
const subscription = supabase
  .channel('video-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'video_assets',
    filter: `course_id=eq.${courseId}`
  }, (payload) => {
    console.log('Video updated:', payload);
  })
  .subscribe();
```

### Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to Functions > check-video-status
3. Click "Logs" tab
4. Look for execution logs, errors, and performance metrics

## Performance Testing

### Test with Different Video Counts

```bash
# Time the execution
time curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/check-video-status \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"courseId": "YOUR_COURSE_ID"}'
```

The response includes timing information:
- `timing.totalDurationMs` - Total execution time
- `timing.avgPerVideoMs` - Average time per video

### Stress Test

Run multiple concurrent checks:

```bash
for i in {1..5}; do
  curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/check-video-status \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"courseId": "YOUR_COURSE_ID"}' &
done
wait
```

## Best Practices

1. **Always start with debug-video-status** to understand the current state
2. **Use dry-run mode** before running updates on production data
3. **Enable verbose mode** when investigating issues
4. **Check Supabase logs** for detailed error messages
5. **Use database helper functions** for quick SQL-based checks
6. **Monitor timing** to identify performance bottlenecks
7. **Compare HeyGen vs Database** to identify sync issues

## Troubleshooting Checklist

- [ ] Videos exist in database with provider_video_id
- [ ] HeyGen API key is configured
- [ ] Videos are actually completed at HeyGen
- [ ] Sync query is finding the videos
- [ ] Database updates are succeeding (no errors in logs)
- [ ] Verification reads show updated values
- [ ] Course-level status updates after all videos complete
- [ ] RLS policies allow service role to update

## Getting Help

If you're still stuck:

1. Run debug-video-status with checkHeyGen: true
2. Run check-video-status with dryRun: true and verbose: true
3. Capture the output from both
4. Check Supabase Functions logs
5. Run the database helper functions
6. Include all this information when asking for help
