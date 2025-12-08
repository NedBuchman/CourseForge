# Security Documentation for CourseForge Platform

This document outlines the security measures implemented across all three CourseForge applications (Course Creator, Manager Portal, and Student Portal).

## Security Features Implemented

### 1. Security Headers

All three applications now include the following security headers:

#### HTTP Security Headers
- **X-Frame-Options: DENY** - Prevents clickjacking attacks by disallowing the app from being embedded in iframes
- **X-Content-Type-Options: nosniff** - Prevents MIME type sniffing attacks
- **X-XSS-Protection: 1; mode=block** - Enables browser XSS protection
- **Referrer-Policy: strict-origin-when-cross-origin** - Controls referrer information sent with requests
- **Permissions-Policy** - Restricts access to browser features (geolocation, microphone, camera)

#### Content Security Policy (CSP)
Implemented via netlify.toml configuration:
- Restricts script sources to same origin and inline scripts (required for Vite)
- Limits style sources to same origin and inline styles
- Allows images from any HTTPS source and data URIs
- Restricts API connections to self and Supabase domains
- Prevents framing by other sites
- Enforces form submissions to same origin

#### HTTPS Enforcement
- **HTTP Strict Transport Security (HSTS)** with 2-year max-age
- Automatic HTTP to HTTPS redirects
- Preload ready for browser HSTS lists

### 2. Build Configuration Security

#### Production Builds
- Source maps disabled in production to prevent code inspection
- Code splitting with vendor chunks for better security isolation
- Optimized bundle sizes with tree-shaking

#### Asset Optimization
- Long-term caching for static assets (1 year)
- Immutable cache headers for versioned assets
- Automatic cache busting through content hashing

### 3. Environment Variables

#### .env.example Files
Created template files for all three apps documenting required variables:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

#### Security Notes
- Never commit .env files (protected by .gitignore)
- Only use ANON keys in frontend (never service_role keys)
- Anon keys are safe to expose as they're protected by RLS policies

### 4. Dependency Security

#### Updated Dependencies
- @supabase/supabase-js: Updated to ^2.87.0 (latest stable)
- lucide-react: Updated to ^0.556.0
- All npm audit vulnerabilities resolved (0 vulnerabilities)

#### Ongoing Maintenance
Run these commands regularly to maintain security:
```bash
npm audit
npm audit fix
npm outdated
```

### 5. Database Security

#### Row Level Security (RLS)
All database tables have RLS enabled with appropriate policies:
- User authentication via Supabase Auth
- Role-based access control for managers
- Student-specific authentication through edge functions
- Data isolation between different user types

#### Secure Authentication
- Email/password authentication through Supabase
- Custom student authentication via edge functions
- Session management with token expiration
- Secure password hashing by Supabase

### 6. Hosting Configuration

#### Netlify Deployment
Each app includes netlify.toml with:
- Security headers configuration
- HTTPS redirects
- Static asset caching
- CSP policies

#### Files Created
- `/netlify.toml` (Course Creator)
- `/manager/netlify.toml` (Manager Portal)
- `/student/netlify.toml` (Student Portal)

### 7. Version Control Security

#### .gitignore Configuration
All apps now properly exclude:
- .env files
- .env.local files
- .env.*.local files
- node_modules
- dist folders
- Log files

## Security Checklist for Deployment

Before deploying to production, verify:

- [ ] All environment variables are set in hosting platform
- [ ] .env files are NOT committed to repository
- [ ] Only ANON keys are used in frontend applications
- [ ] HTTPS is enforced (check netlify.toml)
- [ ] Security headers are active (test with security headers checker)
- [ ] npm audit shows 0 vulnerabilities
- [ ] All builds complete successfully
- [ ] RLS policies are tested and working
- [ ] User authentication flows are tested
- [ ] Session management works correctly
- [ ] CORS is properly configured for Supabase edge functions

## Testing Security

### Header Testing
Use these tools to verify security headers:
- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

### Vulnerability Scanning
Run these commands in each app directory:
```bash
npm audit
npm outdated
```

### Manual Testing
1. Verify HTTPS redirect works
2. Test that app cannot be iframed
3. Verify Supabase connections work with ANON key
4. Test authentication flows
5. Verify RLS policies block unauthorized access

## Security Best Practices

### For Developers
1. Never commit .env files or secrets
2. Only use environment variables for sensitive data
3. Keep dependencies updated regularly
4. Review and test all database queries for SQL injection
5. Validate all user input on both client and server
6. Use RLS policies for all database tables
7. Never expose service_role keys in frontend code

### For Deployment
1. Use HTTPS everywhere
2. Enable all security headers
3. Monitor npm audit reports
4. Keep Supabase and other services updated
5. Regularly review access logs
6. Implement rate limiting where appropriate
7. Use environment-specific configurations

## Incident Response

If a security issue is discovered:

1. Immediately rotate any exposed credentials
2. Update Supabase keys if compromised
3. Review access logs for unauthorized access
4. Update affected dependencies
5. Test fixes thoroughly before deploying
6. Document the issue and resolution

## Security Contact

For security concerns or to report vulnerabilities, please contact your security team immediately.

## Compliance

This platform implements security measures aligned with:
- OWASP Top 10 protection
- Modern web security standards
- Best practices for SaaS applications
- Supabase security recommendations

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [Content Security Policy Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [HTTP Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)

---

Last Updated: 2024
Version: 1.0.0
