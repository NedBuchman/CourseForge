# LLM Integration Documentation

## Overview

This CourseForge application now uses Claude (Anthropic) via Supabase Edge Functions to generate all course content. The integration replaces all mock data with real AI-generated content based on user inputs from the web forms.

## Architecture

### Edge Functions (Backend)

All LLM API calls are handled server-side through Supabase Edge Functions to:
- Keep API keys secure (never exposed to client)
- Provide better rate limiting and error handling
- Enable server-side logging and monitoring
- Reduce client bundle size

### Edge Functions Deployed

1. **generate-course-content** (`/functions/v1/generate-course-content`)
   - Generates complete course outlines and lesson content
   - Takes form inputs: subject, audience, difficulty, duration, objectives, context
   - Processes uploaded file contents if provided
   - Returns structured JSON with lessons array

2. **generate-quizzes** (`/functions/v1/generate-quizzes`)
   - Generates multiple-choice quiz questions for each lesson
   - Takes lesson content and desired questions per lesson
   - Returns quiz questions with explanations and difficulty levels
   - Creates varied question types testing different comprehension levels

3. **verify-course-content** (`/functions/v1/verify-course-content`)
   - Fact-checks course content for accuracy
   - Identifies outdated information or unverified claims
   - Returns accuracy score and detailed error reports
   - Provides specific suggestions for corrections

4. **chat-refinement** (`/functions/v1/chat-refinement`)
   - Powers the AI chat for course refinement
   - Maintains conversation context with chat history
   - Helps users refine course parameters through natural conversation
   - Provides instructional design guidance

## Data Flow

### Course Generation Flow

1. User fills out course creation form (CreateCourse component)
2. User clicks "Generate My Course" button
3. Frontend uploads any reference files to Supabase Storage
4. Frontend calls `generate-course-content` Edge Function with:
   - Form data (subject, audience, difficulty, duration, objectives, context)
   - Uploaded file contents (if any)
5. Edge Function:
   - Builds comprehensive prompt from inputs
   - Calls Claude API with structured instructions
   - Parses JSON response into CourseContent structure
   - Returns generated content
6. Frontend saves generated content to database
7. User sees course outline with all lessons

### Quiz Generation Flow

1. User accepts course content and proceeds to quiz generation
2. Frontend calls `generate-quizzes` Edge Function with:
   - All lesson content
   - Desired questions per lesson
3. Edge Function:
   - Iterates through each lesson
   - Generates questions testing comprehension
   - Returns structured quiz data
4. Frontend saves quizzes to database
5. User can review all generated questions

### Content Verification Flow

1. User clicks "Verify Content" button
2. Frontend calls `verify-course-content` Edge Function with:
   - Course title
   - All lesson content
3. Edge Function:
   - Reviews content for accuracy
   - Identifies potential issues
   - Calculates accuracy score
   - Returns verification results
4. Frontend displays results with highlighted issues
5. User can choose to auto-correct or accept

### Chat Refinement Flow

1. User opens chat interface in course creation form
2. User types message about course requirements
3. Frontend calls `chat-refinement` Edge Function with:
   - User message
   - Current course details from form
   - Previous chat history
4. Edge Function:
   - Maintains conversation context
   - Provides instructional design guidance
   - Returns AI response
5. Frontend displays response in chat

## Prompt Engineering

### Course Content Prompts

Prompts are dynamically built from form inputs and include:
- **Topic**: From subject field
- **Target Audience**: Detailed description from audience field
- **Difficulty Level**: Beginner, intermediate, or advanced
- **Duration**: Controls number and length of lessons
- **Learning Objectives**: Optional specific outcomes
- **Context**: Optional topics to emphasize
- **Reference Materials**: Optional uploaded file contents

The prompt structure:
1. Sets context as expert instructional designer
2. Provides all course parameters
3. Includes specific formatting instructions
4. Requests structured JSON output
5. Specifies lesson requirements (word count, objectives, etc.)

### Quiz Question Prompts

Prompts for quiz generation include:
- Full lesson content
- Learning objectives
- Desired number of questions
- Difficulty distribution requirements
- Question format specifications (4 options, single correct answer)

### Verification Prompts

Prompts for verification include:
- Course title
- All lesson content
- Instructions to identify:
  - Outdated information
  - Unverified claims
  - Factual errors
  - Misleading examples
- Request for accuracy scoring
- Request for specific correction suggestions

## Database Storage

### Courses Table

Generated content is stored in the `courses` table:
- `generated_content`: JSONB column storing CourseContent structure
- `verification_results`: JSONB column storing verification results
- `chat_history`: JSONB array storing chat messages
- `status`: Tracks generation state (generating, completed, failed)

### Quizzes Tables

Quiz data is stored in normalized tables:
- `quizzes`: One row per lesson quiz
- `quiz_questions`: Multiple rows per quiz with question details

## Error Handling

All Edge Functions include:
- Try-catch blocks for API calls
- Validation of Claude API responses
- Structured error messages
- Logging for debugging
- Graceful fallbacks in frontend

Frontend components:
- Display user-friendly error messages
- Allow retry on failures
- Maintain form state on errors
- Log errors to console for debugging

## Environment Variables

Required environment variables (automatically configured in Supabase):
- `ANTHROPIC_API_KEY`: Claude API key
- `VITE_SUPABASE_URL`: Supabase project URL (frontend)
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key (frontend)

## API Usage and Costs

Each operation uses Claude tokens:
- **Course Generation**: ~2,000-8,000 tokens per course (depends on complexity)
- **Quiz Generation**: ~1,000-4,000 tokens per lesson
- **Content Verification**: ~1,000-3,000 tokens per verification
- **Chat Messages**: ~100-500 tokens per message

The Edge Functions return usage data that can be logged for cost tracking.

## Testing

To test the integration:

1. **Course Generation**:
   - Fill out all required form fields
   - Add optional objectives and context
   - Upload reference files (optional)
   - Submit and wait for generation (~60-90 seconds)
   - Verify lessons are coherent and match requirements

2. **Quiz Generation**:
   - Accept generated course
   - Configure questions per lesson
   - Generate quizzes
   - Review questions for relevance and difficulty

3. **Content Verification**:
   - Click "Verify Content"
   - Review accuracy score and any issues found
   - Check that issues are legitimate concerns

4. **Chat Refinement**:
   - Open chat interface
   - Ask questions about course structure
   - Verify responses are contextual and helpful

## Future Enhancements

Possible improvements:
1. Add streaming responses for faster perceived performance
2. Implement caching for similar course topics
3. Add more granular control over lesson structure
4. Support for different quiz question types
5. Automated correction of verification issues
6. Cost tracking dashboard
7. Prompt template management in database
8. A/B testing different prompt strategies

## Troubleshooting

### Common Issues

1. **"ANTHROPIC_API_KEY not configured"**
   - API key is automatically configured in Supabase
   - Contact support if error persists

2. **"Failed to parse course content"**
   - Claude returned malformed JSON
   - Usually self-resolves on retry
   - Check prompt formatting if persistent

3. **Long generation times**
   - Normal for complex courses (60-90 seconds)
   - Depends on Claude API response time
   - Progress indicator shows current status

4. **CORS errors**
   - Edge Functions include proper CORS headers
   - Clear browser cache if issues persist
   - Check that VITE_SUPABASE_URL is correct

## Code Locations

- **Edge Functions**: `/supabase/functions/`
- **Course Generation Integration**: `/src/pages/CreateCourse.tsx` (handleSubmit)
- **Quiz Generation Integration**: `/src/pages/GenerateQuizzes.tsx` (handleGenerateQuizzes)
- **Verification Integration**: `/src/pages/CreateCourse.tsx` (handleVerify)
- **Chat Integration**: `/src/pages/CreateCourse.tsx` (sendChatMessage)
- **Helper Functions**: `/src/lib/edgeFunctions.ts`
