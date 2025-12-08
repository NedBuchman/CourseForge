# CourseForge Student App

Student-facing learning platform for CourseForge courses.

## Features

- Student registration and authentication
- Course discovery and browsing
- Course enrollment
- Interactive course player
- Progress tracking
- Video and text-based lessons
- Quiz taking (future)
- Personal learning dashboard

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Access to CourseForge Supabase instance

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the root of the student folder:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

```bash
npm run dev
```

The app will run on `http://localhost:5174`

### Build

```bash
npm run build
```

## Architecture

- **Authentication**: Custom student authentication via edge functions
- **Database**: Shared Supabase database with creator and manager apps
- **State Management**: React hooks and local storage for sessions
- **Styling**: Tailwind CSS

## Project Structure

```
student/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   │   ├── LandingPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegistrationPage.tsx
│   │   ├── Dashboard.tsx
│   │   ├── CourseCatalog.tsx
│   │   └── CoursePlayer.tsx
│   ├── lib/            # Utilities and clients
│   │   ├── supabase.ts
│   │   └── studentAuth.ts
│   ├── App.tsx         # Main app component with routing
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── public/             # Static assets
└── index.html          # HTML template
```

## Key Differences from Creator App

1. **Authentication**: Uses custom student_accounts table instead of Supabase Auth
2. **Focus**: Learning experience vs. content creation
3. **Features**: Course consumption vs. course generation
4. **Navigation**: Simple client-side routing vs. complex workflows

## Future Enhancements

- Real-time AI tutoring assistance
- Multi-language support
- Learning mode selection (text/video/audio)
- Social features (discussions, peer learning)
- Achievements and gamification
- Mobile app (React Native)
- Offline support
- Course certificates
