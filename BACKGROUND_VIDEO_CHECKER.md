# Background Video Status Checker

## Overview

The Background Video Status Checker is a system that automatically monitors video generation progress even when users are logged off. This ensures that course creators always see up-to-date video status when they return to the application.

## Problem Solved

**Before:** When a user started video generation and logged off, videos would continue processing at HeyGen's servers, but the CourseForge database wouldn't update until the user returned and viewed the ReviewVideos page. This meant:
- Completed videos remained marked as "processing"
- Course workflow status wasn't updated automatically
- Users couldn't see accurate progress without manual page refreshes

**After:** The background checker periodically polls HeyGen's API for all processing videos and updates the database automatically, providing real-time status updates regardless of user activity.

## Architecture

### Components

1. **Edge Function: `check-all-processing-videos`**
   - Deployed at: `/functions/v1/check-all-processing-videos`
   - Runs independently of user sessions
   - Can be triggered manually or scheduled via cron jobs

2. **Database Helper Functions**
   - `get_processing_videos()` - Lists all videos currently processing
   - `get_stale_processing_videos(minutes)` - Finds videos stuck in processing
   - `get_courses_with_processing_videos()` - Shows courses with active video generation
   - `should_run_background_video_check()` - Quick check if background job is needed

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                     Background Checker Flow                  │
└─────────────────────────────────────────────────────────────┘

1. Trigger (Manual or Scheduled)
   │
   ├──> Query: Find all video_assets with status='processing'
   │
   ├──> For each video:
   │    ├─> Call HeyGen API: GET /v1/video_status.get
   │    ├─> Check result:
   │    │   ├─> If 'completed': Update DB with video URL, mark complete
   │    │   ├─> If 'failed': Mark as failed, save error message
   │    │   └─> If 'processing': Leave as-is, continue monitoring
   │    └─> Wait 500ms (rate limiting)
   │
   └──> Update course-level status for all affected courses
        ├─> Calculate: completed / total videos
        ├─> Update video_generation_progress (0-100%)
        └─> Update videos_status ('completed' or 'partial')
```

## Setup Instructions

### Option 1: Manual Triggering

You can manually trigger the background checker at any time:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/check-all-processing-videos \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

Response format:
```json
{
  "success": true,
  "message": "Checked 5 videos, updated 2",
  "stats": {
    "checked": 5,
    "updated": 2,
    "completed": 2,
    "failed": 0,
    "stale": 0,
    "courses_affected": 1,
    "duration_ms": 3241
  }
}
```

### Option 2: Scheduled Cron Job (Recommended)

Set up a cron job in Supabase to run the checker every 5 minutes:

1. Go to your Supabase Dashboard
2. Navigate to Database > Functions
3. Create a new cron job:
   - **Name:** check-video-status-cron
   - **Schedule:** `*/5 * * * *` (every 5 minutes)
   - **SQL:**
     ```sql
     SELECT
       net.http_post(
         url := 'https://YOUR_PROJECT.supabase.co/functions/v1/check-all-processing-videos',
         headers := jsonb_build_object('Content-Type', 'application/json'),
         body := '{}'::jsonb
       ) AS response;
     ```

**Alternative:** Use an external cron service (e.g., Vercel Cron, GitHub Actions) to call the endpoint periodically.

### Option 3: Database Trigger (Advanced)

Create a trigger that automatically checks status after a certain time period:

```sql
-- Create a function to schedule checks
CREATE OR REPLACE FUNCTION schedule_video_status_check()
RETURNS trigger AS $$
BEGIN
  -- Only schedule if there are processing videos
  IF (SELECT should_run_background_video_check()) THEN
    -- Use pg_cron or similar to schedule a check
    PERFORM pg_cron.schedule(
      'video-status-check-' || NEW.id::text,
      '*/5 * * * *',
      format('SELECT net.http_post(url := %L)',
        'YOUR_EDGE_FUNCTION_URL')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Monitoring & Management

### Check Current Processing Videos

Query the database to see what's currently processing:

```sql
-- Get all processing videos
SELECT * FROM get_processing_videos();

-- Find stuck videos (processing > 30 minutes)
SELECT * FROM get_stale_processing_videos(30);

-- See courses with active video generation
SELECT * FROM get_courses_with_processing_videos();

-- Quick check if background job should run
SELECT should_run_background_video_check();
```

### Performance Considerations

- **API Rate Limiting:** The checker includes 500ms delays between HeyGen API calls
- **Execution Time:** Typical execution is ~500-1000ms per video checked
- **Cost:** Each run makes N API calls (where N = number of processing videos)

### Stale Video Detection

The system flags videos that have been processing for more than 30 minutes as "stale". This helps identify:
- Videos that may have failed without reporting errors
- Issues with HeyGen's processing queue
- Network or API problems

**Manual intervention may be needed for stale videos:**

1. Check the video status manually at HeyGen dashboard
2. If truly stuck, regenerate the video
3. If completed but not reported, manually update the database

## Integration with User Workflow

### User Experience Flow

1. **User starts video generation** → Videos submitted to HeyGen
2. **User logs off** → Background checker takes over
3. **5-10 minutes pass** → Background checker runs, updates status
4. **User logs back in** → Sees updated progress immediately
5. **User views ReviewVideos page** → Accurate status without delays

### Frontend Integration

The ReviewVideos page works seamlessly with the background checker:
- Still polls every 15 seconds when user is viewing
- Background checker ensures data is fresh when user isn't viewing
- No code changes needed in frontend - database is always current

## Troubleshooting

### Videos Stuck in "Processing"

**Symptoms:** Videos remain in processing status for > 30 minutes

**Solutions:**
1. Run the background checker manually
2. Check `get_stale_processing_videos(30)` for details
3. Verify HeyGen API key is valid
4. Check HeyGen dashboard for video status
5. If needed, manually regenerate the video

### Background Checker Not Running

**Check these:**
- [ ] Edge function deployed correctly
- [ ] HEYGEN_API_KEY configured in Supabase secrets
- [ ] Cron job scheduled (if using scheduled approach)
- [ ] Network connectivity to HeyGen API
- [ ] Logs in Supabase Functions dashboard

### High API Usage

If you're seeing too many HeyGen API calls:
- Adjust cron frequency (e.g., every 10 minutes instead of 5)
- Implement smarter triggering (only run if videos are processing)
- Use database function to check before making API calls:
  ```sql
  SELECT should_run_background_video_check();
  ```

## Security

- ✅ Edge function has `verify_jwt: false` to allow background execution
- ✅ Uses service role key for database access (automatic)
- ✅ HEYGEN_API_KEY stored securely in Supabase secrets
- ✅ Read-only helper functions use SECURITY DEFINER safely
- ✅ No user data exposed in logs

## Future Enhancements

Potential improvements:
- [ ] Webhook support from HeyGen (if available)
- [ ] Intelligent scheduling based on video count
- [ ] Email notifications when videos complete
- [ ] Slack/Discord integration for status updates
- [ ] Retry logic for failed API calls
- [ ] Exponential backoff for rate limiting

## Cost Estimation

Typical costs for background checking:

| Videos Processing | Check Frequency | API Calls/Day | Estimated Cost |
|-------------------|-----------------|---------------|----------------|
| 1-5 videos        | Every 5 min     | ~1,440        | Minimal        |
| 10 videos         | Every 5 min     | ~2,880        | Low            |
| 50 videos         | Every 5 min     | ~14,400       | Moderate       |

**Recommendation:** Start with 5-minute intervals and adjust based on your video volume and HeyGen plan limits.

## Support

For issues or questions:
1. Check Supabase Functions logs for errors
2. Verify edge function deployment
3. Test manually with curl command
4. Review HeyGen API documentation
5. Check database helper function results
