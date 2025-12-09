CourseForge

## CRITICAL: Before Deploying

**READ THIS FIRST:** [CRITICAL_DEPLOYMENT_SETUP.md](./CRITICAL_DEPLOYMENT_SETUP.md)

Your app will show a "Configuration Error" and not start if you don't set environment variables in your hosting platform BEFORE deployment. The `.env` file is excluded from git for security.

Required environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

See the critical deployment guide for complete setup instructions.

---

## Video Generation Background Monitoring

CourseForge includes an automated background checker that monitors video generation progress even when users are logged off. This ensures course creators always see accurate, up-to-date video status.

### Key Features
- Automatic status updates for processing videos
- Detection of stuck/stale videos (> 30 minutes)
- Real-time course progress tracking
- Seamless integration with existing workflow

### Documentation
See [BACKGROUND_VIDEO_CHECKER.md](./BACKGROUND_VIDEO_CHECKER.md) for complete setup instructions and technical details.

### Quick Start
Manually trigger a status check:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/check-all-processing-videos \
  -H "Content-Type: application/json"
```

For automated scheduling, see the full documentation.
