# Video Generation Diagnostics & Error Handling

## Issue Fixed

The video generation function was previously failing silently when 0 videos were submitted to HeyGen. All errors were caught and logged but not properly reported back to the user or tracked in the database.

## Improvements Made

### 1. Enhanced Error Logging
- Added detailed logging for each video asset being processed
- Logs complete HeyGen API request payloads (for debugging)
- Logs full API response bodies including error details
- Added validation of API key presence and length
- Logs summary statistics at the end of processing

### 2. Configuration Validation
- Added `validateVideoConfig()` function to check video_config before API calls
- Validates that required fields (avatar_id, voice_id) are present
- Throws descriptive errors when configuration is invalid

### 3. Comprehensive Error Tracking
- Tracks all failed videos with specific error messages
- Stores failure reasons in the database (video_assets.generation_error)
- Returns detailed error information in the API response
- Updates course status to show partial success (e.g., "2/3 videos submitted")

### 4. Better Response Format
The function now returns:
```json
{
  "success": true/false,
  "message": "Submitted X of Y videos for generation",
  "videosSubmitted": 2,
  "totalVideos": 3,
  "failedCount": 1,
  "failedVideos": [
    {
      "assetId": "uuid",
      "lessonNumber": "1",
      "error": "Specific error message"
    }
  ],
  "status": "processing",
  "details": "Some videos failed to submit. Check logs for details."
}
```

### 5. Diagnostic Test Endpoint

A new edge function `test-heygen-api` has been created to diagnose HeyGen API connectivity issues.

**Endpoint:** `https://[YOUR-SUPABASE-URL]/functions/v1/test-heygen-api`

**Usage:**
```bash
curl -X POST https://[YOUR-SUPABASE-URL]/functions/v1/test-heygen-api \
  -H "Authorization: Bearer [ANON-KEY]"
```

**What it checks:**
- Whether HEYGEN_API_KEY is configured
- API key validity by making a test request
- Complete request/response cycle with detailed diagnostics

**Success Response:**
```json
{
  "success": true,
  "message": "HeyGen API connection successful",
  "testVideoId": "test-video-id",
  "diagnostics": {
    "apiKeyConfigured": true,
    "apiKeyLength": 32,
    "responseStatus": 200,
    "hasVideoId": true,
    "videoStatus": "pending"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "HEYGEN_API_KEY not configured",
  "details": "Please add HEYGEN_API_KEY to your Supabase project secrets",
  "diagnostics": {
    "apiKeyConfigured": false,
    "apiKeyLength": 0
  }
}
```

## Common Issues & Solutions

### Issue: "HEYGEN_API_KEY not configured"
**Solution:** Add the HEYGEN_API_KEY to your Supabase project secrets in the dashboard under Project Settings > Edge Functions > Secrets.

### Issue: "Invalid video configuration: avatar_id is missing"
**Solution:** Ensure the course's video_config includes valid avatar_id and voice_id fields. Check the course record in the database.

### Issue: "HeyGen API error (401)"
**Solution:** Your API key is invalid or expired. Verify the key in your HeyGen dashboard.

### Issue: "HeyGen API error (402)"
**Solution:** Your HeyGen account has insufficient credits or your plan doesn't support the requested features.

### Issue: "HeyGen API error (429)"
**Solution:** You've hit the rate limit. Wait a few minutes before trying again.

## Debugging Steps

1. **Check the Supabase Edge Function logs** for detailed error messages:
   - Go to Supabase Dashboard > Edge Functions > generate-lesson-videos
   - Click on "Logs" to see real-time execution logs

2. **Run the diagnostic endpoint** to verify HeyGen API connectivity:
   ```bash
   curl -X POST https://[YOUR-SUPABASE-URL]/functions/v1/test-heygen-api \
     -H "Authorization: Bearer [ANON-KEY]"
   ```

3. **Check video_assets table** for failed videos:
   ```sql
   SELECT id, asset_reference_id, generation_status, generation_error
   FROM video_assets
   WHERE course_id = 'your-course-id'
   AND generation_status = 'failed';
   ```

4. **Verify video_config** in the courses table:
   ```sql
   SELECT id, title, video_config
   FROM courses
   WHERE id = 'your-course-id';
   ```

## Next Steps

When you see the error logs, you'll now get:
- Exact error message from HeyGen API
- Which specific video(s) failed
- Why each video failed
- Complete request/response data for debugging

This information will help identify whether the issue is:
- Missing/invalid API key
- Invalid video configuration
- HeyGen account issues (quota, credits, etc.)
- Network/connectivity problems
- Invalid request parameters
