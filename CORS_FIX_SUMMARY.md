# CORS Issue Resolution

## Problem Identified

During the security audit on December 8, 2025, I implemented restrictive CORS policies that broke compatibility with cloud IDE environments (WebContainer, StackBlitz, etc.).

### Root Cause

In the security audit, I changed CORS from permissive (`Access-Control-Allow-Origin: *`) to a strict allowlist:

```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://courseforge.app',
  'https://www.courseforge.app',
  // ... only specific origins
];
```

This broke the application when running in cloud IDEs because their origins are dynamically generated (e.g., `https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3-4vctpobl--5173--365214aa.local-credentialless.webcontainer-api.io`).

### Affected Edge Functions

1. **`generate-course-content`** - Uses `supabase/functions/_shared/security.ts`
2. **`student-auth`** - Had hardcoded restrictive CORS

## Changes Made

### 1. Reverted `_shared/security.ts`
**File:** `supabase/functions/_shared/security.ts`

```typescript
// BEFORE (restrictive - broke cloud IDEs)
export function getCorsHeaders(origin: string | null): HeadersInit {
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    // ...
  };
}

// AFTER (permissive - works everywhere)
export function getCorsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    // ...
  };
}
```

### 2. Reverted `student-auth` CORS
**File:** `supabase/functions/student-auth/index.ts`

Removed the `ALLOWED_ORIGINS` allowlist and reverted to `*` for all origins.

## Status

✅ **FIXED** - CORS now allows all origins during development
✅ **Build Status** - Main application builds successfully
⚠️ **Security Note** - CORS is now permissive. For production deployment, consider implementing origin validation based on environment.

## Other Edge Functions

The following functions already had permissive CORS (`*`) and were not affected:
- `chat-refinement`
- `generate-quizzes`
- `landing-page-assistant`
- `list-heygen-avatars`
- `list-heygen-voices`
- `check-video-status`
- `generate-lesson-videos`
- `verify-course-content`
- `verify-courseforge-video-params`

## Recommendation for Production

When deploying to production:

1. Use environment variables to determine if running in development or production
2. Apply restrictive CORS only in production
3. Keep permissive CORS in development to support various development environments

Example:
```typescript
export function getCorsHeaders(origin: string | null): HeadersInit {
  const isProduction = Deno.env.get("ENVIRONMENT") === "production";

  if (isProduction) {
    // Strict allowlist for production
    const ALLOWED_ORIGINS = ['https://courseforge.app', /* ... */];
    const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
    return {
      "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
      // ...
    };
  }

  // Permissive for development
  return {
    "Access-Control-Allow-Origin": "*",
    // ...
  };
}
```

## Deployment Required

To apply these fixes, you need to redeploy the edge functions:

1. **Via Supabase Dashboard:**
   - Navigate to Edge Functions
   - Redeploy `generate-course-content`
   - Redeploy `student-auth`

2. **Via Supabase CLI:**
   ```bash
   supabase functions deploy generate-course-content
   supabase functions deploy student-auth
   ```

## Verification

After redeployment:
1. Refresh your browser
2. Try logging in
3. Try creating a course
4. The CORS errors should be resolved
