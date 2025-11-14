# CourseForge Manager

The administrative portal for CourseForge platform management and analytics.

## Overview

CourseForge Manager is a separate application that provides administrators and managers with:

- **Analytics Dashboard**: Comprehensive platform metrics and insights
- **User Management**: Role-based access control (Admin only)
- **Platform Overview**: Course creation, student enrollment, and workflow completion statistics

## Features

### Analytics Dashboard
- Platform overview with key metrics (total creators, students, courses)
- Course topic analysis and trends
- Workflow completion funnel
- Difficulty level distribution
- Popular courses by enrollment

### User Management (Admin Only)
- View all registered users
- Assign and modify user roles (creator, manager, admin)
- Track user activity and sign-in history
- Real-time role updates

## Role-Based Access

### Creator
- Default role for all new users
- Can create and manage their own courses
- No access to manager portal

### Manager
- Can access analytics dashboard
- Cannot manage users
- Read-only access to platform metrics

### Admin
- Full access to all manager features
- Can manage user roles
- Access to user management interface

## Setup

### Prerequisites
- Node.js 18+ installed
- Supabase project configured
- Same Supabase credentials as main CourseForge app

### Installation

1. Navigate to the manager directory:
```bash
cd manager
```

2. Install dependencies:
```bash
npm install
```

3. Environment variables are already configured in `.env` (shared with main app)

4. Start development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

## Database Setup

The manager app uses these database tables:

- `user_roles` - Stores user role assignments
- `analytics_*` views - Pre-computed analytics data

Migrations are located in the parent `supabase/migrations/` directory and are shared between both apps.

### Creating Your First Admin

After setting up the application:

1. Register a user account through the main CourseForge app
2. Use a database client to manually update the `user_roles` table:
```sql
UPDATE user_roles
SET role = 'admin'
WHERE user_id = 'YOUR_USER_ID';
```
3. Sign in to the manager portal with your admin account

Alternatively, you can execute SQL in Supabase Studio to promote your first user to admin.

## Architecture

### Separation from Main App
- Independent React application
- Shares same Supabase database and authentication
- Can be deployed separately at different URLs
- No code dependencies on main creator app

### Security
- Role verification on every page load
- Database-level RLS policies
- Session-based authentication
- Protected analytics views

## Deployment

### Recommended Setup
- Deploy to separate subdomain (e.g., `manager.courseforge.com`)
- Use same Supabase project as main app
- Configure separate build pipeline
- Implement IP whitelisting for additional security (optional)

### Build Output
```bash
npm run build
# Output: dist/
```

## Development

### Project Structure
```
manager/
├── src/
│   ├── components/     # Shared UI components
│   ├── lib/           # Supabase client
│   ├── pages/         # Main pages (Login, Analytics, UserManagement)
│   └── App.tsx        # Main application with routing
├── .env               # Environment variables (shared with parent)
└── package.json       # Dependencies
```

### Tech Stack
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase Auth & Database
- Lucide React Icons

## Security Considerations

1. **Always verify user roles** before displaying sensitive data
2. **Use RLS policies** on all database tables
3. **Log all admin actions** for audit trails
4. **Regularly review** user role assignments
5. **Monitor** for suspicious access patterns

## Support

For issues or questions related to CourseForge Manager:
- Check database migrations are up to date
- Verify user roles are correctly assigned
- Ensure Supabase connection is configured
- Review browser console for authentication errors
