import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Upload, Palette, Target, Sparkles, Home, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AIFieldTrigger from '../components/AIFieldTrigger';
import AIHelperPanel from '../components/AIHelperPanel';

interface CourseContent {
  course_title: string;
  total_lessons: number;
  estimated_duration: string;
}

interface CustomizeLandingPageProps {
  courseId: string;
  courseContent: CourseContent;
  onBack: () => void;
  onComplete: () => void;
  onBackToCourses?: () => void;
  onLogout?: () => void;
}

type PageStyle = 'professional' | 'modern' | 'minimal' | 'friendly';

export default function CustomizeLandingPage({
  courseId,
  onBack,
  onComplete,
  onBackToCourses,
  onLogout
}: CustomizeLandingPageProps) {
  const [courseHeadline, setCourseHeadline] = useState('');
  const [valueProposition, setValueProposition] = useState('');
  const [audienceDescription, setAudienceDescription] = useState('');
  const [instructorBio, setInstructorBio] = useState('');
  const [pageStyle, setPageStyle] = useState<PageStyle>('professional');
  const [primaryColor, setPrimaryColor] = useState('#2d5a8c');
  const [secondaryColor, setSecondaryColor] = useState('#10b981');
  const [heroImage, setHeroImage] = useState<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null);
  const [ctaButtonText, setCtaButtonText] = useState('Enroll in Course');
  const [pricingInfo, setPricingInfo] = useState('');
  const [testimonials, setTestimonials] = useState('');
  const [specialMessage, setSpecialMessage] = useState('');
  const [benefit1Title, setBenefit1Title] = useState('');
  const [benefit1Description, setBenefit1Description] = useState('');
  const [benefit2Title, setBenefit2Title] = useState('');
  const [benefit2Description, setBenefit2Description] = useState('');
  const [benefit3Title, setBenefit3Title] = useState('');
  const [benefit3Description, setBenefit3Description] = useState('');
  const [benefit4Title, setBenefit4Title] = useState('');
  const [benefit4Description, setBenefit4Description] = useState('');
  const [publishUrl, setPublishUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [aiActiveField, setAiActiveField] = useState('');
  const [courseTopicForAI, setCourseTopicForAI] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    loadExistingConfig();
  }, [courseId]);

  const loadExistingConfig = async () => {
    try {
      const [landingPageResult, courseResult] = await Promise.all([
        supabase
          .from('landing_page_configs')
          .select('*')
          .eq('course_id', courseId)
          .maybeSingle(),
        supabase
          .from('courses')
          .select('topic, target_audience, difficulty_level, learning_objectives, title')
          .eq('id', courseId)
          .single()
      ]);

      if (courseResult.data) {
        const { topic, target_audience, difficulty_level, learning_objectives, title } = courseResult.data;
        const courseContext = `${topic || title} (${difficulty_level} level for ${target_audience})${learning_objectives ? '. Objectives: ' + learning_objectives : ''}`;
        setCourseTopicForAI(courseContext);
      }

      const { data, error } = landingPageResult;

      if (error) {
        console.error('Error loading landing page config:', error);
      } else if (data) {
        setCourseHeadline(data.course_headline || '');
        setValueProposition(data.value_proposition || '');
        setAudienceDescription(data.audience_description || '');
        setInstructorBio(data.instructor_bio || '');
        setPageStyle(data.page_style as PageStyle || 'professional');
        setPrimaryColor(data.primary_color || '#2d5a8c');
        setSecondaryColor(data.secondary_color || '#10b981');
        setCtaButtonText(data.cta_button_text || 'Enroll in Course');
        setPricingInfo(data.pricing_info || '');
        setTestimonials(data.testimonials || '');
        setSpecialMessage(data.special_message || '');
        setPublishUrl(data.publish_url || '');

        if (data.hero_image_url) {
          setHeroImagePreview(data.hero_image_url);
        }

        if (data.course_benefits && Array.isArray(data.course_benefits)) {
          const benefits = data.course_benefits;
          if (benefits[0]) {
            setBenefit1Title(benefits[0].title || '');
            setBenefit1Description(benefits[0].description || '');
          }
          if (benefits[1]) {
            setBenefit2Title(benefits[1].title || '');
            setBenefit2Description(benefits[1].description || '');
          }
          if (benefits[2]) {
            setBenefit3Title(benefits[2].title || '');
            setBenefit3Description(benefits[2].description || '');
          }
          if (benefits[3]) {
            setBenefit4Title(benefits[3].title || '');
            setBenefit4Description(benefits[3].description || '');
          }
        }
      }
    } catch (err) {
      console.error('Error loading existing landing page config:', err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleHeroImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Hero image must be smaller than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      setHeroImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setHeroImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      let heroImageUrl: string | null = null;

      if (heroImage) {
        setGenerationStatus('Uploading hero image...');
        setGenerationProgress(15);

        const fileExt = heroImage.name.split('.').pop();
        const fileName = `hero-${courseId}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('course-logos')
          .upload(filePath, heroImage, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Hero image upload error:', uploadError);
        } else {
          const { data } = supabase.storage
            .from('course-logos')
            .getPublicUrl(filePath);

          heroImageUrl = data.publicUrl;
        }
      }

      setGenerationStatus('Saving landing page configuration...');
      setGenerationProgress(50);

      const benefits = [];
      if (benefit1Title && benefit1Description) {
        benefits.push({ icon: '📊', title: benefit1Title, description: benefit1Description });
      }
      if (benefit2Title && benefit2Description) {
        benefits.push({ icon: '📈', title: benefit2Title, description: benefit2Description });
      }
      if (benefit3Title && benefit3Description) {
        benefits.push({ icon: '🎯', title: benefit3Title, description: benefit3Description });
      }
      if (benefit4Title && benefit4Description) {
        benefits.push({ icon: '💡', title: benefit4Title, description: benefit4Description });
      }

      const studentLoginUrl = publishUrl.trim()
        ? `${publishUrl.trim()}/student-login`
        : null;

      const { error: configError } = await supabase
        .from('landing_page_configs')
        .upsert({
          course_id: courseId,
          course_headline: courseHeadline,
          value_proposition: valueProposition,
          audience_description: audienceDescription,
          instructor_bio: instructorBio || null,
          page_style: pageStyle,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          hero_image_url: heroImageUrl,
          cta_button_text: ctaButtonText,
          pricing_info: pricingInfo || null,
          testimonials: testimonials || null,
          special_message: specialMessage || null,
          course_benefits: benefits.length > 0 ? benefits : null,
          publish_url: publishUrl.trim() || null,
          student_login_url: studentLoginUrl,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'course_id'
        });

      if (configError) {
        console.error('Error saving landing page config:', configError);
      }

      setGenerationStatus('Complete!');
      setGenerationProgress(100);

      onComplete();
    } catch (err) {
      console.error('Error generating landing page:', err);
      setIsGenerating(false);
    }
  };

  const styleOptions = [
    { value: 'professional' as PageStyle, icon: '💼', label: 'Professional', desc: 'Clean, corporate, trustworthy' },
    { value: 'modern' as PageStyle, icon: '✨', label: 'Modern', desc: 'Bold, trendy, eye-catching' },
    { value: 'minimal' as PageStyle, icon: '⚪', label: 'Minimal', desc: 'Simple, elegant, focused' },
    { value: 'friendly' as PageStyle, icon: '😊', label: 'Friendly', desc: 'Warm, approachable, casual' }
  ];

  const handleOpenAIPanel = (fieldName: string) => {
    setAiActiveField(fieldName);
    setIsAIPanelOpen(true);
  };

  const handleCloseAIPanel = () => {
    setIsAIPanelOpen(false);
    setAiActiveField('');
  };

  const handleInsertAIContent = (content: string) => {
    if (aiActiveField === 'Course Headline') {
      const trimmedContent = content.substring(0, 100);
      setCourseHeadline(trimmedContent);
    } else if (aiActiveField === 'Value Proposition') {
      const trimmedContent = content.substring(0, 400);
      setValueProposition(trimmedContent);
    } else if (aiActiveField === 'Who Is This Course For?') {
      const trimmedContent = content.substring(0, 300);
      setAudienceDescription(trimmedContent);
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
              <span>Back to Review</span>
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
          <div className="flex items-center justify-center gap-8 relative max-w-5xl mx-auto">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-green-500 -translate-y-1/2 z-0" />

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-green-500 border-4 border-white flex items-center justify-center text-white font-bold shadow-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-slate-700 mt-2">Details</span>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-green-500 border-4 border-white flex items-center justify-center text-white font-bold shadow-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-slate-700 mt-2">Outline</span>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-green-500 border-4 border-white flex items-center justify-center text-white font-bold shadow-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-slate-700 mt-2">Presentation</span>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-600 border-4 border-white flex items-center justify-center text-white font-bold shadow-lg">
                4
              </div>
              <span className="text-sm font-semibold text-blue-900 mt-2">Landing Page</span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto py-12">
        <div className="container mx-auto max-w-4xl px-6">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎨</div>
            <h1 className="text-4xl font-black text-slate-900 mb-3">Customize Your Course Landing Page</h1>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Tell us how you want your course landing page to look and what message you want to convey. AI will generate a professional, conversion-optimized page based on your preferences.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="font-bold text-slate-900 mb-2">About Your Landing Page</h3>
                <p className="text-slate-600 mb-3 leading-relaxed">
                  Your course landing page is where potential students will learn about your course and enroll. A great landing page clearly communicates the value, builds trust, and makes enrollment easy.
                </p>
                <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-600">
                  <p className="text-blue-900 font-semibold mb-2">Your landing page will include:</p>
                  <ul className="text-blue-800 space-y-1 text-sm">
                    <li>✓ Compelling headline and course description</li>
                    <li>✓ Key learning outcomes and benefits</li>
                    <li>✓ Course structure and lesson overview</li>
                    <li>✓ Instructor information and credentials</li>
                    <li>✓ Testimonials or social proof (if provided)</li>
                    <li>✓ Clear call-to-action buttons</li>
                    <li>✓ Responsive design for all devices</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-slate-900 mb-6 pb-4 border-b-2 border-slate-200 flex items-center gap-2">
              <Target className="w-6 h-6 text-blue-600" />
              Content & Messaging
            </h3>

            <div className="space-y-6">
              <div>
                <label htmlFor="courseHeadline" className="block text-lg font-bold text-slate-900 mb-2">
                  Course Headline
                </label>
                <p className="text-slate-600 mb-1 text-sm">
                  A catchy, benefit-focused headline that grabs attention. What's the main promise of your course?
                </p>
                <AIFieldTrigger onClick={() => handleOpenAIPanel('Course Headline')} />
                <input
                  type="text"
                  id="courseHeadline"
                  value={courseHeadline}
                  onChange={(e) => setCourseHeadline(e.target.value)}
                  maxLength={100}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none bg-slate-50 focus:bg-white transition-all mt-3 ${
                    aiActiveField === 'Course Headline' && isAIPanelOpen
                      ? 'border-blue-400 ring-4 ring-blue-100 shadow-lg'
                      : 'border-slate-200 focus:border-blue-600'
                  }`}
                  placeholder="e.g., Master Data Analysis in 2 Hours - No Experience Required"
                />
                <div className="text-right text-sm text-slate-500 mt-1">{courseHeadline.length}/100 characters</div>
              </div>

              <div>
                <label htmlFor="valueProposition" className="block text-lg font-bold text-slate-900 mb-2">
                  Value Proposition
                </label>
                <p className="text-slate-600 mb-1 text-sm">
                  In 2-3 sentences, explain why someone should take this course. What transformation will they experience?
                </p>
                <AIFieldTrigger onClick={() => handleOpenAIPanel('Value Proposition')} />
                <textarea
                  id="valueProposition"
                  value={valueProposition}
                  onChange={(e) => setValueProposition(e.target.value)}
                  maxLength={400}
                  rows={4}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none bg-slate-50 focus:bg-white transition-all resize-none mt-3 ${
                    aiActiveField === 'Value Proposition' && isAIPanelOpen
                      ? 'border-blue-400 ring-4 ring-blue-100 shadow-lg'
                      : 'border-slate-200 focus:border-blue-600'
                  }`}
                  placeholder="e.g., Learn the essential data analysis skills that top companies demand. Transform raw data into clear insights that drive business decisions."
                />
                <div className="text-right text-sm text-slate-500 mt-1">{valueProposition.length}/400 characters</div>
              </div>

              <div>
                <label htmlFor="audienceDescription" className="block text-lg font-bold text-slate-900 mb-2">
                  Who Is This Course For?
                </label>
                <p className="text-slate-600 mb-1 text-sm">
                  Describe your ideal student. Help visitors self-identify if this course is right for them.
                </p>
                <AIFieldTrigger onClick={() => handleOpenAIPanel('Who Is This Course For?')} />
                <textarea
                  id="audienceDescription"
                  value={audienceDescription}
                  onChange={(e) => setAudienceDescription(e.target.value)}
                  maxLength={300}
                  rows={3}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none bg-slate-50 focus:bg-white transition-all resize-none mt-3 ${
                    aiActiveField === 'Who Is This Course For?' && isAIPanelOpen
                      ? 'border-blue-400 ring-4 ring-blue-100 shadow-lg'
                      : 'border-slate-200 focus:border-blue-600'
                  }`}
                  placeholder="e.g., Business professionals, managers, and entrepreneurs who work with data but don't have a technical background."
                />
                <div className="text-right text-sm text-slate-500 mt-1">{audienceDescription.length}/300 characters</div>
              </div>

              <div>
                <label htmlFor="instructorBio" className="block text-lg font-bold text-slate-900 mb-2">
                  Instructor Information
                </label>
                <p className="text-slate-600 mb-3 text-sm">
                  Your name, title, and brief credentials. Build credibility by sharing relevant experience.
                </p>
                <textarea
                  id="instructorBio"
                  value={instructorBio}
                  onChange={(e) => setInstructorBio(e.target.value)}
                  maxLength={300}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none bg-slate-50 focus:bg-white transition-colors resize-none"
                  placeholder="e.g., John Smith, Senior Data Analyst with 10+ years at Fortune 500 companies."
                />
                <div className="text-right text-sm text-slate-500 mt-1">{instructorBio.length}/300 characters</div>
              </div>

              <div>
                <label className="block text-lg font-bold text-slate-900 mb-2">
                  Key Course Benefits
                </label>
                <p className="text-slate-600 mb-1 text-sm">
                  Highlight 2-4 key benefits or learning outcomes. What will students gain? These appear prominently on your landing page.
                </p>
                <AIFieldTrigger onClick={() => handleOpenAIPanel('Key Course Benefits')} />
                <div className={`space-y-4 mt-3 p-4 rounded-xl transition-all ${
                  aiActiveField === 'Key Course Benefits' && isAIPanelOpen
                    ? 'ring-4 ring-blue-100 bg-blue-50'
                    : ''
                }`}>
                  <div className="border-2 border-slate-200 rounded-xl p-4 bg-slate-50">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Benefit 1</label>
                    <input
                      type="text"
                      value={benefit1Title}
                      onChange={(e) => setBenefit1Title(e.target.value)}
                      maxLength={40}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none bg-white mb-2"
                      placeholder="e.g., Master Core Concepts"
                    />
                    <input
                      type="text"
                      value={benefit1Description}
                      onChange={(e) => setBenefit1Description(e.target.value)}
                      maxLength={80}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none bg-white"
                      placeholder="e.g., Learn fundamental principles and terminology"
                    />
                  </div>

                  <div className="border-2 border-slate-200 rounded-xl p-4 bg-slate-50">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Benefit 2</label>
                    <input
                      type="text"
                      value={benefit2Title}
                      onChange={(e) => setBenefit2Title(e.target.value)}
                      maxLength={40}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none bg-white mb-2"
                      placeholder="e.g., Practical Skills"
                    />
                    <input
                      type="text"
                      value={benefit2Description}
                      onChange={(e) => setBenefit2Description(e.target.value)}
                      maxLength={80}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none bg-white"
                      placeholder="e.g., Apply knowledge with hands-on exercises"
                    />
                  </div>

                  <div className="border-2 border-slate-200 rounded-xl p-4 bg-slate-50">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Benefit 3 (Optional)</label>
                    <input
                      type="text"
                      value={benefit3Title}
                      onChange={(e) => setBenefit3Title(e.target.value)}
                      maxLength={40}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none bg-white mb-2"
                      placeholder="e.g., Real Results"
                    />
                    <input
                      type="text"
                      value={benefit3Description}
                      onChange={(e) => setBenefit3Description(e.target.value)}
                      maxLength={80}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none bg-white"
                      placeholder="e.g., Create projects you can use immediately"
                    />
                  </div>

                  <div className="border-2 border-slate-200 rounded-xl p-4 bg-slate-50">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Benefit 4 (Optional)</label>
                    <input
                      type="text"
                      value={benefit4Title}
                      onChange={(e) => setBenefit4Title(e.target.value)}
                      maxLength={40}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none bg-white mb-2"
                      placeholder="e.g., Expert Insights"
                    />
                    <input
                      type="text"
                      value={benefit4Description}
                      onChange={(e) => setBenefit4Description(e.target.value)}
                      maxLength={80}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none bg-white"
                      placeholder="e.g., Learn best practices from professionals"
                    />
                  </div>
                </div>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-slate-900 mb-6 pb-4 border-b-2 border-slate-200 mt-10 flex items-center gap-2">
              <Palette className="w-6 h-6 text-blue-600" />
              Visual Design & Branding
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-lg font-bold text-slate-900 mb-2">
                  Page Style & Tone <span className="text-red-600">*</span>
                </label>
                <p className="text-slate-600 mb-4 text-sm">
                  Choose the overall look and feel that matches your brand and target audience.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {styleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPageStyle(option.value)}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        pageStyle === option.value
                          ? 'border-blue-600 bg-blue-50 shadow-lg'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">{option.icon}</div>
                      <div className="font-bold text-slate-900">{option.label}</div>
                      <div className="text-xs text-slate-600 mt-1">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-lg font-bold text-slate-900 mb-2">
                  Color Scheme
                </label>
                <p className="text-slate-600 mb-4 text-sm">
                  Choose your brand colors. These will be used for buttons, headers, and accents throughout the page.
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-5 rounded-xl border-2 border-slate-200">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">Primary Color</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-16 h-16 border-3 border-slate-300 rounded-lg cursor-pointer"
                      />
                      <span className="font-mono text-xl font-bold text-slate-900">{primaryColor}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-xl border-2 border-slate-200">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">Secondary Color</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-16 h-16 border-3 border-slate-300 rounded-lg cursor-pointer"
                      />
                      <span className="font-mono text-xl font-bold text-slate-900">{secondaryColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-lg font-bold text-slate-900 mb-2">
                  Hero Image or Logo
                </label>
                <p className="text-slate-600 mb-4 text-sm">
                  Upload an image for the top of your landing page. This could be a course banner, your logo, or a relevant photo.
                </p>
                {!heroImagePreview ? (
                  <label className="block border-3 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-slate-50">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-700 font-semibold mb-1">Click to upload image</p>
                    <p className="text-sm text-slate-500">PNG, JPG up to 5MB • Recommended: 1200x600px</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleHeroImageSelect}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="border-2 border-slate-200 rounded-xl p-4 flex items-center gap-4">
                    <img src={heroImagePreview} alt="Hero preview" className="w-32 h-32 object-cover rounded-lg" />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 mb-2">Hero Image Preview</p>
                      <p className="text-sm text-slate-600 mb-3">This image will appear at the top of your landing page</p>
                      <label className="inline-block px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold cursor-pointer hover:bg-slate-700 transition-colors text-sm">
                        Change Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleHeroImageSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-2xl font-bold text-slate-900 mb-6 pb-4 border-b-2 border-slate-200 mt-10 flex items-center gap-2">
              <Target className="w-6 h-6 text-blue-600" />
              Publishing & Enrollment
            </h3>

            <div className="space-y-6">
              <div>
                <label htmlFor="publishUrl" className="block text-lg font-bold text-slate-900 mb-2">
                  Course URL
                </label>
                <p className="text-slate-600 mb-3 text-sm">
                  Enter the URL where you want to publish your course landing page. This could be your custom domain or subdomain.
                </p>
                <input
                  type="text"
                  id="publishUrl"
                  value={publishUrl}
                  onChange={(e) => setPublishUrl(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none bg-slate-50 focus:bg-white transition-colors"
                  placeholder="e.g., mycourse.example.com or example.com/courses/my-course"
                />
                <div className="bg-blue-50 rounded-lg p-3 mt-3 border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <strong>Examples:</strong> courses.mysite.com • www.mysite.com/learn • mysite.com/training/advanced
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="ctaButtonText" className="block text-lg font-bold text-slate-900 mb-2">
                  Enrollment Button Text <span className="text-red-600">*</span>
                </label>
                <p className="text-slate-600 mb-3 text-sm">
                  What should the main call-to-action button say? Make it action-oriented and benefit-focused.
                </p>
                <input
                  type="text"
                  id="ctaButtonText"
                  value={ctaButtonText}
                  onChange={(e) => setCtaButtonText(e.target.value)}
                  maxLength={50}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none bg-slate-50 focus:bg-white transition-colors"
                  placeholder="e.g., Start Learning Now"
                />
                <div className="text-right text-sm text-slate-500 mt-1">{ctaButtonText.length}/50 characters</div>
              </div>

              <div>
                <label htmlFor="pricingInfo" className="block text-lg font-bold text-slate-900 mb-2">
                  Pricing or Access Information
                </label>
                <p className="text-slate-600 mb-3 text-sm">
                  How will students access the course? Include pricing, free trial info, or enrollment details.
                </p>
                <textarea
                  id="pricingInfo"
                  value={pricingInfo}
                  onChange={(e) => setPricingInfo(e.target.value)}
                  maxLength={200}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none bg-slate-50 focus:bg-white transition-colors resize-none"
                  placeholder="e.g., $49 one-time payment • Full lifetime access • 30-day money-back guarantee"
                />
                <div className="text-right text-sm text-slate-500 mt-1">{pricingInfo.length}/200 characters</div>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-slate-900 mb-6 pb-4 border-b-2 border-slate-200 mt-10">
              ✨ Additional Elements (Optional)
            </h3>

            <div className="space-y-6">
              <div>
                <label htmlFor="testimonials" className="block text-lg font-bold text-slate-900 mb-2">
                  Student Testimonials or Reviews
                </label>
                <p className="text-slate-600 mb-3 text-sm">
                  Add 1-3 testimonials from past students. Include name, role, and their feedback.
                </p>
                <textarea
                  id="testimonials"
                  value={testimonials}
                  onChange={(e) => setTestimonials(e.target.value)}
                  maxLength={600}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none bg-slate-50 focus:bg-white transition-colors resize-none"
                  placeholder='e.g., "This course changed how I approach data at work." - Sarah Chen, Marketing Manager'
                />
                <div className="text-right text-sm text-slate-500 mt-1">{testimonials.length}/600 characters</div>
              </div>

              <div>
                <label htmlFor="specialMessage" className="block text-lg font-bold text-slate-900 mb-2">
                  Special Message or Unique Selling Point
                </label>
                <p className="text-slate-600 mb-3 text-sm">
                  Any additional message you want to highlight? Limited-time offer, bonus content, certification, etc.
                </p>
                <textarea
                  id="specialMessage"
                  value={specialMessage}
                  onChange={(e) => setSpecialMessage(e.target.value)}
                  maxLength={200}
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none bg-slate-50 focus:bg-white transition-colors resize-none"
                  placeholder="e.g., Bonus: Includes downloadable templates • Certificate of completion"
                />
                <div className="text-right text-sm text-slate-500 mt-1">{specialMessage.length}/200 characters</div>
              </div>
            </div>

            <div className="bg-green-50 rounded-xl p-6 mt-8">
              <div className="flex items-start gap-3">
                <span className="text-2xl">👁️</span>
                <div>
                  <h4 className="font-bold text-green-900 mb-2">What happens next</h4>
                  <p className="text-green-800 leading-relaxed">
                    After you submit, AI will generate a professional landing page based on your preferences. You'll be able to review it, make edits, and then publish it for your students. The page will be fully responsive and optimized for conversions.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8 pt-6 border-t-2 border-slate-200">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 px-6 py-4 border-2 border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Review
              </button>
              <button
                type="submit"
                disabled={!ctaButtonText.trim() || isGenerating}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-2"
              >
                Generate Landing Page
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </main>

      {isGenerating && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
            <div className="w-20 h-20 border-6 border-slate-200 border-t-green-500 rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-3xl font-black text-slate-900 text-center mb-3">
              Creating Your Landing Page... 🎨
            </h2>
            <p className="text-center text-slate-600 mb-6 leading-relaxed">
              AI is designing a professional, conversion-optimized landing page based on your preferences.
            </p>

            <div className="bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
              <div
                className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
            <p className="text-center text-green-600 font-semibold mb-6">
              {generationStatus}
            </p>

            <p className="text-center text-slate-500 text-sm">
              Please don't close this window.
            </p>
          </div>
        </div>
      )}

      <AIHelperPanel
        isOpen={isAIPanelOpen}
        onClose={handleCloseAIPanel}
        fieldName={aiActiveField}
        fieldDescription={
          aiActiveField === 'Course Headline'
            ? "A catchy, benefit-focused headline that grabs attention. What's the main promise of your course?"
            : aiActiveField === 'Value Proposition'
            ? "In 2-3 sentences, explain why someone should take this course. What transformation will they experience?"
            : aiActiveField === 'Who Is This Course For?'
            ? "Describe your ideal student. Help visitors self-identify if this course is right for them."
            : aiActiveField === 'Key Course Benefits'
            ? "Highlight 2-4 key benefits or learning outcomes. What will students gain?"
            : ''
        }
        currentValue={
          aiActiveField === 'Course Headline' ? courseHeadline
          : aiActiveField === 'Value Proposition' ? valueProposition
          : aiActiveField === 'Who Is This Course For?' ? audienceDescription
          : ''
        }
        courseTopic={courseTopicForAI}
        onInsert={handleInsertAIContent}
      />
    </div>
  );
}
