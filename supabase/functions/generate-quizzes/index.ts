import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Lesson {
  lesson_number: number;
  title: string;
  content: string;
  duration: string;
  objectives: string[];
}

interface QuizRequest {
  lessons: Lesson[];
  questionsPerLesson: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("Quiz generation request received");
    console.log("Request method:", req.method);
    console.log("Request headers:", JSON.stringify(Object.fromEntries(req.headers.entries())));

    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Request body parsed successfully");
    } catch (jsonError) {
      console.error("Failed to parse request body:", jsonError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid JSON in request body",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!claudeApiKey) {
      console.error("ANTHROPIC_API_KEY not configured in environment");
      return new Response(
        JSON.stringify({
          success: false,
          error: "ANTHROPIC_API_KEY not configured in environment",
        }),
        {
          status: 503,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { lessons, questionsPerLesson } = requestBody as QuizRequest;

    if (!lessons || !Array.isArray(lessons) || lessons.length === 0) {
      throw new Error("Invalid lessons data: must be a non-empty array");
    }

    if (!questionsPerLesson || questionsPerLesson < 5 || questionsPerLesson > 20) {
      throw new Error("Invalid questionsPerLesson: must be between 5 and 20");
    }

    console.log(`Starting quiz generation for ${lessons.length} lessons with ${questionsPerLesson} questions per lesson`);

    const allQuizzes: Record<number, any[]> = {};
    const errors: Array<{ lesson: number; error: string }> = [];

    // Add timeout for the entire operation (9 minutes)
    const startTime = Date.now();
    const maxDuration = 540000; // 9 minutes

    for (const lesson of lessons) {
      // Check if we're approaching timeout
      if (Date.now() - startTime > maxDuration) {
        console.warn(`Approaching timeout limit, stopping at lesson ${lesson.lesson_number}`);
        errors.push({
          lesson: lesson.lesson_number,
          error: 'Generation stopped due to time limit. Please try generating fewer lessons or with fewer questions per lesson.'
        });
        break;
      }

      try {
        if (!lesson.lesson_number || !lesson.title || !lesson.content) {
          throw new Error(`Invalid lesson data: missing required fields (lesson_number, title, or content)`);
        }

        console.log(`Generating ${questionsPerLesson} questions for lesson ${lesson.lesson_number}: ${lesson.title}`);

        const objectives = Array.isArray(lesson.objectives) ? lesson.objectives.join(', ') : '';
        const prompt = `You are an expert educational assessment designer specializing in creating high-quality, pedagogically sound multiple-choice questions. Your questions should test deep understanding, not just memorization.

**LESSON ${lesson.lesson_number}: ${lesson.title}**

**LESSON CONTENT:**
${lesson.content}

**LEARNING OBJECTIVES:**
${objectives}

**YOUR TASK:**
Create ${questionsPerLesson} multiple-choice questions that effectively assess student understanding of this lesson.

**QUALITY REQUIREMENTS:**

1. **Cognitive Diversity** - Questions should test different cognitive levels:
   - Remember: Recall facts and basic concepts (20%)
   - Understand: Explain ideas and concepts (30%)
   - Apply: Use information in new situations (30%)
   - Analyze: Make connections and distinctions (20%)

2. **Difficulty Distribution** - Mix difficulty levels:
   - Easy: 30% (straightforward recall and basic understanding)
   - Medium: 50% (requires comprehension and application)
   - Hard: 20% (requires analysis and synthesis)

3. **Question Quality:**
   - Clear, unambiguous question stems
   - All options should be plausible (avoid obvious wrong answers)
   - Options should be similar in length and complexity
   - Avoid "all of the above" or "none of the above"
   - Use scenarios and real-world applications when possible
   - Test understanding of WHY, not just WHAT

4. **Answer Options:**
   - Exactly 4 options per question (A, B, C, D)
   - All distractors should be plausible but incorrect
   - Avoid giving away the answer through grammar clues or length
   - Mix up the position of correct answers (don't always make it 'A')

5. **Explanations:**
   - Explain WHY the correct answer is right
   - Briefly mention why key distractors are wrong
   - Help students learn from mistakes
   - Keep explanations concise but informative (2-3 sentences)

**CRITICAL FORMAT REQUIREMENTS:**
- Respond ONLY with valid JSON (no markdown, no code blocks, no extra text)
- correct_answer must be ONLY a single letter: A, B, C, or D
- Each option should be a complete, clear statement WITHOUT labels like "A)" or "Option A:"

**JSON FORMAT:**
{
  "questions": [
    {
      "question_text": "Clear, specific question?",
      "question_type": "single-answer",
      "options": ["First option", "Second option", "Third option", "Fourth option"],
      "correct_answer": "B",
      "explanation": "Explanation of correct answer and why other options are incorrect.",
      "difficulty": "medium",
      "cognitive_level": "understand"
    }
  ]
}

Generate exactly ${questionsPerLesson} high-quality questions now:`;

        // Add timeout for individual Claude API call (90 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);

        let claudeResponse;
        try {
          claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": claudeApiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 4096,
              temperature: 0.7,
              messages: [
                {
                  role: "user",
                  content: prompt,
                },
              ],
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            throw new Error(`Claude API timeout after 90 seconds for lesson ${lesson.lesson_number}`);
          }
          throw fetchError;
        }

        if (!claudeResponse.ok) {
          const errorText = await claudeResponse.text();
          console.error(`Claude API Error for lesson ${lesson.lesson_number}:`, errorText);
          throw new Error(`Claude API error (${claudeResponse.status}): ${errorText.substring(0, 200)}`);
        }

        const claudeData = await claudeResponse.json();

        if (!claudeData.content || !claudeData.content[0] || !claudeData.content[0].text) {
          console.error("Invalid Claude response structure:", JSON.stringify(claudeData));
          throw new Error("Invalid response structure from Claude API");
        }

        let contentText = claudeData.content[0].text;
        console.log(`Raw response for lesson ${lesson.lesson_number}:`, contentText.substring(0, 200));

        contentText = contentText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

        let quizData;
        try {
          quizData = JSON.parse(contentText);
        } catch (parseError) {
          console.error(`Failed to parse Claude response for lesson ${lesson.lesson_number}:`, contentText);
          throw new Error(`Failed to parse quiz questions - invalid JSON format`);
        }

        if (!quizData.questions || !Array.isArray(quizData.questions)) {
          console.error(`Invalid quiz data structure for lesson ${lesson.lesson_number}:`, JSON.stringify(quizData));
          throw new Error("Quiz data missing 'questions' array");
        }

        if (quizData.questions.length !== questionsPerLesson) {
          console.warn(`Expected ${questionsPerLesson} questions but got ${quizData.questions.length} for lesson ${lesson.lesson_number}`);
        }

        for (let i = 0; i < quizData.questions.length; i++) {
          const q = quizData.questions[i];
          if (!q.question_text || !q.options || !Array.isArray(q.options) || q.options.length !== 4 || !q.correct_answer || !q.explanation) {
            console.error(`Invalid question structure at index ${i} for lesson ${lesson.lesson_number}:`, JSON.stringify(q));
            throw new Error(`Question ${i + 1} is missing required fields or has incorrect format`);
          }
          if (!/^[A-D]$/.test(q.correct_answer)) {
            console.error(`Invalid correct_answer format for question ${i} in lesson ${lesson.lesson_number}: "${q.correct_answer}"`);
            throw new Error(`Question ${i + 1} has invalid correct_answer format. Must be A, B, C, or D`);
          }
        }

        allQuizzes[lesson.lesson_number] = quizData.questions;
        console.log(`Successfully generated ${quizData.questions.length} questions for lesson ${lesson.lesson_number}`);

      } catch (lessonError) {
        console.error(`Error processing lesson ${lesson.lesson_number}:`, lessonError);
        errors.push({
          lesson: lesson.lesson_number,
          error: lessonError.message || String(lessonError)
        });
      }
    }

    if (errors.length > 0) {
      console.error(`Quiz generation completed with ${errors.length} error(s):`, JSON.stringify(errors));
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to generate quizzes for ${errors.length} lesson(s)`,
          details: errors,
          partialResults: allQuizzes
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`Quiz generation completed successfully for all ${lessons.length} lessons`);
    return new Response(
      JSON.stringify({
        success: true,
        quizzes: allQuizzes,
        totalLessons: lessons.length,
        totalQuestions: Object.values(allQuizzes).reduce((sum, questions) => sum + questions.length, 0)
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Top-level error in generate-quizzes:", error);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An unexpected error occurred",
        details: error.stack || String(error),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
