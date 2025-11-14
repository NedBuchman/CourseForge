# CourseForge Setup Instructions

## Problem Identified

Your CourseForge application is getting a "Network error: Unable to connect to course generation service" because the **ANTHROPIC_API_KEY** secret is not configured in your Supabase project.

**Status Check:**
- ✅ Edge functions are deployed and active
- ✅ Supabase configuration is correct
- ✅ Frontend environment variables are set
- ❌ **ANTHROPIC_API_KEY secret is missing** (This is the issue!)

## Solution: Configure ANTHROPIC_API_KEY

### Step 1: Get Your Anthropic API Key

1. Go to https://console.anthropic.com
2. Sign in or create an account
3. Navigate to **API Keys** section
4. Click **Create Key** or copy an existing key
5. Copy your API key (it starts with `sk-ant-`)

### Step 2: Add the Secret to Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ghlgqldbnanecodnkmkz
2. Click on **Project Settings** (gear icon in bottom left)
3. Navigate to **Edge Functions** in the left sidebar
4. Scroll down to the **Secrets** section
5. Click **Add new secret**
6. Enter the following:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** Your Claude API key (paste the key from Step 1)
7. Click **Save** or **Add Secret**

### Step 3: Verify the Configuration

After adding the secret, wait about 30-60 seconds for it to propagate, then:

1. Open your CourseForge application
2. Log in to your account
3. Try creating a new course with these simple settings:
   - **Subject:** "Introduction to Python"
   - **Audience:** "Complete beginners"
   - **Difficulty:** Beginner
   - **Duration:** 30 minutes
4. Click **Generate My Course**

### Expected Behavior

After configuration:
- **Simple courses (30 min - 1 hour):** 30-60 seconds generation time
- **Medium courses (2 hours):** 1-2 minutes generation time
- **Large courses (3-4 hours):** 2-4 minutes generation time

## Troubleshooting

### Error: "ANTHROPIC_API_KEY not configured"
- Double-check the secret name is exactly `ANTHROPIC_API_KEY` (case-sensitive)
- Verify your API key is correct and starts with `sk-ant-`
- Wait 1-2 minutes after adding the secret and try again

### Error: "Authentication failed" or "Invalid API key"
- Your Anthropic API key is incorrect or expired
- Get a new API key from https://console.anthropic.com
- Replace the secret value in Supabase

### Error: "Rate limit exceeded"
- You've hit the API rate limit on your Anthropic account
- Wait 2-3 minutes before trying again
- Check your usage at https://console.anthropic.com

### Error: "Insufficient credits"
- Your Anthropic account has run out of credits
- Add credits to your Anthropic account at https://console.anthropic.com

### Still Having Issues?

If you continue to see the "Network error" after completing these steps:

1. **Check Supabase Function Logs:**
   - Go to Supabase Dashboard > Edge Functions
   - Click on `generate-course-content`
   - View the **Logs** tab for error messages

2. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for detailed error messages

3. **Verify API Key Works:**
   - Test your API key directly at https://console.anthropic.com
   - Try making a simple API call to verify it's active

## Important Notes

- The ANTHROPIC_API_KEY secret is stored securely in Supabase and is never exposed to the frontend
- You need a valid Anthropic account with available credits
- Edge functions are already deployed and active
- No code changes are needed - this is purely a configuration issue

## Summary

The fix is simple:
1. Get your Anthropic API key from console.anthropic.com
2. Add it as a secret named `ANTHROPIC_API_KEY` in Supabase Project Settings > Edge Functions
3. Wait 30-60 seconds and try generating a course

That's it! Your CourseForge application should start working immediately after the API key is configured.
