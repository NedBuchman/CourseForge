# Course Generation Fix - Deployment Instructions

## What Was Fixed

The course generation was failing at 90% due to:
1. **Timeout issues**: Edge function and Claude API timeouts were too short for complex courses
2. **Poor error handling**: Generic error messages didn't help users understand what went wrong
3. **No retry logic**: Network hiccups or temporary API issues caused immediate failures
4. **Missing validation**: No upfront checks for API configuration

## Changes Made

### 1. Edge Function Improvements (`supabase/functions/generate-course-content/index.ts`)
- **Increased timeouts**: 3-5 minutes depending on course complexity (was 2.5 min)
- **Retry logic**: Up to 3 attempts with exponential backoff for transient failures
- **Better error messages**: Specific messages for auth, rate limits, timeouts, and config issues
- **Improved JSON parsing**: Handles Claude responses with code blocks and validates structure
- **Higher token limits**: 6000-10000 tokens (was 5000-7000) for more detailed content
- **Updated model**: Using `claude-sonnet-4-20250514` for better reliability

### 2. Frontend Improvements (`src/pages/CreateCourse.tsx`)
- **Longer client timeouts**: 4-6 minutes (was 3-6 min) to match edge function timeouts
- **Better error categorization**: Detects config, timeout, and rate limit errors
- **Helpful troubleshooting**: Shows specific setup instructions based on error type
- **Configuration check**: Validates Supabase setup on app load
- **Status banners**: Persistent error messages with actionable next steps

## Deployment Steps

### Step 1: Verify Supabase Configuration

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `ghlgqldbnanecodnkmkz`
3. Go to **Project Settings** > **Edge Functions**
4. **Critical**: Add a secret named `ANTHROPIC_API_KEY`
   - Get your API key from https://console.anthropic.com
   - Click "Add new secret"
   - Name: `ANTHROPIC_API_KEY`
   - Value: Your Claude API key (starts with `sk-ant-`)

### Step 2: Deploy Edge Functions

You need to deploy the updated edge function to Supabase cloud:

**Option A: Using Supabase CLI (Recommended)**
```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref ghlgqldbnanecodnkmkz

# Deploy the edge function
supabase functions deploy generate-course-content
```

**Option B: Manual Deployment via Dashboard**
1. Go to Supabase Dashboard > Edge Functions
2. Create/Update the `generate-course-content` function
3. Copy the contents of `supabase/functions/generate-course-content/index.ts`
4. Deploy the function

### Step 3: Test the Changes

1. Try creating a **simple course first**:
   - Subject: "Introduction to Python"
   - Duration: 30 minutes
   - Difficulty: Beginner

2. If successful, try a **complex course**:
   - Subject: "American History in the 20th Century"
   - Duration: 3-4 hours
   - Difficulty: Advanced

3. Monitor the browser console for any errors

### Step 4: Troubleshooting

**If you still see errors:**

1. **"Configuration Error"** or **"ANTHROPIC_API_KEY not configured"**
   - Go to Project Settings > Edge Functions
   - Verify ANTHROPIC_API_KEY is set correctly
   - Redeploy the edge function

2. **"Network error: Unable to connect"**
   - Edge functions might not be deployed
   - Run: `supabase functions deploy generate-course-content`
   - Check Edge Functions section in dashboard

3. **"Timeout" errors**
   - Try creating a shorter course (fewer lessons)
   - Check your Claude API usage limits at console.anthropic.com
   - Wait 2-3 minutes and try again

4. **"Rate limit exceeded"**
   - Wait 2-3 minutes before retrying
   - Check Claude API rate limits on your plan

## Expected Behavior

After deployment:
- Simple courses (3-4 lessons): Complete in 30-60 seconds
- Medium courses (6-8 lessons): Complete in 1-2 minutes
- Complex courses (10+ lessons): Complete in 2-4 minutes
- Automatic retries on temporary failures
- Clear error messages with setup instructions

## Key Improvements Summary

| Issue | Before | After |
|-------|--------|-------|
| Timeout | 150 seconds | 180-300 seconds |
| Retries | 0 | 2 with backoff |
| Token limit | 5000-7000 | 6000-10000 |
| Error messages | Generic | Specific with steps |
| Config validation | None | On app startup |
| Status feedback | Basic | Detailed with progress |

## Need Help?

If issues persist after following these steps:
1. Check Supabase function logs in the dashboard
2. Check browser console for detailed error messages
3. Verify your Anthropic API key is valid and has sufficient credits
4. Ensure you're on a stable internet connection
