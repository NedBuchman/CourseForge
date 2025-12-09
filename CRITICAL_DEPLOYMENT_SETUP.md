# CRITICAL: Environment Variables Setup for Deployment

## ⚠️ IMPORTANT: Read This Before Publishing

Your app will show a "Configuration Error" and **WILL NOT START** if you don't complete these steps.

---

## Why You See the Configuration Error

The `.env` file contains your Supabase credentials but is **excluded from git** (in `.gitignore`) for security. This means:

1. ✅ Your local development works (has `.env` file)
2. ❌ Your deployed app fails (no `.env` file in repository)
3. ⚠️ Hosting platforms need environment variables set in their dashboard

---

## REQUIRED: Set Environment Variables in Hosting Platform

### For Netlify Deployment

**BEFORE you deploy, complete these steps:**

1. **Go to your Netlify site dashboard**
2. Navigate to: **Site settings** → **Build & deploy** → **Environment variables**
3. Click **"Add a variable"** and add these TWO variables:

```
Variable name: VITE_SUPABASE_URL
Value: https://ghlgqldbnanecodnkmkz.supabase.co

Variable name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobGdxbGRibmFuZWNvZG5rbWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MjA3NTEsImV4cCI6MjA3NzQ5Njc1MX0.RI0zVuVpwVi0v0sNSTUbtIvvVSU5J54WHuuCXww5KxE
```

4. Click **"Save"**
5. **Trigger a new deploy** (Netlify won't rebuild automatically after adding env vars)

---

### For Vercel Deployment

**BEFORE you deploy, complete these steps:**

1. **Go to your Vercel project dashboard**
2. Navigate to: **Settings** → **Environment Variables**
3. Add these TWO variables (one at a time):

```
Name: VITE_SUPABASE_URL
Value: https://ghlgqldbnanecodnkmkz.supabase.co

Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobGdxbGRibmFuZWNvZG5rbWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MjA3NTEsImV4cCI6MjA3NzQ5Njc1MX0.RI0zVuVpwVi0v0sNSTUbtIvvVSU5J54WHuuCXww5KxE
```

4. Select **"Production"** environment
5. Click **"Save"**
6. **Redeploy your project** from the Deployments tab

---

### For Other Hosting Platforms

**General steps for any hosting platform:**

1. Find the **Environment Variables** or **Build Environment** settings
2. Add these two variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Use the values from your `.env` file or from above
4. **Save and trigger a new build**

---

## How Vite Environment Variables Work

### Build Time (Important!)

Vite replaces `import.meta.env.VITE_*` with actual values **during the build process**:

```javascript
// Your code:
const url = import.meta.env.VITE_SUPABASE_URL;

// After build (if VITE_SUPABASE_URL is set):
const url = "https://ghlgqldbnanecodnkmkz.supabase.co";

// After build (if VITE_SUPABASE_URL is NOT set):
const url = undefined; // ❌ This causes the error!
```

### Why This Matters

- ❌ **Setting env vars AFTER build doesn't work** - values are already baked in
- ✅ **Setting env vars BEFORE build works** - values get baked into the JavaScript
- ⚠️ **Changing env vars requires a rebuild** - not just a restart

---

## Quick Deployment Checklist

Use this checklist when deploying any of the three apps:

### Main Course Creator App

- [ ] Set `VITE_SUPABASE_URL` in hosting dashboard
- [ ] Set `VITE_SUPABASE_ANON_KEY` in hosting dashboard
- [ ] Save environment variables
- [ ] Trigger new deployment
- [ ] Verify app loads without configuration error
- [ ] Test user registration
- [ ] Test course creation

### Student Portal (`student/` directory)

- [ ] Set `VITE_SUPABASE_URL` in hosting dashboard
- [ ] Set `VITE_SUPABASE_ANON_KEY` in hosting dashboard
- [ ] Set build directory to `student`
- [ ] Set publish directory to `student/dist`
- [ ] Save environment variables
- [ ] Trigger new deployment
- [ ] Verify app loads without error

### Manager Dashboard (`manager/` directory)

- [ ] Set `VITE_SUPABASE_URL` in hosting dashboard
- [ ] Set `VITE_SUPABASE_ANON_KEY` in hosting dashboard
- [ ] Set build directory to `manager`
- [ ] Set publish directory to `manager/dist`
- [ ] Save environment variables
- [ ] Trigger new deployment
- [ ] Verify app loads without error

---

## Verifying Environment Variables Are Set

### Method 1: Check Build Logs

Look for these lines in your build logs:

```
✓ built in 8.95s
```

If the build succeeds but the app shows a configuration error, the env vars weren't available during build.

### Method 2: Test Deployment

1. After deployment, open your app URL
2. **Expected Success:** App shows login/landing page
3. **Expected Failure:** App shows "Configuration Error" (means env vars missing)

### Method 3: Browser Console

1. Open deployed app
2. Open browser DevTools (F12)
3. Look for: `Supabase Configuration: { hasUrl: true, hasKey: true }`
4. If you see `hasUrl: false` or `hasKey: false`, env vars weren't set during build

---

## Common Mistakes

### ❌ Mistake 1: Deploying Without Setting Env Vars
**Problem:** You deploy first, then add env vars
**Solution:** Add env vars FIRST, then deploy

### ❌ Mistake 2: Setting Env Vars in Wrong Place
**Problem:** Setting env vars in project settings instead of build environment
**Solution:** Look for "Build Environment Variables" or "Environment Variables" section

### ❌ Mistake 3: Not Redeploying After Adding Env Vars
**Problem:** Adding env vars but not triggering a new build
**Solution:** After adding env vars, click "Trigger deploy" or "Redeploy"

### ❌ Mistake 4: Using Different Values Than Local
**Problem:** Using placeholder values like "your_supabase_url_here"
**Solution:** Use the EXACT same values from your `.env` file

### ❌ Mistake 5: Typos in Variable Names
**Problem:** Using `VITE_SUPABASE_API_KEY` instead of `VITE_SUPABASE_ANON_KEY`
**Solution:** Copy variable names exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

---

## Still Seeing Configuration Error?

### Step 1: Verify Variables Are Set

**Netlify:**
1. Go to Site settings → Environment variables
2. Confirm both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are listed
3. Click "Edit" to verify the values are correct (not placeholders)

**Vercel:**
1. Go to Settings → Environment Variables
2. Confirm both variables are listed with "Production" checkmark
3. Verify values are correct

### Step 2: Trigger a Fresh Build

**Netlify:**
1. Go to Deploys tab
2. Click "Trigger deploy" → "Clear cache and deploy site"

**Vercel:**
1. Go to Deployments tab
2. Click the ⋯ menu on latest deployment
3. Click "Redeploy"

### Step 3: Check Build Logs

1. Open the latest deployment
2. Look at build logs
3. Search for errors mentioning "env" or "environment"
4. Verify build completed successfully

### Step 4: Test the Deployed App

1. Open your deployed URL
2. Check browser console (F12)
3. Look for: `Supabase Configuration: { hasUrl: true, hasKey: true }`
4. If still showing configuration error, repeat steps 1-3

---

## Security Note

The `VITE_SUPABASE_ANON_KEY` is **safe to include in frontend code** because:

1. ✅ It's protected by Row Level Security (RLS) policies
2. ✅ It can only perform operations allowed by RLS
3. ✅ It's designed to be publicly accessible
4. ❌ **NEVER use `service_role` key in frontend**

The `service_role` key is only used in:
- Edge functions (secure backend)
- Server-side operations
- Admin tasks

---

## Need Help?

### Quick Debug Commands

**Test environment variables locally:**
```bash
# This should show your Supabase URL
echo $VITE_SUPABASE_URL

# Build locally to test
npm run build
```

**Check if env vars are in the build:**
```bash
# After building, search the dist folder
grep -r "ghlgqldbnanecodnkmkz" dist/

# If this returns results, env vars are in the build ✅
# If this returns nothing, env vars weren't available during build ❌
```

### Contact Points

- **Netlify Support:** https://docs.netlify.com/environment-variables/get-started/
- **Vercel Support:** https://vercel.com/docs/projects/environment-variables
- **Supabase Docs:** https://supabase.com/docs

---

## Summary

**To deploy successfully:**

1. ✅ Add environment variables to hosting platform FIRST
2. ✅ Use exact values from your `.env` file
3. ✅ Trigger a new deployment AFTER adding variables
4. ✅ Verify app loads without configuration error
5. ❌ DO NOT commit `.env` file to git
6. ❌ DO NOT use placeholder values

**Remember:** Environment variables must be set in the hosting platform's dashboard, not in your code or `.env` file, because `.env` is excluded from git for security.

---

**Last Updated:** December 9, 2025
**Status:** Critical for deployment success
