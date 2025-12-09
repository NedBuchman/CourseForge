# Bolt.host Deployment Guide for CourseForge

This guide is specifically for deploying CourseForge to bolt.host.

---

## What's Been Configured

All environment variables have been pre-configured for bolt.host deployment:

- `bolt.toml` - Main course creator app configuration
- `student/bolt.toml` - Student portal configuration
- `manager/bolt.toml` - Manager dashboard configuration
- `.bolt/config.json` files for all three apps

**Your Supabase credentials are already set in these files**, so the apps will work immediately on bolt.host without additional configuration.

---

## Deploying All Three Apps

### 1. Main Course Creator App

**Configuration:** `bolt.toml` (root directory)

The main app is ready to deploy with:
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: Pre-configured
- Security headers: Enabled
- SPA routing: Configured

**To deploy:**
1. Push your code to bolt.host
2. The app will automatically use the `bolt.toml` configuration
3. Build will run with pre-configured environment variables
4. App will be available at your bolt.host URL

---

### 2. Student Portal

**Configuration:** `student/bolt.toml`

The student portal is ready to deploy with:
- Build directory: `student/`
- Build command: `npm run build`
- Output directory: `student/dist`
- Environment variables: Pre-configured

**To deploy:**
1. Configure bolt.host to use the `student/` directory as base
2. Point to `student/bolt.toml` for configuration
3. The app will build and deploy automatically

---

### 3. Manager Dashboard

**Configuration:** `manager/bolt.toml`

The manager dashboard is ready to deploy with:
- Build directory: `manager/`
- Build command: `npm run build`
- Output directory: `manager/dist`
- Environment variables: Pre-configured

**To deploy:**
1. Configure bolt.host to use the `manager/` directory as base
2. Point to `manager/bolt.toml` for configuration
3. The app will build and deploy automatically

---

## Pre-Configured Environment Variables

All three apps are configured with:

```toml
[env]
  VITE_SUPABASE_URL = "https://ghlgqldbnanecodnkmkz.supabase.co"
  VITE_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

These variables are:
- ✅ Baked into the configuration files
- ✅ Applied during build time
- ✅ Safe for frontend use (protected by RLS)
- ✅ The same across all three apps

---

## Security Features Enabled

All three apps include:

### Security Headers
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` - Enables XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer info
- `Content-Security-Policy` - Comprehensive CSP
- `Strict-Transport-Security` - Forces HTTPS

### Content Security Policy
- Scripts: Self + inline + eval (required for React)
- Styles: Self + inline
- Images: Self + data URLs + HTTPS + blob
- Connections: Self + Supabase + bolt.host
- Fonts: Self + data URLs
- Frame ancestors: None (prevents embedding)

### Caching
- JavaScript files: 1 year immutable
- CSS files: 1 year immutable
- Font files: 1 year immutable

### HTTPS Enforcement
- Automatic redirect from HTTP to HTTPS
- HSTS enabled with 2-year max-age

---

## Verification Steps

After deployment, verify each app:

### Main Course Creator App
1. Open your bolt.host URL
2. ✅ Should show landing page (not configuration error)
3. ✅ Browser console shows: `Supabase Configuration: { hasUrl: true, hasKey: true }`
4. ✅ Can register new user
5. ✅ Can log in
6. ✅ Can create course

### Student Portal
1. Open student portal URL
2. ✅ Should show student landing page
3. ✅ No configuration errors
4. ✅ Can register as student
5. ✅ Can view course catalog

### Manager Dashboard
1. Open manager dashboard URL
2. ✅ Should show login page
3. ✅ No configuration errors
4. ✅ Manager can log in
5. ✅ Can view analytics

---

## Troubleshooting

### Issue: Configuration Error on Deployed App

**Symptoms:**
- App shows "Configuration Error: CourseForge cannot start"
- Lists missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY`

**Causes:**
1. `bolt.toml` file not being read by bolt.host
2. Environment variables not applied during build
3. Wrong configuration file being used

**Solutions:**
1. Verify `bolt.toml` exists in the deployed directory
2. Check bolt.host build logs for environment variable messages
3. Ensure bolt.host is configured to use the TOML file
4. Try clearing build cache and redeploying

---

### Issue: 404 on Page Refresh

**Symptoms:**
- Direct URLs like `/login` return 404
- Refreshing page causes 404 error

**Cause:**
SPA routing not configured properly

**Solution:**
Verify the redirect rule in `bolt.toml`:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

This rule should be present in all three `bolt.toml` files.

---

### Issue: Security Headers Not Applied

**Symptoms:**
- Browser shows missing security headers
- CSP errors in console

**Cause:**
bolt.host not applying header configuration

**Solution:**
1. Check if bolt.host supports TOML header configuration
2. Verify `[[headers]]` sections in `bolt.toml`
3. May need to configure headers in bolt.host dashboard separately

---

### Issue: Environment Variables Not Available

**Symptoms:**
- Build succeeds but app shows configuration error
- Console shows `hasUrl: false` or `hasKey: false`

**Cause:**
Environment variables not being injected during build

**Solutions:**

**Option 1: TOML Configuration (Preferred)**
Verify `[env]` section exists in `bolt.toml` with correct values.

**Option 2: .bolt/config.json**
The `.bolt/config.json` files are also configured as a fallback.

**Option 3: bolt.host Dashboard**
If TOML env vars don't work, manually set them in bolt.host dashboard:
- Go to project settings
- Find environment variables section
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Redeploy

---

## Build Verification

Before deploying, verify local builds work:

### Main App
```bash
npm run build
# Should complete without errors
# Check dist/ folder exists
```

### Student Portal
```bash
cd student
npm run build
# Should complete without errors
# Check dist/ folder exists
```

### Manager Dashboard
```bash
cd manager
npm run build
# Should complete without errors
# Check dist/ folder exists
```

---

## Deployment Checklist

- [ ] All three `bolt.toml` files exist and contain correct env vars
- [ ] All three `.bolt/config.json` files exist
- [ ] Local builds complete successfully
- [ ] Code committed and pushed to repository
- [ ] bolt.host connected to repository
- [ ] Main app deployed and verified
- [ ] Student portal deployed and verified
- [ ] Manager dashboard deployed and verified
- [ ] All apps show no configuration errors
- [ ] User registration/login works
- [ ] Course creation works
- [ ] Database connections work

---

## Configuration Files Summary

### Main App
- `/bolt.toml` - Primary configuration
- `/.bolt/config.json` - Alternative configuration
- Build: `npm run build` → `dist/`

### Student Portal
- `/student/bolt.toml` - Primary configuration
- `/student/.bolt/config.json` - Alternative configuration
- Build: `cd student && npm run build` → `student/dist/`

### Manager Dashboard
- `/manager/bolt.toml` - Primary configuration
- `/manager/.bolt/config.json` - Alternative configuration
- Build: `cd manager && npm run build` → `manager/dist/`

---

## Important Notes

### About the Anon Key
The `VITE_SUPABASE_ANON_KEY` is included in configuration files because:
- ✅ It's designed to be publicly accessible
- ✅ It's protected by Row Level Security (RLS) policies
- ✅ It can only perform operations allowed by RLS
- ✅ It's safe to include in frontend code and configuration files

### Never Use Service Role Key
- ❌ **NEVER** put `service_role` key in frontend code or config files
- ❌ **NEVER** put `service_role` key in `bolt.toml` or `.bolt/config.json`
- ✅ Service role key is only for backend/edge functions

### Configuration File Priority
If bolt.host supports multiple configuration formats:
1. `bolt.toml` (primary)
2. `.bolt/config.json` (fallback)
3. bolt.host dashboard settings (manual fallback)

---

## Support

If you encounter issues not covered here:

1. **Check bolt.host documentation** for TOML support
2. **Check build logs** in bolt.host dashboard
3. **Verify environment variables** are being injected
4. **Test local build** with same commands
5. **Check browser console** for specific errors

---

## Quick Reference

### Environment Variables (All Apps)
```
VITE_SUPABASE_URL=https://ghlgqldbnanecodnkmkz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobGdxbGRibmFuZWNvZG5rbWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MjA3NTEsImV4cCI6MjA3NzQ5Njc1MX0.RI0zVuVpwVi0v0sNSTUbtIvvVSU5J54WHuuCXww5KxE
```

### Build Commands
```bash
# Main app
npm run build

# Student portal
cd student && npm run build

# Manager dashboard
cd manager && npm run build
```

### Output Directories
- Main app: `dist/`
- Student portal: `student/dist/`
- Manager dashboard: `manager/dist/`

---

**Status:** Ready for bolt.host deployment
**Last Updated:** December 9, 2025
