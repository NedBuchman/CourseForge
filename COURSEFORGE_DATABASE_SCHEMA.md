# CourseForge Database Schema Documentation

**Generated:** November 10, 2025
**Database:** Supabase PostgreSQL
**Application:** CourseForge Course Creation Platform

---

## Table of Contents
1. [Overview](#overview)
2. [Tables](#tables)
3. [Storage Buckets](#storage-buckets)
4. [Views](#views)
5. [Functions](#functions)
6. [Security](#security)
7. [Indexes](#indexes)

---

## Overview

CourseForge is a platform that enables users to create AI-generated courses with presentations, quizzes, and landing pages. The database supports:
- Course creator accounts (via Supabase Auth)
- Student accounts (custom authentication)
- Course content generation and tracking
- Quiz management and student progress
- Analytics for creators and platform managers
- Role-based access control

---

## Tables

### 1. **courses**
Main table storing course information and generation status.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique course identifier |
| user_id | uuid | NOT NULL, FK → auth.users | Course creator |
| title | text | nullable | Course title |
| topic | text | NOT NULL | Course subject/topic |
| status | text | NOT NULL, default 'draft' | Course status (draft/generating/completed/failed/ready_for_quizzes) |
| difficulty_level | text | NOT NULL | beginner/intermediate/advanced |
| target_audience | text | NOT NULL | Intended audience description |
| duration | text | NOT NULL | Course duration (e.g., "1-hour", "2-hours") |
| learning_objectives | text | nullable | What learners will achieve |
| additional_context | text | nullable | Specific topics to emphasize |
| uploaded_files | jsonb | default '[]' | Array of uploaded file URLs |
| restrict_to_files | boolean | default false | Whether to limit AI to uploaded files |
| chat_history | jsonb | default '[]' | Course refinement chat messages |
| generated_content | jsonb | default '{}' | Complete AI-generated course structure |
| generation_progress | integer | default 0 | Progress percentage (0-100) |
| generation_stage | text | default '' | Current generation stage description |
| generation_started_at | timestamptz | nullable | When generation began |
| generation_completed_at | timestamptz | nullable | When generation completed |
| generation_error | text | nullable | Error details if failed |
| retry_count | integer | default 0 | Number of retry attempts |
| generation_job_id | uuid | default gen_random_uuid() | Async job tracking ID |
| current_lesson_generating | integer | nullable | Lesson being generated |
| lessons_generated | integer[] | default '{}' | Completed lesson numbers |
| generation_last_heartbeat | timestamptz | nullable | Last progress update |
| generation_estimated_completion | timestamptz | nullable | Estimated finish time |
| content_generated_at | timestamptz | nullable | When content completed |
| content_status | text | default 'not_started' | not_started/in_progress/completed/needs_redo |
| quizzes_status | text | default 'not_started' | Quiz workflow status |
| quizzes_accepted_at | timestamptz | nullable | When quizzes approved |
| presentation_status | text | default 'not_configured' | Presentation workflow status |
| presentation_accepted_at | timestamptz | nullable | When presentation approved |
| landing_page_status | text | default 'not_configured' | Landing page workflow status |
| landing_page_accepted_at | timestamptz | nullable | When landing page approved |
| current_step | integer | default 1 | Current workflow step (1-6) |
| last_completed_step | integer | default 0 | Highest completed step (0-6) |
| published_status | text | default 'not_published' | not_published/published/needs_republish |
| published_at | timestamptz | nullable | Publication timestamp |
| downloaded_status | text | default 'not_downloaded' | not_downloaded/downloaded |
| last_downloaded_at | timestamptz | nullable | Last download timestamp |
| created_at | timestamptz | default now() | Creation timestamp |
| updated_at | timestamptz | default now() | Last update timestamp |

**RLS Policies:**
- Users can view their own courses
- Users can insert their own courses
- Users can update their own courses
- Users can delete their own courses

---

### 2. **presentation_configs**
Stores presentation theme and branding settings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique identifier |
| course_id | uuid | NOT NULL, UNIQUE, FK → courses | Associated course |
| theme | text | NOT NULL, default 'modern' | Theme: modern/vibrant/academic/tech |
| logo_url | text | nullable | URL to uploaded logo |
| primary_color | text | NOT NULL, default '#3B82F6' | Hex color code |
| created_at | timestamptz | default now() | Creation timestamp |
| updated_at | timestamptz | default now() | Last update timestamp |

**RLS Policies:**
- Users can view/insert/update/delete configs for their courses

---

### 3. **landing_page_configs**
Stores landing page content and styling.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique identifier |
| course_id | uuid | NOT NULL, UNIQUE, FK → courses | Associated course |
| course_headline | text | NOT NULL | Catchy headline |
| value_proposition | text | NOT NULL | Why take this course |
| audience_description | text | NOT NULL | Who is this for |
| instructor_bio | text | nullable | Instructor credentials |
| page_style | text | NOT NULL, default 'professional' | professional/modern/minimal/friendly |
| primary_color | text | NOT NULL, default '#2d5a8c' | Hex color code |
| secondary_color | text | NOT NULL, default '#10b981' | Hex color code |
| hero_image_url | text | nullable | Hero image URL |
| cta_button_text | text | NOT NULL, default 'Enroll in Course' | Button text |
| pricing_info | text | nullable | Pricing or access details |
| testimonials | text | nullable | Student testimonials |
| special_message | text | nullable | Unique selling point |
| course_benefits | jsonb | nullable | Array of benefits (icon, title, description) |
| publish_url | text | nullable | Custom publication URL |
| student_login_url | text | nullable | Student login page URL |
| created_at | timestamptz | default now() | Creation timestamp |
| updated_at | timestamptz | default now() | Last update timestamp |

**RLS Policies:**
- Users can view/insert/update/delete configs for their courses

---

### 4. **quizzes**
Stores quiz metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique identifier |
| course_id | uuid | NOT NULL, FK → courses | Associated course |
| title | text | NOT NULL | Quiz title |
| module_index | integer | NOT NULL | Lesson number this quiz belongs to |
| approved | boolean | NOT NULL, default false | Whether approved by creator |
| created_at | timestamptz | default now() | Creation timestamp |
| updated_at | timestamptz | default now() | Last update timestamp |

**RLS Policies:**
- Users can view/insert/update/delete quizzes for their courses

---

### 5. **quiz_questions**
Stores individual quiz questions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique identifier |
| quiz_id | uuid | NOT NULL, FK → quizzes | Associated quiz |
| question_text | text | NOT NULL | The question |
| question_type | text | NOT NULL, default 'single-answer' | Question type |
| options | jsonb | NOT NULL | Array of 4 answer options |
| correct_answer | text | NOT NULL | Correct option letter (A/B/C/D) |
| explanation | text | NOT NULL, default '' | Why the answer is correct |
| order_index | integer | NOT NULL, default 0 | Question order |
| created_at | timestamptz | default now() | Creation timestamp |
| updated_at | timestamptz | default now() | Last update timestamp |

**RLS Policies:**
- Users can view/insert/update/delete questions for their quizzes

---

### 6. **student_accounts**
Custom student authentication separate from course creators.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique identifier |
| email | text | UNIQUE, NOT NULL | Student email |
| password_hash | text | NOT NULL | Bcrypt hashed password |
| first_name | text | nullable | First name |
| last_name | text | nullable | Last name |
| created_at | timestamptz | default now() | Registration timestamp |
| updated_at | timestamptz | default now() | Last update timestamp |
| last_login_at | timestamptz | nullable | Last login timestamp |
| email_verified | boolean | default false | Email verification status |
| verification_token | text | nullable | Email verification token |
| reset_password_token | text | nullable | Password reset token |
| reset_password_expires | timestamptz | nullable | Reset token expiration |

**RLS Policies:**
- Students can read their own account
- Students can update their own account

---

### 7. **student_course_enrollments**
Tracks student enrollments in courses.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique identifier |
| student_id | uuid | NOT NULL, FK → student_accounts | Enrolled student |
| course_id | uuid | NOT NULL, FK → courses | Enrolled course |
| enrolled_at | timestamptz | default now() | Enrollment timestamp |
| progress | jsonb | default {...} | Lesson completion tracking |
| completed_at | timestamptz | nullable | Course completion timestamp |
| UNIQUE(student_id, course_id) | | | One enrollment per student per course |

**RLS Policies:**
- Students can view their own enrollments
- Students can update their own enrollments
- Students can enroll in courses

---

### 8. **student_lesson_views**
Tracks every time a student accesses a lesson.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique identifier |
| student_id | uuid | NOT NULL, FK → student_accounts | Viewing student |
| course_id | uuid | NOT NULL, FK → courses | Course being viewed |
| lesson_index | integer | NOT NULL | Lesson number (0-based) |
| viewed_at | timestamptz | default now() | View timestamp |
| time_spent_seconds | integer | default 0 | Estimated time spent |
| completed_on_view | boolean | default false | Whether completed during view |
| created_at | timestamptz | default now() | Record creation timestamp |

**RLS Policies:**
- Students can view/insert their own lesson views
- Course creators can view lesson views for their courses

---

### 9. **student_lesson_completions**
Tracks lesson completions (one per student per lesson).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique identifier |
| student_id | uuid | NOT NULL, FK → student_accounts | Student |
| course_id | uuid | NOT NULL, FK → courses | Course |
| lesson_index | integer | NOT NULL | Completed lesson |
| completed_at | timestamptz | default now() | Completion timestamp |
| view_count | integer | default 1 | Views before completing |
| UNIQUE(student_id, course_id, lesson_index) | | | One completion per lesson |

**RLS Policies:**
- Students can view/insert/update their own completions
- Course creators can view completions for their courses

---

### 10. **student_quiz_attempts**
Tracks quiz attempts by students.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique identifier |
| student_id | uuid | NOT NULL, FK → student_accounts | Attempting student |
| quiz_id | uuid | NOT NULL, FK → quizzes | Quiz being attempted |
| course_id | uuid | NOT NULL, FK → courses | Associated course |
| attempt_number | integer | NOT NULL, default 1 | Attempt count (1, 2, 3...) |
| started_at | timestamptz | default now() | Start timestamp |
| completed_at | timestamptz | nullable | Completion timestamp |
| score | numeric(5,2) | default 0 | Score (0-100) |
| passed | boolean | default false | Pass/fail status |
| answers | jsonb | default '[]' | Array of answer choices |

**RLS Policies:**
- Students can view/insert/update their own attempts
- Course creators can view attempts for their courses

---

### 11. **student_quiz_answers**
Detailed tracking of individual question answers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique identifier |
| attempt_id | uuid | NOT NULL, FK → student_quiz_attempts | Associated attempt |
| question_id | uuid | NOT NULL, FK → quiz_questions | Question answered |
| student_answer | text | NOT NULL | Selected answer (A/B/C/D) |
| is_correct | boolean | NOT NULL, default false | Correctness |
| time_spent_seconds | integer | default 0 | Time on question |
| answered_at | timestamptz | default now() | Answer timestamp |

**RLS Policies:**
- Students can view/insert their own answers
- Course creators can view answers for their courses

---

### 12. **user_roles**
Role-based access control for managers and admins.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique identifier |
| user_id | uuid | NOT NULL, UNIQUE, FK → auth.users | User account |
| role | text | NOT NULL, default 'creator' | admin/manager/creator |
| created_at | timestamptz | default now() | Role assignment timestamp |
| updated_at | timestamptz | default now() | Last update timestamp |
| created_by | uuid | nullable, FK → auth.users | Who assigned the role |

**RLS Policies:**
- Users can read their own role
- Admins can read all roles
- Managers can read all roles
- Only admins can insert/update/delete roles

---

## Storage Buckets

### 1. **course-materials**
- **Public:** No (private)
- **Purpose:** Store uploaded reference materials for course generation
- **Structure:** `{user_id}/{course_id}/filename`
- **RLS:** Users can only access their own files

### 2. **course-logos**
- **Public:** Yes
- **Purpose:** Store logos for presentations and landing pages
- **RLS:** Authenticated users can upload, all can view

---

## Views

### Analytics Views (Platform-wide)

#### **analytics_platform_overview**
High-level platform statistics including total creators, students, courses, enrollments.

#### **analytics_user_growth_daily**
Daily user registration trends for creators and students.

#### **analytics_course_metrics**
Detailed course metrics including generation time, enrollment count, workflow status.

#### **analytics_course_topics**
Topic popularity by course count and enrollments.

#### **analytics_workflow_funnel**
Workflow completion rates from content creation to download.

#### **analytics_student_engagement**
Student engagement metrics including enrollment and completion rates.

#### **analytics_popular_courses**
Most popular courses ranked by enrollment count.

#### **analytics_generation_metrics**
Course generation success rates and performance metrics.

#### **analytics_daily_activity**
Daily course creation, completion, and publication activity.

#### **analytics_difficulty_distribution**
Distribution of courses by difficulty level.

#### **analytics_duration_distribution**
Distribution of courses by duration.

#### **analytics_customization_adoption**
Adoption rates for presentations and landing pages.

#### **analytics_theme_popularity**
Presentation theme usage statistics.

### Course Creator Analytics Views

#### **course_student_overview**
Per-course enrollment and completion statistics.

#### **course_lesson_analytics**
Detailed per-lesson metrics including completion rates and time spent.

#### **course_quiz_analytics**
Quiz performance metrics including average scores and pass rates.

#### **quiz_question_difficulty**
Question-level difficulty analysis based on student performance.

#### **student_performance_summary**
Individual student progress across lessons and quizzes.

#### **lesson_retake_analytics**
Tracks how often students revisit lessons.

---

## Functions

### Platform Functions

#### **get_platform_stats()** → JSON
Returns key platform metrics from analytics_platform_overview.

#### **get_user_growth_by_period(period_days INTEGER)** → TABLE
Returns daily user growth for specified period.

#### **get_course_creation_funnel()** → JSON
Returns workflow completion funnel data.

### Course Creator Functions

#### **get_course_analytics_overview(course_id UUID)** → TABLE
Returns enrollment and completion metrics for a specific course.

#### **get_lesson_analytics(course_id UUID)** → TABLE
Returns detailed lesson analytics for a specific course.

#### **get_difficult_questions(course_id UUID, max_success_rate NUMERIC)** → TABLE
Returns questions with low success rates.

#### **get_students_by_course(course_id UUID)** → TABLE
Returns student list with progress for a specific course.

### Utility Functions

#### **is_manager_or_admin()** → BOOLEAN
Returns true if current user has manager or admin role.

#### **get_next_quiz_attempt_number(student_id UUID, quiz_id UUID)** → INTEGER
Returns the next attempt number for a student's quiz.

#### **handle_new_user()** → TRIGGER
Automatically assigns 'creator' role to new auth.users.

#### **handle_updated_at()** → TRIGGER
Updates updated_at timestamp on row updates.

#### **update_student_updated_at()** → TRIGGER
Updates student_accounts updated_at timestamp.

---

## Security

### Authentication
- **Course Creators:** Supabase Auth (auth.users table)
- **Students:** Custom authentication (student_accounts table)
- **Managers/Admins:** Role-based via user_roles table

### Row Level Security (RLS)
All tables have RLS enabled with policies enforcing:
- Users can only access their own data
- Course creators can view analytics for their courses
- Students can only access their enrolled courses
- Managers/admins have broader read access

### Password Security
- Student passwords hashed using bcrypt
- Password reset tokens with expiration
- Email verification tokens

---

## Indexes

### Performance Indexes

**courses table:**
- idx_courses_user_id (user_id)
- idx_courses_status (status)
- idx_courses_created_at (created_at DESC)
- idx_courses_generation_job_id (generation_job_id)
- idx_courses_user_status (user_id, status)
- idx_courses_heartbeat (generation_last_heartbeat) WHERE status = 'generating'
- idx_courses_quizzes_status (quizzes_status)
- idx_courses_presentation_status (presentation_status)
- idx_courses_landing_page_status (landing_page_status)
- idx_courses_published_at (published_at DESC)
- idx_courses_content_status (content_status)
- idx_courses_current_step (current_step)
- idx_courses_last_completed_step (last_completed_step)
- idx_courses_published_status (published_status)
- idx_courses_downloaded_status (downloaded_status)

**presentation_configs table:**
- idx_presentation_configs_course_id (course_id)

**landing_page_configs table:**
- idx_landing_page_configs_course_id (course_id)

**quizzes table:**
- idx_quizzes_course_id (course_id)
- idx_quizzes_module_index (module_index)

**quiz_questions table:**
- idx_quiz_questions_quiz_id (quiz_id)

**student_accounts table:**
- idx_student_accounts_email (email)
- idx_student_accounts_reset_token (reset_password_token)

**student_course_enrollments table:**
- idx_enrollments_student (student_id)
- idx_enrollments_course (course_id)

**student_lesson_views table:**
- idx_lesson_views_student (student_id)
- idx_lesson_views_course (course_id)
- idx_lesson_views_lesson (lesson_index)
- idx_lesson_views_viewed_at (viewed_at)
- idx_lesson_views_course_lesson (course_id, lesson_index)

**student_lesson_completions table:**
- idx_lesson_completions_student (student_id)
- idx_lesson_completions_course (course_id)
- idx_lesson_completions_lesson (lesson_index)
- idx_lesson_completions_completed_at (completed_at)

**student_quiz_attempts table:**
- idx_quiz_attempts_student (student_id)
- idx_quiz_attempts_quiz (quiz_id)
- idx_quiz_attempts_course (course_id)
- idx_quiz_attempts_started_at (started_at)
- idx_quiz_attempts_student_quiz (student_id, quiz_id)

**student_quiz_answers table:**
- idx_quiz_answers_attempt (attempt_id)
- idx_quiz_answers_question (question_id)
- idx_quiz_answers_correct (is_correct)

**user_roles table:**
- idx_user_roles_user_id (user_id)
- idx_user_roles_role (role)

---

## Database Constraints

### Check Constraints

**courses:**
- courses_status_check: status IN ('draft', 'generating', 'completed', 'failed', 'ready_for_quizzes')
- content_status_check: content_status IN ('not_started', 'in_progress', 'completed', 'needs_redo')
- quizzes_status_check: quizzes_status IN ('not_started', 'in_progress', 'completed', 'needs_redo')
- presentation_status_check: presentation_status IN ('not_configured', 'configured', 'needs_redo')
- landing_page_status_check: landing_page_status IN ('not_configured', 'configured', 'needs_redo')
- published_status_check: published_status IN ('not_published', 'published', 'needs_republish')
- downloaded_status_check: downloaded_status IN ('not_downloaded', 'downloaded')
- current_step_check: current_step >= 1 AND current_step <= 6
- last_completed_step_check: last_completed_step >= 0 AND last_completed_step <= 6

**user_roles:**
- role IN ('admin', 'manager', 'creator')

### Unique Constraints

- student_accounts.email (UNIQUE)
- user_roles.user_id (UNIQUE)
- student_course_enrollments(student_id, course_id) (UNIQUE)
- student_lesson_completions(student_id, course_id, lesson_index) (UNIQUE)
- presentation_configs.course_id (UNIQUE)
- landing_page_configs.course_id (UNIQUE)

### Foreign Keys with Cascading Deletes

All foreign key relationships use ON DELETE CASCADE to maintain referential integrity:
- courses → auth.users
- presentation_configs → courses
- landing_page_configs → courses
- quizzes → courses
- quiz_questions → quizzes
- student_course_enrollments → student_accounts, courses
- student_lesson_views → student_accounts, courses
- student_lesson_completions → student_accounts, courses
- student_quiz_attempts → student_accounts, quizzes, courses
- student_quiz_answers → student_quiz_attempts, quiz_questions
- user_roles → auth.users

---

## Workflow Steps

CourseForge uses a 6-step workflow tracked by `current_step` and `last_completed_step`:

1. **Content Generation** - AI generates course content
2. **Quiz Generation** - AI generates quizzes for lessons
3. **Presentation Configuration** - Customize presentation theme and branding
4. **Landing Page Configuration** - Customize course landing page
5. **Published** - Course is published and accessible to students
6. **Downloaded** - Course package downloaded for external use

---

## Notes

- All timestamps use `timestamptz` for timezone awareness
- JSONB used for flexible structured data (chat history, quiz options, student progress)
- UUID primary keys for all tables
- Comprehensive RLS policies enforce data isolation
- Separate authentication systems for creators and students
- Analytics views pre-compute common queries for performance
- Automatic triggers maintain updated_at timestamps
- Default values prevent NULL issues in critical fields

---

**End of Schema Documentation**
