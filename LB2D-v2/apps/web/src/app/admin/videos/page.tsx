'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api-client';
import { LoadingPage } from '@/components/ui/loading-spinner';
import Button from '@/components/ui/button';
import toast from 'react-hot-toast';

export default function AdminVideosPage() {
  const router = useRouter();
  const { user, isAuthenticated, initializeAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    initializeAuth();

    if (isAuthenticated && user) {
      if (user.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      loadPendingVideos();
    } else if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, user]);

  const loadPendingVideos = async () => {
    try {
      const response = await api.videos.getPending();
      const data = response.data?.data || response.data;
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Failed to load pending videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (videoId: string, videoTitle: string) => {
    if (!confirm(`Approve video: ${videoTitle}?`)) return;

    try {
      await api.videos.approve(videoId, true);
      toast.success('Video approved successfully');
      loadPendingVideos();
    } catch (error: any) {
      toast.error('Failed to approve video');
    }
  };

  const handleReject = async (videoId: string, videoTitle: string) => {
    const reason = prompt(`Reject video: ${videoTitle}\n\nEnter rejection reason:`);
    if (!reason) return;

    try {
      await api.videos.approve(videoId, false, reason);
      toast.success('Video rejected');
      loadPendingVideos();
    } catch (error: any) {
      toast.error('Failed to reject video');
    }
  };

  if (loading || !user || user.role !== 'ADMIN') {
    return <LoadingPage message="Loading pending videos..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-2">Video Approvals</h1>
          <p className="text-green-100">Review and approve pending videos</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {videos.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              All Caught Up!
            </h2>
            <p className="text-gray-600">No pending videos to review</p>
          </div>
        ) : (
          <div className="space-y-6">
            {videos.map((video) => (
              <div key={video.id} className="bg-white rounded-xl shadow-md p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Video Info */}
                  <div className="lg:col-span-2">
                    <div className="mb-4">
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">
                        {video.title}
                      </h3>
                      <p className="text-gray-600">{video.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                      <span>📚 Course: {video.course.title}</span>
                      <span>⏱️ Duration: {Math.floor(video.duration / 60)} min</span>
                      <span>📅 Uploaded: {new Date(video.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-2">Uploaded by:</p>
                      <p className="font-semibold text-gray-800">
                        {video.course.supervisor.firstName} {video.course.supervisor.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{video.course.supervisor.email}</p>
                    </div>
                  </div>

                  {/* Video Preview */}
                  <div className="lg:col-span-1">
                    <video
                      src={video.videoUrl}
                      controls
                      className="w-full rounded-lg mb-4"
                    >
                      Your browser does not support video playback.
                    </video>

                    <div className="space-y-2">
                      <Button
                        onClick={() => handleApprove(video.id, video.title)}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        ✓ Approve
                      </Button>
                      <Button
                        onClick={() => handleReject(video.id, video.title)}
                        variant="destructive"
                        className="w-full"
                      >
                        ✗ Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
