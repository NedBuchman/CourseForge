import { useState, useEffect } from 'react';
import { ArrowLeft, Monitor, Tablet, Smartphone, CheckCircle, Home } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

interface Benefit {
  icon: string;
  title: string;
  description: string;
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
  course_benefits: Benefit[] | null;
}

interface ReviewLandingPageProps {
  courseId: string;
  courseContent: CourseContent;
  onBack: () => void;
  onComplete: () => void;
  onBackToCourses?: () => void;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

export default function ReviewLandingPage({
  courseId,
  courseContent,
  onBack,
  onComplete,
  onBackToCourses
}: ReviewLandingPageProps) {
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [landingConfig, setLandingConfig] = useState<LandingPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadLandingPageConfig();
  }, [courseId]);

  const loadLandingPageConfig = async () => {
    try {
      const { data } = await supabase
        .from('landing_page_configs')
        .select('*')
        .eq('course_id', courseId)
        .maybeSingle();

      if (data) {
        setLandingConfig(data);
      }
    } catch (err) {
      console.error('Error loading landing page config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setIsPublishing(true);
    onComplete();
  };

  const deviceSizes = {
    desktop: 'max-w-full',
    tablet: 'max-w-3xl',
    mobile: 'max-w-sm'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-semibold">Loading landing page...</p>
        </div>
      </div>
    );
  }

  if (!landingConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 font-semibold">Landing page configuration not found</p>
        </div>
      </div>
    );
  }

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
              <span>Back to Customize</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto py-12">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl p-8 text-center mb-8 shadow-lg">
            <div className="text-5xl mb-3">🎉</div>
            <h1 className="text-3xl font-black mb-2">Your Landing Page is Ready!</h1>
            <p className="text-lg opacity-95">
              AI generated a professional, conversion-optimized landing page
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Preview Your Landing Page</h2>
              <p className="text-slate-600">View how your page looks on different devices</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDevice('desktop')}
                className={`px-5 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${
                  device === 'desktop'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Monitor className="w-5 h-5" />
                Desktop
              </button>
              <button
                onClick={() => setDevice('tablet')}
                className={`px-5 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${
                  device === 'tablet'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Tablet className="w-5 h-5" />
                Tablet
              </button>
              <button
                onClick={() => setDevice('mobile')}
                className={`px-5 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${
                  device === 'mobile'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Smartphone className="w-5 h-5" />
                Mobile
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b-2 border-slate-200">
              <h2 className="text-2xl font-black text-slate-900">Landing Page Preview</h2>
              <div className="font-mono text-sm text-slate-600 bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
                yoursite.com/{courseContent.course_title.toLowerCase().replace(/\s+/g, '-')}
              </div>
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <h4 className="font-bold text-amber-900 mb-1">This is a live preview</h4>
                  <p className="text-amber-800 text-sm leading-relaxed">
                    Scroll through the preview to see your complete landing page. This is what students will see when they visit your course URL.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-100 rounded-2xl p-8">
              <div className={`${deviceSizes[device]} mx-auto transition-all duration-300`}>
                <div className="bg-white border-3 border-slate-300 rounded-xl overflow-hidden shadow-2xl">
                  <div className="max-h-[800px] overflow-y-auto">
                    <div className="bg-white">
                      <section
                        className="text-white p-12 text-center"
                        style={{ background: `linear-gradient(135deg, ${landingConfig.primary_color} 0%, ${landingConfig.primary_color}dd 100%)` }}
                      >
                        {landingConfig.hero_image_url && (
                          <div className="mb-6">
                            <img
                              src={landingConfig.hero_image_url}
                              alt="Course Hero"
                              className="max-w-md mx-auto rounded-lg shadow-lg"
                            />
                          </div>
                        )}
                        <h1 className="text-4xl font-black leading-tight mb-6">
                          {landingConfig.course_headline}
                        </h1>
                        <p className="text-xl opacity-95 mb-8 leading-relaxed max-w-3xl mx-auto">
                          {landingConfig.value_proposition}
                        </p>
                        <button
                          className="px-8 py-4 rounded-xl text-xl font-bold shadow-xl transition-transform hover:scale-105"
                          style={{ background: landingConfig.secondary_color, color: 'white' }}
                        >
                          {landingConfig.cta_button_text} →
                        </button>
                        {landingConfig.pricing_info && (
                          <p className="mt-6 text-lg opacity-90">{landingConfig.pricing_info}</p>
                        )}
                      </section>

                      {landingConfig.course_benefits && landingConfig.course_benefits.length > 0 && (
                        <section className="p-12">
                          <h2 className="text-3xl font-black text-slate-900 mb-8 text-center">What You'll Learn</h2>
                          <div className={`grid ${landingConfig.course_benefits.length === 2 ? 'md:grid-cols-2' : landingConfig.course_benefits.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'} gap-8 max-w-6xl mx-auto`}>
                            {landingConfig.course_benefits.map((benefit, idx) => (
                              <div key={idx} className="text-center p-6">
                                <div className="text-5xl mb-4">{benefit.icon}</div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{benefit.title}</h3>
                                <p className="text-slate-600">{benefit.description}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      <section className="bg-slate-50 p-12">
                        <h2 className="text-3xl font-black text-slate-900 mb-8 text-center">
                          Course Structure ({courseContent.total_lessons} Lessons)
                        </h2>
                        <div className="max-w-4xl mx-auto space-y-4">
                          {courseContent.lessons.map((lesson) => (
                            <div
                              key={lesson.lesson_number}
                              className="bg-white p-6 rounded-xl shadow-md border-l-4"
                              style={{ borderColor: landingConfig.primary_color }}
                            >
                              <h3 className="text-xl font-bold text-slate-900 mb-2">
                                Lesson {lesson.lesson_number}: {lesson.title}
                              </h3>
                              <div
                                className="text-slate-600 leading-relaxed prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{
                                  __html: lesson.content.substring(0, 200) + '...'
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="p-12">
                        <h2 className="text-3xl font-black text-slate-900 mb-8 text-center">
                          Who This Course Is For
                        </h2>
                        <div className="max-w-3xl mx-auto text-center">
                          <p className="text-lg text-slate-700 leading-relaxed">
                            {landingConfig.audience_description}
                          </p>
                        </div>
                      </section>

                      {landingConfig.instructor_bio && (
                        <section className="bg-slate-50 p-12">
                          <h2 className="text-3xl font-black text-slate-900 mb-8 text-center">
                            Your Instructor
                          </h2>
                          <div className="max-w-3xl mx-auto text-center">
                            <p className="text-lg text-slate-700 leading-relaxed">
                              {landingConfig.instructor_bio}
                            </p>
                          </div>
                        </section>
                      )}

                      {landingConfig.testimonials && (
                        <section className="p-12">
                          <h2 className="text-3xl font-black text-slate-900 mb-8 text-center">
                            What Students Say
                          </h2>
                          <div className="max-w-4xl mx-auto space-y-6">
                            {landingConfig.testimonials.split('---').map((testimonial, idx) => {
                              const lines = testimonial.trim().split('\n');
                              const quote = lines[0]?.replace(/^["']|["']$/g, '');
                              const author = lines[1];

                              return (
                                <div key={idx} className="bg-white p-6 rounded-xl shadow-md">
                                  <p className="text-lg text-slate-700 italic mb-4 leading-relaxed">
                                    "{quote}"
                                  </p>
                                  {author && (
                                    <p className="font-bold text-slate-900">{author}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      )}

                      {landingConfig.special_message && (
                        <section className="bg-gradient-to-r from-amber-100 to-yellow-100 p-12 text-center">
                          <div className="text-4xl mb-4">✨</div>
                          <p className="text-xl text-amber-900 font-semibold leading-relaxed max-w-3xl mx-auto">
                            {landingConfig.special_message}
                          </p>
                        </section>
                      )}

                      <section
                        className="text-white p-12 text-center"
                        style={{ background: `linear-gradient(135deg, ${landingConfig.secondary_color} 0%, ${landingConfig.secondary_color}dd 100%)` }}
                      >
                        <h2 className="text-3xl font-black mb-6">Ready to Start Learning?</h2>
                        <p className="text-xl opacity-95 mb-8 max-w-2xl mx-auto">
                          Join students who've transformed their skills. Start your journey today.
                        </p>
                        <button
                          className="px-8 py-4 bg-white rounded-xl text-xl font-bold shadow-xl transition-transform hover:scale-105"
                          style={{ color: landingConfig.secondary_color }}
                        >
                          {landingConfig.cta_button_text} →
                        </button>
                      </section>

                      <footer className="bg-slate-900 text-slate-400 p-8 text-center">
                        <p>&copy; 2025 {courseContent.course_title}. All rights reserved.</p>
                      </footer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-900 text-center mb-8">
              What would you like to do?
            </h2>

            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              <div className="bg-white border-3 border-slate-200 rounded-2xl p-8 text-center hover:border-amber-500 hover:shadow-2xl transition-all">
                <div className="text-6xl mb-4">✏️</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Refine & Regenerate</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Go back to adjust your landing page preferences and regenerate with different styling, messaging, or content.
                </p>
                <button
                  onClick={onBack}
                  className="w-full px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Refine & Regenerate
                </button>
              </div>

              <div className="bg-white border-3 border-slate-200 rounded-2xl p-8 text-center hover:border-green-500 hover:shadow-2xl transition-all">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Accept & Finalize</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Landing page looks perfect! Proceed to the final step to publish your complete course and get your shareable link.
                </p>
                <button
                  onClick={handleAccept}
                  className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  Accept & Finalize Course
                  <CheckCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {isPublishing && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl text-center">
            <div className="w-20 h-20 border-6 border-slate-200 border-t-green-500 rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-black text-slate-900 mb-3">Publishing Your Course...</h2>
            <p className="text-slate-600 leading-relaxed">
              AI is finalizing your course and preparing it for students...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
