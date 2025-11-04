'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api-client';
import { LoadingPage } from '@/components/ui/loading-spinner';
import Button from '@/components/ui/button';
import toast from 'react-hot-toast';

export default function AdminResourcesPage() {
  const router = useRouter();
  const { user, isAuthenticated, initializeAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<any[]>([]);

  useEffect(() => {
    initializeAuth();

    if (isAuthenticated && user) {
      if (user.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      loadPendingResources();
    } else if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, user]);

  const loadPendingResources = async () => {
    try {
      const response = await api.resources.getPending();
      const data = response.data?.data || response.data;
      setResources(data.resources || []);
    } catch (error) {
      console.error('Failed to load pending resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (resourceId: string, resourceTitle: string) => {
    if (!confirm(`Approve resource: ${resourceTitle}?`)) return;

    try {
      await api.resources.approve(resourceId, true);
      toast.success('Resource approved successfully');
      loadPendingResources();
    } catch (error: any) {
      toast.error('Failed to approve resource');
    }
  };

  const handleReject = async (resourceId: string, resourceTitle: string) => {
    const reason = prompt(`Reject resource: ${resourceTitle}\n\nEnter rejection reason:`);
    if (!reason) return;

    try {
      await api.resources.approve(resourceId, false, reason);
      toast.success('Resource rejected');
      loadPendingResources();
    } catch (error: any) {
      toast.error('Failed to reject resource');
    }
  };

  if (loading || !user || user.role !== 'ADMIN') {
    return <LoadingPage message="Loading pending resources..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-2">Resource Approvals</h1>
          <p className="text-purple-100">Review and approve pending resources</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {resources.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              All Caught Up!
            </h2>
            <p className="text-gray-600">No pending resources to review</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((resource) => (
              <div key={resource.id} className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-center w-full h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg mb-4">
                  <div className="text-center text-white">
                    <p className="text-5xl mb-2">📄</p>
                    <p className="text-sm font-medium">{resource.fileType.toUpperCase()}</p>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {resource.title}
                </h3>
                {resource.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {resource.description}
                  </p>
                )}

                <div className="mb-4 text-sm text-gray-600">
                  <p>📚 {resource.course.title}</p>
                  <p className="mt-1">
                    👤 {resource.course.supervisor.firstName} {resource.course.supervisor.lastName}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(resource.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={() => window.open(resource.fileUrl, '_blank')}
                    variant="outline"
                    className="w-full"
                  >
                    Preview File
                  </Button>
                  <Button
                    onClick={() => handleApprove(resource.id, resource.title)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    ✓ Approve
                  </Button>
                  <Button
                    onClick={() => handleReject(resource.id, resource.title)}
                    variant="destructive"
                    className="w-full"
                  >
                    ✗ Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
