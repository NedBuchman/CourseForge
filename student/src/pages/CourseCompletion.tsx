import { useEffect, useState, useRef } from 'react';
import { Award, Download, BookOpen, LogOut, Home, Search, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { studentAuth } from '../lib/studentAuth';

interface CourseCompletionProps {
  courseId: string;
  onNavigate: (page: 'dashboard' | 'catalog') => void;
  onLogout: () => void;
}

interface Confetti {
  id: number;
  left: number;
  color: string;
  delay: number;
  duration: number;
}

interface Certificate {
  id: string;
  certificate_html: string;
  certificate_data: any;
  completed_at: string;
  issued_at: string;
}

interface Course {
  title: string;
  description: string;
  difficulty_level: string;
  duration: string;
}

export default function CourseCompletion({ courseId, onNavigate, onLogout }: CourseCompletionProps) {
  const [confetti, setConfetti] = useState<Confetti[]>([]);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const certificateRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    console.log('🎉 CourseCompletion mounted');
    console.log('  courseId:', courseId);
    window.scrollTo(0, 0);
    createConfetti();
    loadSession();
  }, []);

  useEffect(() => {
    console.log('📊 Certificate state changed:', certificate);
  }, [certificate]);

  const loadSession = async () => {
    const currentSession = await studentAuth.getSession();
    setSession(currentSession);
    if (currentSession) {
      loadCertificate(currentSession);
    } else {
      setLoading(false);
    }
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

  const loadCertificate = async (currentSession: any) => {
    console.log('📜 loadCertificate called');
    console.log('  courseId:', courseId);
    console.log('  courseId type:', typeof courseId);
    console.log('  currentSession:', currentSession);

    try {
      // First check if there are duplicate courses
      console.log('  → Checking for duplicate courses...');
      const { data: allCourses, error: checkError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('id', courseId);

      console.log('  All matching courses:', allCourses);
      console.log('  Check error:', checkError);

      // Load course details - use limit(1) to get just the first one
      console.log('  → Fetching course details...');
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('title, description, difficulty_level, duration')
        .eq('id', courseId)
        .limit(1)
        .maybeSingle();

      console.log('  Course query result:', { courseData, courseError });

      if (courseError) throw courseError;

      if (!courseData) {
        throw new Error('Course not found');
      }

      setCourse(courseData);

      // Load or generate certificate
      console.log('  → Checking for existing certificate...');
      console.log('    user_id:', currentSession.user_id);
      const { data: existingCert, error: certError } = await supabase
        .from('course_certificates')
        .select('*')
        .eq('user_id', currentSession.user_id)
        .eq('course_id', courseId)
        .maybeSingle();

      console.log('  Certificate query result:', { existingCert, certError });

      if (certError) throw certError;

      if (existingCert) {
        console.log('  ✓ Found existing certificate');
        console.log('    certificate_html length:', existingCert.certificate_html?.length);
        setCertificate(existingCert);
      } else {
        console.log('  ⚠ No existing certificate, generating new one...');
        await generateCertificate(courseData, currentSession);
      }
    } catch (error) {
      console.error('❌ Error loading certificate:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCertificate = async (courseData: Course, currentSession: any) => {
    console.log('🎓 generateCertificate called');
    console.log('  courseData:', courseData);
    console.log('  currentSession:', currentSession);

    const completedAt = new Date().toISOString();
    const studentName = `${currentSession.first_name} ${currentSession.last_name}`;
    console.log('  studentName:', studentName);

    const certificateData = {
      studentName,
      courseName: courseData.title,
      completionDate: new Date(completedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      certificateId: crypto.randomUUID().substring(0, 8).toUpperCase()
    };

    console.log('  certificateData:', certificateData);

    const certificateHtml = `
      <div style="width: 800px; height: 600px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: 20px solid #4a5568; padding: 40px; box-sizing: border-box; font-family: 'Georgia', serif; position: relative;">
        <div style="background: white; padding: 60px 40px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
          <div style="text-align: center;">
            <div style="color: #667eea; font-size: 48px; font-weight: bold; margin-bottom: 20px;">🎓</div>
            <h1 style="color: #2d3748; font-size: 42px; margin: 0 0 10px 0; font-weight: bold;">Certificate of Completion</h1>
            <div style="width: 100px; height: 4px; background: linear-gradient(90deg, #667eea, #764ba2); margin: 0 auto 30px auto;"></div>
          </div>

          <div style="text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center;">
            <p style="color: #4a5568; font-size: 18px; margin: 0 0 20px 0;">This certifies that</p>
            <h2 style="color: #667eea; font-size: 36px; margin: 0 0 30px 0; font-weight: bold;">${certificateData.studentName}</h2>
            <p style="color: #4a5568; font-size: 18px; margin: 0 0 10px 0;">has successfully completed the course</p>
            <h3 style="color: #2d3748; font-size: 28px; margin: 0 0 30px 0; font-weight: bold;">${certificateData.courseName}</h3>
            <p style="color: #718096; font-size: 16px; margin: 0;">Completed on ${certificateData.completionDate}</p>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 2px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
            <div style="text-align: center; flex: 1;">
              <div style="width: 200px; border-top: 2px solid #4a5568; padding-top: 8px; margin: 0 auto;">
                <p style="color: #4a5568; font-size: 14px; margin: 0; font-weight: bold;">CourseForge Platform</p>
                <p style="color: #718096; font-size: 12px; margin: 4px 0 0 0;">Authorized Signature</p>
              </div>
            </div>
            <div style="text-align: right;">
              <p style="color: #718096; font-size: 12px; margin: 0;">Certificate ID</p>
              <p style="color: #4a5568; font-size: 14px; margin: 4px 0 0 0; font-weight: bold;">${certificateData.certificateId}</p>
            </div>
          </div>
        </div>
      </div>
    `;

    try {
      console.log('  → Inserting certificate into database...');
      console.log('    certificateHtml length:', certificateHtml.length);

      const { data: newCert, error } = await supabase
        .from('course_certificates')
        .insert({
          user_id: currentSession.user_id,
          course_id: courseId,
          certificate_html: certificateHtml,
          certificate_data: certificateData,
          completed_at: completedAt
        })
        .select()
        .single();

      console.log('  Insert result:', { newCert, error });

      if (error) throw error;

      console.log('  ✓ Certificate generated and saved successfully');
      setCertificate(newCert);
    } catch (error) {
      console.error('❌ Error generating certificate:', error);
    }
  };

  const handlePrint = () => {
    console.log('🖨️ Print button clicked');
    console.log('  certificateRef.current:', certificateRef.current);
    console.log('  certificate:', certificate);
    console.log('  certificate_html length:', certificate?.certificate_html?.length);

    if (!certificate || !certificate.certificate_html) {
      console.error('❌ No certificate or certificate_html available');
      alert('Certificate not available. Please wait for it to load.');
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Course Certificate</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
                display: block;
              }
              @page {
                margin: 0.5in;
                size: landscape;
              }
            }
          </style>
        </head>
        <body>
          ${certificate.certificate_html}
        </body>
      </html>
    `;

    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      setTimeout(() => {
        console.log('  Triggering print dialog via iframe');
        iframe.contentWindow?.print();

        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  };

  const handleDownload = () => {
    if (!certificate) return;

    const blob = new Blob([`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Course Certificate - ${course?.title}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: #f7fafc;
            }
          </style>
        </head>
        <body>
          ${certificate.certificate_html}
        </body>
      </html>
    `], { type: 'text/html' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${course?.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your certificate...</p>
        </div>
      </div>
    );
  }

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
            <BookOpen className="h-8 w-8" />
            <span className="text-2xl font-black">COURSEFORGE</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className="text-blue-100 hover:text-white transition-colors flex items-center gap-2"
            >
              <Home className="w-5 h-5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <button
              onClick={onLogout}
              className="text-blue-100 hover:text-white transition-colors flex items-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
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
                You've successfully completed the course
              </p>
              <div className="inline-block bg-white bg-opacity-20 px-6 py-3 rounded-full text-lg font-bold border-2 border-white border-opacity-30">
                ✨ Course Completed
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
            <div className="text-center mb-8 pb-6 border-b-2 border-slate-200">
              <h2 className="text-3xl font-black text-slate-900 mb-2">{course?.title}</h2>
              <p className="text-slate-600 text-lg">You've earned your certificate of completion</p>
            </div>

            <div className="mb-8">
              <div className="flex justify-center gap-4 mb-6">
                <button
                  onClick={handlePrint}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Printer className="w-5 h-5" />
                  Print Certificate
                </button>
                <button
                  onClick={handleDownload}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Certificate
                </button>
              </div>

              <div
                ref={certificateRef}
                className="flex justify-center"
                dangerouslySetInnerHTML={{ __html: certificate?.certificate_html || '' }}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
            <h2 className="text-3xl font-black text-slate-900 text-center mb-8">
              What's Next?
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border-2 border-blue-200 hover:shadow-lg transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-full flex items-center justify-center text-2xl font-black mb-4">
                  <Home className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Back to Dashboard
                </h3>
                <p className="text-slate-600 mb-4 leading-relaxed">
                  View all your courses and track your learning progress.
                </p>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg font-bold hover:shadow-lg transition-all inline-flex items-center gap-2"
                >
                  Go to Dashboard →
                </button>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border-2 border-blue-200 hover:shadow-lg transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-full flex items-center justify-center text-2xl font-black mb-4">
                  <Search className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Explore More Courses
                </h3>
                <p className="text-slate-600 mb-4 leading-relaxed">
                  Browse our catalog and continue your learning journey.
                </p>
                <button
                  onClick={() => onNavigate('catalog')}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg font-bold hover:shadow-lg transition-all inline-flex items-center gap-2"
                >
                  Browse Courses →
                </button>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border-2 border-blue-200 hover:shadow-lg transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-full flex items-center justify-center text-2xl font-black mb-4">
                  <Award className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Share Your Achievement
                </h3>
                <p className="text-slate-600 mb-4 leading-relaxed">
                  Download your certificate and share it on social media or your resume.
                </p>
                <button
                  onClick={handleDownload}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg font-bold hover:shadow-lg transition-all inline-flex items-center gap-2"
                >
                  Download Now →
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white rounded-2xl p-12 text-center shadow-xl">
            <h2 className="text-3xl font-black mb-4">Keep Learning!</h2>
            <p className="text-xl opacity-95 mb-8">
              Your achievement is just the beginning. Explore more courses and expand your knowledge.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => onNavigate('catalog')}
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-lg font-bold hover:shadow-2xl transition-all"
              >
                Browse More Courses →
              </button>
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-8 py-4 bg-white bg-opacity-20 text-white rounded-xl text-lg font-bold border-2 border-white border-opacity-30 hover:bg-white hover:text-blue-900 transition-all"
              >
                View Dashboard
              </button>
            </div>
          </div>

          <div className="text-center py-8 text-slate-600">
            <p className="mb-2">🎓 Powered by CourseForge - AI-Powered Course Creation</p>
            <p>Congratulations on your achievement!</p>
          </div>
        </div>
      </main>
    </div>
  );
}
