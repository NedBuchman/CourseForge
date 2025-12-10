import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { checkVideoStatus } from '../lib/edgeFunctions';
import { Video, CheckCircle, XCircle, RefreshCw, Clock, Eye, Download, Loader, ArrowLeft, Home, LogOut } from 'lucide-react';
import Toast from '../components/Toast';

interface VideoAsset {
  id: string;
  asset_type: string;
  asset_reference_id: string;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number;
  generation_status: string;
  generation_error: string | null;
  script_text: string;
  approved: boolean;
  created_at: string;
  updated_at: string;
}

interface ReviewVideosProps {
  courseId: string;
  onComplete: () => void;
  onBack: () => void;
  onBackToCourses?: () => void;
  onLogout?: () => void;
}

const ReviewVideos: React.FC<ReviewVideosProps> = ({ courseId, onComplete, onBack, onBackToCourses, onLogout }) => {
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [videoConfig, setVideoConfig] = useState<any>(null);
  const [videoStats, setVideoStats] = useState({
    total: 0,
    completed: 0,
    processing: 0,
    failed: 0,
    approved: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);

  useEffect(() => {
    loadVideos();
    loadCourseInfo();
  }, [courseId]);

  // Auto-refresh polling when videos are processing
  useEffect(() => {
    if (videoStats.processing === 0) {
      return;
    }

    const pollInterval = setInterval(() => {
      loadVideos();
    }, 15000); // Poll every 15 seconds

    return () => clearInterval(pollInterval);
  }, [videoStats.processing, courseId]);

  // Show completion banner when all videos finish processing
  useEffect(() => {
    const prevProcessing = sessionStorage.getItem(`processing_${courseId}`);

    if (prevProcessing && parseInt(prevProcessing) > 0 && videoStats.processing === 0 && videoStats.total > 0) {
      setShowCompletionBanner(true);
      setTimeout(() => setShowCompletionBanner(false), 10000); // Hide after 10 seconds
    }

    sessionStorage.setItem(`processing_${courseId}`, videoStats.processing.toString());
  }, [videoStats.processing, courseId]);

  const loadCourseInfo = async () => {
    const { data } = await supabase
      .from('courses')
      .select('title, video_config')
      .eq('id', courseId)
      .single();

    if (data) {
      setCourseTitle(data.title);
      setVideoConfig(data.video_config);
    }
  };

  const loadVideos = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data: quickCheck } = await supabase
        .from('video_assets')
        .select('generation_status')
        .eq('course_id', courseId)
        .eq('generation_status', 'processing');

      const hasProcessingVideos = quickCheck && quickCheck.length > 0;
      const isFirstLoad = !showRefreshIndicator && loading;

      if (hasProcessingVideos || showRefreshIndicator || isFirstLoad) {
        try {
          await checkVideoStatus({ courseId });
        } catch (statusError) {
          console.error('Error checking video status from HeyGen:', statusError);
        }
      }

      const { data, error } = await supabase
        .from('video_assets')
        .select('*')
        .eq('course_id', courseId)
        .order('asset_reference_id', { ascending: true });

      if (error) throw error;

      if (data) {
        setVideos(data);
        calculateStats(data);
      }
    } catch (error: any) {
      console.error('Error loading videos:', error);
      setToast({ message: 'Failed to load videos', type: 'error' });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    loadVideos(true);
  };

  const calculateStats = (videoList: VideoAsset[]) => {
    const stats = {
      total: videoList.length,
      completed: videoList.filter(v => v.generation_status === 'completed').length,
      processing: videoList.filter(v => v.generation_status === 'processing').length,
      failed: videoList.filter(v => v.generation_status === 'failed').length,
      approved: videoList.filter(v => v.approved).length
    };
    setVideoStats(stats);
  };

  const handleRegenerateVideo = async (videoId: string) => {
    setRegenerating(videoId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lesson-videos`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            courseId,
            videoAssetIds: [videoId],
            regenerateAll: false
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to regenerate video');
      }

      setToast({ message: 'Video regeneration started. This will take 2-5 minutes.', type: 'info' });

      setTimeout(() => {
        loadVideos();
      }, 3000);
    } catch (error: any) {
      console.error('Error regenerating video:', error);
      setToast({ message: error.message || 'Failed to regenerate video', type: 'error' });
    } finally {
      setRegenerating(null);
    }
  };

  const handleApproveVideo = async (videoId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from('video_assets')
        .update({
          approved,
          approved_at: approved ? new Date().toISOString() : null
        })
        .eq('id', videoId);

      if (error) throw error;

      setToast({
        message: approved ? 'Video approved' : 'Video approval removed',
        type: 'success'
      });
      loadVideos();
    } catch (error: any) {
      console.error('Error updating video:', error);
      setToast({ message: 'Failed to update video', type: 'error' });
    }
  };

  const handleCompleteReview = async () => {
    // Check if any videos are still processing
    if (videoStats.processing > 0) {
      setToast({
        message: 'Some videos are still processing. Please wait for all videos to complete before continuing.',
        type: 'error'
      });
      return;
    }

    const allApproved = videos.every(v => v.approved || v.generation_status === 'failed');

    if (!allApproved) {
      setToast({
        message: 'Please approve or regenerate all videos before continuing',
        type: 'error'
      });
      return;
    }

    onComplete();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Completed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            <Clock className="w-4 h-4" />
            Processing
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            <XCircle className="w-4 h-4" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-sm font-medium">
            <Clock className="w-4 h-4" />
            Queued
          </span>
        );
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hasIncompleteVideoConfig = () => {
    if (!videoConfig) return true;
    return !videoConfig.avatar_id || !videoConfig.voice_id;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Course
            </button>
            {onBackToCourses && (
              <>
                <span className="text-slate-300">|</span>
                <button
                  onClick={onBackToCourses}
                  className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
                >
                  <Home className="w-5 h-5" />
                  Back to Courses
                </button>
              </>
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

          <h1 className="text-4xl font-bold text-slate-900 mb-2">Review Course Videos</h1>
          <p className="text-xl text-slate-600">{courseTitle}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-3xl font-bold text-slate-900">{videoStats.total}</div>
            <div className="text-sm text-slate-600">Total Videos</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 shadow-sm">
            <div className="text-3xl font-bold text-green-700">{videoStats.completed}</div>
            <div className="text-sm text-green-700">Completed</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 shadow-sm">
            <div className="text-3xl font-bold text-blue-700">{videoStats.processing}</div>
            <div className="text-sm text-blue-700">Processing</div>
          </div>
          <div className="bg-red-50 rounded-xl p-4 shadow-sm">
            <div className="text-3xl font-bold text-red-700">{videoStats.failed}</div>
            <div className="text-sm text-red-700">Failed</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 shadow-sm">
            <div className="text-3xl font-bold text-slate-700">{videoStats.approved}</div>
            <div className="text-sm text-slate-700">Approved</div>
          </div>
        </div>

        {showCompletionBanner && (
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 mb-6 animate-pulse">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-700" />
              <div>
                <p className="font-bold text-green-900">All videos have been generated!</p>
                <p className="text-sm text-green-800">
                  Please review each video and approve them to continue.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">Video Duration Optimization</h3>
              <p className="text-sm text-blue-800">
                Each lesson video is automatically optimized to stay within 2.5 minutes (HeyGen has a 3-minute maximum).
                Videos marked as <span className="font-medium text-amber-600">"Getting long"</span> (2.5-2.75 min) or{' '}
                <span className="font-medium text-red-600">"Near limit"</span> (2.75+ min) may be close to the maximum duration.
                All videos are carefully condensed while maintaining educational value.
              </p>
            </div>
          </div>
        </div>

        {hasIncompleteVideoConfig() && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-sm font-bold">!</div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-1">Incomplete Video Configuration</h3>
                <p className="text-sm text-amber-800 mb-3">
                  Your course's video configuration is missing required settings (avatar and voice).
                  Videos may use default settings, which might not match your preferred style.
                </p>
                <p className="text-sm text-amber-800">
                  <strong>To fix this:</strong> Go back to "Create Course" and regenerate this course, selecting "Video" format and configuring your preferred avatar and voice settings.
                </p>
              </div>
            </div>
          </div>
        )}

        {videoStats.processing > 0 && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Loader className="w-5 h-5 animate-spin text-blue-700 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <p className="font-bold text-blue-900 mb-1">Videos are still processing</p>
                <p className="text-sm text-blue-800 mb-2">
                  {videoStats.processing} of {videoStats.total} video{videoStats.processing !== 1 ? 's' : ''} currently being generated.
                  ({Math.round((videoStats.completed / videoStats.total) * 100)}% complete)
                </p>
                <p className="text-xs text-blue-700 mb-3">
                  This page automatically refreshes every 15 seconds. Video generation typically takes 2-5 minutes per video.
                </p>
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRefreshing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Refresh Status Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">All Videos</h2>

          <div className="space-y-4">
            {videos.map((video) => (
              <div
                key={video.id}
                className="border-2 border-slate-200 rounded-xl p-6 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {video.video_url && video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt={`Lesson ${video.asset_reference_id}`}
                        className="w-32 h-18 object-cover rounded-lg cursor-pointer"
                        onClick={() => setSelectedVideo(video)}
                      />
                    ) : (
                      <div className="w-32 h-18 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Video className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        Lesson {video.asset_reference_id}
                      </h3>
                      {getStatusBadge(video.generation_status)}
                      {video.approved && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Approved
                        </span>
                      )}
                    </div>

                    {video.duration_seconds > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <p className={`text-sm font-medium ${
                          video.duration_seconds > 165 ? 'text-red-600' :
                          video.duration_seconds > 150 ? 'text-amber-600' :
                          'text-slate-600'
                        }`}>
                          Duration: {formatDuration(video.duration_seconds)}
                          {video.duration_seconds > 165 && (
                            <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              Near limit
                            </span>
                          )}
                          {video.duration_seconds > 150 && video.duration_seconds <= 165 && (
                            <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                              Getting long
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                      {video.script_text.substring(0, 150)}...
                    </p>

                    {video.generation_error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                        <p className="text-sm text-red-800">
                          <strong>Error:</strong> {video.generation_error}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {video.video_url && video.generation_status === 'completed' && (
                        <>
                          <button
                            onClick={() => setSelectedVideo(video)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            <Eye className="w-4 h-4" />
                            Preview
                          </button>

                          {!video.approved ? (
                            <button
                              onClick={() => handleApproveVideo(video.id, true)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                          ) : (
                            <button
                              onClick={() => handleApproveVideo(video.id, false)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors text-sm font-medium"
                            >
                              Remove Approval
                            </button>
                          )}
                        </>
                      )}

                      {(video.generation_status === 'failed' || video.approved === false) && (
                        <button
                          onClick={() => handleRegenerateVideo(video.id)}
                          disabled={regenerating === video.id}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          {regenerating === video.id ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          Regenerate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
          >
            Back
          </button>

          <div className="flex flex-col items-end gap-2">
            {videoStats.processing > 0 && (
              <p className="text-sm text-slate-600 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Waiting for {videoStats.processing} video{videoStats.processing !== 1 ? 's' : ''} to complete...
              </p>
            )}
            <button
              onClick={handleCompleteReview}
              disabled={videoStats.processing > 0}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
            >
              Complete Review & Continue
            </button>
          </div>
        </div>
      </div>

      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10 pb-2">
              <h3 className="text-2xl font-bold text-slate-900">
                Lesson {selectedVideo.asset_reference_id} Video
              </h3>
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-slate-500 hover:text-slate-700 text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {selectedVideo.video_url && (
              <video
                controls
                autoPlay
                className="w-full rounded-lg mb-4 max-h-[50vh]"
                src={selectedVideo.video_url}
              >
                Your browser does not support video playback.
              </video>
            )}

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <h4 className="font-bold text-slate-900 mb-2">Video Script:</h4>
              <p className="text-sm text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {selectedVideo.script_text}
              </p>
            </div>

            <div className="flex gap-3 sticky bottom-0 bg-white pt-2">
              <button
                onClick={() => setSelectedVideo(null)}
                className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
              >
                Close
              </button>

              {selectedVideo.video_url && (
                <a
                  href={selectedVideo.video_url}
                  download
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download Video
                </a>
              )}
            </div>
          </div>
        </div>
      )}

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

export default ReviewVideos;
