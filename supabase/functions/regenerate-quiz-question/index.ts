import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RegenerateRequest {
  questionId: string;
  lessonContent: string;
  lessonTitle: string;
  objectives: string[];
  existingQuestions: Array<{
    question_text: string;
    correct_answer: string;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!claudeApiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { questionId, lessonContent, lessonTitle, objectives, existingQuestions } = await req.json() as RegenerateRequest;

    if (!questionId || !lessonContent || !lessonTitle) {
      throw new Error("Missing required fields");
    }

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const existingQuestionsText = existingQuestions
      .map((q, i) => `${i + 1}. ${q.question_text} (Answer: ${q.correct_answer})`)
      .join('\n');

    const objectivesText = Array.isArray(objectives) ? objectives.join(', ') : '';

    const prompt = `You are an expert educational assessment designer. Generate ONE new, unique multiple-choice question for this lesson.

**LESSON: ${lessonTitle}**

**LESSON CONTENT:**
${lessonContent}

**LEARNING OBJECTIVES:**
${objectivesText}

**EXISTING QUESTIONS (DO NOT DUPLICATE):**
${existingQuestionsText}

**REQUIREMENTS:**
1. Create ONE multiple-choice question that is DIFFERENT from existing questions
2. Test a different aspect or concept from the lesson
3. Follow best practices for question quality:
   - Clear, unambiguous question stem
   - 4 plausible options (A, B, C, D)
   - Options should be similar in length and complexity
   - Mix up the position of the correct answer
   - Test understanding of WHY, not just WHAT

4. **Difficulty Levels:**
   - Easy: Straightforward recall and basic understanding
   - Medium: Requires comprehension and application
   - Hard: Requires analysis and synthesis

5. **Cognitive Levels:**
   - Remember: Recall facts and basic concepts
   - Understand: Explain ideas and concepts
   - Apply: Use information in new situations
   - Analyze: Make connections and distinctions

6. **Explanation Quality:**
   - Explain WHY the correct answer is right
   - Briefly mention why key distractors are wrong
   - Help students learn from mistakes
   - 2-3 sentences, concise but informative

**CRITICAL FORMAT:**
- Respond with ONLY valid JSON (no markdown, no code blocks, no extra text)
- correct_answer must be a single letter: A, B, C, or D
- Options should NOT have labels like "A)" or "Option A:"

**JSON FORMAT:**
{
  "question_text": "Clear, specific question?",
  "question_type": "single-answer",
  "options": ["First option", "Second option", "Third option", "Fourth option"],
  "correct_answer": "B",
  "explanation": "Explanation of correct answer and why other options are incorrect.",
  "difficulty": "medium",
  "cognitive_level": "understand"
}

Generate ONE high-quality question now:`;

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        temperature: 0.8,
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
      throw new Error(`Claude API error: ${errorText.substring(0, 200)}`);
    }

    const claudeData = await claudeResponse.json();
    let contentText = claudeData.content[0].text;

    contentText = contentText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

    const questionData = JSON.parse(contentText);

    if (!questionData.question_text || !questionData.options || !Array.isArray(questionData.options) ||
        questionData.options.length !== 4 || !questionData.correct_answer || !questionData.explanation) {
      throw new Error("Invalid question structure from AI");
    }

    if (!/^[A-D]$/.test(questionData.correct_answer)) {
      throw new Error("Invalid correct_answer format");
    }

    const { data: updatedQuestion, error: updateError } = await supabaseClient
      .from('quiz_questions')
      .update({
        question_text: questionData.question_text,
        options: questionData.options,
        correct_answer: questionData.correct_answer,
        explanation: questionData.explanation,
        edited_by: user.id,
        is_ai_generated: true
      })
      .eq('id', questionId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update question: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        question: updatedQuestion
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in regenerate-quiz-question:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An unexpected error occurred",
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
