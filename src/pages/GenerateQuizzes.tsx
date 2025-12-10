import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, BookOpen, Shield, CheckCircle, Clock, TrendingUp, AlertCircle, Home, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Lesson {
  lesson_number: number;
  title: string;
  content: string;
  duration: string;
  objectives: string[];
}

interface CourseContent {
  course_title: string;
  total_lessons: number;
  estimated_duration: string;
  lessons: Lesson[];
}

interface QuizQuestion {
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface GenerateQuizzesProps {
  courseId: string;
  courseContent: CourseContent;
  onBack: () => void;
  onComplete: () => void;
  onBackToCourses?: () => void;
  onLogout?: () => void;
}

export default function GenerateQuizzes({
  courseId,
  courseContent,
  onBack,
  onComplete,
  onBackToCourses,
  onLogout
}: GenerateQuizzesProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [questionsPerLesson, setQuestionsPerLesson] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [generatedQuizzes, setGeneratedQuizzes] = useState<Record<number, QuizQuestion[]>>({});
  const [showResults, setShowResults] = useState(false);

  const totalQuestions = questionsPerLesson * courseContent.total_lessons;
  const questionsPerQuiz = 5;
  const uniqueCombinations = calculateCombinations(questionsPerLesson, questionsPerQuiz);

  function calculateCombinations(n: number, k: number): number {
    if (k > n) return 0;
    if (k === 0 || k === n) return 1;

    let result = 1;
    for (let i = 1; i <= k; i++) {
      result *= (n - k + i) / i;
    }
    return Math.round(result);
  }

  const incrementQuestions = () => {
    if (questionsPerLesson < 20) {
      setQuestionsPerLesson(prev => prev + 1);
    }
  };

  const decrementQuestions = () => {
    if (questionsPerLesson > 5) {
      setQuestionsPerLesson(prev => prev - 1);
    }
  };

  const handleGenerateQuizzes = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus('Starting quiz generation...');

    try {
      console.log('Starting quiz generation:', {
        courseId,
        lessonsCount: courseContent.lessons.length,
        questionsPerLesson
      });

      if (!courseContent.lessons || courseContent.lessons.length === 0) {
        throw new Error('No lessons found in course content');
      }

      setGenerationProgress(10);
      setGenerationStatus('Calling AI to generate quiz questions...');

      let generateResponse;
      try {
        console.log('Calling edge function:', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quizzes`);
        console.log('Request payload:', {
          lessonsCount: courseContent.lessons.length,
          questionsPerLesson,
          firstLesson: courseContent.lessons[0]?.title
        });

        generateResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quizzes`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              lessons: courseContent.lessons,
              questionsPerLesson: questionsPerLesson,
            }),
          }
        );
      } catch (fetchError: any) {
        console.error('Fetch error:', fetchError);
        console.error('Fetch error details:', {
          message: fetchError.message,
          stack: fetchError.stack,
          name: fetchError.name
        });
        throw new Error(`Network error: ${fetchError.message || 'Failed to connect to quiz generation service'}`);
      }

      console.log('Generate quizzes response status:', generateResponse.status);
      console.log('Response headers:', Object.fromEntries(generateResponse.headers.entries()));

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        console.error('Edge function returned error:', errorText);
        throw new Error(`Server error (${generateResponse.status}): ${errorText.substring(0, 200)}`);
      }

      let generateData;
      try {
        generateData = await generateResponse.json();
      } catch (parseError) {
        console.error('Failed to parse response JSON:', parseError);
        throw new Error('Invalid response format from quiz generation service');
      }

      console.log('Quiz generation response:', generateData);

      if (!generateData.success) {
        console.error('Quiz generation failed:', generateData);
        const errorMessage = generateData.error || 'Failed to generate quizzes';
        const details = generateData.details ? `\n\nDetails: ${JSON.stringify(generateData.details)}` : '';
        throw new Error(errorMessage + details);
      }

      if (!generateData.quizzes || typeof generateData.quizzes !== 'object') {
        console.error('Invalid quizzes data structure:', generateData);
        throw new Error('Invalid quiz data received from server');
      }

      const generatedQuizzes = generateData.quizzes;
      const quizCount = Object.keys(generatedQuizzes).length;
      console.log(`Received ${quizCount} quiz sets`);

      if (quizCount !== courseContent.lessons.length) {
        console.warn(`Expected ${courseContent.lessons.length} quiz sets but received ${quizCount}`);
      }

      setGenerationProgress(70);
      setGenerationStatus('Saving quizzes to database...');

      const { data: courseData, error: courseCheckError } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .single();

      if (courseCheckError || !courseData) {
        console.error('Course validation error:', courseCheckError);
        throw new Error('Course not found. Please refresh and try again.');
      }

      let savedCount = 0;
      for (const lesson of courseContent.lessons) {
        try {
          const lessonQuizzes = generatedQuizzes[lesson.lesson_number];

          if (!lessonQuizzes || !Array.isArray(lessonQuizzes) || lessonQuizzes.length === 0) {
            console.error(`No quizzes found for lesson ${lesson.lesson_number}`);
            throw new Error(`Missing quiz questions for lesson ${lesson.lesson_number}: ${lesson.title}`);
          }

          console.log(`Saving quiz for lesson ${lesson.lesson_number} with ${lessonQuizzes.length} questions`);

          const { data: quizData, error: quizError } = await supabase
            .from('quizzes')
            .insert({
              course_id: courseId,
              title: `${lesson.title} Quiz`,
              module_index: lesson.lesson_number,
              approved: false
            })
            .select()
            .single();

          if (quizError) {
            console.error(`Quiz insert error for lesson ${lesson.lesson_number}:`, quizError);
            throw new Error(`Failed to create quiz for lesson ${lesson.lesson_number}: ${quizError.message}`);
          }

          if (!quizData || !quizData.id) {
            console.error('Quiz insert succeeded but no data returned');
            throw new Error(`Failed to create quiz for lesson ${lesson.lesson_number}: no ID returned`);
          }

          const quizQuestions = lessonQuizzes.map((q: QuizQuestion, index: number) => ({
            quiz_id: quizData.id,
            question_text: q.question_text,
            question_type: q.question_type || 'single-answer',
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation || '',
            order_index: index
          }));

          console.log(`Inserting ${quizQuestions.length} questions for quiz ${quizData.id}`);

          const { error: questionsError } = await supabase
            .from('quiz_questions')
            .insert(quizQuestions);

          if (questionsError) {
            console.error(`Questions insert error for lesson ${lesson.lesson_number}:`, questionsError);
            throw new Error(`Failed to save questions for lesson ${lesson.lesson_number}: ${questionsError.message}`);
          }

          savedCount++;
          const progress = 70 + Math.floor((savedCount / courseContent.lessons.length) * 25);
          setGenerationProgress(progress);
          setGenerationStatus(`Saved ${savedCount} of ${courseContent.lessons.length} quizzes...`);

        } catch (lessonError) {
          console.error(`Error processing lesson ${lesson.lesson_number}:`, lessonError);
          throw lessonError;
        }
      }

      console.log(`Successfully saved ${savedCount} quizzes to database`);

      const { error: updateError } = await supabase
        .from('courses')
        .update({
          status: 'completed',
          quizzes_status: 'completed',
          quizzes_accepted_at: new Date().toISOString(),
          current_step: 3,
          last_completed_step: 2,
        })
        .eq('id', courseId);

      if (updateError) {
        console.warn('Failed to update course status:', updateError);
      }

      setGeneratedQuizzes(generatedQuizzes);
      setGenerationProgress(100);
      setGenerationStatus('Quiz generation complete!');
      console.log('Quiz generation completed successfully');

      setTimeout(() => {
        setIsGenerating(false);
        setShowResults(true);
        setSelectedLesson(courseContent.lessons[0].lesson_number);
      }, 500);

    } catch (err) {
      console.error('Error generating quizzes:', err);
      console.error('Error stack:', (err as Error).stack);

      const errorMessage = (err as Error).message || 'An unknown error occurred';
      setGenerationStatus('Error: ' + errorMessage.substring(0, 100));
      setIsGenerating(false);

      alert(
        'Failed to generate quizzes\n\n' +
        'Error: ' + errorMessage + '\n\n' +
        'Please check the browser console for detailed logs and try again. ' +
        'If the problem persists, try generating a course with fewer lessons or contact support.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col">
      <header className="bg-gradient-to-r from-blue-800 to-blue-900 text-white py-4 shadow-lg">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/CourseForgeLogo.png" alt="CourseForge" className="h-8 w-auto" />
            <span className="text-2xl font-black">COURSEFORGE</span>
          </div>
          <div className="flex items-center gap-4">
            {onBackToCourses && (
              <button
                onClick={onBackToCourses}
                className="text-blue-100 hover:text-white transition-colors flex items-center gap-2"
              >
                <Home className="w-5 h-5" />
                <span>Back to Courses</span>
              </button>
            )}
            <button
              onClick={onBack}
              className="text-white hover:text-blue-200 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Course</span>
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="text-blue-100 hover:text-white transition-colors flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="bg-white py-6 shadow-md">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-center gap-8 relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0" />
            <div className="absolute top-1/2 left-0 h-1 bg-green-500 -translate-y-1/2 z-0" style={{ width: '100%' }} />

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-green-500 border-4 border-white flex items-center justify-center text-white font-bold shadow-lg">
                <CheckCircle className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-slate-700 mt-2">Course Details</span>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-green-500 border-4 border-white flex items-center justify-center text-white font-bold shadow-lg">
                <CheckCircle className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-slate-700 mt-2">Review Outline</span>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-600 border-4 border-white flex items-center justify-center text-white font-bold shadow-lg">
                3
              </div>
              <span className="text-sm font-semibold text-blue-900 mt-2">Generate Quizzes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        <aside className="w-80 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Lessons</h2>
            <p className="text-sm text-slate-600">{courseContent.total_lessons} lessons in this course</p>
          </div>

          <div className="p-4 space-y-2">
            {courseContent.lessons.map((lesson) => (
              <button
                key={lesson.lesson_number}
                onClick={() => setSelectedLesson(lesson.lesson_number)}
                className={`w-full text-left p-4 rounded-lg transition-all ${
                  selectedLesson === lesson.lesson_number
                    ? 'bg-blue-100 border-2 border-blue-500'
                    : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {lesson.lesson_number}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm line-clamp-2 flex-1">{lesson.title}</h3>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 ml-11">
                  <Clock className="w-3 h-3" />
                  {lesson.duration}
                </div>
                {generatedQuizzes[lesson.lesson_number] && (
                  <div className="mt-2 ml-11 flex items-center gap-1 text-xs text-green-600 font-semibold">
                    <CheckCircle className="w-3 h-3" />
                    {generatedQuizzes[lesson.lesson_number].length} questions generated
                  </div>
                )}
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          {!showResults ? (
            <div className="container mx-auto max-w-4xl px-6 py-12">
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">📝</div>
                <h1 className="text-4xl font-black text-slate-900 mb-3">Configure Quiz Generation</h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  Set up assessments for your course. AI will generate multiple-choice questions to test learner comprehension after each lesson.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg mb-6">
                <div className="flex items-start gap-3 mb-6">
                  <Sparkles className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">How Quizzes Work</h2>
                    <p className="text-slate-600 mb-4">
                      Quizzes are automatically generated for each lesson and help reinforce learning. Students take quizzes after completing lessons to test their comprehension.
                    </p>

                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-600 rounded-lg p-4">
                      <h3 className="font-bold text-blue-900 mb-2">Smart Quiz System:</h3>
                      <ul className="space-y-2 text-blue-800">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>AI generates a question pool for each lesson</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Students get 5 randomly selected questions per quiz</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Multiple-choice format with 4 answer options each</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Immediate feedback with correct answers shown</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Automatic scoring and progress tracking</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Students can retake quizzes to improve scores</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg mb-6">
                <div className="mb-8 pb-6 border-b-2 border-slate-100">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Quiz Configuration</h2>
                  <p className="text-slate-600">Customize the number of questions generated for each lesson</p>
                </div>

                <div className="mb-8">
                  <label className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-3">
                    Questions in Pool (Per Lesson)
                    <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-white px-3 py-1 rounded-full text-sm">
                      ✨ Recommended: 10
                    </span>
                  </label>
                  <p className="text-slate-600 mb-4">
                    How many questions should AI generate for each lesson? Students will be shown 5 randomly selected questions from this pool when they take the quiz.
                  </p>

                  <div className="flex items-center gap-4 mb-6">
                    <input
                      type="number"
                      value={questionsPerLesson}
                      onChange={(e) => setQuestionsPerLesson(Math.min(20, Math.max(5, parseInt(e.target.value) || 10)))}
                      min="5"
                      max="20"
                      className="w-32 px-6 py-4 text-3xl font-bold border-3 border-slate-300 rounded-xl text-center bg-slate-50 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={incrementQuestions}
                        className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg font-bold text-xl hover:scale-110 transition-transform"
                      >
                        +
                      </button>
                      <button
                        onClick={decrementQuestions}
                        className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg font-bold text-xl hover:scale-110 transition-transform"
                      >
                        −
                      </button>
                    </div>
                    <span className="text-slate-600 font-semibold">questions per lesson</span>
                  </div>

                  <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      Your Quiz Setup
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-lg border-2 border-slate-200 text-center">
                        <div className="text-4xl font-black text-blue-600 mb-1">{totalQuestions}</div>
                        <div className="text-sm font-semibold text-slate-700">Total Questions Generated</div>
                        <div className="text-xs text-slate-500 mt-1">Across all {courseContent.total_lessons} lessons</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border-2 border-slate-200 text-center">
                        <div className="text-4xl font-black text-blue-600 mb-1">{questionsPerQuiz}</div>
                        <div className="text-sm font-semibold text-slate-700">Questions Per Quiz</div>
                        <div className="text-xs text-slate-500 mt-1">Shown to students</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border-2 border-slate-200 text-center">
                        <div className="text-4xl font-black text-blue-600 mb-1">{(uniqueCombinations || 0).toLocaleString()}</div>
                        <div className="text-sm font-semibold text-slate-700">Unique Quiz Variations</div>
                        <div className="text-xs text-slate-500 mt-1">Possible combinations</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <label className="text-lg font-bold text-slate-900 mb-2 block">
                    Answer Options Per Question
                  </label>
                  <p className="text-slate-600 mb-4">
                    Each question will have 4 multiple-choice answers (A, B, C, D) with one correct answer. This is standard for effective assessment.
                  </p>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value="4"
                      disabled
                      className="w-32 px-6 py-4 text-3xl font-bold border-3 border-slate-300 rounded-xl text-center bg-slate-100 cursor-not-allowed"
                    />
                    <span className="text-slate-500 font-semibold">answer choices (fixed)</span>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-6">
                  <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2 text-lg">
                    <Shield className="w-5 h-5" />
                    How Students Experience Quizzes
                  </h3>
                  <div className="text-green-800">
                    <p className="font-semibold mb-2">After completing each lesson:</p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                      <li>Student clicks "Take Quiz" button</li>
                      <li>System randomly selects 5 questions from the {questionsPerLesson}-question pool</li>
                      <li>Student answers multiple-choice questions (4 options each)</li>
                      <li>Upon submission, system immediately shows:
                        <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                          <li>Their score (e.g., 4/5 = 80%)</li>
                          <li>Which questions they got right/wrong</li>
                          <li>The correct answers with explanations</li>
                        </ul>
                      </li>
                      <li>Students can retake the quiz to improve their score (questions randomized each time)</li>
                    </ol>
                    <p className="mt-3 font-semibold">Passing score: 80% (4 out of 5 questions correct) to unlock the next lesson.</p>
                  </div>
                </div>

                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
                  <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Example Quiz Question
                  </h3>
                  <div className="bg-white p-4 rounded-lg border-l-4 border-amber-500">
                    <p className="font-semibold text-slate-900 mb-3">
                      Question: What is the primary purpose of data cleaning in the data analysis process?
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-start gap-2 text-amber-900">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>A. To identify and fix errors, missing values, and inconsistencies in the dataset</span>
                      </li>
                      <li className="flex items-start gap-2 text-amber-900">
                        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">○</span>
                        <span>B. To create visualizations of the data</span>
                      </li>
                      <li className="flex items-start gap-2 text-amber-900">
                        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">○</span>
                        <span>C. To share the data with stakeholders</span>
                      </li>
                      <li className="flex items-start gap-2 text-amber-900">
                        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">○</span>
                        <span>D. To increase the size of the dataset</span>
                      </li>
                    </ul>
                    <div className="pt-3 border-t border-amber-200 text-sm text-amber-900">
                      <p><strong>Correct Answer:</strong> A</p>
                      <p><strong>Explanation:</strong> Data cleaning ensures accuracy by removing errors and handling missing values before analysis.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-8 pt-6 border-t-2 border-slate-100">
                  <button
                    onClick={onBack}
                    className="px-6 py-3 border-2 border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                  >
                    ← Back to Review
                  </button>
                  <button
                    onClick={handleGenerateQuizzes}
                    disabled={isGenerating}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-bold hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Generate Course & Quizzes →
                    <span className="text-sm font-normal ml-2">(~2 minutes)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="container mx-auto max-w-5xl px-6 py-12">
              <div className="bg-white rounded-2xl p-8 shadow-lg mb-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-3xl font-black text-slate-900 mb-2">Review Generated Questions</h2>
                    <p className="text-lg text-slate-600">
                      {totalQuestions} questions have been generated. Review them by lesson and make any adjustments needed.
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-100 to-blue-200 border-l-4 border-blue-600 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-blue-900 font-semibold">Select a lesson from the sidebar to review its questions</p>
                      <p className="text-blue-800 text-sm mt-1">
                        Click on any lesson to see its {questionsPerLesson} generated questions. You can regenerate if needed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedLesson !== null && (() => {
                const lesson = courseContent.lessons.find(l => l.lesson_number === selectedLesson);
                const questions = generatedQuizzes[selectedLesson] || [];

                if (!lesson) return null;

                const getDifficultyColor = (difficulty: string) => {
                  switch (difficulty) {
                    case 'easy': return 'bg-green-100 text-green-700 border-green-300';
                    case 'medium': return 'bg-amber-100 text-amber-700 border-amber-300';
                    case 'hard': return 'bg-red-100 text-red-700 border-red-300';
                    default: return 'bg-slate-100 text-slate-700 border-slate-300';
                  }
                };

                return (
                  <div className="bg-white rounded-2xl p-8 shadow-lg mb-6">
                    <div className="mb-6 pb-6 border-b-2 border-slate-200">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                          {lesson.lesson_number}
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900">{lesson.title}</h3>
                          <p className="text-slate-600 flex items-center gap-2 mt-1">
                            <Clock className="w-4 h-4" />
                            {lesson.duration} • {questions.length} questions in pool
                          </p>
                        </div>
                      </div>
                      <p className="text-slate-600">
                        Students will be randomly shown 5 of these questions when taking the quiz.
                      </p>
                    </div>

                    <div className="space-y-6">
                      {questions.map((question, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-xl p-6 border-2 border-slate-200">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                                {idx + 1}
                              </div>
                              <p className="font-semibold text-slate-900 text-lg flex-1 pt-1">{question.question_text}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getDifficultyColor(question.difficulty)} flex-shrink-0`}>
                              {question.difficulty.toUpperCase()}
                            </span>
                          </div>

                          <div className="ml-13 space-y-3 mb-4">
                            {question.options.map((option, optIdx) => {
                              const letter = String.fromCharCode(65 + optIdx);
                              const isCorrect = letter === question.correct_answer;
                              return (
                                <div
                                  key={optIdx}
                                  className={`p-4 rounded-lg border-2 transition-all ${
                                    isCorrect
                                      ? 'bg-green-50 border-green-400 shadow-sm'
                                      : 'bg-white border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    {isCorrect ? (
                                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    ) : (
                                      <div className="w-5 h-5 flex items-center justify-center text-slate-400 flex-shrink-0 mt-0.5">
                                        ○
                                      </div>
                                    )}
                                    <span className={`flex-1 ${
                                      isCorrect
                                        ? 'text-green-900 font-semibold'
                                        : 'text-slate-700'
                                    }`}>
                                      <strong className="font-bold">{letter}.</strong> {option.replace(/^Option [A-D]: /, '')}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="ml-13 pt-4 border-t-2 border-slate-300">
                            <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-600">
                              <p className="text-sm text-blue-900">
                                <strong className="font-bold">Explanation:</strong> {question.explanation}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex gap-4">
                  <button
                    onClick={onBack}
                    className="flex-1 px-6 py-4 border-2 border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Refine & Regenerate
                  </button>
                  <button
                    onClick={onComplete}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    Accept & Continue
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-center text-slate-500 text-sm mt-4">
                  Next: Generate course presentation
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {isGenerating && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
            <div className="w-20 h-20 border-6 border-slate-200 border-t-green-500 rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-3xl font-black text-slate-900 text-center mb-3">
              Creating Your Complete Course... 🎓
            </h2>
            <p className="text-center text-slate-600 mb-6">
              AI is generating quiz questions with multiple-choice answers and setting up your course structure.
            </p>

            <div className="bg-slate-100 h-3 rounded-full overflow-hidden mb-3">
              <div
                className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
            <p className="text-center text-green-600 font-semibold">{generationStatus}</p>

            <p className="text-center text-slate-500 text-sm mt-6">
              This typically takes 90-120 seconds. Please don't close this window.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
