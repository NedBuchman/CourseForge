import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Video, CheckCircle, Edit2, Clock, ArrowLeft, Home, LogOut, AlertTriangle, Save, X } from 'lucide-react';
import Toast from '../components/Toast';

interface VideoScript {
  lesson_number: number;
  title: string;
  script: string;
  word_count: number;
  estimated_duration: number;
}

interface ReviewVideoScriptsProps {
  courseId: string;
  onComplete: () => void;
  onBack: () => void;
  onBackToCourses?: () => void;
  onLogout?: () => void;
}

const ReviewVideoScripts: React.FC<ReviewVideoScriptsProps> = ({
  courseId,
  onComplete,
  onBack,
  onBackToCourses,
  onLogout
}) => {
  const [scripts, setScripts] = useState<VideoScript[]>([]);
  const [editingScript, setEditingScript] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [courseTitle, setCourseTitle] = useState('');

  useEffect(() => {
    loadVideoScripts();
    loadCourseInfo();
  }, [courseId]);

  const loadCourseInfo = async () => {
    const { data } = await supabase
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .single();

    if (data) {
      setCourseTitle(data.title);
    }
  };

  const loadVideoScripts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('video_scripts')
        .eq('id', courseId)
        .single();

      if (error) throw error;

      if (data && data.video_scripts) {
        setScripts(data.video_scripts as VideoScript[]);
      }
    } catch (error: any) {
      console.error('Error loading video scripts:', error);
      setToast({ message: 'Failed to load video scripts', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditScript = (lessonNumber: number, currentScript: string) => {
    setEditingScript(lessonNumber);
    setEditedContent(currentScript);
  };

  const handleCancelEdit = () => {
    setEditingScript(null);
    setEditedContent('');
  };

  const handleSaveScript = async (lessonNumber: number) => {
    setSaving(true);
    try {
      const wordCount = countWords(editedContent);
      const estimatedDuration = estimateDuration(wordCount);

      if (estimatedDuration > 165) {
        setToast({
          message: 'Warning: This script may exceed 2.75 minutes. Consider shortening it.',
          type: 'error'
        });
        setSaving(false);
        return;
      }

      const updatedScripts = scripts.map(script => {
        if (script.lesson_number === lessonNumber) {
          return {
            ...script,
            script: editedContent,
            word_count: wordCount,
            estimated_duration: estimatedDuration
          };
        }
        return script;
      });

      const { error } = await supabase
        .from('courses')
        .update({ video_scripts: updatedScripts })
        .eq('id', courseId);

      if (error) throw error;

      setScripts(updatedScripts);
      setEditingScript(null);
      setEditedContent('');
      setToast({ message: 'Script updated successfully', type: 'success' });
    } catch (error: any) {
      console.error('Error saving script:', error);
      setToast({ message: 'Failed to save script', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleApproveScripts = async () => {
    const hasLongScripts = scripts.some(s => s.estimated_duration > 165);
    if (hasLongScripts) {
      setToast({
        message: 'Some scripts exceed 2.75 minutes. Please edit them before approving.',
        type: 'error'
      });
      return;
    }

    setApproving(true);
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          video_scripts_status: 'approved',
          video_scripts_approved_at: new Date().toISOString(),
          current_step: 3,
          last_completed_step: 2
        })
        .eq('id', courseId);

      if (error) throw error;

      setToast({
        message: 'Scripts approved! Video generation will start in the background.',
        type: 'success'
      });

      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error: any) {
      console.error('Error approving scripts:', error);
      setToast({ message: 'Failed to approve scripts', type: 'error' });
    } finally {
      setApproving(false);
    }
  };

  const countWords = (text: string): number => {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  };

  const estimateDuration = (wordCount: number, wordsPerMinute: number = 140): number => {
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
    if (seconds > 165) return '⚠️ Too long - will likely exceed 3-minute limit';
    if (seconds > 150) return '⚡ Getting close to limit';
    return '✓ Good duration';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="w-12 h-12 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading video scripts...</p>
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

            <h1 className="text-4xl font-bold text-slate-900 mb-2">Review Video Scripts</h1>
            <p className="text-xl text-slate-600">{courseTitle}</p>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <Video className="w-6 h-6 text-blue-700 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">About Video Scripts</h3>
                <p className="text-sm text-blue-800 mb-2">
                  These are shortened versions of your lessons optimized for video narration. Each script is designed to create a video under 2.5 minutes (HeyGen has a 3-minute maximum).
                </p>
                <p className="text-sm text-blue-800">
                  Review and edit the scripts as needed. After you approve them, video generation will start in the background while you continue building your course.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            {scripts.map((script) => (
              <div
                key={script.lesson_number}
                className="bg-white rounded-2xl shadow-lg p-6 border-2 border-slate-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-slate-900">
                        Lesson {script.lesson_number}: {script.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-slate-600">
                        <Clock className="w-4 h-4" />
                        {script.word_count} words
                      </span>
                      <span className={`flex items-center gap-1 font-medium ${getDurationColor(script.estimated_duration)}`}>
                        <Video className="w-4 h-4" />
                        ~{formatDuration(script.estimated_duration)}
                      </span>
                      <span className="text-xs">{getDurationWarning(script.estimated_duration)}</span>
                    </div>
                  </div>
                  {editingScript !== script.lesson_number && (
                    <button
                      onClick={() => handleEditScript(script.lesson_number, script.script)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>

                {editingScript === script.lesson_number ? (
                  <div>
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full h-64 px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none text-slate-700 mb-4"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSaveScript(script.lesson_number)}
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
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {script.script}
                    </p>
                  </div>
                )}

                {script.estimated_duration > 150 && editingScript !== script.lesson_number && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      This script is approaching the duration limit. Consider editing to make it more concise.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border-2 border-green-200 mb-8">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-700 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 mb-2">Ready to Generate Videos?</h3>
                <p className="text-sm text-green-800 mb-3">
                  Once you approve these scripts, video generation will begin in the background. You can continue working on quizzes, presentations, and landing pages while the videos are being created. This typically takes 10-15 minutes total.
                </p>
                <p className="text-sm text-green-800">
                  You'll review the finished videos before publishing your course.
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
              onClick={handleApproveScripts}
              disabled={approving || scripts.some(s => s.estimated_duration > 165)}
              className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-6 h-6" />
              {approving ? 'Approving...' : 'Approve Scripts & Start Video Generation'}
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

export default ReviewVideoScripts;
