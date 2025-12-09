import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BookOpen, CheckCircle, Edit2, Clock, ArrowLeft, Home, LogOut, AlertTriangle, Save, X, Video } from 'lucide-react';
import Toast from '../components/Toast';

interface Lesson {
  lesson_number: number;
  title: string;
  content: string;
  duration: string;
  objectives: string[];
}

interface ReviewLessonContentProps {
  courseId: string;
  onComplete: () => void;
  onBack: () => void;
  onBackToCourses?: () => void;
  onLogout?: () => void;
}

const ReviewLessonContent: React.FC<ReviewLessonContentProps> = ({
  courseId,
  onComplete,
  onBack,
  onBackToCourses,
  onLogout
}) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [editingLesson, setEditingLesson] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [isVideoMode, setIsVideoMode] = useState(false);

  useEffect(() => {
    loadCourseContent();
  }, [courseId]);

  const loadCourseContent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('title, generated_content, content_format')
        .eq('id', courseId)
        .single();

      if (error) throw error;

      if (data) {
        setCourseTitle(data.title);
        setIsVideoMode(data.content_format === 'video');

        if (data.generated_content && data.generated_content.lessons) {
          setLessons(data.generated_content.lessons);
        }
      }
    } catch (error: any) {
      console.error('Error loading course content:', error);
      setToast({ message: 'Failed to load lesson content', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditLesson = (lessonNumber: number, currentContent: string) => {
    setEditingLesson(lessonNumber);
    setEditedContent(currentContent);
  };

  const handleCancelEdit = () => {
    setEditingLesson(null);
    setEditedContent('');
  };

  const countWords = (text: string): number => {
    const strippedText = text.replace(/<[^>]*>/g, ' ');
    return strippedText.split(/\s+/).filter(word => word.length > 0).length;
  };

  const estimateVideoDuration = (wordCount: number, wordsPerMinute: number = 140): number => {
    return Math.ceil((wordCount / wordsPerMinute) * 60);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDurationColor = (seconds: number) => {
    if (seconds > 165) return 'text-red-600';
    if (seconds > 150) return 'text-amber-600';
    return 'text-green-600';
  };

  const getDurationWarning = (seconds: number) => {
    if (seconds > 165) return '⚠️ Too long - will likely exceed 3-minute video limit';
    if (seconds > 150) return '⚡ Getting close to limit';
    return '✓ Good length for video';
  };

  const handleSaveLesson = async (lessonNumber: number) => {
    setSaving(true);
    try {
      const wordCount = countWords(editedContent);

      if (isVideoMode) {
        const estimatedDuration = estimateVideoDuration(wordCount);
        if (estimatedDuration > 165) {
          setToast({
            message: 'Warning: This lesson may exceed 2.75 minutes when converted to video. Consider shortening it.',
            type: 'error'
          });
          setSaving(false);
          return;
        }
      }

      const updatedLessons = lessons.map(lesson => {
        if (lesson.lesson_number === lessonNumber) {
          return {
            ...lesson,
            content: editedContent
          };
        }
        return lesson;
      });

      const { data: courseData, error: fetchError } = await supabase
        .from('courses')
        .select('generated_content')
        .eq('id', courseId)
        .single();

      if (fetchError) throw fetchError;

      const updatedContent = {
        ...courseData.generated_content,
        lessons: updatedLessons
      };

      const { error } = await supabase
        .from('courses')
        .update({ generated_content: updatedContent })
        .eq('id', courseId);

      if (error) throw error;

      setLessons(updatedLessons);
      setEditingLesson(null);
      setEditedContent('');
      setToast({ message: 'Lesson updated successfully', type: 'success' });
    } catch (error: any) {
      console.error('Error saving lesson:', error);
      setToast({ message: 'Failed to save lesson', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleApproveContent = async () => {
    if (isVideoMode) {
      const hasLongLessons = lessons.some(lesson => {
        const wordCount = countWords(lesson.content);
        const duration = estimateVideoDuration(wordCount);
        return duration > 165;
      });

      if (hasLongLessons) {
        setToast({
          message: 'Some lessons may exceed 2.75 minutes. Please edit them before approving.',
          type: 'error'
        });
        return;
      }
    }

    setApproving(true);
    try {
      const updates: any = {
        content_approved_at: new Date().toISOString(),
        current_step: 3,
        last_completed_step: 2
      };

      if (isVideoMode) {
        updates.video_generation_started_at = new Date().toISOString();
        updates.video_generation_background = true;
      }

      const { error: updateError } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', courseId);

      if (updateError) throw updateError;

      if (isVideoMode) {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

          const response = await fetch(`${supabaseUrl}/functions/v1/generate-lesson-videos`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              courseId: courseId,
              regenerateAll: true
            }),
          });

          if (!response.ok) {
            console.error('Failed to trigger video generation:', await response.text());
          } else {
            console.log('Video generation started in background');
          }
        } catch (videoError) {
          console.error('Error triggering video generation:', videoError);
        }
      }

      setToast({
        message: isVideoMode
          ? 'Content approved! Videos are generating in the background.'
          : 'Content approved! Moving to quiz generation.',
        type: 'success'
      });

      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error: any) {
      console.error('Error approving content:', error);
      setToast({ message: 'Failed to approve content', type: 'error' });
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="w-12 h-12 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading lesson content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
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

      <main className="flex-1 overflow-y-auto py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Course
            </button>

            <h1 className="text-4xl font-bold text-slate-900 mb-2">Review Lesson Content</h1>
            <p className="text-xl text-slate-600">{courseTitle}</p>
            {isVideoMode && (
              <div className="mt-2 flex items-center gap-2 text-blue-700">
                <Video className="w-5 h-5" />
                <span className="font-medium">Video Mode - Content optimized for video narration</span>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <BookOpen className="w-6 h-6 text-blue-700 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">Review Your Lessons</h3>
                <p className="text-sm text-blue-800 mb-2">
                  {isVideoMode
                    ? 'These lessons have been optimized for video narration (shorter and more conversational). Each lesson should stay under 350 words to fit within a 2.5-minute video.'
                    : 'Review your lesson content. You can edit any lesson to refine the material before proceeding.'
                  }
                </p>
                <p className="text-sm text-blue-800">
                  After approval, you'll move on to quiz generation.
                  {isVideoMode && ' Video generation will start in the background.'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            {lessons.map((lesson) => {
              const wordCount = countWords(lesson.content);
              const estimatedDuration = isVideoMode ? estimateVideoDuration(wordCount) : 0;

              return (
                <div
                  key={lesson.lesson_number}
                  className="bg-white rounded-2xl shadow-lg p-6 border-2 border-slate-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">
                        Lesson {lesson.lesson_number}: {lesson.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm mb-3">
                        <span className="flex items-center gap-1 text-slate-600">
                          <Clock className="w-4 h-4" />
                          {wordCount} words
                        </span>
                        {isVideoMode && (
                          <span className={`flex items-center gap-1 font-medium ${getDurationColor(estimatedDuration)}`}>
                            <Video className="w-4 h-4" />
                            ~{formatDuration(estimatedDuration)} video
                          </span>
                        )}
                      </div>
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-slate-700 mb-1">Learning Objectives:</p>
                        <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                          {lesson.objectives.map((obj, idx) => (
                            <li key={idx}>{obj}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {editingLesson !== lesson.lesson_number && (
                      <button
                        onClick={() => handleEditLesson(lesson.lesson_number, lesson.content)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                  </div>

                  {editingLesson === lesson.lesson_number ? (
                    <div>
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full h-64 px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none text-slate-700 mb-4 font-mono text-sm"
                      />
                      {isVideoMode && (
                        <div className="mb-4 text-sm">
                          <span className="text-slate-600">Current: {countWords(editedContent)} words</span>
                          <span className={`ml-4 font-medium ${getDurationColor(estimateVideoDuration(countWords(editedContent)))}`}>
                            {getDurationWarning(estimateVideoDuration(countWords(editedContent)))}
                          </span>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleSaveLesson(lesson.lesson_number)}
                          disabled={saving}
                          className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          <Save className="w-5 h-5" />
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors flex items-center gap-2"
                        >
                          <X className="w-5 h-5" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div
                        className="text-slate-700 leading-relaxed prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: lesson.content }}
                      />
                    </div>
                  )}

                  {isVideoMode && estimatedDuration > 150 && editingLesson !== lesson.lesson_number && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800">
                        This lesson is approaching the video duration limit. Consider editing to make it more concise.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border-2 border-green-200 mb-8">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-700 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 mb-2">Ready to Continue?</h3>
                <p className="text-sm text-green-800 mb-3">
                  Once you approve this content, you'll proceed to quiz generation.
                  {isVideoMode && ' Video generation will begin in the background and typically takes 10-15 minutes total.'}
                </p>
                <p className="text-sm text-green-800">
                  {isVideoMode
                    ? "You can continue building your course (quizzes, presentation, landing page) while videos generate. You'll review the videos before publishing."
                    : "You can make any final edits before moving forward."
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={onBack}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
            >
              Back
            </button>

            <button
              onClick={handleApproveContent}
              disabled={approving}
              className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-6 h-6" />
              {approving ? 'Approving...' : 'Approve Content & Continue'}
            </button>
          </div>
        </div>
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default ReviewLessonContent;
