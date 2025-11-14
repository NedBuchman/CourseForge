# CourseForge Navigation Flow

## Page Flow Diagram

```
Landing Page
    ↓
  [Get Started]
    ↓
Login Page ←→ Registration Page
    ↓              ↓
    └──────┬───────┘
           ↓
    Create Course Page
           ↓
    Course Dashboard
```

## Detailed Page Descriptions

### 1. Landing Page
- **Route**: `/` (home)
- **Purpose**: Introduction to CourseForge
- **Actions**:
  - "Get Started" button → Navigate to Login Page

### 2. Login Page
- **Purpose**: Authenticate existing users
- **Features**:
  - Email and password input
  - "Remember me" checkbox
  - "Show/Hide password" toggle
  - "Forgot Password?" link → Password Reset Flow
  - "Create New Account" button → Navigate to Registration Page
- **On Success**: Navigate to Create Course Page
- **Authentication**: Supabase Auth with `signInWithPassword()`

### 3. Registration Page
- **Purpose**: Create new user account
- **Features**:
  - Full user information form (name, email, password, address, phone)
  - Terms and Conditions acceptance
  - Data Privacy Notice acceptance
  - Print functionality for legal documents
- **On Success**: Navigate to Create Course Page
- **Authentication**: Supabase Auth with `signUp()`

### 4. Create Course Page
- **Purpose**: AI-powered course creation
- **Features**:
  - 3-step progress tracker
  - Course details form (subject, audience, difficulty, duration)
  - File upload for reference materials
  - AI chat for prompt refinement
  - Character counters on all text fields
  - Auto-save to localStorage
- **On Success**: Navigate to Course Dashboard
- **Back Button**: Navigate to Login Page

### 5. Course Dashboard (Coming Soon)
- **Purpose**: View and manage generated courses
- **Current State**: Placeholder showing course ID

## Authentication Flow

### New User Flow
1. Landing Page → Login Page
2. Click "Create New Account"
3. Fill Registration Form
4. Accept Terms & Privacy
5. Submit → Account Created
6. Redirect to Create Course Page

### Returning User Flow
1. Landing Page → Login Page
2. Enter Email & Password
3. Submit → Authenticated
4. Redirect to Create Course Page

### Password Reset Flow
1. Login Page → Click "Forgot Password?"
2. Enter Email Address
3. Submit → Reset Email Sent
4. Check Email → Click Reset Link
5. Set New Password
6. Return to Login Page

## Database Integration

### Tables Used
- `auth.users` - User authentication (managed by Supabase Auth)
- `courses` - Course data and generation status

### Storage Buckets
- `course-materials` - User-uploaded reference files

## Security Features
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- File uploads restricted to user's own folder
- Password minimum length: 6 characters
- Email validation on all forms
- Session management via Supabase Auth
