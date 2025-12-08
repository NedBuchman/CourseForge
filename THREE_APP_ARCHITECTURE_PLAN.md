# CourseForge: 3-App Architecture Plan

**Last Updated:** December 8, 2024
**Status:** Planning Phase

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema Updates](#database-schema-updates)
3. [Authentication Strategy](#authentication-strategy)
4. [Course Access Control](#course-access-control)
5. [App-Specific Features](#app-specific-features)
6. [Shared Resources](#shared-resources)
7. [Implementation Plan](#implementation-plan)
8. [Future Payment Integration](#future-payment-integration)

---

## Architecture Overview

### The Three Apps

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SUPABASE DATABASE                            │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐   │
│  │   Courses    │  │   Students   │  │   User Management      │   │
│  │   Quizzes    │  │  Enrollments │  │   Analytics            │   │
│  │   Videos     │  │   Progress   │  │   Roles & Access       │   │
│  └──────────────┘  └──────────────┘  └────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
         ▲                    ▲                         ▲
         │                    │                         │
    ┌────┴────┐         ┌────┴────┐             ┌─────┴─────┐
    │ CREATOR │         │ STUDENT │             │  MANAGER  │
    │   APP   │         │   APP   │             │    APP    │
    └─────────┘         └─────────┘             └───────────┘
```

### **1. Creator App** (Current `/` folder)
**URL:** `creator.courseforge.com` or `courseforge.com/creator`
**Users:** Course instructors, content creators
**Tech Stack:** React + TypeScript + Vite + Tailwind + Supabase

**Core Features:**
- Course creation & content generation
- Video generation & management
- Quiz creation & management
- Presentation customization
- Landing page builder
- Course publishing
- Student analytics dashboard
- Course export/download

**Authentication:** Supabase Auth (auth.users)

---

### **2. Student App** (New `/student` folder)
**URL:** `learn.courseforge.com` or `courseforge.com/learn`
**Users:** Students, learners
**Tech Stack:** React + TypeScript + Vite + Tailwind + Supabase

**Core Features:**
- Course discovery & browsing
- Course enrollment
- Interactive video learning
- Text-based lessons
- Quiz taking
- Progress tracking
- Course completion certificates
- Personal dashboard
- **Future:** Real-time AI assistance, language switching, mode selection

**Authentication:** Custom student authentication (student_accounts)

---

### **3. Manager App** (Existing `/manager` folder)
**URL:** `admin.courseforge.com` or `courseforge.com/admin`
**Users:** Platform administrators, managers
**Tech Stack:** React + TypeScript + Vite + Tailwind + Supabase

**Core Features:**
- Platform-wide analytics
- User management (creators)
- Course creator insights
- System health monitoring
- Role assignment
- **Future:** Payment management, subscription oversight

**Authentication:** Supabase Auth with role-based access (admin/manager roles)

---

## Database Schema Updates

### Current State
✅ Already have:
- `student_accounts` table (separate from auth.users)
- `student_course_enrollments` table
- `student_lesson_views`, `student_lesson_completions`
- `student_quiz_attempts`, `student_quiz_answers`
- `user_roles` table (admin/manager/creator)

### New Tables Needed

#### **1. course_access_control**
Controls which students can access which courses (for paid/restricted courses)

```sql
CREATE TABLE course_access_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
  access_type text NOT NULL DEFAULT 'full', -- 'full', 'preview', 'trial'
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz, -- NULL = never expires
  granted_by uuid REFERENCES auth.users(id), -- Creator who granted access
  payment_id text, -- Future: link to payment record
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id)
);
```

**Access Types:**
- `full` - Complete access to all course content
- `preview` - Limited preview (first 2 lessons only)
- `trial` - Time-limited trial access

---

#### **2. course_visibility**
Controls course visibility and discovery settings

```sql
CREATE TABLE course_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
  visibility text NOT NULL DEFAULT 'private', -- 'public', 'unlisted', 'private'
  requires_enrollment boolean NOT NULL DEFAULT true,
  requires_payment boolean NOT NULL DEFAULT false,
  price_cents integer, -- Price in cents (USD), NULL if free
  preview_enabled boolean NOT NULL DEFAULT false,
  preview_lesson_count integer DEFAULT 2, -- How many lessons in preview
  featured boolean NOT NULL DEFAULT false, -- Show in featured section
  allow_discovery boolean NOT NULL DEFAULT true, -- Show in search/browse
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Visibility Options:**
- `public` - Anyone can discover and enroll
- `unlisted` - Only accessible via direct link
- `private` - Only accessible to students with explicit access grants

---

#### **3. student_sessions**
Track student login sessions for security

```sql
CREATE TABLE student_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now()
);
```

---

#### **4. course_invitations**
Allow creators to invite students via email

```sql
CREATE TABLE course_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  invitation_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
  invited_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_student_id uuid REFERENCES student_accounts(id)
);
```

---

### RLS Policies for New Tables

**course_access_control:**
```sql
-- Students can view their own access grants
CREATE POLICY "Students view own access"
  ON course_access_control FOR SELECT
  TO authenticated
  USING (
    student_id IN (SELECT id FROM student_accounts WHERE email = auth.jwt()->>'email')
  );

-- Course creators can view/manage access for their courses
CREATE POLICY "Creators manage course access"
  ON course_access_control FOR ALL
  TO authenticated
  USING (
    course_id IN (SELECT id FROM courses WHERE user_id = auth.uid())
  );
```

**course_visibility:**
```sql
-- Anyone can view visibility of discoverable courses
CREATE POLICY "Public view discoverable courses"
  ON course_visibility FOR SELECT
  TO authenticated, anon
  USING (visibility = 'public' AND allow_discovery = true);

-- Course creators manage their course visibility
CREATE POLICY "Creators manage visibility"
  ON course_visibility FOR ALL
  TO authenticated
  USING (
    course_id IN (SELECT id FROM courses WHERE user_id = auth.uid())
  );
```

---

## Authentication Strategy

### Authentication Comparison

| Feature | Creator App | Student App | Manager App |
|---------|-------------|-------------|-------------|
| Auth System | Supabase Auth | Custom (student_accounts) | Supabase Auth + Roles |
| Table | `auth.users` | `student_accounts` | `auth.users` + `user_roles` |
| Registration | Self-service | Self-service | Admin-created only |
| Email/Password | ✅ | ✅ | ✅ |
| OAuth (Google, etc.) | ✅ Future | ❌ (custom only) | ✅ Future |
| Password Reset | Supabase built-in | Custom edge function | Supabase built-in |
| Session Management | Supabase SDK | Custom tokens | Supabase SDK |

---

### Why Separate Student Authentication?

1. **Different user types** - Students and creators have completely different needs
2. **Data isolation** - Student data shouldn't mix with creator/admin data
3. **Different lifecycle** - Students enrolled in specific courses vs. creators managing platform
4. **Future flexibility** - Easier to implement student-specific features (achievements, badges, certifications)
5. **Security** - Separate authentication reduces attack surface

---

### Authentication Flows

#### **Creator App - Registration/Login**

```typescript
// Registration
const { data, error } = await supabase.auth.signUp({
  email,
  password,
});

// Automatic role assignment via trigger
// → user_roles table gets entry with role='creator'

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

#### **Student App - Registration/Login**

```typescript
// Registration (via edge function)
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/student-auth`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'register',
      email,
      password,
      first_name,
      last_name,
    }),
  }
);

// Returns: { student_id, session_token, expires_at }

// Login (via edge function)
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/student-auth`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'login',
      email,
      password,
    }),
  }
);
```

#### **Manager App - Login**

```typescript
// Login (same as creator)
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// Check role
const { data: role } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .single();

// Only allow if role === 'admin' or 'manager'
if (!['admin', 'manager'].includes(role.role)) {
  // Redirect to creator app or show error
}
```

---

## Course Access Control

### Access Control Logic

**When a student tries to access a course, check:**

1. **Course Visibility** - Is course public/unlisted/private?
2. **Access Grant** - Does student have explicit access? (course_access_control)
3. **Enrollment** - Is student enrolled? (student_course_enrollments)
4. **Payment Status** - If payment required, has student paid? (future)
5. **Preview Mode** - If no access, can student view preview?

### Access Control Query

```sql
-- Check if student can access course
CREATE FUNCTION can_access_course(
  p_student_id uuid,
  p_course_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_visibility course_visibility;
  v_access course_access_control;
  v_enrollment student_course_enrollments;
  result jsonb;
BEGIN
  -- Get visibility settings
  SELECT * INTO v_visibility
  FROM course_visibility
  WHERE course_id = p_course_id;

  -- Get access grant if exists
  SELECT * INTO v_access
  FROM course_access_control
  WHERE student_id = p_student_id
    AND course_id = p_course_id
    AND (expires_at IS NULL OR expires_at > now());

  -- Get enrollment if exists
  SELECT * INTO v_enrollment
  FROM student_course_enrollments
  WHERE student_id = p_student_id
    AND course_id = p_course_id;

  -- Determine access level
  IF v_access IS NOT NULL THEN
    -- Has explicit access grant
    result := jsonb_build_object(
      'can_access', true,
      'access_type', v_access.access_type,
      'reason', 'granted'
    );
  ELSIF v_visibility.visibility = 'public' AND NOT v_visibility.requires_payment THEN
    -- Public free course
    result := jsonb_build_object(
      'can_access', true,
      'access_type', 'full',
      'reason', 'public'
    );
  ELSIF v_visibility.preview_enabled THEN
    -- Preview available
    result := jsonb_build_object(
      'can_access', true,
      'access_type', 'preview',
      'reason', 'preview',
      'preview_lesson_count', v_visibility.preview_lesson_count
    );
  ELSE
    -- No access
    result := jsonb_build_object(
      'can_access', false,
      'reason', 'no_access'
    );
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## App-Specific Features

### Creator App Features

**Current (MVP):**
- ✅ Course creation wizard
- ✅ AI content generation
- ✅ Video generation (HeyGen)
- ✅ Quiz generation
- ✅ Presentation customization
- ✅ Landing page builder
- ✅ Course publishing
- ✅ Student analytics

**New Features Needed:**
- Student access management UI
- Course visibility settings
- Invitation system
- Preview configuration

---

### Student App Features

**Phase 1 (MVP):**
- Landing page (public)
- Student registration & login
- Course discovery/browsing
- Course enrollment
- Video lesson player
- Text lesson viewer
- Quiz taking interface
- Progress dashboard
- Course completion tracking

**Phase 2 (Enhanced):**
- Real-time AI tutor/assistant
- Language switching (i18n)
- Mode selection (text/video/audio)
- Note-taking functionality
- Bookmarks
- Course certificates
- Achievement badges

**Phase 3 (Advanced):**
- Adaptive learning (AI adjusts difficulty)
- Peer discussion forums
- Live Q&A sessions
- Mobile app (React Native)

---

### Manager App Features

**Current (Existing):**
- ✅ Platform analytics dashboard
- ✅ User management
- ✅ Course creator insights

**Future:**
- Payment/subscription management
- Platform configuration
- Content moderation
- Support ticket system

---

## Shared Resources

### 1. Supabase Database
- All 3 apps connect to same Supabase project
- RLS policies enforce data isolation
- Separate authentication systems (auth.users vs. student_accounts)

### 2. Edge Functions
- Shared edge functions accessible by all apps
- Authentication varies by function
- Examples:
  - `generate-course-content` - Creator app only
  - `student-auth` - Student app only
  - `generate-quizzes` - Creator app only

### 3. Storage Buckets
- `course-materials` - Creator uploads (private)
- `course-logos` - Public logos
- `course-videos` - Video assets (controlled access)
- `student-uploads` - Student assignments (future)

### 4. Environment Variables
All apps share same Supabase config:
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### 5. Shared TypeScript Types (Future)
Consider creating shared package:
```
/packages
  /shared-types
    - course.types.ts
    - student.types.ts
    - quiz.types.ts
```

---

## Implementation Plan

### Phase 1: Database Schema Updates (Week 1)

- [ ] Create `course_access_control` table
- [ ] Create `course_visibility` table
- [ ] Create `student_sessions` table
- [ ] Create `course_invitations` table
- [ ] Add RLS policies for all new tables
- [ ] Create `can_access_course()` function
- [ ] Test all policies and functions

### Phase 2: Student App Foundation (Week 2)

- [ ] Create `/student` folder with Vite + React + TypeScript
- [ ] Set up Tailwind CSS
- [ ] Configure Supabase client
- [ ] Create public landing page
- [ ] Build registration page
- [ ] Build login page
- [ ] Implement student session management
- [ ] Create protected route wrapper

### Phase 3: Student App - Course Discovery (Week 3)

- [ ] Build course browsing page
- [ ] Implement search functionality
- [ ] Create course card components
- [ ] Build course detail page
- [ ] Implement enrollment flow
- [ ] Add access control checks

### Phase 4: Student App - Learning Interface (Week 4)

- [ ] Create course player layout
- [ ] Build video lesson player
- [ ] Build text lesson viewer
- [ ] Implement lesson navigation
- [ ] Add progress tracking
- [ ] Build quiz interface
- [ ] Add quiz submission & scoring

### Phase 5: Student Dashboard (Week 5)

- [ ] Build student dashboard
- [ ] Show enrolled courses
- [ ] Display progress overview
- [ ] Add course completion status
- [ ] Show quiz scores
- [ ] Implement "Continue Learning" functionality

### Phase 6: Creator App Updates (Week 6)

- [ ] Add course visibility settings page
- [ ] Build student access management UI
- [ ] Create invitation system
- [ ] Add preview configuration
- [ ] Update analytics to show student data
- [ ] Test creator → student workflow

### Phase 7: Testing & Polish (Week 7)

- [ ] End-to-end testing all workflows
- [ ] Test RLS policies thoroughly
- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] Bug fixes
- [ ] Documentation

### Phase 8: Deployment (Week 8)

- [ ] Deploy Student app to production
- [ ] Configure domain/subdomain
- [ ] Set up CI/CD pipeline
- [ ] Monitor error logs
- [ ] User acceptance testing

---

## Future Payment Integration

### Payment Requirements (Future Phase)

**For Creators:**
- Subscription tiers (free, pro, enterprise)
- Pay per course creation
- Pay per video generation
- Revenue share from course sales

**For Students:**
- One-time course purchases
- Course bundles
- Subscription to creator's content
- Platform subscription (access all courses)

### Payment Tables (Future)

```sql
CREATE TABLE payment_plans (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL, -- 'creator_subscription', 'course_purchase', etc.
  price_cents integer NOT NULL,
  billing_period text, -- 'monthly', 'yearly', 'one_time'
  features jsonb NOT NULL DEFAULT '[]'
);

CREATE TABLE payments (
  id uuid PRIMARY KEY,
  payer_type text NOT NULL, -- 'creator', 'student'
  payer_id uuid NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL, -- 'pending', 'completed', 'failed', 'refunded'
  stripe_payment_id text,
  payment_method text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE course_purchases (
  id uuid PRIMARY KEY,
  student_id uuid REFERENCES student_accounts(id),
  course_id uuid REFERENCES courses(id),
  payment_id uuid REFERENCES payments(id),
  purchased_at timestamptz DEFAULT now()
);
```

### Payment Provider: Stripe

- Use Stripe Checkout for payments
- Stripe Customer Portal for subscriptions
- Webhooks for payment events
- Test mode during development

---

## Security Considerations

### 1. Authentication Security
- Student passwords hashed with bcrypt
- Session tokens expire after 7 days
- Refresh token rotation
- Rate limiting on login attempts

### 2. Data Isolation
- RLS policies prevent cross-user access
- Students cannot access creator data
- Creators cannot access student credentials
- Managers have read-only access to most data

### 3. Course Content Protection
- Video URLs signed with expiration
- Download prevention on videos
- Watermarking for premium content (future)
- Rate limiting on content access

### 4. API Security
- Edge functions validate authentication
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- CORS properly configured

---

## Performance Considerations

### 1. Database Optimization
- Indexes on frequently queried columns
- Materialized views for analytics
- Connection pooling
- Query optimization

### 2. Frontend Performance
- Code splitting per app
- Lazy loading components
- Image optimization
- CDN for static assets

### 3. Video Delivery
- HeyGen CDN for video hosting
- Adaptive bitrate streaming
- Video preloading
- Thumbnail generation

---

## Monitoring & Analytics

### Application Monitoring
- Error tracking (Sentry or similar)
- Performance monitoring
- User analytics (student behavior)
- Course completion funnels

### Business Metrics
- Creator retention
- Student engagement
- Course completion rates
- Revenue metrics (future)

---

## Next Steps

1. **Review this plan** - Get stakeholder approval
2. **Set up development environment** - Prepare for multi-app development
3. **Start with database migrations** - Foundation for everything else
4. **Build student app incrementally** - MVP first, then enhancements
5. **Test thoroughly** - Cannot compromise on security/access control
6. **Deploy gradually** - Beta test with select creators/students

---

## Questions to Resolve

1. **Domain structure** - Subdomains or path-based routing?
   - Option A: `creator.courseforge.com`, `learn.courseforge.com`, `admin.courseforge.com`
   - Option B: `courseforge.com/creator`, `courseforge.com/learn`, `courseforge.com/admin`

2. **Student email verification** - Required or optional?
   - Recommended: Optional initially, required for certificates

3. **Course previews** - How many lessons free?
   - Recommended: First 2 lessons or 10% of content

4. **Payment timing** - When to integrate?
   - Recommended: After student app MVP is stable

5. **Mobile apps** - Native or PWA?
   - Recommended: Start with responsive web, then PWA, then native

---

**End of Architecture Plan**
