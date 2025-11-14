import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from './supabase';

interface CourseContent {
  course_title: string;
  total_lessons: number;
  estimated_duration: string;
  lessons: Array<{
    lesson_number: number;
    title: string;
    content: string;
  }>;
}

interface LandingPageConfig {
  course_headline: string;
  value_proposition: string;
  audience_description: string;
  instructor_bio: string | null;
  page_style: string;
  primary_color: string;
  secondary_color: string;
  hero_image_url: string | null;
  cta_button_text: string;
  pricing_info: string | null;
  testimonials: string | null;
  special_message: string | null;
  course_benefits: Array<{
    icon: string;
    title: string;
    description: string;
  }> | null;
}

interface Quiz {
  id: string;
  title: string;
  module_index: number;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  order_index: number;
}

export async function exportCourseProject(
  courseId: string,
  courseContent: CourseContent,
  landingConfig: LandingPageConfig
): Promise<void> {
  const zip = new JSZip();
  const projectName = courseContent.course_title.toLowerCase().replace(/\s+/g, '-');

  const indexHtml = generateLandingPage(courseContent, landingConfig);
  zip.file('index.html', indexHtml);

  const loginHtml = generateStudentLoginPage(courseContent, landingConfig);
  zip.file('login.html', loginHtml);

  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('*')
    .eq('course_id', courseId)
    .order('module_index');

  const quizzesWithQuestions: Array<Quiz & { questions: QuizQuestion[] }> = [];

  if (quizzes && quizzes.length > 0) {
    for (const quiz of quizzes) {
      const { data: questions } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('order_index');

      quizzesWithQuestions.push({
        ...quiz,
        questions: questions || []
      });
    }
  }

  courseContent.lessons.forEach((lesson) => {
    const lessonHtml = generateLessonPage(lesson, courseContent, landingConfig, quizzesWithQuestions);
    zip.file(`lesson-${lesson.lesson_number}.html`, lessonHtml);
  });

  quizzesWithQuestions.forEach((quiz) => {
    const quizHtml = generateQuizPage(quiz, courseContent, landingConfig);
    zip.file(`quiz-${quiz.module_index}.html`, quizHtml);
  });

  const courseDashboardHtml = generateCourseDashboard(courseContent, landingConfig, quizzesWithQuestions);
  zip.file('dashboard.html', courseDashboardHtml);

  const certificateHtml = generateCertificatePage(courseContent, landingConfig, courseId);
  zip.file('certificate.html', certificateHtml);

  const readmeContent = generateReadme(courseContent);
  zip.file('README.md', readmeContent);

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `${projectName}.zip`);
}

function generateLandingPage(course: CourseContent, config: LandingPageConfig): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${course.course_title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white">
  <!-- Hero Section -->
  <section class="text-white p-12 text-center" style="background: linear-gradient(135deg, ${config.primary_color} 0%, ${config.primary_color}dd 100%);">
    ${config.hero_image_url ? `
    <div class="mb-6">
      <img src="${config.hero_image_url}" alt="Course Hero" class="max-w-md mx-auto rounded-lg shadow-lg">
    </div>` : ''}
    <h1 class="text-5xl font-black leading-tight mb-6">${config.course_headline}</h1>
    <p class="text-xl opacity-95 mb-8 leading-relaxed max-w-3xl mx-auto">${config.value_proposition}</p>
    <a href="login.html" class="inline-block px-8 py-4 rounded-xl text-xl font-bold shadow-xl transition-transform hover:scale-105" style="background: ${config.secondary_color}; color: white;">
      ${config.cta_button_text} →
    </a>
    ${config.pricing_info ? `<p class="mt-6 text-lg opacity-90">${config.pricing_info}</p>` : ''}
  </section>

  ${config.course_benefits && config.course_benefits.length > 0 ? `
  <!-- Benefits Section -->
  <section class="p-12 bg-white">
    <h2 class="text-4xl font-black text-gray-900 mb-12 text-center">What You'll Learn</h2>
    <div class="grid md:grid-cols-${config.course_benefits.length > 3 ? '4' : config.course_benefits.length} gap-8 max-w-6xl mx-auto">
      ${config.course_benefits.map(benefit => `
      <div class="text-center p-6">
        <div class="text-5xl mb-4">${benefit.icon}</div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">${benefit.title}</h3>
        <p class="text-gray-600">${benefit.description}</p>
      </div>`).join('')}
    </div>
  </section>` : ''}

  <!-- Course Structure -->
  <section class="bg-gray-50 p-12">
    <h2 class="text-4xl font-black text-gray-900 mb-12 text-center">Course Structure (${course.total_lessons} Lessons)</h2>
    <div class="max-w-4xl mx-auto space-y-4">
      ${course.lessons.map(lesson => `
      <div class="bg-white p-6 rounded-xl shadow-md border-l-4" style="border-color: ${config.primary_color};">
        <h3 class="text-xl font-bold text-gray-900 mb-2">Lesson ${lesson.lesson_number}: ${lesson.title}</h3>
        <p class="text-gray-600 leading-relaxed">${lesson.content.substring(0, 150)}...</p>
      </div>`).join('')}
    </div>
  </section>

  <!-- Who This Course Is For -->
  <section class="p-12 bg-white">
    <h2 class="text-4xl font-black text-gray-900 mb-8 text-center">Who This Course Is For</h2>
    <div class="max-w-3xl mx-auto text-center">
      <p class="text-lg text-gray-700 leading-relaxed">${config.audience_description}</p>
    </div>
  </section>

  ${config.instructor_bio ? `
  <!-- Instructor -->
  <section class="bg-gray-50 p-12">
    <h2 class="text-4xl font-black text-gray-900 mb-8 text-center">Your Instructor</h2>
    <div class="max-w-3xl mx-auto text-center">
      <p class="text-lg text-gray-700 leading-relaxed">${config.instructor_bio}</p>
    </div>
  </section>` : ''}

  ${config.testimonials ? `
  <!-- Testimonials -->
  <section class="p-12 bg-white">
    <h2 class="text-4xl font-black text-gray-900 mb-12 text-center">What Students Say</h2>
    <div class="max-w-4xl mx-auto space-y-6">
      ${config.testimonials.split('---').map(testimonial => {
        const lines = testimonial.trim().split('\n');
        const quote = lines[0]?.replace(/^["']|["']$/g, '');
        const author = lines[1] || '';
        return `
      <div class="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <p class="text-lg text-gray-700 italic mb-4 leading-relaxed">"${quote}"</p>
        ${author ? `<p class="font-bold text-gray-900">${author}</p>` : ''}
      </div>`;
      }).join('')}
    </div>
  </section>` : ''}

  ${config.special_message ? `
  <!-- Special Message -->
  <section class="bg-gradient-to-r from-amber-100 to-yellow-100 p-12 text-center">
    <div class="text-4xl mb-4">✨</div>
    <p class="text-xl text-amber-900 font-semibold leading-relaxed max-w-3xl mx-auto">${config.special_message}</p>
  </section>` : ''}

  <!-- CTA Section -->
  <section class="text-white p-12 text-center" style="background: linear-gradient(135deg, ${config.secondary_color} 0%, ${config.secondary_color}dd 100%);">
    <h2 class="text-4xl font-black mb-6">Ready to Start Learning?</h2>
    <p class="text-xl opacity-95 mb-8 max-w-2xl mx-auto">Join students who've transformed their skills. Start your journey today.</p>
    <a href="login.html" class="inline-block px-8 py-4 bg-white rounded-xl text-xl font-bold shadow-xl transition-transform hover:scale-105" style="color: ${config.secondary_color};">
      ${config.cta_button_text} →
    </a>
  </section>

  <!-- Footer -->
  <footer class="bg-gray-900 text-gray-400 p-8 text-center">
    <p>&copy; 2025 ${course.course_title}. All rights reserved.</p>
  </footer>
</body>
</html>`;
}

function generateStudentLoginPage(course: CourseContent, config: LandingPageConfig): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Student Login - ${course.course_title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
  <div class="min-h-screen flex items-center justify-center p-6">
    <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-black text-gray-900 mb-2">${course.course_title}</h1>
        <p class="text-gray-600">Student Portal</p>
      </div>

      <div class="mb-6">
        <div class="flex gap-2 bg-gray-100 rounded-lg p-1">
          <button onclick="showLogin()" id="loginTab" class="flex-1 px-4 py-2 rounded-lg font-bold bg-white shadow-sm">Login</button>
          <button onclick="showRegister()" id="registerTab" class="flex-1 px-4 py-2 rounded-lg font-bold text-gray-600">Register</button>
        </div>
      </div>

      <div id="loginForm">
        <form onsubmit="handleLogin(event)">
          <div class="mb-4">
            <label class="block text-gray-700 font-bold mb-2">Email</label>
            <input type="email" required class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500">
          </div>
          <div class="mb-6">
            <label class="block text-gray-700 font-bold mb-2">Password</label>
            <input type="password" required class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500">
          </div>
          <button type="submit" class="w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all hover:shadow-xl" style="background: ${config.primary_color};">
            Login
          </button>
        </form>
      </div>

      <div id="registerForm" class="hidden">
        <form onsubmit="handleRegister(event)">
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-gray-700 font-bold mb-2">First Name</label>
              <input type="text" required class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500">
            </div>
            <div>
              <label class="block text-gray-700 font-bold mb-2">Last Name</label>
              <input type="text" required class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500">
            </div>
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 font-bold mb-2">Email</label>
            <input type="email" required class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500">
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 font-bold mb-2">Password</label>
            <input type="password" required class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500">
          </div>
          <div class="mb-6">
            <label class="block text-gray-700 font-bold mb-2">Confirm Password</label>
            <input type="password" required class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500">
          </div>
          <button type="submit" class="w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all hover:shadow-xl" style="background: ${config.primary_color};">
            Create Account
          </button>
        </form>
      </div>

      <div class="mt-6 text-center">
        <a href="index.html" class="text-blue-600 hover:underline">← Back to Course Info</a>
      </div>
    </div>
  </div>

  <script>
    function showLogin() {
      document.getElementById('loginForm').classList.remove('hidden');
      document.getElementById('registerForm').classList.add('hidden');
      document.getElementById('loginTab').classList.add('bg-white', 'shadow-sm');
      document.getElementById('loginTab').classList.remove('text-gray-600');
      document.getElementById('registerTab').classList.remove('bg-white', 'shadow-sm');
      document.getElementById('registerTab').classList.add('text-gray-600');
    }

    function showRegister() {
      document.getElementById('loginForm').classList.add('hidden');
      document.getElementById('registerForm').classList.remove('hidden');
      document.getElementById('registerTab').classList.add('bg-white', 'shadow-sm');
      document.getElementById('registerTab').classList.remove('text-gray-600');
      document.getElementById('loginTab').classList.remove('bg-white', 'shadow-sm');
      document.getElementById('loginTab').classList.add('text-gray-600');
    }

    function handleLogin(event) {
      event.preventDefault();
      localStorage.setItem('studentLoggedIn', 'true');
      window.location.href = 'dashboard.html';
    }

    function handleRegister(event) {
      event.preventDefault();
      localStorage.setItem('studentLoggedIn', 'true');
      window.location.href = 'dashboard.html';
    }
  </script>
</body>
</html>`;
}

function generateCourseDashboard(course: CourseContent, config: LandingPageConfig, quizzes: Array<Quiz & { questions: QuizQuestion[] }>): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Course Dashboard - ${course.course_title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
  <script>
    if (!localStorage.getItem('studentLoggedIn')) {
      window.location.href = 'login.html';
    }
  </script>

  <header class="bg-white shadow-sm">
    <div class="container mx-auto px-6 py-4 flex justify-between items-center">
      <h1 class="text-2xl font-black text-gray-900">${course.course_title}</h1>
      <button onclick="logout()" class="px-4 py-2 text-gray-600 hover:text-gray-900">Logout</button>
    </div>
  </header>

  <main class="container mx-auto px-6 py-12">
    <div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
      <h2 class="text-3xl font-black text-gray-900 mb-4">Welcome to Your Course!</h2>
      <p class="text-gray-600 text-lg mb-6">${course.estimated_duration} of learning content</p>
      <div class="bg-gray-200 rounded-full h-4 mb-2">
        <div class="bg-green-500 h-4 rounded-full" style="width: 0%"></div>
      </div>
      <p class="text-sm text-gray-600">0% Complete</p>
    </div>

    <div class="bg-white rounded-2xl shadow-lg p-8">
      <h2 class="text-2xl font-black text-gray-900 mb-6">Course Content</h2>
      <div class="space-y-4">
        ${course.lessons.map((lesson) => {
          const quiz = quizzes.find(q => q.module_index === lesson.lesson_number);
          return `
        <div class="border-2 border-gray-200 rounded-xl overflow-hidden">
          <a href="lesson-${lesson.lesson_number}.html" class="block p-6 hover:bg-gray-50 transition-all">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white" style="background: ${config.primary_color};">
                ${lesson.lesson_number}
              </div>
              <div class="flex-1">
                <h3 class="text-xl font-bold text-gray-900">${lesson.title}</h3>
                <p class="text-gray-600">Lesson ${lesson.lesson_number} of ${course.total_lessons}</p>
              </div>
              <div class="text-gray-400">→</div>
            </div>
          </a>
          ${quiz ? `
          <a href="quiz-${quiz.module_index}.html" class="block p-6 bg-amber-50 border-t-2 border-gray-200 hover:bg-amber-100 transition-all">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white bg-amber-500">
                ✓
              </div>
              <div class="flex-1">
                <h3 class="text-xl font-bold text-gray-900">${quiz.title}</h3>
                <p class="text-gray-600">${quiz.questions.length} questions</p>
              </div>
              <div class="text-gray-400">→</div>
            </div>
          </a>` : ''}
        </div>`;
        }).join('')}
      </div>
    </div>

    <div class="bg-gradient-to-r from-green-100 to-teal-100 rounded-2xl p-8 shadow-lg text-center">
      <div class="text-5xl mb-4">🎓</div>
      <h2 class="text-2xl font-black text-gray-900 mb-4">Complete Your Course Journey</h2>
      <p class="text-gray-700 mb-6">
        Finish all lessons and quizzes to earn your certificate of completion
      </p>
      <a href="certificate.html" class="inline-block px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all">
        View Certificate →
      </a>
    </div>
  </main>

  <script>
    function logout() {
      localStorage.removeItem('studentLoggedIn');
      window.location.href = 'index.html';
    }
  </script>
</body>
</html>`;
}

function generateLessonPage(
  lesson: { lesson_number: number; title: string; content: string },
  course: CourseContent,
  config: LandingPageConfig,
  quizzes: Array<Quiz & { questions: QuizQuestion[] }>
): string {
  const prevLesson = lesson.lesson_number > 1 ? lesson.lesson_number - 1 : null;
  const nextLesson = lesson.lesson_number < course.total_lessons ? lesson.lesson_number + 1 : null;
  const currentQuiz = quizzes.find(q => q.module_index === lesson.lesson_number);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lesson ${lesson.lesson_number}: ${lesson.title} - ${course.course_title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
  <script>
    if (!localStorage.getItem('studentLoggedIn')) {
      window.location.href = 'login.html';
    }
  </script>

  <header class="bg-white shadow-sm">
    <div class="container mx-auto px-6 py-4 flex justify-between items-center">
      <a href="dashboard.html" class="text-blue-600 hover:underline">← Back to Dashboard</a>
      <h1 class="text-xl font-black text-gray-900">${course.course_title}</h1>
      <button onclick="logout()" class="px-4 py-2 text-gray-600 hover:text-gray-900">Logout</button>
    </div>
  </header>

  <main class="container mx-auto px-6 py-12 max-w-4xl">
    <div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
      <div class="mb-8">
        <p class="text-sm font-bold mb-2" style="color: ${config.primary_color};">LESSON ${lesson.lesson_number} OF ${course.total_lessons}</p>
        <h1 class="text-4xl font-black text-gray-900 mb-4">${lesson.title}</h1>
      </div>

      <div class="prose prose-lg max-w-none">
        ${lesson.content.split('\n\n').map(para => `<p class="mb-6 leading-relaxed text-gray-700">${para}</p>`).join('')}
      </div>

      ${currentQuiz ? `
      <div class="mt-8 p-6 bg-amber-50 border-2 border-amber-200 rounded-xl">
        <h3 class="text-xl font-bold text-amber-900 mb-2">Ready to test your knowledge?</h3>
        <p class="text-amber-800 mb-4">Take the quiz for this lesson to check your understanding.</p>
        <a href="quiz-${currentQuiz.module_index}.html" class="inline-block px-6 py-3 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 transition-all">
          Take Quiz: ${currentQuiz.title} →
        </a>
      </div>` : ''}

      <div class="mt-12 pt-8 border-t border-gray-200 flex justify-between items-center">
        ${prevLesson ? `
        <a href="lesson-${prevLesson}.html" class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-all">
          ← Previous Lesson
        </a>` : '<div></div>'}

        ${nextLesson ? `
        <a href="lesson-${nextLesson}.html" class="px-6 py-3 text-white rounded-lg font-bold hover:shadow-lg transition-all" style="background: ${config.primary_color};">
          Next Lesson →
        </a>` : `
        <a href="dashboard.html" class="px-6 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-all">
          Complete Course ✓
        </a>`}
      </div>
    </div>
  </main>

  <script>
    function logout() {
      localStorage.removeItem('studentLoggedIn');
      window.location.href = 'index.html';
    }
  </script>
</body>
</html>`;
}

function generateQuizPage(
  quiz: Quiz & { questions: QuizQuestion[] },
  course: CourseContent,
  config: LandingPageConfig
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${quiz.title} - ${course.course_title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
  <script>
    if (!localStorage.getItem('studentLoggedIn')) {
      window.location.href = 'login.html';
    }
  </script>

  <header class="bg-white shadow-sm">
    <div class="container mx-auto px-6 py-4 flex justify-between items-center">
      <a href="dashboard.html" class="text-blue-600 hover:underline">← Back to Dashboard</a>
      <h1 class="text-xl font-black text-gray-900">${course.course_title}</h1>
      <button onclick="logout()" class="px-4 py-2 text-gray-600 hover:text-gray-900">Logout</button>
    </div>
  </header>

  <main class="container mx-auto px-6 py-12 max-w-4xl">
    <div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
      <div class="mb-8">
        <p class="text-sm font-bold mb-2 text-amber-600">QUIZ FOR LESSON ${quiz.module_index}</p>
        <h1 class="text-4xl font-black text-gray-900 mb-4">${quiz.title}</h1>
        <p class="text-gray-600">${quiz.questions.length} questions</p>
      </div>

      <form id="quizForm" onsubmit="submitQuiz(event)">
        ${quiz.questions.map((question, idx) => `
        <div class="mb-8 p-6 bg-gray-50 rounded-xl">
          <h3 class="text-lg font-bold text-gray-900 mb-4">
            Question ${idx + 1}: ${question.question_text}
          </h3>
          <div class="space-y-3">
            ${question.options.map((option, optIdx) => {
              const letter = String.fromCharCode(65 + optIdx);
              return `
            <label class="flex items-start gap-3 p-4 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-500 transition-all">
              <input type="radio" name="question-${question.id}" value="${letter}" class="mt-1" required>
              <span class="flex-1">
                <strong class="text-blue-600">${letter}.</strong> ${option}
              </span>
            </label>`;
            }).join('')}
          </div>
          <div id="explanation-${question.id}" class="hidden mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <p class="text-sm font-bold text-blue-900 mb-1">Explanation:</p>
            <p class="text-sm text-blue-800">${question.explanation}</p>
          </div>
        </div>`).join('')}

        <div id="results" class="hidden mb-8 p-6 rounded-xl"></div>

        <div class="flex gap-4">
          <button type="submit" id="submitBtn" class="flex-1 px-8 py-4 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all" style="background: ${config.primary_color};">
            Submit Quiz
          </button>
          <a href="lesson-${quiz.module_index}.html" class="px-8 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-200 transition-all text-center">
            Back to Lesson
          </a>
        </div>
      </form>

      <div id="nextSteps" class="hidden mt-8 pt-8 border-t border-gray-200 flex justify-center">
        ${quiz.module_index < course.total_lessons ? `
        <a href="lesson-${quiz.module_index + 1}.html" class="px-8 py-4 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all" style="background: ${config.primary_color};">
          Continue to Next Lesson →
        </a>` : `
        <a href="dashboard.html" class="px-8 py-4 bg-green-500 text-white rounded-xl font-bold text-lg hover:bg-green-600 transition-all">
          Return to Dashboard
        </a>`}
      </div>
    </div>
  </main>

  <script>
    const correctAnswers = ${JSON.stringify(quiz.questions.reduce((acc, q) => {
      acc[q.id] = q.correct_answer;
      return acc;
    }, {} as Record<string, string>))};

    function submitQuiz(event) {
      event.preventDefault();

      const form = event.target;
      let correctCount = 0;
      const totalQuestions = ${quiz.questions.length};

      ${quiz.questions.map(q => `
      const answer${q.id.replace(/-/g, '')} = form['question-${q.id}'].value;
      if (answer${q.id.replace(/-/g, '')} === correctAnswers['${q.id}']) {
        correctCount++;
      }
      document.getElementById('explanation-${q.id}').classList.remove('hidden');
      `).join('\n')}

      const percentage = Math.round((correctCount / totalQuestions) * 100);
      const resultsDiv = document.getElementById('results');

      if (percentage >= 70) {
        resultsDiv.className = 'p-6 bg-green-50 border-2 border-green-500 rounded-xl';
        resultsDiv.innerHTML = \`
          <div class="text-center">
            <div class="text-6xl mb-4">🎉</div>
            <h2 class="text-3xl font-black text-green-900 mb-2">Excellent Work!</h2>
            <p class="text-xl text-green-800 mb-4">You scored \${correctCount} out of \${totalQuestions} (\${percentage}%)</p>
            <p class="text-green-700">You've mastered this material!</p>
          </div>
        \`;
      } else {
        resultsDiv.className = 'p-6 bg-amber-50 border-2 border-amber-500 rounded-xl';
        resultsDiv.innerHTML = \`
          <div class="text-center">
            <div class="text-6xl mb-4">📚</div>
            <h2 class="text-3xl font-black text-amber-900 mb-2">Keep Learning!</h2>
            <p class="text-xl text-amber-800 mb-4">You scored \${correctCount} out of \${totalQuestions} (\${percentage}%)</p>
            <p class="text-amber-700">Review the material and try again when ready.</p>
          </div>
        \`;
      }

      resultsDiv.classList.remove('hidden');
      document.getElementById('submitBtn').disabled = true;
      document.getElementById('submitBtn').classList.add('opacity-50', 'cursor-not-allowed');
      document.getElementById('nextSteps').classList.remove('hidden');

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function logout() {
      localStorage.removeItem('studentLoggedIn');
      window.location.href = 'index.html';
    }
  </script>
</body>
</html>`;
}

function generateCertificatePage(
  course: CourseContent,
  config: LandingPageConfig,
  courseId: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate of Completion - ${course.course_title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
  <script>
    if (!localStorage.getItem('studentLoggedIn')) {
      window.location.href = 'login.html';
    }

    const studentName = localStorage.getItem('studentName') || '[Student Name]';
    const completionDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  </script>

  <header class="bg-white shadow-sm">
    <div class="container mx-auto px-6 py-4 flex justify-between items-center">
      <a href="dashboard.html" class="text-blue-600 hover:underline">← Back to Dashboard</a>
      <h1 class="text-xl font-black text-gray-900">${course.course_title}</h1>
      <button onclick="logout()" class="px-4 py-2 text-gray-600 hover:text-gray-900">Logout</button>
    </div>
  </header>

  <main class="container mx-auto px-6 py-12 max-w-5xl">
    <div id="certificate" class="bg-white border-8 border-double border-amber-600 rounded-2xl p-12 shadow-2xl">
      <div class="text-center mb-8">
        <div class="text-7xl mb-4">🎓</div>
        <h1 class="text-5xl font-black text-gray-900 mb-4" style="font-family: Georgia, serif;">
          Certificate of Completion
        </h1>
        <div class="w-32 h-1 bg-gradient-to-r from-amber-400 to-amber-600 mx-auto mb-8"></div>
      </div>

      <div class="text-center mb-8">
        <p class="text-xl text-gray-700 mb-6">This certifies that</p>
        <div class="py-4 px-8 bg-gradient-to-r from-blue-50 to-slate-50 rounded-lg mb-6 inline-block">
          <p id="certificateName" class="text-3xl font-bold text-gray-900" style="font-family: Georgia, serif;"></p>
        </div>
        <p class="text-xl text-gray-700 mb-6">has successfully completed</p>
        <h2 class="text-3xl font-black mb-8" style="color: ${config.primary_color};">
          ${course.course_title}
        </h2>
      </div>

      <div class="grid grid-cols-2 gap-8 mb-8 max-w-2xl mx-auto">
        <div class="p-4 bg-gray-50 rounded-lg text-center">
          <p class="text-sm text-gray-600 mb-1">Course Duration</p>
          <p class="text-xl font-bold text-gray-900">${course.estimated_duration}</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-lg text-center">
          <p class="text-sm text-gray-600 mb-1">Total Lessons</p>
          <p class="text-xl font-bold text-gray-900">${course.total_lessons}</p>
        </div>
      </div>

      <div class="border-t-2 border-gray-200 pt-8 mt-8">
        <div class="grid grid-cols-2 gap-8 max-w-2xl mx-auto text-center">
          <div>
            <div class="border-t-2 border-gray-900 w-48 mx-auto mb-2"></div>
            <p class="text-sm text-gray-600">Date of Completion</p>
            <p id="certificateDate" class="text-gray-900 font-semibold"></p>
          </div>
          <div>
            <div class="border-t-2 border-gray-900 w-48 mx-auto mb-2"></div>
            <p class="text-sm text-gray-600">Instructor</p>
            <p class="text-gray-900 font-semibold">Course Instructor</p>
          </div>
        </div>
      </div>

      <div class="mt-8 pt-8 border-t-2 border-gray-200 text-center">
        <p class="text-xs text-gray-500">
          Certificate ID: ${courseId.substring(0, 8).toUpperCase()}-<span id="certId"></span>
        </p>
      </div>
    </div>

    <div class="mt-8 text-center">
      <button onclick="downloadCertificate()" class="px-8 py-4 rounded-xl font-bold text-white text-lg hover:shadow-lg transition-all" style="background: ${config.primary_color};">
        Download Certificate as PDF
      </button>
      <p class="mt-4 text-gray-600 text-sm">Use your browser's print function and save as PDF</p>
    </div>
  </main>

  <script>
    document.getElementById('certificateName').textContent = studentName;
    document.getElementById('certificateDate').textContent = completionDate;
    document.getElementById('certId').textContent = Math.random().toString(36).substring(2, 8).toUpperCase();

    function downloadCertificate() {
      window.print();
    }

    function logout() {
      localStorage.removeItem('studentLoggedIn');
      window.location.href = 'index.html';
    }
  </script>

  <style>
    @media print {
      header, button, .mt-8.text-center { display: none; }
      body { background: white; }
      #certificate { border: 8px double #d97706; box-shadow: none; }
    }
  </style>
</body>
</html>`;
}

function generateReadme(course: CourseContent): string {
  return `# ${course.course_title}

This is a standalone course website generated by CourseForge.

## About This Course
- **Total Lessons:** ${course.total_lessons}
- **Duration:** ${course.estimated_duration}

## Files Included
- \`index.html\` - Landing page (marketing page)
- \`login.html\` - Student login and registration
- \`dashboard.html\` - Course dashboard showing all lessons and quizzes
- \`lesson-1.html\` through \`lesson-${course.total_lessons}.html\` - Individual lesson pages
- \`quiz-X.html\` - Interactive quiz pages with automatic grading
- \`certificate.html\` - Certificate of completion page with print/download functionality

## How to Deploy

### Option 1: Deploy to bolt.host
1. Create a new project on bolt.host
2. Upload all these files to the project
3. Your course will be live!

### Option 2: Deploy to Netlify
1. Drag and drop this folder to netlify.com/drop
2. Your site will be live instantly

### Option 3: Deploy to Vercel
1. Upload this folder to a GitHub repository
2. Connect the repo to Vercel
3. Deploy!

## Student Login
The login system uses localStorage for demo purposes. In production, you would integrate with a real authentication system.

---
Generated by CourseForge
`;
}
