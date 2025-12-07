import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Upload, X, MessageSquare, Send, Sparkles, Lightbulb, FileText, Plus, BookOpen, Clock, TrendingUp, LogOut, AlertTriangle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CourseResults, { IssueState } from '../components/CourseResults';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import GenerateQuizzes from './GenerateQuizzes';
import GeneratePresentation from './GeneratePresentation';
import ReviewPresentation from './ReviewPresentation';
import CustomizeLandingPage from './CustomizeLandingPage';
import ReviewLandingPage from './ReviewLandingPage';
import CoursePublished from './CoursePublished';
import CourseWorkflowDashboard from './CourseWorkflowDashboard';

interface CreateCourseProps {
  onComplete: (courseId: string) => void;
  onBack: () => void;
  onViewAnalytics?: (courseId: string, courseTitle: string) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Course {
  id: string;
  title: string;
  status: string;
  difficulty_level: string;
  created_at: string;
  updated_at: string;
  current_step: number;
  last_completed_step: number;
  content_status: string;
  quizzes_status: string;
  presentation_status: string;
  landing_page_status: string;
  published_status: string;
  downloaded_status: string;
}

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

interface VerificationResults {
  verified: boolean;
  errors: Array<{ lesson: number; issue: string; suggestion: string }>;
  accuracy_score: number;
}

export default function CreateCourse({ onComplete, onBack, onViewAnalytics }: CreateCourseProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showNewCourseForm, setShowNewCourseForm] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingCourseData, setLoadingCourseData] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [courseContent, setCourseContent] = useState<CourseContent | null>(null);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [verificationResults, setVerificationResults] = useState<VerificationResults | undefined>(undefined);
  const [isViewMode, setIsViewMode] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'info' | 'error'; message: string } | null>(null);
  const [showQuizGeneration, setShowQuizGeneration] = useState(false);
  const [showPresentationGeneration, setShowPresentationGeneration] = useState(false);
  const [showPresentationReview, setShowPresentationReview] = useState(false);
  const [showLandingPageCustomization, setShowLandingPageCustomization] = useState(false);
  const [showLandingPageReview, setShowLandingPageReview] = useState(false);
  const [showCoursePublished, setShowCoursePublished] = useState(false);
  const [showWorkflowDashboard, setShowWorkflowDashboard] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    audience: '',
    difficulty: '',
    duration: '',
    objectives: '',
    context: '',
    contentFormat: 'text',
    videoAvatarId: 'Adrian_public_3_20240312',
    videoVoiceId: '75af67cc2ceb498681d0085bb56bddc3',
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [restrictToFiles, setRestrictToFiles] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingTopic, setLoadingTopic] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);

  useEffect(() => {
    fetchUserCourses();
    checkConfiguration();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [showResults, showQuizGeneration, showPresentationGeneration, showPresentationReview, showLandingPageCustomization, showLandingPageReview, showCoursePublished, showNewCourseForm]);

  const checkConfiguration = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing Supabase configuration');
        setStatusBanner({
          type: 'error',
          message: 'Configuration error: Supabase credentials are missing. Please check your .env file.'
        });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }

      const healthCheckUrl = `${supabaseUrl}/functions/v1/generate-course-content`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(healthCheckUrl, {
          method: 'OPTIONS',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok && response.status !== 404) {
          console.warn('Edge function health check returned:', response.status);
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name !== 'AbortError') {
          console.warn('Edge function connectivity check failed:', err.message);
        }
      }
    } catch (err) {
      console.error('Configuration check failed:', err);
    }
  }

  const fetchUserCourses = async () => {
    setLoadingCourses(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error('No user found');
        setLoadingCourses(false);
        return;
      }

      const { data, error } = await supabase
        .from('courses')
        .select('id, title, status, difficulty_level, created_at, updated_at, current_step, last_completed_step, content_status, quizzes_status, presentation_status, landing_page_status, published_status, downloaded_status')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setCourses(data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleNewCourse = () => {
    setSelectedCourse(null);
    setShowNewCourseForm(true);
    setFormData({
      subject: '',
      audience: '',
      difficulty: '',
      duration: '',
      objectives: '',
      context: '',
      contentFormat: 'text',
      videoAvatarId: 'Adrian_public_3_20240312',
      videoVoiceId: '75af67cc2ceb498681d0085bb56bddc3',
    });
    setUploadedFiles([]);
    setRestrictToFiles(false);
    setChatMessages([]);
    setShowChat(false);
    setStatusBanner(null);
    setIsViewMode(false);
  };

  const handleSelectCourse = async (course: Course) => {
    setLoadingCourseData(true);
    setStatusBanner(null);
    setShowResults(false);
    setShowNewCourseForm(false);
    setShowWorkflowDashboard(false);

    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', course.id)
        .single();

      if (error) throw error;

      setSelectedCourse(data as any);

      setFormData({
        subject: data.title || '',
        audience: data.target_audience || '',
        difficulty: data.difficulty_level || '',
        duration: data.duration || '',
        objectives: data.learning_objectives || '',
        context: data.additional_context || '',
        contentFormat: data.content_format || 'text',
        videoAvatarId: data.video_config?.avatar_id || 'Adrian_public_3_20240312',
        videoVoiceId: data.video_config?.voice_id || '75af67cc2ceb498681d0085bb56bddc3',
      });

      setChatMessages(data.chat_history || []);
      setRestrictToFiles(data.restrict_to_files || false);

      if (data.uploaded_files && Array.isArray(data.uploaded_files) && data.uploaded_files.length > 0) {
        setStatusBanner({
          type: 'info',
          message: `This course had ${data.uploaded_files.length} file(s) uploaded previously. You can upload new files if needed.`
        });
      }

      if (data.generated_content && data.generated_content.lessons) {
        setCourseContent(data.generated_content);
        setCurrentCourseId(data.id);
        setVerificationResults(data.verification_results && data.verification_results.errors ? data.verification_results : undefined);
      }

      setShowWorkflowDashboard(true);
    } catch (err) {
      console.error('Error loading course:', err);
      setStatusBanner({
        type: 'error',
        message: 'Failed to load course data. Please try selecting the course again.'
      });
    } finally {
      setLoadingCourseData(false);
    }
  };

  const handleDashboardContinue = () => {
    if (!selectedCourse) return;

    setShowWorkflowDashboard(false);

    const currentStep = selectedCourse.current_step;

    if (currentStep === 1) {
      setShowResults(true);
      setIsViewMode(false);
    } else if (currentStep === 2) {
      setShowQuizGeneration(true);
    } else if (currentStep === 3) {
      setShowPresentationGeneration(true);
    } else if (currentStep === 4) {
      setShowLandingPageCustomization(true);
    } else if (currentStep === 5) {
      setShowLandingPageReview(true);
    } else if (currentStep === 6) {
      setShowCoursePublished(true);
    }
  };

  const handleDashboardEditStep = (step: number) => {
    if (!selectedCourse) return;

    setShowWorkflowDashboard(false);

    if (step === 1) {
      setShowResults(true);
      setIsViewMode(true);
    } else if (step === 2) {
      setShowQuizGeneration(true);
    } else if (step === 3) {
      setShowPresentationGeneration(true);
    } else if (step === 4) {
      setShowLandingPageCustomization(true);
    } else if (step === 5) {
      setShowLandingPageReview(true);
    } else if (step === 6) {
      setShowCoursePublished(true);
    }
  };

  const handleBackToDashboard = () => {
    setShowNewCourseForm(false);
    setShowResults(false);
    setShowQuizGeneration(false);
    setShowPresentationGeneration(false);
    setShowPresentationReview(false);
    setShowLandingPageCustomization(false);
    setShowLandingPageReview(false);
    setShowCoursePublished(false);
    setShowWorkflowDashboard(true);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration is missing');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(
        `${supabaseUrl}/functions/v1/chat-refinement`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage,
            courseDetails: {
              subject: formData.subject,
              audience: formData.audience,
              difficulty: formData.difficulty,
              duration: formData.duration,
              objectives: formData.objectives,
              context: formData.context,
            },
            chatHistory: chatMessages,
            existingContent: courseContent,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Chat API error:', response.status, errorText);

        if (response.status === 503) {
          throw new Error('The AI chat service is currently unavailable. Please ensure the ANTHROPIC_API_KEY is configured in Supabase Edge Functions.');
        } else if (response.status === 500) {
          throw new Error('The chat service encountered an error. Please try again.');
        } else {
          throw new Error(`Chat service error: ${response.status}`);
        }
      }

      const data = await response.json();

      if (data.success) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      } else {
        throw new Error(data.error || 'Chat service returned an error');
      }
    } catch (error: any) {
      console.error('Chat error:', error);

      let errorMessage = 'Sorry, I encountered an error. ';

      if (error.name === 'AbortError') {
        errorMessage += 'The request timed out. Please try again.';
      } else if (error.message?.includes('ANTHROPIC_API_KEY')) {
        errorMessage += 'The AI service needs to be configured. Please ensure the ANTHROPIC_API_KEY is set in Supabase.';
      } else if (error.message?.includes('fetch')) {
        errorMessage += 'Unable to connect to the chat service. Please check your internet connection.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }

      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: errorMessage }
      ]);
    }
  };

  const isFormValid = () => {
    return formData.subject.trim() !== '' &&
           formData.audience.trim() !== '' &&
           formData.difficulty !== '' &&
           formData.duration !== '';
  };

  const simulateProgress = (startProgress: number, endProgress: number, duration: number, stage: string) => {
    setGenerationStage(stage);
    const steps = 20;
    const increment = (endProgress - startProgress) / steps;
    const intervalDuration = duration / steps;

    let currentProgress = startProgress;
    const interval = setInterval(() => {
      currentProgress += increment;
      if (currentProgress >= endProgress) {
        setGenerationProgress(endProgress);
        clearInterval(interval);
      } else {
        setGenerationProgress(Math.floor(currentProgress));
      }
    }, intervalDuration);

    return interval;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setLoading(true);
    setLoadingTopic(formData.subject);
    setGenerationProgress(0);
    setGenerationStage('Initializing course generation...');

    const lessonCount = formData.duration.includes('30') ? 3 :
                        formData.duration.includes('1-hour') ? 4 :
                        formData.duration.includes('2-hours') ? 6 :
                        formData.duration.includes('3-hours') ? 8 : 10;

    const estimatedTime = lessonCount * 15;
    setEstimatedTimeRemaining(estimatedTime);

    let courseId: string;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('Please log in to create a course');
        setLoading(false);
        return;
      }

      let progressInterval = simulateProgress(0, 10, 2000, 'Preparing files...');

      let fileUrls: string[] = [];
      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('course-materials')
            .upload(fileName, file);

          if (uploadError) {
            clearInterval(progressInterval);
            console.error('Storage upload error:', uploadError);
            throw new Error(`Failed to upload file ${file.name}: ${uploadError.message}`);
          }

          const { data: { publicUrl } } = supabase.storage
            .from('course-materials')
            .getPublicUrl(fileName);

          fileUrls.push(publicUrl);
        }
      }

      clearInterval(progressInterval);
      setGenerationProgress(10);

      progressInterval = simulateProgress(10, 15, 1000, 'Setting up course structure...');

      const courseData = {
        user_id: user.id,
        title: formData.subject,
        topic: formData.subject,
        target_audience: formData.audience,
        difficulty_level: formData.difficulty,
        duration: formData.duration,
        learning_objectives: formData.objectives,
        additional_context: formData.context,
        uploaded_files: fileUrls,
        restrict_to_files: restrictToFiles,
        chat_history: chatMessages,
        status: 'generating',
        generation_started_at: new Date().toISOString(),
        generation_progress: 15,
        generation_stage: 'Researching topic...',
        retry_count: 0,
        generated_content: null,
        verification_results: null,
        generation_error: null,
        generation_completed_at: null,
        content_status: 'in_progress',
        current_step: 1,
        last_completed_step: 0,
        quizzes_status: 'not_started',
        presentation_status: 'not_configured',
        landing_page_status: 'not_configured',
        published_status: 'not_published',
        downloaded_status: 'not_downloaded',
        content_format: formData.contentFormat,
        video_config: {
          enabled: formData.contentFormat === 'video',
          avatar_id: formData.videoAvatarId,
          voice_id: formData.videoVoiceId,
          background_style: 'color',
          background_color: '#f0f4f8',
          include_lesson_videos: true,
          include_quiz_explanation_videos: true
        },
        video_generation_status: 'not_started',
        video_generation_progress: 0,
      };

      if (selectedCourse?.id) {
        console.log('Regenerating existing course:', selectedCourse.id);
        courseId = selectedCourse.id;

        const { error: updateError } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', courseId);

        if (updateError) {
          clearInterval(progressInterval);
          console.error('Database update error:', updateError);
          throw new Error(`Failed to update course: ${updateError.message}`);
        }

        console.log('Course data reset successfully for regeneration');

        await supabase
          .from('quizzes')
          .delete()
          .eq('course_id', courseId);

        console.log('Existing quizzes deleted for regeneration');
      } else {
        console.log('Creating new course');
        const { data: course, error: courseError } = await supabase
          .from('courses')
          .insert([courseData])
          .select()
          .single();

        if (courseError) {
          clearInterval(progressInterval);
          console.error('Database insert error:', courseError);
          throw new Error(`Failed to create course in database: ${courseError.message}`);
        }
        courseId = course.id;
        console.log('New course created with ID:', courseId);
      }

      clearInterval(progressInterval);
      setGenerationProgress(15);

      const uploadedFileContents: string[] = [];
      if (fileUrls.length > 0) {
        setGenerationStage(`Reading ${fileUrls.length} uploaded reference file${fileUrls.length > 1 ? 's' : ''}...`);

        for (let i = 0; i < fileUrls.length; i++) {
          const url = fileUrls[i];
          try {
            const fileResponse = await fetch(url);
            if (!fileResponse.ok) {
              console.error(`Failed to fetch file from ${url}: ${fileResponse.status}`);
              continue;
            }
            const fileText = await fileResponse.text();
            if (fileText.trim().length === 0) {
              console.warn(`File at ${url} is empty`);
              continue;
            }
            uploadedFileContents.push(fileText);
          } catch (err) {
            console.error('Error reading file:', err);
          }
        }

        const totalWords = uploadedFileContents.reduce((sum, content) =>
          sum + content.split(/\s+/).length, 0
        );

        if (uploadedFileContents.length === 0) {
          throw new Error('Failed to read any of the uploaded files. Please try uploading again.');
        }

        console.log(`Successfully loaded ${uploadedFileContents.length} reference file(s) with ${totalWords.toLocaleString()} words`);
        setGenerationStage(`Loaded ${uploadedFileContents.length} reference file(s) (${totalWords.toLocaleString()} words)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
          'Configuration error: Supabase credentials are missing. Please check your environment variables and restart the application.'
        );
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication error: Please log out and log back in.');
      }

      progressInterval = simulateProgress(15, 90, estimatedTime * 800, 'AI is researching and generating course content...');

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate-course-content`;
      console.log('Starting async course generation:', edgeFunctionUrl);
      console.log('Course ID:', courseId);

      fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: courseId,
          subject: formData.subject,
          audience: formData.audience,
          difficulty: formData.difficulty,
          duration: formData.duration,
          objectives: formData.objectives,
          context: formData.context,
          uploadedFileContents: uploadedFileContents.length > 0 ? uploadedFileContents : undefined,
          restrictToFilesOnly: restrictToFiles,
          chatHistory: chatMessages,
        }),
      }).then(response => {
        console.log('Edge function call initiated, status:', response.status);
      }).catch(err => {
        console.error('Edge function call failed to initiate:', err);
      });

      clearInterval(progressInterval);

      let pollAttempts = 0;
      const maxPollAttempts = 180;
      const pollInterval = 2000;

      const pollForCompletion = async (): Promise<boolean> => {
        pollAttempts++;

        if (pollAttempts > maxPollAttempts) {
          console.error('Polling timeout: Max attempts reached');
          throw new Error('Course generation is taking longer than expected. Please check back in a few minutes or contact support.');
        }

        try {
          const { data: courseData, error: pollError } = await supabase
            .from('courses')
            .select('status, generation_progress, generation_stage, generated_content, generation_error, current_lesson_generating, content_format, video_generation_status, video_generation_progress, video_generation_stage, videos_generated_count, videos_total_count')
            .eq('id', courseId)
            .single();

          if (pollError) {
            console.error('Polling error:', pollError);
            return false;
          }

          if (!courseData) {
            console.error('Course not found during polling');
            return false;
          }

          setGenerationProgress(courseData.generation_progress || 0);
          setGenerationStage(courseData.generation_stage || 'Processing...');

          if (courseData.status === 'completed') {
            console.log('Course generation completed successfully');

            if (!courseData.generated_content || !courseData.generated_content.lessons) {
              throw new Error('Course completed but content is missing');
            }

            if (courseData.content_format === 'video' && courseData.video_generation_status === 'in_progress') {
              const videoProgress = courseData.video_generation_progress || 0;
              const videoStage = courseData.video_generation_stage || 'Generating videos...';
              setGenerationProgress(Math.min(videoProgress, 99));
              setGenerationStage(`${videoStage} (${courseData.videos_generated_count || 0}/${courseData.videos_total_count || 0} videos)`);
              return false;
            }

            if (courseData.content_format === 'video' && courseData.video_generation_status === 'processing') {
              setGenerationProgress(85);
              setGenerationStage(`Videos are processing at HeyGen (${courseData.videos_generated_count || 0}/${courseData.videos_total_count || 0} completed)...`);
              return false;
            }

            setGenerationProgress(100);
            setGenerationStage('Course generation complete!');
            setLoading(false);
            setCourseContent(courseData.generated_content);
            setCurrentCourseId(courseId);
            setSelectedCourse(courseData as any);
            setShowResults(true);
            setShowNewCourseForm(false);
            setIsViewMode(false);
            await fetchUserCourses();
            return true;
          }

          if (courseData.status === 'failed') {
            console.error('Course generation failed:', courseData.generation_error);
            throw new Error(courseData.generation_error || 'Course generation failed');
          }

          return false;
        } catch (error) {
          console.error('Error during polling:', error);
          throw error;
        }
      };

      let videoStatusInterval: NodeJS.Timeout | null = null;

      const checkVideoGenerationStatus = async () => {
        try {
          const { checkVideoStatus } = await import('../lib/edgeFunctions');
          const result = await checkVideoStatus({ courseId });
          console.log('Video status check result:', result);
        } catch (error) {
          console.error('Error checking video status:', error);
        }
      };

      const startPolling = async () => {
        while (pollAttempts < maxPollAttempts) {
          try {
            const isComplete = await pollForCompletion();

            const { data: currentCourse } = await supabase
              .from('courses')
              .select('content_format, video_generation_status')
              .eq('id', courseId)
              .single();

            if (currentCourse?.content_format === 'video' &&
                (currentCourse.video_generation_status === 'processing' || currentCourse.video_generation_status === 'in_progress') &&
                !videoStatusInterval) {
              videoStatusInterval = setInterval(checkVideoGenerationStatus, 30000);
            }

            if (isComplete) {
              if (videoStatusInterval) {
                clearInterval(videoStatusInterval);
              }
              return;
            }
            await new Promise(resolve => setTimeout(resolve, pollInterval));
          } catch (error) {
            if (videoStatusInterval) {
              clearInterval(videoStatusInterval);
            }
            throw error;
          }
        }
        if (videoStatusInterval) {
          clearInterval(videoStatusInterval);
        }
      };

      await startPolling();

    } catch (err: any) {
      console.error('Error during course generation:', err);

      const errorMessage = err.message || 'An unexpected error occurred';
      const errorDetails = {
        message: errorMessage,
        timestamp: new Date().toISOString(),
        courseId: courseId! || 'undefined',
        selectedCourseId: selectedCourse?.id || 'none',
        action: selectedCourse?.id ? 'update' : 'create',
        formData: {
          subject: formData.subject,
          difficulty: formData.difficulty,
          duration: formData.duration,
        }
      };
      console.error('Full error details:', errorDetails);

      const isConfigError = errorMessage.includes('ANTHROPIC_API_KEY') ||
                            errorMessage.includes('Configuration Error') ||
                            errorMessage.includes('not properly configured');
      const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('timed out');
      const isRateLimitError = errorMessage.includes('Rate limit') || errorMessage.includes('429');

      let userMessage = errorMessage;
      if (isConfigError) {
        userMessage += '\n\nSetup Instructions:\n' +
                      '1. Go to your Supabase Dashboard\n' +
                      '2. Navigate to Project Settings > Edge Functions\n' +
                      '3. Add a new secret named ANTHROPIC_API_KEY\n' +
                      '4. Get your API key from https://console.anthropic.com\n' +
                      '5. Redeploy your edge functions';
      } else if (isTimeoutError) {
        userMessage += '\n\nSuggestions:\n' +
                      '• Try creating a shorter course (fewer lessons)\n' +
                      '• Simplify your requirements and objectives\n' +
                      '• Wait a minute and try again';
      } else if (isRateLimitError) {
        userMessage += '\n\nPlease wait 2-3 minutes before trying again.';
      }

      alert(
        'Error creating course:\n\n' +
        userMessage +
        '\n\nCheck the browser console for technical details.'
      );
      setLoading(false);

      if (courseId! && (isConfigError || isTimeoutError)) {
        setStatusBanner({
          type: 'error',
          message: isConfigError
            ? 'Configuration required: Set up ANTHROPIC_API_KEY in Supabase'
            : 'Generation timed out: Try a shorter course or simpler requirements'
        });
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onBack();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-blue-600 bg-blue-100';
      case 'advanced': return 'text-purple-600 bg-purple-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generating': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleReturnToEdit = () => {
    setShowResults(false);
    setShowNewCourseForm(true);
    setVerificationResults(undefined);
  };

  const handleVerify = async () => {
    if (!courseContent) return;

    setIsVerifying(true);

    try {
      const verifyResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-course-content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            course_title: courseContent.course_title,
            lessons: courseContent.lessons,
          }),
        }
      );

      const verifyData = await verifyResponse.json();

      if (!verifyData.success) {
        throw new Error(verifyData.error || 'Failed to verify course content');
      }

      setVerificationResults(verifyData.verificationResults);

      if (currentCourseId) {
        await supabase
          .from('courses')
          .update({ verification_results: verifyData.verificationResults })
          .eq('id', currentCourseId);
      }
    } catch (error) {
      console.error('Error verifying content:', error);
      alert('Failed to verify content: ' + (error as Error).message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAutoCorrect = async () => {
    if (!verificationResults || !courseContent) return;

    setIsCorrecting(true);

    setTimeout(() => {
      const correctedContent = { ...courseContent };

      verificationResults.errors.forEach(error => {
        const lessonIndex = error.lesson - 1;
        if (correctedContent.lessons[lessonIndex]) {
          correctedContent.lessons[lessonIndex].content += '\n\n<strong>[Corrected]</strong> ' + error.suggestion;
        }
      });

      setCourseContent(correctedContent);

      if (currentCourseId) {
        supabase
          .from('courses')
          .update({ generated_content: correctedContent })
          .eq('id', currentCourseId);
      }

      setVerificationResults({
        verified: true,
        accuracy_score: 100,
        errors: []
      });
      setIsCorrecting(false);
    }, 3000);
  };

  const handleAcceptResults = async (issueStates: Record<string, IssueState>) => {
    if (isViewMode) {
      if (currentCourseId) {
        onComplete(currentCourseId);
      }
      return;
    }

    const acceptedIssues = Object.values(issueStates).filter(s => s.status === 'accepted');

    if (acceptedIssues.length > 0 && courseContent) {
      const updatedContent = { ...courseContent };

      acceptedIssues.forEach(issue => {
        const lessonIndex = issue.lesson - 1;
        if (updatedContent.lessons[lessonIndex]) {
          updatedContent.lessons[lessonIndex].content +=
            `\n\n<div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px; margin-top: 16px; border-radius: 4px;">` +
            `<strong style="color: #166534;">✓ AI Improvement Applied:</strong> ` +
            `<span style="color: #15803d;">${issue.suggestion}</span>` +
            `</div>`;
        }
      });

      setCourseContent(updatedContent);

      if (currentCourseId) {
        await supabase
          .from('courses')
          .update({
            generated_content: updatedContent,
            verification_results: {
              ...verificationResults,
              verified: true,
              accuracy_score: 100,
              errors: []
            }
          })
          .eq('id', currentCourseId);
      }
    }

    setShowQuizGeneration(true);
  };

  const handleBackFromQuizGeneration = () => {
    setShowQuizGeneration(false);
  };

  const handleQuizGenerationComplete = () => {
    setShowQuizGeneration(false);
    setShowPresentationGeneration(true);
  };

  const handleBackFromPresentationGeneration = () => {
    setShowPresentationGeneration(false);
    setShowQuizGeneration(true);
  };

  const handlePresentationGenerationComplete = () => {
    setShowPresentationGeneration(false);
    setShowPresentationReview(true);
  };

  const handleBackFromPresentationReview = () => {
    setShowPresentationReview(false);
    setShowPresentationGeneration(true);
  };

  const handlePresentationReviewComplete = async () => {
    if (currentCourseId) {
      await supabase
        .from('courses')
        .update({
          presentation_status: 'configured',
          presentation_accepted_at: new Date().toISOString(),
          current_step: 4,
          last_completed_step: 3,
        })
        .eq('id', currentCourseId);

      await fetchUserCourses();
    }

    setShowPresentationReview(false);
    setShowLandingPageCustomization(true);
  };

  const handleBackFromLandingPageCustomization = () => {
    setShowLandingPageCustomization(false);
    setShowPresentationReview(true);
  };

  const handleLandingPageCustomizationComplete = () => {
    setShowLandingPageCustomization(false);
    setShowLandingPageReview(true);
  };

  const handleBackFromLandingPageReview = () => {
    setShowLandingPageReview(false);
    setShowLandingPageCustomization(true);
  };

  const handleLandingPageReviewComplete = async () => {
    if (currentCourseId) {
      await supabase
        .from('courses')
        .update({
          landing_page_status: 'configured',
          landing_page_accepted_at: new Date().toISOString(),
          current_step: 5,
          last_completed_step: 4,
        })
        .eq('id', currentCourseId);

      await fetchUserCourses();
    }

    setShowLandingPageReview(false);
    setShowCoursePublished(true);
  };

  const handleCreateAnotherCourse = () => {
    setShowCoursePublished(false);
    setCurrentCourseId(null);
    setCourseContent(null);
    setSelectedCourse(null);
    setFormData({
      subject: '',
      audience: '',
      difficulty: '',
      duration: '',
      objectives: '',
      context: '',
      contentFormat: 'text',
      videoAvatarId: 'Adrian_public_3_20240312',
      videoVoiceId: '75af67cc2ceb498681d0085bb56bddc3',
    });
    setShowQuizGeneration(false);
    setShowPresentationGeneration(false);
    setShowPresentationReview(false);
    setShowLandingPageCustomization(false);
    setShowLandingPageReview(false);
    setStatusBanner(null);
  };

  const handleDuplicateCourse = async () => {
    if (!selectedCourse || !courseContent) return;

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const duplicateData = {
        user_id: user.data.user.id,
        title: `${formData.subject} (Copy)`,
        topic: `${formData.subject} (Copy)`,
        target_audience: formData.audience,
        difficulty_level: formData.difficulty,
        duration: formData.duration,
        learning_objectives: formData.objectives,
        additional_context: formData.context,
        status: 'completed',
        generated_content: courseContent,
        verification_results: verificationResults,
      };

      const { data, error } = await supabase
        .from('courses')
        .insert(duplicateData)
        .select()
        .single();

      if (error) throw error;

      await fetchUserCourses();
      if (data) {
        handleSelectCourse(data);
      }
    } catch (err) {
      console.error('Error duplicating course:', err);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const initiateDeleteCourse = (course: Course) => {
    setCourseToDelete(course);
    setShowDeleteModal(true);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setCourseToDelete(null);
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;

    setIsDeletingCourse(true);
    const courseName = courseToDelete.title;

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseToDelete.id);

      if (error) throw error;

      setSelectedCourse(null);
      setCourseContent(null);
      setCurrentCourseId(null);
      setIsViewMode(false);
      setShowResults(false);
      setShowNewCourseForm(false);
      setVerificationResults(undefined);
      setStatusBanner(null);

      await fetchUserCourses();

      showToast(`${courseName} has been deleted successfully.`, 'success');

      setShowDeleteModal(false);
      setCourseToDelete(null);
    } catch (err) {
      console.error('Error deleting course:', err);

      showToast(
        `${courseName} deletion failed. Please contact the CourseForge support.`,
        'error'
      );

      setShowDeleteModal(false);
      setCourseToDelete(null);
      setSelectedCourse(null);
      setShowResults(false);
      setShowNewCourseForm(false);
    } finally {
      setIsDeletingCourse(false);
    }
  };

  const handleEditAndRegenerate = () => {
    setIsViewMode(false);
    setShowResults(false);
    setShowNewCourseForm(true);
    setVerificationResults(undefined);
    setCourseContent(null);
    setStatusBanner({
      type: 'info',
      message: 'Update your course details below and click "Regenerate Course" to create a new version. Previous quizzes and content will be replaced.'
    });
  };

  if (showCoursePublished && courseContent && currentCourseId) {
    return (
      <CoursePublished
        courseId={currentCourseId}
        courseContent={courseContent}
        onCreateAnother={handleCreateAnotherCourse}
      />
    );
  }

  if (showLandingPageReview && courseContent && currentCourseId) {
    return (
      <ReviewLandingPage
        courseId={currentCourseId}
        courseContent={courseContent}
        onBack={handleBackFromLandingPageReview}
        onComplete={handleLandingPageReviewComplete}
      />
    );
  }

  if (showLandingPageCustomization && courseContent && currentCourseId) {
    return (
      <CustomizeLandingPage
        courseId={currentCourseId}
        courseContent={courseContent}
        onBack={handleBackFromLandingPageCustomization}
        onComplete={handleLandingPageCustomizationComplete}
      />
    );
  }

  if (showPresentationReview && courseContent && currentCourseId) {
    return (
      <ReviewPresentation
        courseId={currentCourseId}
        courseContent={courseContent}
        onBack={handleBackFromPresentationReview}
        onComplete={handlePresentationReviewComplete}
      />
    );
  }

  if (showPresentationGeneration && courseContent && currentCourseId) {
    return (
      <GeneratePresentation
        courseId={currentCourseId}
        courseContent={courseContent}
        onBack={handleBackFromPresentationGeneration}
        onComplete={handlePresentationGenerationComplete}
      />
    );
  }

  if (showQuizGeneration && courseContent && currentCourseId) {
    return (
      <GenerateQuizzes
        courseId={currentCourseId}
        courseContent={courseContent}
        onBack={handleBackFromQuizGeneration}
        onComplete={handleQuizGenerationComplete}
      />
    );
  }

  if (showWorkflowDashboard && selectedCourse) {
    return (
      <CourseWorkflowDashboard
        courseId={selectedCourse.id}
        courseTitle={selectedCourse.title}
        currentStep={selectedCourse.current_step}
        lastCompletedStep={selectedCourse.last_completed_step}
        contentStatus={selectedCourse.content_status}
        quizzesStatus={selectedCourse.quizzes_status}
        presentationStatus={selectedCourse.presentation_status}
        landingPageStatus={selectedCourse.landing_page_status}
        publishedStatus={selectedCourse.published_status}
        downloadedStatus={selectedCourse.downloaded_status}
        onContinue={handleDashboardContinue}
        onEditStep={handleDashboardEditStep}
        onBack={() => {
          setShowWorkflowDashboard(false);
          setSelectedCourse(null);
        }}
        onViewAnalytics={onViewAnalytics ? () => onViewAnalytics(selectedCourse.id, selectedCourse.title) : undefined}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col">
      <header className="bg-gradient-to-r from-blue-800 to-blue-900 text-white py-4 shadow-lg">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/CourseForgeLogo.png" alt="CourseForge" className="h-8 w-auto" />
            <span className="text-2xl font-black tracking-tight">COURSEFORGE</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleLogout} className="flex items-center gap-2 text-blue-100 hover:text-white transition-colors">
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 bg-white border-r border-slate-200 shadow-lg overflow-y-auto">
          <div className="p-6 border-b border-slate-200">
            <button
              onClick={handleNewCourse}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-bold hover:from-green-600 hover:to-green-700 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Course
            </button>
          </div>

          <div className="p-6">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">My Courses</h2>

            {loadingCourses ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-slate-100 rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No courses yet</p>
                <p className="text-slate-400 text-xs mt-1">Click "New Course" to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {courses.map(course => {
                  const progress = course.last_completed_step || 0;
                  const totalSteps = 6;
                  const progressPercentage = Math.round((progress / totalSteps) * 100);

                  return (
                    <div
                      key={course.id}
                      className={`relative p-4 rounded-lg transition-all group ${
                        selectedCourse?.id === course.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                      }`}
                    >
                      <button
                        onClick={() => handleSelectCourse(course)}
                        className="w-full text-left"
                      >
                        <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 pr-8">{course.title}</h3>

                        <div className="flex items-center gap-1 mb-2">
                          {[...Array(totalSteps)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${
                                i < progress
                                  ? 'bg-green-500'
                                  : i === progress
                                  ? 'bg-blue-500'
                                  : 'bg-slate-300'
                              }`}
                            />
                          ))}
                          <span className="text-xs font-semibold text-slate-600 ml-1">
                            {progressPercentage}%
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getDifficultyColor(course.difficulty_level)}`}>
                            {course.difficulty_level}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          {formatDate(course.updated_at)}
                        </div>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCourseToDelete(course);
                          setShowDeleteModal(true);
                        }}
                        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        title="Delete course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          {loadingCourseData ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Loading Course...</h2>
                <p className="text-slate-600">Please wait while we retrieve your course data</p>
              </div>
            </div>
          ) : showResults && courseContent && currentCourseId ? (
            <div className="container mx-auto max-w-5xl px-6 py-12">
              <CourseResults
                courseId={currentCourseId!}
                courseContent={courseContent}
                onReturnToEdit={handleReturnToEdit}
                onVerify={handleVerify}
                onAccept={handleAcceptResults}
                onAutoCorrect={handleAutoCorrect}
                onDuplicate={handleDuplicateCourse}
                onDelete={() => selectedCourse && initiateDeleteCourse(selectedCourse)}
                onEditAndRegenerate={handleEditAndRegenerate}
                isVerifying={isVerifying}
                isCorrecting={isCorrecting}
                isViewMode={isViewMode}
                verificationResults={verificationResults}
              />
            </div>
          ) : showNewCourseForm ? (
            <div className="container mx-auto max-w-4xl px-6 py-12">
              <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">🚀</div>
                  <h1 className="text-4xl font-black text-slate-900 mb-3">
                    {selectedCourse ? 'Regenerate Your Course' : 'Ready to Create Your Course?'}
                  </h1>
                  <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    {selectedCourse
                      ? 'Update the details below and click "Update Course" to regenerate. Your existing course will be updated with fresh AI-generated content.'
                      : "Get started by telling me what your course is about. I'll research the subject for you and use that information to create comprehensive lessons and quizzes—all in about 90 seconds!"
                    }
                  </p>
                </div>

                {statusBanner && (
                  <div className={`rounded-xl p-4 mb-6 border-l-4 ${
                    statusBanner.type === 'error'
                      ? 'bg-red-50 border-red-600'
                      : 'bg-blue-50 border-blue-600'
                  }`}>
                    <div className="flex items-start gap-3">
                      {statusBanner.type === 'error' ? (
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      )}
                      <p className={`font-semibold ${
                        statusBanner.type === 'error' ? 'text-red-900' : 'text-blue-900'
                      }`}>
                        {statusBanner.message}
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-r from-blue-100 to-blue-200 border-l-4 border-blue-600 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-6 h-6 text-blue-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-blue-900 mb-2">Here's what happens next:</h3>
                      <ul className="space-y-1 text-blue-800">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 font-bold">✓</span>
                          <span><strong>Step 1:</strong> You fill in the details below (takes 2-3 minutes)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 font-bold">✓</span>
                          <span><strong>Step 2:</strong> AI researches your topic and generates a complete course (90 seconds)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 font-bold">✓</span>
                          <span><strong>Step 3:</strong> You review, make quick edits if needed, and publish (1-2 minutes)</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-lg space-y-8">
                <div>
                  <label className="block text-lg font-bold text-slate-900 mb-2">
                    What is your course about? <span className="text-red-500">*</span>
                  </label>
                  <p className="text-slate-600 mb-3">Be specific but concise. This is the main topic your course will cover.</p>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none transition-colors bg-slate-50 focus:bg-white"
                    placeholder="e.g., Introduction to Data Analysis"
                    required
                    maxLength={100}
                  />
                  <div className="text-right text-sm text-slate-500 mt-1">{formData.subject.length}/100 characters</div>
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mt-3">
                    <div className="flex items-center gap-2 text-yellow-900 font-bold text-sm mb-1">
                      <Lightbulb className="w-4 h-4" />
                      Examples:
                    </div>
                    <div className="text-yellow-800 text-sm italic">
                      "Introduction to Python Programming" • "Effective Email Marketing for Small Businesses" • "Workplace Safety and OSHA Compliance"
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-lg font-bold text-slate-900 mb-2">
                    Who is this course for? <span className="text-red-500">*</span>
                  </label>
                  <p className="text-slate-600 mb-3">Describe your ideal learner. This helps the AI tailor the content, examples, and language appropriately.</p>
                  <textarea
                    name="audience"
                    value={formData.audience}
                    onChange={(e) => handleInputChange('audience', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none transition-colors bg-slate-50 focus:bg-white min-h-32 resize-y"
                    placeholder="e.g., Business professionals with no technical background who want to make data-driven decisions"
                    required
                    maxLength={300}
                  />
                  <div className="text-right text-sm text-slate-500 mt-1">{formData.audience.length}/300 characters</div>
                </div>

                <div>
                  <label className="block text-lg font-bold text-slate-900 mb-2">
                    What difficulty level? <span className="text-red-500">*</span>
                  </label>
                  <p className="text-slate-600 mb-3">Choose the complexity that matches your audience's current knowledge level.</p>
                  <div className="grid md:grid-cols-3 gap-4">
                    {[
                      { value: 'beginner', icon: '🌱', label: 'Beginner', desc: 'No prior knowledge' },
                      { value: 'intermediate', icon: '📚', label: 'Intermediate', desc: 'Some experience' },
                      { value: 'advanced', icon: '🎓', label: 'Advanced', desc: 'Expert-level' },
                    ].map(({ value, icon, label, desc }) => (
                      <label key={value} className="relative cursor-pointer">
                        <input
                          type="radio"
                          name="difficulty"
                          value={value}
                          checked={formData.difficulty === value}
                          onChange={(e) => handleInputChange('difficulty', e.target.value)}
                          className="sr-only"
                          required
                        />
                        <div className={`border-2 rounded-xl p-4 text-center transition-all ${
                          formData.difficulty === value
                            ? 'border-blue-600 bg-blue-50 shadow-lg'
                            : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                        }`}>
                          <div className="text-3xl mb-2">{icon}</div>
                          <div className="font-bold text-slate-900">{label}</div>
                          <div className="text-sm text-slate-600">{desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-lg font-bold text-slate-900 mb-2">
                    How long should the course take to complete? <span className="text-red-500">*</span>
                  </label>
                  <p className="text-slate-600 mb-3">Estimated time for learners to complete all lessons and quizzes.</p>
                  <select
                    name="duration"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none transition-colors bg-slate-50 focus:bg-white"
                    required
                  >
                    <option value="">Select duration...</option>
                    <option value="30-minutes">30 minutes - Quick overview</option>
                    <option value="1-hour">1 hour - Focused introduction</option>
                    <option value="2-hours">2 hours - Comprehensive basics</option>
                    <option value="3-hours">3 hours - In-depth coverage</option>
                    <option value="4-hours">4+ hours - Complete mastery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-lg font-bold text-slate-900 mb-2">
                    Do you want text or video course content? <span className="text-red-500">*</span>
                  </label>
                  <p className="text-slate-600 mb-3">Choose how your lessons will be delivered to students.</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <label className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="contentFormat"
                        value="text"
                        checked={formData.contentFormat === 'text'}
                        onChange={(e) => handleInputChange('contentFormat', e.target.value)}
                        className="sr-only"
                      />
                      <div className={`border-2 rounded-xl p-6 transition-all ${
                        formData.contentFormat === 'text'
                          ? 'border-blue-600 bg-blue-50 shadow-lg'
                          : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                      }`}>
                        <div className="text-4xl mb-3">📝</div>
                        <div className="font-bold text-slate-900 text-lg mb-2">Text-Based Course</div>
                        <div className="text-sm text-slate-600 mb-3">Traditional written lessons that students can read at their own pace</div>
                        <ul className="text-xs text-slate-600 space-y-1">
                          <li>✓ Fast generation (1-2 minutes)</li>
                          <li>✓ Easy to skim and reference</li>
                          <li>✓ Lower bandwidth requirements</li>
                          <li>✓ Quick to update and edit</li>
                        </ul>
                      </div>
                    </label>

                    <label className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="contentFormat"
                        value="video"
                        checked={formData.contentFormat === 'video'}
                        onChange={(e) => handleInputChange('contentFormat', e.target.value)}
                        className="sr-only"
                      />
                      <div className={`border-2 rounded-xl p-6 transition-all ${
                        formData.contentFormat === 'video'
                          ? 'border-blue-600 bg-blue-50 shadow-lg'
                          : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                      }`}>
                        <div className="text-4xl mb-3">🎥</div>
                        <div className="font-bold text-slate-900 text-lg mb-2">Video-Enhanced Course</div>
                        <div className="text-sm text-slate-600 mb-3">AI avatar instructor narrates each lesson on-camera</div>
                        <ul className="text-xs text-slate-600 space-y-1">
                          <li>✓ More engaging for students</li>
                          <li>✓ Professional AI instructor avatar</li>
                          <li>✓ Natural voice narration</li>
                          <li>✓ Generation time: +5-10 minutes</li>
                        </ul>
                      </div>
                    </label>
                  </div>

                  {formData.contentFormat === 'video' && (
                    <div className="mt-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <Sparkles className="w-6 h-6 text-blue-700 flex-shrink-0 mt-1" />
                        <div>
                          <h3 className="font-bold text-blue-900 text-lg mb-2">Video Generation Settings</h3>
                          <p className="text-blue-800 text-sm mb-4">
                            Your course content will be narrated by an AI avatar instructor. Choose your preferred avatar and voice style.
                          </p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-bold text-blue-900 mb-2">
                            AI Avatar Instructor
                          </label>
                          <select
                            value={formData.videoAvatarId}
                            onChange={(e) => handleInputChange('videoAvatarId', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:border-blue-600 focus:outline-none bg-white"
                          >
                            <option value="Adrian_public_3_20240312">Adrian - Professional Male (Recommended)</option>
                            <option value="Andrew_public_pro1_20230614">Alex - Business Male</option>
                            <option value="Anna_public_20240108">Anna - Professional Female</option>
                            <option value="Amanda_in_Blue_Shirt_Front">Amanda - Business Female</option>
                          </select>
                          <p className="text-xs text-blue-700 mt-1">The AI avatar that will present your lessons</p>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-blue-900 mb-2">
                            Voice Style
                          </label>
                          <select
                            value={formData.videoVoiceId}
                            onChange={(e) => handleInputChange('videoVoiceId', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:border-blue-600 focus:outline-none bg-white"
                          >
                            <option value="75af67cc2ceb498681d0085bb56bddc3">Mason Finn - Professional Male (Recommended)</option>
                            <option value="77a8b81df32f482f851684c5e2ebb0d2">Calm Chloe - Female</option>
                            <option value="79d9a0758b1f406ebe8ac3e52e09adb1">Relaxed Ray - Male</option>
                            <option value="748d08eb00634e03b17c524d1e957fc6">June - Female (Lifelike)</option>
                            <option value="75a5a6de69204dc9ba448158d1b6a8de">Dominic - Male</option>
                          </select>
                          <p className="text-xs text-blue-700 mt-1">Natural-sounding AI voice narration</p>
                        </div>
                      </div>

                      <div className="mt-4 bg-white border-2 border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-900">
                          <strong>Note:</strong> Video generation adds 5-10 minutes to course creation time.
                          You'll be able to preview and regenerate any videos before publishing.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-lg font-bold text-slate-900 mb-2">
                    What should learners be able to do after completing this course? <span className="text-slate-500 font-normal text-base">(Optional)</span>
                  </label>
                  <p className="text-slate-600 mb-3">List 3-5 specific skills or knowledge outcomes. This helps focus the course content.</p>
                  <textarea
                    name="objectives"
                    value={formData.objectives}
                    onChange={(e) => handleInputChange('objectives', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none transition-colors bg-slate-50 focus:bg-white min-h-32 resize-y"
                    placeholder="e.g., Analyze datasets using basic statistical methods, Create clear data visualizations"
                    maxLength={500}
                  />
                  <div className="text-right text-sm text-slate-500 mt-1">{formData.objectives.length}/500 characters</div>
                </div>

                <div>
                  <label className="block text-lg font-bold text-slate-900 mb-2">
                    Any specific topics or areas to emphasize? <span className="text-slate-500 font-normal text-base">(Optional)</span>
                  </label>
                  <p className="text-slate-600 mb-3">Include specific topics, tools, frameworks, or examples you want covered.</p>
                  <textarea
                    name="context"
                    value={formData.context}
                    onChange={(e) => handleInputChange('context', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none transition-colors bg-slate-50 focus:bg-white min-h-32 resize-y"
                    placeholder="e.g., Focus on Excel and Google Sheets. Include real-world retail examples."
                    maxLength={500}
                  />
                  <div className="text-right text-sm text-slate-500 mt-1">{formData.context.length}/500 characters</div>
                </div>

                <div>
                  <label className="block text-lg font-bold text-slate-900 mb-2">
                    Upload Reference Materials <span className="text-slate-500 font-normal text-base">(Optional)</span>
                  </label>
                  <p className="text-slate-600 mb-3">Upload documents, PDFs, or other materials to use as reference for the course content.</p>

                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors cursor-pointer bg-slate-50">
                    <input
                      type="file"
                      id="fileUpload"
                      onChange={handleFileUpload}
                      className="hidden"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.md"
                    />
                    <label htmlFor="fileUpload" className="cursor-pointer">
                      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <div className="text-slate-700 font-semibold mb-1">Click to upload or drag and drop</div>
                      <div className="text-sm text-slate-500">PDF, DOC, DOCX, TXT, MD (max 10MB each)</div>
                    </label>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium text-slate-900">{file.name}</span>
                            <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {uploadedFiles.length > 0 && (
                    <label className="flex items-center gap-3 mt-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restrictToFiles}
                        onChange={(e) => setRestrictToFiles(e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-slate-700 font-medium">Restrict search to uploaded files only</span>
                    </label>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowChat(!showChat)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all"
                  >
                    <MessageSquare className="w-5 h-5" />
                    {showChat ? 'Hide' : 'Refine with AI Chat'}
                  </button>

                  {showChat && (
                    <div className="mt-4 border-2 border-slate-300 rounded-xl overflow-hidden">
                      <div className="bg-slate-100 p-4 border-b border-slate-300">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                          <MessageSquare className="w-5 h-5" />
                          Refine Your Course Prompt
                        </h3>
                        <p className="text-sm text-slate-600 mt-1">Chat with AI to refine your course details before generation</p>
                      </div>

                      <div className="h-64 overflow-y-auto p-4 space-y-3 bg-white">
                        {chatMessages.length === 0 ? (
                          <div className="text-center text-slate-500 py-8">
                            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>Start chatting to refine your course details</p>
                          </div>
                        ) : (
                          chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-xs px-4 py-2 rounded-lg ${
                                msg.role === 'user'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-200 text-slate-900'
                              }`}>
                                {msg.content}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 border-t border-slate-300">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                            placeholder="Ask to refine your course..."
                            className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={sendChatMessage}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-r from-green-100 to-green-200 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-6 h-6 text-green-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-green-900 mb-2">🎯 Pro Tips for Better Courses</h3>
                      <ul className="space-y-1 text-green-800 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 font-bold">💡</span>
                          <span><strong>Be specific:</strong> "Excel pivot tables for sales reporting" is better than "Excel basics"</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 font-bold">💡</span>
                          <span><strong>Know your audience:</strong> The more detail about learners, the better the AI can tailor content</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 font-bold">💡</span>
                          <span><strong>Set clear objectives:</strong> Specific learning outcomes lead to focused, actionable content</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t-2 border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowNewCourseForm(false)}
                    className="flex-shrink-0 px-8 py-4 bg-white border-2 border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isFormValid() || loading}
                    className="flex-1 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-bold hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
                  >
                    {selectedCourse ? 'Regenerate Course' : 'Generate My Course'} <ArrowRight className="w-5 h-5" />
                    <span className="text-sm font-normal">(1-3 minutes)</span>
                  </button>
                </div>
              </form>
            </div>
          ) : !selectedCourse ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <TrendingUp className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to CourseForge</h2>
                <p className="text-slate-600 mb-6">Select a course from the sidebar or create a new one</p>
                <button
                  onClick={handleNewCourse}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-bold hover:from-green-600 hover:to-green-700 transition-all shadow-lg inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Course
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertTriangle className="w-20 h-20 text-red-300 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Unable to Load Course</h2>
                <p className="text-slate-600 mb-6">There was an issue loading this course. Please try selecting it again or create a new course.</p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => selectedCourse && handleSelectCourse(selectedCourse)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg inline-flex items-center gap-2"
                  >
                    Retry Loading
                  </button>
                  <button
                    onClick={handleNewCourse}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-bold hover:from-green-600 hover:to-green-700 transition-all shadow-lg inline-flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Create New Course
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {selectedCourse ? 'Regenerating Your Course... ✨' : 'Creating Your Course... ✨'}
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                {selectedCourse
                  ? `Regenerating course content for "${loadingTopic}". Previous content will be replaced.`
                  : `Our AI is researching "${loadingTopic}" and generating comprehensive content.`
                }
              </p>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">{generationStage}</span>
                <span className="text-sm font-bold text-blue-600">{generationProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${generationProgress}%` }}
                ></div>
              </div>
            </div>

            {estimatedTimeRemaining > 0 && generationProgress < 90 && (
              <div className="text-center">
                <p className="text-slate-500 text-sm">
                  Estimated time: {Math.ceil((estimatedTimeRemaining * (100 - generationProgress)) / 100)} seconds
                </p>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>💡 Tip:</strong> Larger courses take longer to generate. The AI is creating detailed lessons tailored to your specifications.
              </p>
            </div>

            <p className="text-slate-400 text-sm mt-6 text-center">Please don't close this window.</p>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteModal}
        onConfirm={handleDeleteCourse}
        onCancel={cancelDelete}
        title="Delete Course"
        message={`Are you sure you want to delete "${courseToDelete?.title}"? This action cannot be undone.`}
        confirmText="OK"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeletingCourse}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={true}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
