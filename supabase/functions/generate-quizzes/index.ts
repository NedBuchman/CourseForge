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

    for (const lesson of lessons) {
      try {
        if (!lesson.lesson_number || !lesson.title || !lesson.content) {
          throw new Error(`Invalid lesson data: missing required fields (lesson_number, title, or content)`);
        }

        console.log(`Generating ${questionsPerLesson} questions for lesson ${lesson.lesson_number}: ${lesson.title}`);

        const objectives = Array.isArray(lesson.objectives) ? lesson.objectives.join(', ') : '';
        const prompt = `You are an expert assessment designer. Respond ONLY with valid JSON. No text before or after.

**LESSON ${lesson.lesson_number}: ${lesson.title}**
Content: ${lesson.content}
Objectives: ${objectives}

**REQUIREMENTS**
1. Create ${questionsPerLesson} multiple-choice questions testing lesson understanding
2. Each question: clear text, 4 options (A-D), correct answer, brief explanation, difficulty (easy/medium/hard)
3. Mix difficulty levels and test recall, comprehension, application, analysis
4. Ensure correct_answer is ONLY a single letter: A, B, C, or D
5. Each option should be a complete, clear statement

**JSON FORMAT**
{
  "questions": [
    {
      "question_text": "Question text?",
      "question_type": "single-answer",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "A",
      "explanation": "Brief explanation",
      "difficulty": "medium"
    }
  ]
}`;

        const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": claudeApiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 3000,
            temperature: 0.5,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        });

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
