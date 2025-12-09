# CourseForge Deployment - Quick Checklist

Print this and check off each step as you deploy.

---

## Main Course Creator App

### Step 1: Set Environment Variables in Hosting Platform
- [ ] Navigate to environment variables section in hosting dashboard
- [ ] Add `VITE_SUPABASE_URL` with value: `https://ghlgqldbnanecodnkmkz.supabase.co`
- [ ] Add `VITE_SUPABASE_ANON_KEY` with value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobGdxbGRibmFuZWNvZG5rbWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MjA3NTEsImV4cCI6MjA3NzQ5Njc1MX0.RI0zVuVpwVi0v0sNSTUbtIvvVSU5J54WHuuCXww5KxE`
- [ ] Click Save

### Step 2: Configure Build Settings
- [ ] Build command: `npm run build`
- [ ] Publish directory: `dist`
- [ ] Node version: 18.x or higher

### Step 3: Deploy
- [ ] Trigger deployment
- [ ] Wait for build to complete
- [ ] Check build logs for errors

### Step 4: Verify Deployment
- [ ] Open deployed URL
- [ ] Confirm NO "Configuration Error" appears
- [ ] Test user registration
- [ ] Test login
- [ ] Test course creation

---

## Student Portal

### Step 1: Set Environment Variables
- [ ] Navigate to environment variables section
- [ ] Add `VITE_SUPABASE_URL` (same value as above)
- [ ] Add `VITE_SUPABASE_ANON_KEY` (same value as above)
- [ ] Click Save

### Step 2: Configure Build Settings
- [ ] Build command: `cd student && npm run build`
- [ ] Publish directory: `student/dist`
- [ ] Base directory: `student` (if required by platform)
- [ ] Node version: 18.x or higher

### Step 3: Deploy
- [ ] Trigger deployment
- [ ] Wait for build to complete
- [ ] Check build logs for errors

### Step 4: Verify Deployment
- [ ] Open deployed URL
- [ ] Confirm NO "Configuration Error" appears
- [ ] Test student registration
- [ ] Test student login
- [ ] Test course enrollment

---

## Manager Dashboard

### Step 1: Set Environment Variables
- [ ] Navigate to environment variables section
- [ ] Add `VITE_SUPABASE_URL` (same value as above)
- [ ] Add `VITE_SUPABASE_ANON_KEY` (same value as above)
- [ ] Click Save

### Step 2: Configure Build Settings
- [ ] Build command: `cd manager && npm run build`
- [ ] Publish directory: `manager/dist`
- [ ] Base directory: `manager` (if required by platform)
- [ ] Node version: 18.x or higher

### Step 3: Deploy
- [ ] Trigger deployment
- [ ] Wait for build to complete
- [ ] Check build logs for errors

### Step 4: Verify Deployment
- [ ] Open deployed URL
- [ ] Confirm NO "Configuration Error" appears
- [ ] Test manager login
- [ ] Test analytics dashboard
- [ ] Test user management

---

## Supabase Edge Functions

### Step 1: Set API Keys (One-time Setup)
- [ ] Go to Supabase Dashboard → Project Settings → Edge Functions
- [ ] Add secret: `ANTHROPIC_API_KEY` = your Claude API key
- [ ] Add secret: `HEYGEN_API_KEY` = your HeyGen API key
- [ ] Click Save

### Step 2: Verify Functions Are Deployed
- [ ] Go to Edge Functions section in Supabase dashboard
- [ ] Confirm 19 functions are listed
- [ ] Check deployment status (should be green/active)

---

## Post-Deployment Testing

### All Apps Working?
- [ ] Main app loads without configuration error
- [ ] Student portal loads without configuration error
- [ ] Manager dashboard loads without configuration error

### Authentication Working?
- [ ] User can register in main app
- [ ] User can log in to main app
- [ ] Student can register in student portal
- [ ] Student can log in to student portal
- [ ] Manager can log in to manager dashboard

### Core Features Working?
- [ ] Create a test course
- [ ] Generate course content with AI
- [ ] Review lesson content
- [ ] Generate quizzes
- [ ] Publish course
- [ ] Student can enroll in course
- [ ] Student can view lessons
- [ ] Student can take quizzes
- [ ] Manager can view analytics

---

## Troubleshooting

### If you see "Configuration Error":
1. ⚠️ **Environment variables not set in hosting platform**
   - Go back to Step 1 for the affected app
   - Set both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Trigger new deployment

2. ⚠️ **Environment variables set AFTER build**
   - Trigger a new deployment (rebuilding with env vars present)

3. ⚠️ **Wrong environment variable names**
   - Check spelling: must be exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### If build fails:
1. Check build logs for specific error
2. Verify Node version is 18.x or higher
3. Verify build command and publish directory are correct
4. Check that npm dependencies install successfully

### If app loads but features don't work:
1. Open browser console (F12)
2. Look for network errors
3. Verify Supabase connection in console logs
4. Check if edge functions are deployed in Supabase dashboard
5. Verify API keys are set in Supabase edge function secrets

---

## Success Criteria

✅ All 3 apps deployed and accessible via URL
✅ No configuration errors on any app
✅ User registration and login working
✅ Course creation working
✅ AI content generation working (if API keys configured)
✅ Student enrollment and course viewing working
✅ Manager analytics working
✅ Database queries executing successfully

---

## Next Steps After Successful Deployment

1. Share course creator URL with instructors
2. Share student portal URL with students
3. Restrict manager dashboard URL (admin only)
4. Monitor Supabase dashboard for errors
5. Check edge function logs regularly
6. Set up monitoring/alerting (optional)

---

**Need Help?** See [CRITICAL_DEPLOYMENT_SETUP.md](./CRITICAL_DEPLOYMENT_SETUP.md) for detailed instructions.
