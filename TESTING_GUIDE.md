# CourseForge: 3-App Testing Guide

This guide walks you through testing the newly separated architecture.

---

## Prerequisites

Before testing, ensure:
1. Supabase database migrations are applied
2. Environment variables are configured in `.env`
3. All apps have dependencies installed

---

## Setup Instructions

### 1. Install Dependencies

```bash
# Creator App (already installed)
npm install

# Student App (NEW - needs installation)
cd student
npm install
cd ..

# Manager App (already installed)
cd manager
npm install
cd ..
```

### 2. Verify Environment Variables

Check that `.env` exists in the project root with:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Verify Database Migrations

Check that these tables exist in Supabase:
- `course_access_control`
- `course_visibility`
- `student_sessions`
- `course_invitations`

---

## Testing Sequence

### Test 1: Run All Three Apps Simultaneously

**Goal:** Verify all apps start without conflicts

```bash
# Terminal 1 - Creator App
npm run dev
# Should run on http://localhost:5173

# Terminal 2 - Student App
cd student
npm run dev
# Should run on http://localhost:5174

# Terminal 3 - Manager App
cd manager
npm run dev
# Should run on http://localhost:5175
```

**Expected Result:**
- ✅ All three apps running on different ports
- ✅ No port conflicts
- ✅ No build errors

---

### Test 2: Creator App - Create a Test Course

**Goal:** Create a published course that students can enroll in

1. Open Creator App: `http://localhost:5173`
2. Login with your creator account
3. Create a new course:
   - Title: "Test Course for Students"
   - Topic: "Testing"
   - Difficulty: "Beginner"
   - Duration: "1-hour"
   - Generate content
4. Complete the workflow:
   - Generate content
   - Generate quizzes
   - Configure presentation
   - Configure landing page
   - Publish course

**Expected Result:**
- ✅ Course created successfully
- ✅ Course status = "completed"
- ✅ Course has lessons and quizzes

**Note the Course ID** - You'll need it to set visibility

---

### Test 3: Set Course Visibility (Manual - Via Supabase Dashboard)

**Goal:** Make the course discoverable by students

Since the creator UI for visibility doesn't exist yet, set it manually:

1. Go to Supabase Dashboard
2. Open `course_visibility` table
3. Insert a row:
   ```sql
   INSERT INTO course_visibility (
     course_id,
     visibility,
     requires_enrollment,
     requires_payment,
     preview_enabled,
     allow_discovery
   ) VALUES (
     'your-course-id-here',
     'public',
     true,
     false,
     false,
     true
   );
   ```

**Expected Result:**
- ✅ Row inserted without errors
- ✅ Course is now marked as public and discoverable

---

### Test 4: Student App - Registration

**Goal:** Create a student account

1. Open Student App: `http://localhost:5174`
2. Click "Get Started" or "Sign up"
3. Fill registration form:
   - First Name: "Test"
   - Last Name: "Student"
   - Email: "teststudent@example.com"
   - Password: "password123"
   - Confirm Password: "password123"
4. Click "Create Account"

**Expected Result:**
- ✅ Registration successful
- ✅ Automatically redirected to Dashboard
- ✅ Welcome message shows "Welcome back, Test"

**Potential Issues:**
- ❌ If edge function error: Check that `student-auth` edge function exists
- ❌ If RLS error: Verify RLS policies are applied

---

### Test 5: Student App - Browse Courses

**Goal:** Find and view available courses

1. From Dashboard, click "Browse Courses"
2. Should see "Test Course for Students"
3. Click on the course card

**Expected Result:**
- ✅ Course appears in catalog
- ✅ Shows correct title, description, difficulty
- ✅ Shows "Enroll Now" button

**Potential Issues:**
- ❌ No courses shown: Check course_visibility table
- ❌ RLS error: Verify RLS policies allow public course viewing

---

### Test 6: Student App - Enroll in Course

**Goal:** Successfully enroll in the test course

1. Click "Enroll Now" on test course
2. Wait for enrollment to complete
3. Button should change to "Go to Course"

**Expected Result:**
- ✅ Enrollment successful
- ✅ New row in `student_course_enrollments` table
- ✅ Button changes to "Go to Course"

**Potential Issues:**
- ❌ Enrollment fails: Check RLS policies on `student_course_enrollments`
- ❌ Duplicate error: Already enrolled (expected behavior)

---

### Test 7: Student App - View Course Dashboard

**Goal:** See enrolled course in dashboard

1. Navigate back to Dashboard (click "My Dashboard" or logo)
2. Should see enrolled course in "My Courses"
3. Shows progress bar at 0%

**Expected Result:**
- ✅ Enrolled course appears
- ✅ Shows 0% progress
- ✅ Shows "Start Course" button
- ✅ Stats show: 1 Enrolled Course, 1 In Progress, 0 Completed

---

### Test 8: Student App - Take Course

**Goal:** View lessons and mark them complete

1. Click "Start Course" or "Continue Learning"
2. Course player should open
3. Left sidebar shows all lessons
4. Main content shows Lesson 1
5. Click "Mark as Complete"
6. Progress bar should update
7. Click "Next Lesson" to proceed

**Expected Result:**
- ✅ Course player loads correctly
- ✅ Can navigate between lessons
- ✅ Can mark lessons complete
- ✅ Progress saves to database
- ✅ Progress bar updates in real-time

**Potential Issues:**
- ❌ Lessons don't load: Check course has `lessons` JSONB data
- ❌ Progress doesn't save: Check RLS on `student_lesson_completions`

---

### Test 9: Creator App - View Student Analytics

**Goal:** Creator can see student enrolled in their course

1. Go back to Creator App
2. Navigate to Course Analytics (if available)
3. Should see 1 student enrolled

**Expected Result:**
- ✅ Creator can see enrollment data
- ✅ Analytics show student progress
- ✅ No access to student passwords/credentials

**Note:** This may require navigating through the creator app's analytics features.

---

### Test 10: Manager App - View Platform Stats

**Goal:** Manager can see platform-wide data

1. Open Manager App: `http://localhost:5175`
2. Login with an admin/manager account
3. Should see dashboard with stats

**Expected Result:**
- ✅ Can see total courses
- ✅ Can see total creators
- ✅ Can see platform metrics
- ✅ Cannot modify creator/student data

---

## Data Isolation Tests

### Test 11: Student Cannot Access Other Students' Data

**Goal:** Verify RLS prevents cross-student data access

1. Create a second student account
2. Try to view first student's enrollments via Supabase API
3. Should return empty or error

**SQL Test (Run in Supabase SQL Editor):**
```sql
-- Switch to student context
SET request.jwt.claims = '{"sub": "student-1-id"}';

-- Try to access another student's data
SELECT * FROM student_course_enrollments
WHERE student_id != 'student-1-id';
-- Should return 0 rows
```

**Expected Result:**
- ✅ RLS prevents access to other students' data
- ✅ Each student only sees their own enrollments

---

### Test 12: Creator Cannot Access Student Credentials

**Goal:** Verify creators cannot see student passwords

1. As creator, try to query `student_accounts` table
2. Should be blocked by RLS

**Expected Result:**
- ✅ RLS prevents creators from viewing `student_accounts`
- ✅ Creators can only see enrollment data, not credentials

---

## Performance Tests

### Test 13: Course Catalog Load Time

**Goal:** Catalog loads quickly with many courses

1. Create 50+ test courses (use creator app)
2. Open student catalog
3. Measure load time

**Expected Result:**
- ✅ Catalog loads in < 2 seconds
- ✅ Search is responsive
- ✅ No UI lag

---

### Test 14: Course Player Performance

**Goal:** Smooth lesson navigation

1. Open a course with 10+ lessons
2. Rapidly navigate between lessons
3. Mark lessons complete quickly

**Expected Result:**
- ✅ Lesson switches instantly
- ✅ Progress saves without noticeable delay
- ✅ No database errors

---

## Edge Cases

### Test 15: Expired Session Handling

**Goal:** App handles expired sessions gracefully

1. Login to student app
2. Manually expire session in localStorage:
   ```javascript
   // In browser console
   const session = JSON.parse(localStorage.getItem('courseforge_student_session'));
   session.expires_at = '2020-01-01';
   localStorage.setItem('courseforge_student_session', JSON.stringify(session));
   ```
3. Refresh page

**Expected Result:**
- ✅ Redirected to login page
- ✅ Session cleared
- ✅ No errors in console

---

### Test 16: Invalid Course ID

**Goal:** App handles missing courses

1. Manually navigate to course player with fake ID:
   `http://localhost:5174` (then manipulate app state)
2. Should show error message

**Expected Result:**
- ✅ Shows "Course not found" message
- ✅ Provides "Back to Dashboard" button
- ✅ No app crash

---

### Test 17: Empty States

**Goal:** UI handles empty data gracefully

Test scenarios:
1. Student with no enrolled courses
2. Course catalog with no courses
3. Course with no lessons (edge case)

**Expected Result:**
- ✅ Shows helpful empty state messages
- ✅ Provides clear call-to-action
- ✅ No broken UI

---

## Security Tests

### Test 18: SQL Injection Prevention

**Goal:** Verify input sanitization

1. Try to inject SQL in search:
   - Search for: `'; DROP TABLE courses; --`
2. Try in login fields

**Expected Result:**
- ✅ No SQL errors
- ✅ Treated as literal string
- ✅ Parameterized queries prevent injection

---

### Test 19: XSS Prevention

**Goal:** Verify script injection is blocked

1. Create course with title: `<script>alert('XSS')</script>`
2. View in student catalog

**Expected Result:**
- ✅ Script tag displayed as text
- ✅ No JavaScript execution
- ✅ React escapes HTML by default

---

## Troubleshooting

### Common Issues

#### Issue: Student auth edge function not found
**Solution:** Deploy the edge function:
```bash
# Check if function exists
supabase functions list

# If missing, ensure student-auth function is deployed
```

#### Issue: RLS blocks student access
**Solution:** Verify RLS policies:
```sql
-- Check policies on student tables
SELECT * FROM pg_policies
WHERE tablename IN (
  'student_accounts',
  'student_course_enrollments',
  'student_lesson_completions'
);
```

#### Issue: Courses not appearing in catalog
**Solution:**
1. Check course status = 'completed'
2. Verify course_visibility row exists
3. Check visibility = 'public' and allow_discovery = true

#### Issue: Progress not saving
**Solution:**
1. Check browser console for errors
2. Verify student_lesson_completions RLS policies
3. Check student_id is correct

---

## Success Checklist

Mark each item when successfully tested:

### Setup
- [ ] All three apps installed and running
- [ ] Environment variables configured
- [ ] Database migrations applied

### Creator App
- [ ] Can create courses
- [ ] Can publish courses
- [ ] Can view analytics

### Student App
- [ ] Can register account
- [ ] Can login
- [ ] Can browse courses
- [ ] Can enroll in courses
- [ ] Can view dashboard
- [ ] Can take courses
- [ ] Can mark lessons complete
- [ ] Progress tracking works

### Manager App
- [ ] Can login
- [ ] Can view platform stats
- [ ] Can see all courses

### Security
- [ ] Students isolated from each other
- [ ] Creators cannot access student credentials
- [ ] RLS policies working correctly
- [ ] SQL injection prevented
- [ ] XSS prevented

### Performance
- [ ] Catalog loads quickly
- [ ] Course player responsive
- [ ] No lag in navigation

---

## Next Steps After Testing

Once all tests pass:

1. **Fix any issues found during testing**
2. **Deploy to staging environment**
3. **Beta test with real users**
4. **Gather feedback**
5. **Iterate and improve**
6. **Deploy to production**

---

## Getting Help

If you encounter issues:

1. Check browser console for errors
2. Check Supabase logs for database errors
3. Verify RLS policies in Supabase Dashboard
4. Check that edge functions are deployed
5. Review the architecture plan: `THREE_APP_ARCHITECTURE_PLAN.md`

---

**Testing Status:** Ready to begin

Start with Test 1 and work through sequentially. Mark each test as you complete it.
