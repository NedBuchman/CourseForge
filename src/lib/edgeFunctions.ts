const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function callEdgeFunction<T>(
  functionName: string,
  payload: any,
  timeoutMs: number = 600000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      console.error(`Edge function ${functionName} error:`, data);
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    if (!data.success) {
      throw new Error(data.error || `Failed to call ${functionName}`);
    }

    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`Error calling edge function ${functionName}:`, error);

    if (error.name === 'AbortError') {
      throw new Error(`Request timeout: The ${functionName} operation took too long to complete. Please try again with a shorter course or simpler requirements.`);
    }

    throw new Error(error.message || `Failed to fetch`);
  }
}

export async function generateCourseContent(payload: {
  subject: string;
  audience: string;
  difficulty: string;
  duration: string;
  objectives?: string;
  context?: string;
  uploadedFileContents?: string[];
}) {
  return callEdgeFunction<{
    success: boolean;
    courseContent: any;
    usage: any;
  }>('generate-course-content', payload);
}

export async function generateQuizzes(payload: {
  lessons: any[];
  questionsPerLesson: number;
}) {
  return callEdgeFunction<{
    success: boolean;
    quizzes: Record<number, any[]>;
  }>('generate-quizzes', payload);
}

export async function verifyCourseContent(payload: {
  course_title: string;
  lessons: any[];
}) {
  return callEdgeFunction<{
    success: boolean;
    verificationResults: {
      verified: boolean;
      accuracy_score: number;
      errors: Array<{
        lesson: number;
        issue: string;
        suggestion: string;
      }>;
    };
  }>('verify-course-content', payload);
}

export async function chatRefinement(payload: {
  message: string;
  courseDetails: {
    subject: string;
    audience: string;
    difficulty: string;
    duration: string;
    objectives?: string;
    context?: string;
  };
  chatHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}) {
  return callEdgeFunction<{
    success: boolean;
    message: string;
  }>('chat-refinement', payload);
}

export async function generateLessonVideos(payload: {
  courseId: string;
  videoAssetIds?: string[];
  regenerateAll?: boolean;
}) {
  return callEdgeFunction<{
    success: boolean;
    message: string;
    videosSubmitted: number;
    totalVideos: number;
    status: string;
  }>('generate-lesson-videos', payload);
}

export async function checkVideoStatus(payload: {
  courseId: string;
}) {
  return callEdgeFunction<{
    success: boolean;
    status: string;
    message: string;
    stats?: {
      total: number;
      completed: number;
      failed: number;
      processing: number;
    };
    completed?: number;
    failed?: number;
    total?: number;
    pending?: number;
  }>('check-video-status', payload);
}
