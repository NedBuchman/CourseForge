# LessonPlayer Comprehensive Test Suite

This document describes the automated testing system for the LessonPlayer component and its associated database operations, edge functions, and integrations.

## Overview

The test suite (`test-lesson-player.js`) is a comprehensive automated testing script that validates:

- Database schema and table accessibility
- Course data retrieval and integrity
- Video asset management and tracking
- Lesson completion workflows
- Quiz retrieval and validation
- AI chat integration via edge functions
- Error handling mechanisms
- Row Level Security (RLS) policies
- Data integrity across related tables

## Running the Tests

### Prerequisites

1. Ensure your environment is configured with valid Supabase credentials in `student/.env`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Execute Tests

Run the test suite using:

```bash
npm run test:lesson-player
```

Or directly:

```bash
node test-lesson-player.js
```

## Test Categories

### 1. Database Schema Tests

Validates that all required tables are accessible:

- `courses` - Course metadata and lessons
- `student_course_enrollments` - Student enrollment and progress tracking
- `quizzes` - Quiz content and configuration
- `video_assets` - Generated video URLs and metadata
- `lesson_video_views` - Video watching analytics
- `student_lesson_completions` - Lesson completion records

**Expected Result:** All tables should be accessible without errors.

### 2. Course Data Retrieval Tests

Tests the core data loading flow:

- Fetch published courses
- Validate course structure (title, description, lessons array)
- Verify lessons have required fields (title, content, lessonNumber)
- Check video configuration presence

**Expected Result:** Published courses should have complete, valid data structures.

### 3. Video Asset Retrieval Tests

Validates video generation and retrieval:

- Query video assets by course and lesson
- Verify video URLs are valid HTTP(S) URLs
- Check generation status is "completed"
- Validate asset reference IDs match lesson numbers

**Expected Result:** Completed videos should have valid URLs and proper metadata.

### 4. Video Tracking Tests

Tests the video analytics system:

- Create initial video view record
- Update video progress (position, percentage)
- Mark video as completed at 95%+ watch percentage
- Verify upsert operations work correctly

**Expected Result:** All video tracking operations should succeed without errors.

### 5. Lesson Completion Tests

Tests the lesson completion workflow:

- Record lesson completion in `student_lesson_completions`
- Create/update enrollment records
- Update progress tracking with completed lesson arrays
- Integrate quiz scores into progress data

**Expected Result:** Lesson completions should be properly recorded and retrievable.

### 6. Quiz Retrieval Tests

Validates quiz loading:

- Fetch approved quizzes for a course
- Verify quiz ordering by module_index
- Check quiz has required fields (id, title, module_index)
- Validate approval status

**Expected Result:** Quizzes should be retrievable and properly ordered.

### 7. AI Chat Integration Tests

Tests the lesson-assistant edge function:

- Validate edge function endpoint is accessible
- Test with valid payload (lesson content + user question)
- Verify response structure (success, content)
- Test error handling with invalid payload

**Expected Result:** Edge function should respond correctly to valid requests and reject invalid ones.

### 8. Error Handling Tests

Validates graceful error handling:

- Query non-existent course (should return null, not error)
- Access invalid table (should throw appropriate error)
- Handle empty or null data gracefully

**Expected Result:** System should handle errors gracefully without crashes.

### 9. RLS Policy Tests

Tests Row Level Security:

- Verify public users can view published courses
- Verify public users can view approved quizzes
- Ensure proper access control is enforced

**Expected Result:** RLS policies should allow appropriate public access while protecting private data.

### 10. Data Integrity Tests

Validates data consistency:

- Check published courses have complete data
- Verify all lessons have required fields
- Detect orphaned enrollment records
- Validate foreign key relationships

**Expected Result:** No orphaned records or incomplete data should exist.

## Understanding Test Results

### Output Format

Tests display results with colored indicators:

- ✓ Green checkmark = Test passed
- ✗ Red X = Test failed
- ⚠ Yellow warning = Non-critical issue detected

### Test Summary

At the end, you'll see:

```
╔════════════════════════════════════════════════════════════╗
║   Test Summary                                             ║
╚════════════════════════════════════════════════════════════╝

✓ Passed: 45
✗ Failed: 2
⚠ Warnings: 3

Overall Success Rate: 95%
```

### Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

## Common Warnings

These warnings are expected in certain scenarios:

1. **"No published courses found"**
   - Normal for new installations before any courses are published
   - Not an error, just informational

2. **"No completed videos found"**
   - Expected if video generation hasn't been run yet
   - Videos are optional depending on course configuration

3. **"No approved quizzes found"**
   - Normal if quizzes haven't been created for courses yet
   - Quizzes are optional per lesson

4. **"Edge function returned error"**
   - May indicate missing ANTHROPIC_API_KEY environment variable
   - Check edge function deployment and secrets configuration

## Troubleshooting

### Connection Errors

If you see database connection errors:

1. Verify `student/.env` has correct Supabase credentials
2. Check your internet connection
3. Ensure Supabase project is active and accessible

### Permission Errors

If tests fail with permission errors:

1. Verify RLS policies are properly configured
2. Check that ANON_KEY has appropriate access
3. Review database migration files for policy definitions

### Edge Function Errors

If AI chat tests fail:

1. Verify edge function is deployed: `supabase/functions/lesson-assistant/`
2. Check ANTHROPIC_API_KEY is configured in Supabase dashboard
3. Review edge function logs for detailed error messages

## What This Test Suite DOES NOT Cover

This is an **integration test suite** focused on backend functionality. It does NOT test:

- UI rendering (React components)
- User interactions (clicks, keyboard input)
- Browser-specific behaviors
- Visual appearance or styling
- Client-side state management beyond database interactions
- Performance benchmarks
- Load testing or concurrent user scenarios

For full end-to-end UI testing, consider tools like:
- Cypress
- Playwright
- React Testing Library
- Jest with DOM testing utilities

## Maintenance

### Adding New Tests

To add new test categories:

1. Create a new async function (e.g., `testNewFeature()`)
2. Use `logTest()` to record test results
3. Use `logWarning()` for non-critical issues
4. Add the function call to `runAllTests()`

Example:

```javascript
async function testNewFeature() {
  console.log('\n=== Testing New Feature ===\n');

  try {
    // Your test logic here
    const result = await performTest();

    logTest('New Feature', 'Test description', result === expected,
      result === expected ? 'Success details' : 'Failure details');
  } catch (error) {
    logTest('New Feature', 'Test name', false, error.message);
  }
}
```

### Updating Tests

When database schema or functionality changes:

1. Review affected test categories
2. Update queries to match new schema
3. Adjust expected results if behavior changed
4. Add tests for new fields or features

## CI/CD Integration

To integrate into continuous integration:

```yaml
# Example GitHub Actions workflow
- name: Run LessonPlayer Tests
  run: npm run test:lesson-player
  env:
    VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

The test script returns appropriate exit codes for CI/CD:
- Exit 0: All tests passed
- Exit 1: One or more tests failed

## Performance Considerations

The test suite:

- Makes real database queries (not mocked)
- Calls actual edge functions
- Creates and deletes test records
- Typically completes in 10-30 seconds

Avoid running tests:
- Against production databases with sensitive data
- In parallel (tests may conflict with shared test data)
- Too frequently (respects API rate limits)

## Contributing

When contributing new features to LessonPlayer:

1. Add corresponding tests to this suite
2. Ensure all existing tests still pass
3. Document any expected warnings
4. Update this README if test categories change

## Support

For issues or questions about the test suite:

1. Check test output for specific error messages
2. Review database migration files for schema reference
3. Examine edge function logs for API errors
4. Consult Supabase documentation for RLS and policy issues
