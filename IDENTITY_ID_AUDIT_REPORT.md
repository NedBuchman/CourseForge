# Identity ID Audit Report

## Executive Summary

This report documents all occurrences of identity-related IDs (`user_id`, `student_id`, `creator_id`) across the entire CourseForge codebase. This audit is the first step in consolidating the fragmented authentication system into a unified approach using only Supabase Auth (`auth.users`) with role-based access control.

**Current Problems:**
1. **Two Separate Auth Systems**: Creators use Supabase Auth, students use custom auth
2. **Broken RLS Policies**: Many policies use `auth.uid()` which returns NULL for students
3. **Inconsistent Naming**: `creator_id` is just `user_id` with a different name
4. **Data Integrity Issues**: Foreign key references are broken or inconsistent

---

## 1. Database Schema - Identity ID Columns

### Tables with `user_id` (Supabase Auth references)
| Table | Column | Nullable | Foreign Key |
|-------|--------|----------|-------------|
| `courses` | `user_id` | NO | `auth.users(id)` (implied, not enforced) |
| `user_roles` | `user_id` | NO | `auth.users(id)` (implied, not enforced) |
| `user_roles` | `created_by` | YES | None |
| `security_audit_log` | `user_id` | YES | None |
| `student_course_enrollments` | `user_id` | YES | None |
| `analytics_course_metrics` | `user_id` | YES | None |

### Tables with `student_id` (Custom Auth references)
| Table | Column | Nullable | Foreign Key |
|-------|--------|----------|-------------|
| `student_accounts` | `id` | NO | PRIMARY KEY |
| `student_course_enrollments` | `student_id` | NO | **BROKEN** - Should reference `student_accounts(id)` |
| `student_lesson_completions` | `student_id` | NO | **BROKEN** - Should reference `student_accounts(id)` |
| `student_lesson_views` | `student_id` | NO | **BROKEN** - Should reference `student_accounts(id)` |
| `student_quiz_attempts` | `student_id` | NO | **BROKEN** - Should reference `student_accounts(id)` |
| `lesson_video_views` | `student_id` | NO | `student_accounts(id)` ✓ |
| `course_access_control` | `student_id` | NO | `student_accounts(id)` ✓ |
| `course_certificates` | `student_id` | NO | `student_accounts(id)` ✓ |
| `course_invitations` | `created_student_id` | YES | `student_accounts(id)` ✓ |
| `student_sessions` | `student_id` | NO | `student_accounts(id)` ✓ |
| `student_performance_summary` | `student_id` | YES | None (view) |
| `analytics_student_engagement` | `student_id` | YES | None (view) |

### Tables with `creator_id` (Redundant naming)
| Table | Column | Nullable | Foreign Key |
|-------|--------|----------|-------------|
| `course_invitations` | `creator_id` | NO | None |
| `course_lesson_analytics` | `creator_id` | YES | None (view) |
| `course_quiz_analytics` | `creator_id` | YES | None (view) |
| `course_student_overview` | `creator_id` | YES | None (view) |
| `lesson_retake_analytics` | `creator_id` | YES | None (view) |
| `quiz_question_difficulty` | `creator_id` | YES | None (view) |
| `student_performance_summary` | `creator_id` | YES | None (view) |

**Note:** `creator_id` is semantically identical to `user_id` - it always references course creators in `auth.users`

---

## 2. RLS Policies Using Identity IDs

### Total RLS Policies: 88

### Policies Using `auth.uid()` - Creator Access (28 policies)
These work correctly for creators but FAIL for students:

**Tables:**
- `courses` (5 policies) - Uses `user_id = auth.uid()`
- `course_outlines` (4 policies) - Via courses.user_id check
- `presentations` (4 policies) - Via courses.user_id check
- `presentation_configs` (4 policies) - Via courses.user_id check
- `landing_page_configs` (5 policies) - Via courses.user_id check
- `class_landing_pages` (4 policies) - Via courses.user_id check
- `quizzes` (5 policies) - Via courses.user_id check
- `quiz_questions` (5 policies) - Via courses.user_id check
- `video_assets` (4 policies) - Via courses.user_id check
- `video_generation_queue` (3 policies) - Via courses.user_id check
- `course_visibility` (4 policies) - Via courses.user_id check
- `course_access_control` (4 policies) - Via courses.user_id check
- `course_invitations` (3 policies) - Via courses.user_id check
- `course_certificates` (1 policy) - Via courses.user_id check
- `lesson_video_views` (1 policy) - Via courses.user_id check

### Policies Using `student_id` - Student Access (20 policies)
**CRITICAL ISSUE:** These policies expect students to be in `auth.users` but they're not!

**Broken Policies:**
- `student_accounts` (2 policies) - `id = auth.uid()` **ALWAYS FAILS**
- `student_course_enrollments` (4 policies) - Some use `auth.uid() = user_id`, some use `student_id`
- `student_lesson_completions` (4 policies) - `student_id = auth.uid()` **ALWAYS FAILS**
- `student_lesson_views` (3 policies) - `student_id = auth.uid()` **ALWAYS FAILS**
- `student_quiz_attempts` (4 policies) - `student_id = auth.uid()` **ALWAYS FAILS**
- `student_quiz_answers` (3 policies) - Via student_quiz_attempts check **ALWAYS FAILS**
- `quiz_questions` (1 policy) - Student access via enrollment check **ALWAYS FAILS**
- `quizzes` (1 policy) - Student access via enrollment check **ALWAYS FAILS**

**Workaround Policies (Using custom session tokens):**
- `lesson_video_views` (3 policies) - Uses hacky `current_setting('request.headers')` approach
- `student_sessions` (4 policies) - Uses `EXISTS` check without `auth.uid()`
- `course_access_control` (1 policy) - Uses `EXISTS` check without `auth.uid()`

### Public Access Policies (3 policies)
- `courses` - "Anyone can view published courses"
- `landing_page_configs` (2 policies) - "Public can view landing pages"
- `course_visibility` - "Public view discoverable courses"

### Manager/Admin Policies (8 policies)
- `user_roles` (7 policies) - Admin/manager role checks
- `security_audit_log` (1 policy) - Manager access

---

## 3. Database Functions Using Identity IDs

### Functions Using `auth.uid()` (Creator Context)
1. `current_user_has_role(check_role text)` - Checks role for `auth.uid()`
2. `is_manager_or_admin()` - Checks if `auth.uid()` is manager/admin
3. `get_user_role()` - Returns role for `auth.uid()`
4. `handle_new_user()` - Trigger for new auth.users signup

### Functions Using `user_id` Parameter
1. `get_course_metrics(p_user_id uuid)` - Gets metrics for specific user

### Functions Using `student_id` Parameter
1. `get_next_quiz_attempt_number(p_student_id uuid, p_quiz_id uuid)`

### Functions Using `creator_id` (Implicitly from queries)
Views that expose `creator_id`:
- `get_lesson_analytics(p_course_id uuid)`
- `get_course_analytics_overview(p_course_id uuid)`

---

## 4. Edge Functions Using Identity IDs

### Edge Functions Count: 3 files with identity ID usage

#### `student-auth/index.ts` (5 occurrences)
Custom authentication for students - Creates/validates `student_accounts` records
- **Action:** Registration - Creates `student_id` in `student_accounts`
- **Action:** Login - Validates and returns `student_id`
- **Action:** Password reset - Uses `student_id` for token validation

#### `generate-course-content/index.ts` (5 occurrences)
Uses creator's `user_id` from auth context

#### `_shared/security.ts` (3 occurrences)
Security utilities that reference identity IDs

---

## 5. Creator App Code (src/)

### Files: 5 files, 19 occurrences

1. **src/pages/Login.tsx** (1 occurrence)
   - Uses Supabase Auth to get creator's `user_id`

2. **src/pages/CreateCourse.tsx** (3 occurrences)
   - Inserts `user_id` when creating courses

3. **src/pages/CourseAnalytics.tsx** (5 occurrences)
   - Filters analytics by creator's `user_id`

4. **src/pages/StudentProgressDetail.tsx** (7 occurrences)
   - Views student progress (uses `student_id`)

5. **src/App.tsx** (3 occurrences)
   - Auth context with `user_id`

---

## 6. Student App Code (student/src/)

### Files: 10 files, 28 occurrences

1. **student/src/lib/studentAuth.ts** (5 occurrences)
   - Custom auth library managing `student_id`
   - Stores `student_id` in localStorage
   - Uses custom session tokens

2. **student/src/pages/LoginPage.tsx** (3 occurrences)
   - Custom login returning `student_id`

3. **student/src/pages/RegistrationPage.tsx** (2 occurrences)
   - Custom registration creating `student_id`

4. **student/src/pages/Dashboard.tsx** (1 occurrence)
   - Displays student's courses using `student_id`

5. **student/src/pages/LessonPlayer.tsx** (6 occurrences)
   - Tracks progress with `student_id`

6. **student/src/pages/QuizTaker.tsx** (4 occurrences)
   - Records quiz attempts with `student_id`

7. **student/src/pages/QuizResults.tsx** (1 occurrence)
   - Shows results for `student_id`

8. **student/src/pages/CourseCatalog.tsx** (1 occurrence)
   - Enrollment uses `student_id`

9. **student/src/pages/CourseCompletion.tsx** (2 occurrences)
   - Certificate generation with `student_id`

10. **student/src/pages/CustomCourseLandingPage.tsx** (3 occurrences)
    - Enrollment with `student_id`

---

## 7. Manager App Code (manager/src/)

### Files: 5 files, 9 occurrences

1. **manager/src/pages/Login.tsx** (1 occurrence)
   - Uses Supabase Auth to get manager's `user_id`

2. **manager/src/pages/UserManagement.tsx** (5 occurrences)
   - Manages `user_id` and role assignments

3. **manager/src/pages/AnalyticsDashboard.tsx** (1 occurrence)
   - Platform-wide analytics (all users)

4. **manager/src/pages/CourseCreatorInsights.tsx** (1 occurrence)
   - Per-creator metrics using `user_id`

5. **manager/src/App.tsx** (1 occurrence)
   - Auth context with `user_id`

---

## 8. Migration Files Affected

**Total:** 41 migration files containing 481 occurrences

**Key migrations to update:**
1. `create_student_accounts.sql` - Creates the custom student auth system
2. `create_user_roles.sql` - Creates role-based access control
3. `create_student_progress_tracking.sql` - References `student_id`
4. `fix_student_enrollment_policies.sql` - Attempts to fix broken RLS
5. All analytics views - Use `creator_id` instead of `user_id`

---

## 9. Summary Statistics

| Category | Count |
|----------|-------|
| **Database Tables with Identity Columns** | 24 |
| **RLS Policies Using Identity IDs** | 88 |
| **Database Functions** | 4 (directly use identity IDs) |
| **Edge Functions** | 3 |
| **Creator App Files** | 5 (19 occurrences) |
| **Student App Files** | 10 (28 occurrences) |
| **Manager App Files** | 5 (9 occurrences) |
| **Migration Files** | 41 (481 occurrences) |

---

## 10. Recommended Consolidation Plan

### Phase 1: Database Schema Changes
1. Add `user_id` column to all student-related tables (already partially done)
2. Migrate data from `student_accounts` to `auth.users` + `user_roles`
3. Add foreign key constraints: all `user_id` columns → `auth.users(id)`
4. Drop custom `student_accounts` table
5. Rename all `creator_id` → `user_id` for consistency
6. Remove redundant `student_id` columns

### Phase 2: RLS Policy Updates
1. Replace all broken student policies that use `auth.uid()`
2. Simplify policies to consistently use `auth.uid()`
3. Remove hacky workarounds (session token checks)
4. Test all policies with creator, student, and manager roles

### Phase 3: Function Updates
1. Update all database functions to use `user_id` consistently
2. Remove `student_id` parameters
3. Update analytics views to use `user_id` instead of `creator_id`

### Phase 4: Edge Function Updates
1. Delete `student-auth/index.ts` custom auth edge function
2. Update any edge functions that reference `student_id`
3. Use Supabase Auth everywhere

### Phase 5: Frontend Updates
1. **Student App**: Replace custom auth with Supabase Auth
2. **Creator App**: Update any references to use consistent `user_id`
3. **Manager App**: Update role management interface
4. Update all API calls to use `auth.uid()` from Supabase session

### Phase 6: Testing
1. Test creator workflows (course creation, analytics)
2. Test student workflows (enrollment, lessons, quizzes)
3. Test manager workflows (user management, platform analytics)
4. Verify all RLS policies work correctly
5. Test role transitions (student becoming creator, etc.)

---

## 11. Risk Assessment

### High Risk Areas
1. **Student Data Migration** - Moving from custom auth to Supabase Auth
2. **Password Migration** - Cannot migrate bcrypt hashes to Supabase
3. **Existing Student Sessions** - Will be invalidated
4. **Foreign Key Cascades** - Must be careful with data deletion

### Migration Strategy
1. **Create parallel tables** during transition
2. **Dual-write** to both old and new systems temporarily
3. **Gradual cutover** per user type (students last)
4. **Maintain rollback capability** for 30 days
5. **Force password resets** for all students (explain via email)

---

## Next Steps

1. Review and approve this audit report
2. Create detailed migration scripts for each phase
3. Set up staging environment for testing
4. Plan communication to users about password resets
5. Execute migration in phases with rollback points
