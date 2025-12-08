import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Upload, Check, Sparkles, Palette, Image, Zap, GraduationCap, Monitor, Home, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CourseContent {
  course_title: string;
  total_lessons: number;
  estimated_duration: string;
}

interface GeneratePresentationProps {
  courseId: string;
  courseContent: CourseContent;
  onBack: () => void;
  onComplete: () => void;
  onBackToCourses?: () => void;
  onLogout?: () => void;
}

type Theme = 'modern' | 'vibrant' | 'academic' | 'tech';

interface ThemeOption {
  id: Theme;
  name: string;
  description: string;
  icon: typeof Sparkles;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  preview: {
    bg: string;
    card: string;
    text: string;
    button: string;
  };
}

const themes: ThemeOption[] = [
  {
    id: 'modern',
    name: 'Modern & Clean',
    description: 'Minimalist design with lots of white space, perfect for professional courses',
    icon: Sparkles,
    colors: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      accent: '#60A5FA'
    },
    preview: {
      bg: 'bg-gradient-to-br from-blue-50 to-slate-100',
      card: 'bg-white border-2 border-blue-200',
      text: 'text-slate-900',
      button: 'bg-gradient-to-r from-blue-600 to-blue-700'
    }
  },
  {
    id: 'vibrant',
    name: 'Vibrant & Engaging',
    description: 'Colorful and energetic, great for creative or youth-oriented courses',
    icon: Zap,
    colors: {
      primary: '#EC4899',
      secondary: '#8B5CF6',
      accent: '#F59E0B'
    },
    preview: {
      bg: 'bg-gradient-to-br from-pink-100 via-purple-100 to-orange-100',
      card: 'bg-white border-2 border-pink-300',
      text: 'text-slate-900',
      button: 'bg-gradient-to-r from-pink-500 to-purple-600'
    }
  },
  {
    id: 'academic',
    name: 'Academic & Professional',
    description: 'Traditional, scholarly look for formal education',
    icon: GraduationCap,
    colors: {
      primary: '#1F2937',
      secondary: '#4B5563',
      accent: '#B45309'
    },
    preview: {
      bg: 'bg-gradient-to-br from-slate-100 to-amber-50',
      card: 'bg-white border-2 border-slate-300',
      text: 'text-slate-900',
      button: 'bg-gradient-to-r from-slate-700 to-slate-800'
    }
  },
  {
    id: 'tech',
    name: 'Tech & Innovation',
    description: 'Modern tech aesthetic for technical courses',
    icon: Monitor,
    colors: {
      primary: '#0EA5E9',
      secondary: '#06B6D4',
      accent: '#10B981'
    },
    preview: {
      bg: 'bg-gradient-to-br from-cyan-50 to-teal-50',
      card: 'bg-white border-2 border-cyan-200',
      text: 'text-slate-900',
      button: 'bg-gradient-to-r from-cyan-600 to-teal-600'
    }
  }
];

export default function GeneratePresentation({
  courseId,
  courseContent,
  onBack,
  onComplete,
  onBackToCourses,
  onLogout
}: GeneratePresentationProps) {
  const [selectedTheme, setSelectedTheme] = useState<Theme>('modern');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadExistingConfig();
  }, [courseId]);

  const loadExistingConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('presentation_configs')
        .select('*')
        .eq('course_id', courseId)
        .maybeSingle();

      if (error) {
        console.error('Error loading presentation config:', error);
      } else if (data) {
        setSelectedTheme(data.theme as Theme);
        if (data.logo_url) {
          setLogoPreview(data.logo_url);
        }
      }
    } catch (err) {
      console.error('Error loading existing presentation config:', err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo file must be smaller than 2MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      let logoUrl: string | null = null;

      if (logoFile) {
        setGenerationProgress(10);
        setIsUploading(true);

        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${courseId}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('course-logos')
          .upload(filePath, logoFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Logo upload error:', uploadError);
        } else {
          const { data } = supabase.storage
            .from('course-logos')
            .getPublicUrl(filePath);

          logoUrl = data.publicUrl;
        }

        setIsUploading(false);
        setGenerationProgress(25);
      }

      setGenerationProgress(40);

      const selectedThemeObj = themes.find(t => t.id === selectedTheme)!;

      const { error: configError } = await supabase
        .from('presentation_configs')
        .upsert({
          course_id: courseId,
          theme: selectedTheme,
          logo_url: logoUrl,
          primary_color: selectedThemeObj.colors.primary,
          updated_at: new Date().toISOString()
        });

      if (configError) {
        console.error('Error saving presentation config:', configError);
      }

      setGenerationProgress(100);

      onComplete();
    } catch (err) {
      console.error('Error generating presentation:', err);
      setIsGenerating(false);
    }
  };

  const selectedThemeObj = themes.find(t => t.id === selectedTheme)!;

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
              <span>Back to Quizzes</span>
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
                <Check className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-slate-700 mt-2">Course Details</span>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-green-500 border-4 border-white flex items-center justify-center text-white font-bold shadow-lg">
                <Check className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-slate-700 mt-2">Review Outline</span>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-green-500 border-4 border-white flex items-center justify-center text-white font-bold shadow-lg">
                <Check className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-slate-700 mt-2">Generate Quizzes</span>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-600 border-4 border-white flex items-center justify-center text-white font-bold shadow-lg">
                4
              </div>
              <span className="text-sm font-semibold text-blue-900 mt-2">Course Presentation</span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto py-12">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎨</div>
            <h1 className="text-4xl font-black text-slate-900 mb-3">Design Your Course Pages</h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Choose a visual style for your course presentation. These pages will include your course overview, lessons, quizzes, and completion certificate.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg mb-6">
            <div className="flex items-center gap-3 mb-6">
              <Palette className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900">Select Your Theme</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {themes.map((theme) => {
                const Icon = theme.icon;
                const isSelected = selectedTheme === theme.id;

                return (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`relative text-left p-6 rounded-xl border-3 transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 shadow-lg scale-105'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute -top-3 -right-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}

                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-blue-600' : 'bg-slate-100'
                      }`}>
                        <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-slate-600'}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 mb-1">{theme.name}</h3>
                        <p className="text-sm text-slate-600">{theme.description}</p>
                      </div>
                    </div>

                    <div className={`${theme.preview.bg} rounded-lg p-4 border-2 border-slate-200`}>
                      <div className="text-center mb-3">
                        <div className="inline-block px-3 py-1 bg-white rounded-full text-xs font-semibold text-slate-600 mb-2">
                          Preview
                        </div>
                      </div>
                      <div className={`${theme.preview.card} rounded-lg p-4 mb-3`}>
                        <div className="h-2 bg-slate-200 rounded w-3/4 mb-2"></div>
                        <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                      </div>
                      <div className={`${theme.preview.button} text-white text-center py-2 rounded-lg text-sm font-bold`}>
                        Button Style
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      {Object.values(theme.colors).map((color, idx) => (
                        <div
                          key={idx}
                          className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg mb-6">
            <div className="flex items-center gap-3 mb-6">
              <Image className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900">Add Your Logo (Optional)</h2>
            </div>

            <p className="text-slate-600 mb-6">
              Upload your logo to personalize your course pages. This will appear in the header of all course pages.
            </p>

            {!logoPreview ? (
              <div className="border-3 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-700 font-semibold mb-2">Click to upload your logo</p>
                <p className="text-sm text-slate-500 mb-4">PNG, JPG, or SVG • Max 2MB</p>
                <label className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-bold cursor-pointer hover:bg-blue-700 transition-colors">
                  Choose File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoSelect}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="border-2 border-slate-200 rounded-xl p-6 flex items-center gap-6">
                <div className="w-32 h-32 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border-2 border-slate-300">
                  <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 mb-2">Logo Preview</p>
                  <p className="text-sm text-slate-600 mb-4">Your logo will appear in the header of all course pages</p>
                  <div className="flex gap-3">
                    <label className="px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold cursor-pointer hover:bg-slate-700 transition-colors text-sm">
                      Change Logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoSelect}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={handleRemoveLogo}
                      className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors text-sm"
                    >
                      Remove Logo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg mb-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Your Course Presentation Will Include:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">Course Overview Page</p>
                  <p className="text-sm text-slate-600">Introduction, objectives, and course structure</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">{courseContent.total_lessons} Lesson Pages</p>
                  <p className="text-sm text-slate-600">One page per lesson with full content</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">{courseContent.total_lessons} Quiz Pages</p>
                  <p className="text-sm text-slate-600">Interactive quizzes after each lesson</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">Completion Certificate</p>
                  <p className="text-sm text-slate-600">Personalized certificate for students</p>
                </div>
              </div>
            </div>
          </div>

          <div className={`${selectedThemeObj.preview.bg} rounded-2xl p-8 shadow-lg mb-6`}>
            <h3 className="text-xl font-bold text-slate-900 mb-4 text-center">Preview: {courseContent.course_title}</h3>
            <div className={`${selectedThemeObj.preview.card} rounded-xl p-6 max-w-2xl mx-auto`}>
              {logoPreview && (
                <div className="flex justify-center mb-4">
                  <img src={logoPreview} alt="Logo" className="h-16 object-contain" />
                </div>
              )}
              <h1 className="text-3xl font-black text-slate-900 mb-3 text-center">{courseContent.course_title}</h1>
              <div className="flex justify-center gap-6 mb-4 text-sm text-slate-600">
                <span>📚 {courseContent.total_lessons} Lessons</span>
                <span>⏱️ {courseContent.estimated_duration}</span>
              </div>
              <div className={`${selectedThemeObj.preview.button} text-white text-center py-3 rounded-lg font-bold mt-4`}>
                Start Learning
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex gap-4">
              <button
                onClick={onBack}
                className="flex-1 px-6 py-4 border-2 border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Quizzes
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Course Pages
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {isGenerating && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
            <div className="w-20 h-20 border-6 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-3xl font-black text-slate-900 text-center mb-3">
              {isUploading ? 'Uploading Logo...' : 'Creating Your Course Pages... 🎨'}
            </h2>
            <p className="text-center text-slate-600 mb-6">
              Generating beautiful course pages with your selected theme and branding.
            </p>

            <div className="bg-slate-100 h-3 rounded-full overflow-hidden mb-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
            <p className="text-center text-blue-600 font-semibold">
              {generationProgress < 25 ? 'Processing logo...' :
               generationProgress < 60 ? 'Applying theme...' :
               generationProgress < 80 ? 'Generating pages...' :
               'Finalizing...'}
            </p>

            <p className="text-center text-slate-500 text-sm mt-6">
              This typically takes 20-30 seconds. Please don't close this window.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
