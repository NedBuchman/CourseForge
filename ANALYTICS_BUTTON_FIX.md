# Analytics Button Fix

## Problem
The course creator's analytics button at the top of the course workflow dashboard was not working. When clicked, the analytics page would fail to load.

## Root Cause
The `student_performance_summary` database view was missing. This view was dropped during the auth consolidation migration (which removed the `student_accounts` table), but was never recreated to use the new auth structure.

The analytics page (`CourseAnalytics.tsx:130-133`) queries this view:
```typescript
supabase
  .from('student_performance_summary')
  .select('*')
  .eq('course_id', courseId)
```

When the view didn't exist, the query would fail and the entire analytics page would error out.

## Solution
Created a new migration that recreates the `student_performance_summary` view using the consolidated auth structure:

**Migration:** `fix_student_performance_summary_after_auth_consolidation.sql`

### Key Changes:
1. **Uses `auth.users` instead of `student_accounts`**
   - The old view joined with the now-deleted `student_accounts` table
   - The new view joins with `auth.users` to get student information

2. **Extracts user metadata properly**
   ```sql
   COALESCE(u.raw_user_meta_data->>'first_name', SPLIT_PART(u.email, '@', 1)) as first_name
   COALESCE(u.raw_user_meta_data->>'last_name', '') as last_name
   ```

3. **Filters legacy data**
   - Includes `WHERE sce.user_id IS NOT NULL` to exclude old enrollments with NULL user_id

4. **Maintains compatibility**
   - Keeps the same column names and structure
   - No frontend changes required

## Navigation Flow
The analytics button flow works as follows:

1. **Workflow Dashboard** (`CourseWorkflowDashboard.tsx:269-279`)
   - Button appears when course is published and downloaded
   - Calls `onViewAnalytics()` when clicked

2. **Create Course** (`CreateCourse.tsx:1723`)
   - Passes `onViewAnalytics` callback to dashboard
   - Callback invokes parent's `onViewAnalytics` with courseId and title

3. **App Router** (`App.tsx:88-92`)
   - Receives callback from CreateCourse
   - Sets page state to 'course-analytics'
   - Passes courseId and courseTitle to analytics component

4. **Analytics Page** (`CourseAnalytics.tsx`)
   - Loads and displays course analytics data
   - Now works correctly with the restored view

## Testing
All analytics tests now pass:
- ✓ Enrollment tracking accessible
- ✓ Progress tracking accessible
- ✓ Quiz attempts accessible
- ✓ All analytics views accessible (including student_performance_summary)
- ✓ Video views accessible

**Test Results:** 10/10 passed (100% success rate)

## Files Modified
- Created migration: `/supabase/migrations/{timestamp}_fix_student_performance_summary_after_auth_consolidation.sql`
- No frontend code changes required

## Verification
The analytics button now works correctly. When a course is published and downloaded, creators can:
1. Click "View Course Analytics Dashboard" button
2. See comprehensive analytics including:
   - Student enrollment and completion rates
   - Lesson view counts and completion rates
   - Quiz performance metrics
   - Individual student progress
   - Difficult questions analysis
