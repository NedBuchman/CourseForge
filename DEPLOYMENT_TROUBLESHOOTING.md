# Deployment Troubleshooting Guide

## If the site shows a blank page or doesn't load

### 1. Check Environment Variables

The application requires these environment variables to be set on your hosting platform:

```
VITE_SUPABASE_URL=https://ghlgqldbnanecodnkmkz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobGdxbGRibmFuZWNvZG5rbWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MjA3NTEsImV4cCI6MjA3NzQ5Njc1MX0.RI0zVuVpwVi0v0sNSTUbtIvvVSU5J54WHuuCXww5KxE
```

**For Netlify/Bolt.host:**
- Go to Site Settings > Environment Variables
- Add both variables
- Trigger a new deployment after adding them

### 2. Verify Build Settings

Ensure your hosting platform is configured with:

- **Build Command:** `npm run build`
- **Publish Directory:** `dist`
- **Node Version:** 18.x or higher

### 3. Check Browser Console

Open your browser's developer tools (F12) and check the Console tab for errors:

- **If you see "Missing Supabase environment variables"**: Environment variables are not set on the hosting platform
- **If you see CSP errors**: The Content Security Policy might be blocking resources
- **If you see 404 errors**: SPA routing might not be configured correctly

### 4. Verify Deployment Status

- Check that the deployment completed successfully
- Verify all files were uploaded (especially `_redirects` file)
- Look for any failed build steps in deployment logs

### 5. Test with Simple HTML

If nothing works, create a simple test page to verify hosting works:

Create a file called `test.html` in the `public` folder:
```html
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><h1>It works!</h1></body>
</html>
```

Build and deploy. If this works but the app doesn't, the issue is with the app configuration.

## Recent Fixes Applied

1. ✅ Added `_redirects` file for SPA routing support
2. ✅ Added error boundary to catch and display configuration errors gracefully
3. ✅ Modified Supabase client to not throw errors immediately if env vars are missing
4. ✅ Relaxed CSP headers to allow worker-src and bolt.host connections
5. ✅ Verified build completes successfully

## What to Check on Hosting Platform

1. **Environment Variables Tab**
   - Verify both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
   - Check for any typos in variable names
   - Ensure there are no extra spaces in the values

2. **Deploy Logs**
   - Check for any build errors or warnings
   - Verify npm install completed successfully
   - Confirm vite build finished without errors

3. **Site Settings**
   - Verify base directory is set correctly (should be root `/` or empty)
   - Check that redirects are enabled
   - Confirm HTTPS is enabled

4. **Functions/Edge Functions**
   - Verify Supabase edge functions are deployed
   - Check function logs for any errors

## Expected Behavior

When properly configured, the site should:
1. Load the landing page at the root URL
2. Show a configuration error screen if environment variables are missing
3. Allow navigation between pages without 404 errors
4. Connect to Supabase for authentication and data

## Need More Help?

If the site still doesn't work after checking all of the above:

1. Clear your browser cache and try again
2. Try accessing the site in an incognito/private window
3. Check the hosting platform's status page for any outages
4. Review the full deployment logs for detailed error messages
