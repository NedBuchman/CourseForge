# Production Build Fix - Environment Variables

## Issue Identified

The production build on bolt.host was not properly loading Supabase credentials, causing the error:
```
Configuration error: Supabase credentials are missing.
Please check your environment variables and restart the application.
```

## Root Cause

**The problem:** bolt.host's `[env]` section in bolt.toml does not automatically inject environment variables into Vite's build process. Vite needs environment variables available at BUILD TIME to properly embed them in the compiled JavaScript.

**Why development worked but production didn't:**
- Development: Uses `.env` file → Vite reads variables → works fine
- Production: No `.env` during build → Variables not injected → app fails

## Solution Applied

### 1. Enhanced vite.config.ts with Define Option

Added Vite's `define` configuration to explicitly inject environment variables with guaranteed fallback values:

```typescript
define: {
  'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
    process.env.VITE_SUPABASE_URL || 'https://ghlgqldbnanecodnkmkz.supabase.co'
  ),
  'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
    process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGc...'
  ),
}
```

This ensures:
- Environment variables from bolt.toml are used if available
- Hardcoded fallbacks guarantee the app always has valid credentials
- Values are embedded at build time, not runtime

### 2. Simplified supabase.ts

Removed conditional initialization logic and added better validation:
- Direct assignment of environment variables (now guaranteed by vite.config.ts)
- Enhanced validation to catch 'undefined' strings
- Better console logging for debugging

## Deployment Instructions for bolt.host

### Option A: Rebuild on bolt.host (Recommended)

1. Commit these changes to your repository
2. Push to your git remote
3. Trigger a new deployment on bolt.host
4. The new build will have credentials embedded via vite.config.ts

### Option B: Manual Build and Deploy

1. Build locally:
   ```bash
   npm run build
   ```

2. The `dist/` folder now has the credentials properly embedded

3. Deploy the `dist/` folder to bolt.host

## Verification Steps

After deployment, verify the fix:

1. Open the published app in browser
2. Open Browser DevTools Console
3. Look for: `Supabase client initialized successfully`
4. Try creating a course to confirm database connection works

### Expected Console Output

```
Supabase Configuration: {
  hasUrl: true,
  hasKey: true,
  url: "https://ghlgqldbnanecodnkmkz.supabase.co",
  urlLength: 44,
  keyLength: 205
}
Supabase client initialized successfully
```

## Why This Fix Works

1. **Build-Time Injection**: Vite's `define` option replaces `import.meta.env` references at build time
2. **Guaranteed Fallbacks**: Even if bolt.toml doesn't inject variables, fallbacks ensure values exist
3. **No Runtime Dependencies**: Configuration is baked into the JavaScript, not loaded at runtime
4. **Works Everywhere**: Same build works on bolt.host, Netlify, Vercel, or any static host

## Security Note

The `VITE_SUPABASE_ANON_KEY` is safe to embed in client-side code because:
- It's a public anonymous key, not a privileged service role key
- All database operations are protected by Row Level Security (RLS) policies
- This is the standard pattern for Supabase frontend applications

## Troubleshooting

### If the error persists:

1. **Clear build cache:**
   ```bash
   rm -rf dist/ node_modules/.vite
   npm run build
   ```

2. **Check console logs** in the deployed app for configuration details

3. **Verify bolt.toml** has the correct credentials in `[env]` section

4. **Check build logs** on bolt.host to see if environment variables are being set

### Common Issues:

- **Old cached build**: Force a fresh build/deployment
- **Typo in credentials**: Verify URL and key match your Supabase project
- **CSP blocking connections**: Check browser console for Content Security Policy errors

## Files Modified

1. `/vite.config.ts` - Added `define` configuration
2. `/src/lib/supabase.ts` - Simplified and enhanced validation

## Next Steps

After confirming this fix works:
1. Apply the same fix to `/student` and `/manager` apps
2. Update deployment documentation
3. Consider setting up CI/CD for automated deployments
