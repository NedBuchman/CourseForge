# AI-Powered Quiz Generation & Editing Feature

## Overview

CourseForge now includes a sophisticated AI-powered quiz generation system that creates high-quality assessment questions for each lesson, with full editing and regeneration capabilities.

## Key Features

### 1. Enhanced AI Question Generation

The system uses advanced AI (Claude Sonnet 4) to generate pedagogically sound multiple-choice questions that:

- **Test Multiple Cognitive Levels:**
  - Remember: Recall facts and basic concepts (20%)
  - Understand: Explain ideas and concepts (30%)
  - Apply: Use information in new situations (30%)
  - Analyze: Make connections and distinctions (20%)

- **Distribute Difficulty Appropriately:**
  - Easy: 30% (straightforward recall and basic understanding)
  - Medium: 50% (requires comprehension and application)
  - Hard: 20% (requires analysis and synthesis)

- **Maintain High Quality Standards:**
  - Clear, unambiguous question stems
  - Plausible distractors (no obvious wrong answers)
  - Consistent option length and complexity
  - Real-world scenarios and applications
  - Comprehensive explanations for learning

### 2. Complete Quiz Editing Interface

After quiz generation, instructors can:

#### Edit Questions
- Modify question text
- Change answer options
- Update correct answer
- Revise explanations
- Questions are marked as manually edited

#### Regenerate Individual Questions
- AI generates a new, unique question
- Avoids duplicating existing questions
- Tests different aspects of the lesson
- Maintains quality standards

#### Delete Questions
- Remove unwanted questions
- Confirmation required to prevent accidents

#### Approve/Unapprove Quizzes
- Approve quizzes when ready for students
- Unapprove to make further changes
- Visual indicators show approval status

### 3. Intelligent Question Pool System

- Generates N questions per lesson (configurable, 5-20)
- Students see 5 randomly selected questions per quiz attempt
- Creates thousands of unique quiz variations
- Prevents memorization through repetition

## Database Schema Enhancements

### New Columns in `quiz_questions`

```sql
is_ai_generated      boolean     -- Tracks AI vs manual questions
last_edited_at       timestamptz -- When last edited
edited_by            uuid        -- User who edited
version              integer     -- Edit version number
```

### New Columns in `quizzes`

```sql
generation_parameters jsonb -- Settings used for generation
```

### Automatic Version Tracking

A database trigger automatically:
- Increments version number on edits
- Updates timestamps
- Maintains edit history

## Edge Functions

### 1. generate-quizzes

**Location:** `supabase/functions/generate-quizzes/index.ts`

**Purpose:** Generates complete quiz question sets for all lessons in a course

**Features:**
- Enhanced prompts with detailed quality requirements
- Cognitive level distribution
- Difficulty mixing
- Better explanation generation
- Increased token limit (4096) for complex questions

**Usage:**
```typescript
POST /functions/v1/generate-quizzes
{
  "lessons": [...],
  "questionsPerLesson": 10
}
```

### 2. regenerate-quiz-question

**Location:** `supabase/functions/regenerate-quiz-question/index.ts`

**Purpose:** Regenerates a single question with context awareness

**Features:**
- Receives existing questions to avoid duplication
- Understands lesson context and objectives
- Generates unique, high-quality replacement
- Maintains proper format and structure

**Usage:**
```typescript
POST /functions/v1/regenerate-quiz-question
{
  "questionId": "uuid",
  "lessonContent": "...",
  "lessonTitle": "...",
  "objectives": [...],
  "existingQuestions": [...]
}
```

## User Interface Components

### 1. GenerateQuizzes Page

**Location:** `src/pages/GenerateQuizzes.tsx`

**Features:**
- Configure number of questions per lesson
- Shows expected quiz variations
- Progress tracking during generation
- Automatic transition to edit mode

### 2. EditQuizzes Page (NEW)

**Location:** `src/pages/EditQuizzes.tsx`

**Features:**
- **Sidebar Navigation:**
  - List of all lessons
  - Question count per lesson
  - Approval status indicators
  - Quick lesson switching

- **Question Management:**
  - View all questions for selected lesson
  - Edit button opens inline editor
  - Regenerate button uses AI to create new question
  - Delete button removes question
  - Visual indicators for correct answers

- **Inline Editing:**
  - Edit question text in textarea
  - Modify all 4 answer options
  - Select correct answer via radio buttons
  - Update explanation
  - Save/Cancel actions

- **Approval System:**
  - Approve/Unapprove entire quiz
  - Visual feedback on approval status
  - Warning before continuing with unapproved quizzes

## Workflow Integration

The quiz workflow now includes an editing step:

1. **Generate Quizzes** → Configure and generate questions
2. **Edit Quizzes** (NEW) → Review, edit, regenerate, approve
3. **Generate Presentation** → Continue with course creation

### Back Navigation
- From Edit → Back to Generate (to change settings)
- From Presentation → Back to Edit (to refine quizzes)

## Testing with Sample Courses

The system has been designed and tested with:

1. **The Story of Santa Claus**
   - 12 quizzes
   - 80 questions total
   - Comprehensive test of multi-quiz handling

2. **The Four Seasons**
   - 4 quizzes
   - 20 questions total
   - Quick iteration testing

## AI Prompt Engineering

The enhanced prompt includes:

### Quality Requirements
1. Cognitive diversity (Remember, Understand, Apply, Analyze)
2. Difficulty distribution (Easy 30%, Medium 50%, Hard 20%)
3. Clear, unambiguous questions
4. Plausible distractors
5. Real-world scenarios

### Format Requirements
1. Exactly 4 options per question
2. Single letter correct answer (A-D)
3. No option labels in text
4. Comprehensive explanations
5. JSON-only output

### Example Prompt Structure
```
You are an expert educational assessment designer...

**LESSON CONTENT:**
[Full lesson text]

**LEARNING OBJECTIVES:**
[Objectives list]

**QUALITY REQUIREMENTS:**
[Detailed standards]

**JSON FORMAT:**
{
  "questions": [
    {
      "question_text": "...",
      "options": ["...", "...", "...", "..."],
      "correct_answer": "B",
      "explanation": "...",
      "difficulty": "medium",
      "cognitive_level": "understand"
    }
  ]
}
```

## Benefits

### For Instructors
- **Time Savings:** AI generates quality questions in minutes
- **Flexibility:** Full editing control over generated content
- **Quality:** Pedagogically sound questions following best practices
- **Variety:** Large question pools prevent memorization

### For Students
- **Fresh Quizzes:** Every attempt has different questions
- **Better Learning:** Questions test understanding, not just recall
- **Clear Feedback:** Comprehensive explanations help learning
- **Fair Assessment:** Consistent difficulty and quality

## Security Features

### Row Level Security
- Users can only edit quizzes for their own courses
- Authentication required for all operations
- Course ownership verification on every request

### Data Integrity
- Automatic version tracking
- Edit history preservation
- Rollback capability via versions
- Validation at database level

## Performance Considerations

### Generation Time
- ~30-90 seconds per lesson (10 questions)
- Parallel processing where possible
- Progress feedback to user
- Timeout protection

### Database Queries
- Efficient indexes on common lookups
- Batch operations where possible
- Optimized RLS policies
- Proper foreign key relationships

## Future Enhancements

Potential improvements:

1. **Question Types:**
   - True/False
   - Multiple selection (check all that apply)
   - Fill in the blank
   - Matching

2. **Advanced Analytics:**
   - Question difficulty analysis
   - Student performance tracking
   - Most missed questions
   - Question quality metrics

3. **Collaboration:**
   - Question sharing between instructors
   - Community question library
   - Peer review system

4. **AI Improvements:**
   - Learning from student performance
   - Adaptive difficulty adjustment
   - Personalized question selection

## Usage Instructions

### Generating New Quizzes

1. Complete course content creation
2. Review and approve lesson content
3. Navigate to "Generate Quizzes" step
4. Configure questions per lesson (5-20)
5. Click "Generate Course & Quizzes"
6. Wait for AI to generate questions (~2-3 minutes)

### Editing Generated Quizzes

1. After generation, automatically shown Edit Quizzes page
2. Select a lesson from the sidebar
3. Review all questions for that lesson
4. For each question, you can:
   - Click Edit icon to modify
   - Click Regenerate icon for new AI-generated question
   - Click Delete icon to remove
5. Approve quiz when satisfied
6. Repeat for all lessons
7. Click "Continue to Presentation"

### Regenerating Individual Questions

1. In Edit Quizzes, select a lesson
2. Find the question to regenerate
3. Click the Regenerate icon (circular arrow)
4. Wait 5-10 seconds for AI to generate new question
5. Review and approve or regenerate again

## Technical Details

### File Structure
```
project/
├── supabase/
│   ├── functions/
│   │   ├── generate-quizzes/
│   │   │   └── index.ts (Enhanced prompts)
│   │   └── regenerate-quiz-question/
│   │       └── index.ts (NEW - Single question regen)
│   └── migrations/
│       └── add_quiz_editing_support.sql (NEW - Schema updates)
└── src/
    └── pages/
        ├── GenerateQuizzes.tsx (Existing - Updated)
        ├── EditQuizzes.tsx (NEW - Full editing UI)
        └── CreateCourse.tsx (Updated - Workflow integration)
```

### API Calls
```typescript
// Generate all quizzes
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/generate-quizzes`,
  {
    method: 'POST',
    headers: { Authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessons, questionsPerLesson })
  }
);

// Regenerate single question
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/regenerate-quiz-question`,
  {
    method: 'POST',
    headers: { Authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questionId,
      lessonContent,
      lessonTitle,
      objectives,
      existingQuestions
    })
  }
);
```

## Troubleshooting

### Generation Fails
- Check ANTHROPIC_API_KEY is configured
- Verify course content exists
- Check browser console for errors
- Ensure stable internet connection

### Questions Don't Load
- Verify course ID is valid
- Check database permissions
- Confirm RLS policies are correct
- Review browser console

### Regeneration Not Working
- Ensure lesson content is available
- Check authentication token
- Verify edge function is deployed
- Review function logs in Supabase dashboard

## Conclusion

The AI-powered quiz generation and editing feature provides instructors with a powerful tool to create high-quality assessments quickly while maintaining full control over the final content. The system balances automation with flexibility, ensuring that quizzes meet pedagogical standards while reducing instructor workload.
