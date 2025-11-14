import { useEffect, useState } from 'react';
import { Copy, Mail, Share2, BarChart2, Edit, Plus, CheckCircle, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { exportCourseProject } from '../lib/courseExporter';

interface CourseContent {
  course_title: string;
  estimated_duration: string;
  total_lessons: number;
  lessons: Array<{
    lesson_number: number;
    title: string;
    content: string;
  }>;
}

interface CoursePublishedProps {
  courseId: string;
  courseContent: CourseContent;
  onCreateAnother: () => void;
}

interface Confetti {
  id: number;
  left: number;
  color: string;
  delay: number;
  duration: number;
}

export default function CoursePublished({
  courseId,
  courseContent,
  onCreateAnother
}: CoursePublishedProps) {
  const [confetti, setConfetti] = useState<Confetti[]>([]);
  const [copied, setCopied] = useState(false);
  const [quizCount, setQuizCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [, setStudentLoginUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    createConfetti();
    loadCourseStats();
    loadPublishUrl();
    updatePublishedStatus();
  }, []);

  const updatePublishedStatus = async () => {
    const { data: currentCourse } = await supabase
      .from('courses')
      .select('last_completed_step, current_step')
      .eq('id', courseId)
      .single();

    const updateData: any = {
      published_status: 'published',
      published_at: new Date().toISOString(),
    };

    if (!currentCourse || currentCourse.last_completed_step < 5) {
      updateData.last_completed_step = 5;
    }

    if (!currentCourse || currentCourse.current_step < 6) {
      updateData.current_step = 6;
    }

    await supabase
      .from('courses')
      .update(updateData)
      .eq('id', courseId);
  };

  const createConfetti = () => {
    const colors = ['#fbbf24', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'];
    const newConfetti: Confetti[] = [];

    for (let i = 0; i < 50; i++) {
      newConfetti.push({
        id: i,
        left: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        duration: Math.random() * 2 + 2
      });
    }

    setConfetti(newConfetti);

    setTimeout(() => {
      setConfetti([]);
    }, 4000);
  };

  const loadCourseStats = async () => {
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id')
      .eq('course_id', courseId);

    if (quizzes) {
      setQuizCount(quizzes.length);

      const { data: questions } = await supabase
        .from('quiz_questions')
        .select('id')
        .in('quiz_id', quizzes.map(q => q.id));

      if (questions) {
        setQuestionCount(questions.length);
      }
    }
  };

  const loadPublishUrl = async () => {
    const { data } = await supabase
      .from('landing_page_configs')
      .select('publish_url, student_login_url')
      .eq('course_id', courseId)
      .maybeSingle();

    if (data?.publish_url) {
      setPublishUrl(data.publish_url);
      setStudentLoginUrl(data.student_login_url || `${data.publish_url}/student-login`);
    } else {
      const defaultUrl = `https://yoursite.com/courses/${courseContent.course_title.toLowerCase().replace(/\s+/g, '-')}`;
      setPublishUrl(defaultUrl);
      setStudentLoginUrl(`${defaultUrl}/student-login`);
    }
  };

  const courseUrl = publishUrl ?? `https://yoursite.com/courses/${courseContent.course_title.toLowerCase().replace(/\s+/g, '-')}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(courseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportProject = async () => {
    setIsExporting(true);
    try {
      const { data: landingConfigData } = await supabase
        .from('landing_page_configs')
        .select('*')
        .eq('course_id', courseId)
        .maybeSingle();

      if (!landingConfigData) {
        alert('Landing page configuration not found. Please generate a landing page first.');
        return;
      }

      await exportCourseProject(courseId, courseContent, landingConfigData);

      await supabase
        .from('courses')
        .update({
          downloaded_status: 'downloaded',
          last_downloaded_at: new Date().toISOString(),
          last_completed_step: 6,
        })
        .eq('id', courseId);
    } catch (err) {
      console.error('Error exporting course:', err);
      alert('Failed to export course. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Check out my new course: ${courseContent.course_title}`);
    const body = encodeURIComponent(
      `I just created a comprehensive course on ${courseContent.course_title}.\n\n` +
      `Enroll here: ${courseUrl}\n\n` +
      `The course includes ${courseContent.total_lessons} lessons and takes ${courseContent.estimated_duration}.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const answerCount = questionCount * 4;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col">
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="fixed w-3 h-3 pointer-events-none z-50"
          style={{
            left: `${piece.left}%`,
            top: '-10px',
            backgroundColor: piece.color,
            animation: `confetti-fall ${piece.duration}s linear forwards`,
            animationDelay: `${piece.delay}s`
          }}
        />
      ))}

      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }
      `}</style>

      <header className="bg-gradient-to-r from-blue-800 to-blue-900 text-white py-4 shadow-lg">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/CourseForgeLogo.png" alt="CourseForge" className="h-8 w-auto" />
            <span className="text-2xl font-black">COURSEFORGE</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto py-12">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl p-12 text-center mb-12 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '50px 50px'
              }} />
            </div>

            <div className="relative z-10">
              <div className="text-7xl mb-4" style={{ animation: 'bounce 1s ease-in-out infinite' }}>
                🎉
              </div>
              <h1 className="text-5xl font-black mb-4">Congratulations!</h1>
              <p className="text-2xl opacity-95 mb-6">
                Your course is now complete and ready to enroll students
              </p>
              <div className="inline-block bg-white bg-opacity-20 px-6 py-3 rounded-full text-lg font-bold border-2 border-white border-opacity-30">
                ✨ Course Published Successfully
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
            <div className="text-center mb-8 pb-6 border-b-2 border-slate-200">
              <h2 className="text-3xl font-black text-slate-900 mb-2">Course Summary</h2>
              <p className="text-slate-600 text-lg">Here's what you've created with CourseForge</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-50 p-6 rounded-xl border-l-4 border-blue-600">
                <div className="text-xs uppercase font-bold text-slate-600 tracking-wider mb-2">
                  Course Title
                </div>
                <div className="text-2xl font-black text-slate-900 mb-1">
                  {courseContent.course_title}
                </div>
                <div className="text-sm text-slate-500">
                  {courseContent.total_lessons} Comprehensive Lessons
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-xl border-l-4 border-blue-600">
                <div className="text-xs uppercase font-bold text-slate-600 tracking-wider mb-2">
                  Target Audience
                </div>
                <div className="text-2xl font-black text-slate-900 mb-1">
                  Complete Learning Path
                </div>
                <div className="text-sm text-slate-500">Beginner Level</div>
              </div>

              <div className="bg-slate-50 p-6 rounded-xl border-l-4 border-blue-600">
                <div className="text-xs uppercase font-bold text-slate-600 tracking-wider mb-2">
                  Course Duration
                </div>
                <div className="text-2xl font-black text-slate-900 mb-1">
                  {courseContent.estimated_duration}
                </div>
                <div className="text-sm text-slate-500">Self-paced learning</div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 text-center mb-6">
                What Was Generated
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-xl text-center shadow-lg">
                  <div className="text-5xl font-black mb-2">{courseContent.total_lessons}</div>
                  <div className="text-sm opacity-90">Comprehensive Lessons</div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-xl text-center shadow-lg">
                  <div className="text-5xl font-black mb-2">{quizCount}</div>
                  <div className="text-sm opacity-90">Interactive Quizzes</div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-xl text-center shadow-lg">
                  <div className="text-5xl font-black mb-2">{questionCount}</div>
                  <div className="text-sm opacity-90">Quiz Questions</div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-xl text-center shadow-lg">
                  <div className="text-5xl font-black mb-2">{answerCount}</div>
                  <div className="text-sm opacity-90">Answer Choices</div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-xl text-center shadow-lg">
                  <div className="text-5xl font-black mb-2">1</div>
                  <div className="text-sm opacity-90">Landing Page</div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-xl text-center shadow-lg">
                  <div className="text-5xl font-black mb-2">100%</div>
                  <div className="text-sm opacity-90">AI-Generated</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-100 to-yellow-100 rounded-2xl p-8 text-center mb-8 border-3 border-amber-400 shadow-lg">
            <div className="text-6xl mb-4">⚡</div>
            <h2 className="text-3xl font-black text-amber-900 mb-6">
              Incredible Time Savings
            </h2>

            <div className="flex flex-col md:flex-row justify-center items-center gap-8 mb-6">
              <div className="bg-white p-6 rounded-xl shadow-lg min-w-[200px]">
                <div className="text-sm font-semibold text-amber-900 mb-2">
                  Traditional Method
                </div>
                <div className="text-5xl font-black text-slate-900">40-80</div>
                <div className="text-slate-600 mt-1">hours of work</div>
              </div>

              <div className="text-5xl text-green-600">→</div>

              <div className="bg-white p-6 rounded-xl shadow-lg min-w-[200px]">
                <div className="text-sm font-semibold text-amber-900 mb-2">
                  With CourseForge
                </div>
                <div className="text-5xl font-black text-slate-900">12</div>
                <div className="text-slate-600 mt-1">minutes total</div>
              </div>
            </div>

            <div className="text-amber-900 text-xl font-bold">
              🎯 You saved approximately 40-80 hours (5-10 business days) of work!
              <br />
              💰 That's $2,000-$4,000 in saved time at $50/hour
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
            <h2 className="text-2xl font-black text-slate-900 text-center mb-6">
              🔗 Your Course is Live!
            </h2>

            {publishUrl === null ? (
              <div className="text-center py-4">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-slate-600">Loading course URL...</p>
              </div>
            ) : (
              <>
            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 mb-6">
              <span className="flex-1 font-mono text-blue-600 font-bold break-all text-center md:text-left">
                {courseUrl}
              </span>
              <button
                onClick={handleCopyUrl}
                className={`px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:shadow-lg'
                }`}
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy Link
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleExportProject}
                disabled={isExporting}
                className="w-full max-w-md mx-auto block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-2xl transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-6 h-6" />
                {isExporting ? 'Preparing Download...' : 'Download Course Project'}
              </button>
              <p className="text-center text-slate-600 text-sm max-w-2xl mx-auto">
                Download a complete standalone website with all course pages ready to deploy to bolt.host or any web hosting service
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <button
                  onClick={handleShareEmail}
                  className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                >
                  <Mail className="w-5 h-5" />
                  Share via Email
                </button>
                <button
                  onClick={() => alert('Social media sharing coming soon!')}
                  className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="w-5 h-5" />
                  Share on Social Media
                </button>
              </div>
            </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
            <h2 className="text-3xl font-black text-slate-900 text-center mb-8">
              What's Next?
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border-2 border-blue-200 hover:shadow-lg transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-full flex items-center justify-center text-2xl font-black mb-4">
                  1
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Share Your Course
                </h3>
                <p className="text-slate-600 mb-4 leading-relaxed">
                  Send the course link to your audience via email, social media, or your website.
                </p>
                <button
                  onClick={handleShareEmail}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg font-bold hover:shadow-lg transition-all inline-flex items-center gap-2"
                >
                  Share Now →
                </button>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border-2 border-blue-200 hover:shadow-lg transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-full flex items-center justify-center text-2xl font-black mb-4">
                  2
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Monitor Enrollments
                </h3>
                <p className="text-slate-600 mb-4 leading-relaxed">
                  Track student progress, completion rates, and quiz scores in your dashboard.
                </p>
                <button
                  onClick={() => alert('Dashboard coming soon!')}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg font-bold hover:shadow-lg transition-all inline-flex items-center gap-2"
                >
                  <BarChart2 className="w-4 h-4" />
                  View Dashboard →
                </button>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border-2 border-blue-200 hover:shadow-lg transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-full flex items-center justify-center text-2xl font-black mb-4">
                  3
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Edit & Update
                </h3>
                <p className="text-slate-600 mb-4 leading-relaxed">
                  Make changes to lessons, quizzes, or landing page anytime. Updates go live instantly.
                </p>
                <button
                  onClick={() => alert('Edit functionality coming soon!')}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg font-bold hover:shadow-lg transition-all inline-flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Course →
                </button>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border-2 border-blue-200 hover:shadow-lg transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-full flex items-center justify-center text-2xl font-black mb-4">
                  4
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Create More Courses
                </h3>
                <p className="text-slate-600 mb-4 leading-relaxed">
                  Use CourseForge to create unlimited courses on any topic in minutes.
                </p>
                <button
                  onClick={onCreateAnother}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg font-bold hover:shadow-lg transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Another →
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white rounded-2xl p-12 text-center shadow-xl">
            <h2 className="text-3xl font-black mb-4">Ready to Make an Impact?</h2>
            <p className="text-xl opacity-95 mb-8">
              Your course is live and students can start learning immediately. Share it with the world!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => alert('Dashboard coming soon!')}
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-lg font-bold hover:shadow-2xl transition-all"
              >
                Go to Course Dashboard →
              </button>
              <button
                onClick={onCreateAnother}
                className="px-8 py-4 bg-white bg-opacity-20 text-white rounded-xl text-lg font-bold border-2 border-white border-opacity-30 hover:bg-white hover:text-blue-900 transition-all"
              >
                Create Another Course
              </button>
            </div>
          </div>

          <div className="text-center py-8 text-slate-600">
            <p className="mb-2">🎓 Powered by CourseForge - AI-Powered Course Creation</p>
            <p>Created with ❤️ for educators and trainers worldwide</p>
          </div>
        </div>
      </main>
    </div>
  );
}
