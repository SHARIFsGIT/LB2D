'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { resourceApi, courseApi } from '@/lib/api/client';
import ResourceUpload from '@/components/features/ResourceUpload';
import ResourceViewer from '@/components/features/ResourceViewer';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { useNotification } from '@/hooks/useNotification';
import ConfirmModal from '@/components/common/ConfirmModal';

interface Resource {
  _id: string;
  title: string;
  description: string;
  type: 'document' | 'audio' | 'image' | 'video' | 'link';
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileExtension: string;
  isViewableInline: boolean;
  category: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  downloadCount: number;
  uploadedAt: string;
  rejectionReason?: string;
  courseId: {
    _id: string;
    title: string;
    level: string;
  };
  supervisorId: {
    firstName: string;
    lastName: string;
  };
}

interface Course {
  _id: string;
  title: string;
  level: string;
}

const ResourceManagement: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [resources, setResources] = useState<Resource[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    status: 'all',
    courseId: 'all',
    type: 'all'
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchResources(),
        fetchCourses()
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchResources = async () => {
    try {
      const response = await resourceApi.getSupervisorResources();
      if (response.data?.success) {
        setResources(response.data?.data || []);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await courseApi.getAll();
      if (response.data?.success) {
        setCourses(response.data?.data || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleUploadComplete = (newResource: Resource) => {
    setResources(prev => [newResource, ...prev]);
    setShowUploadModal(false);
  };

  const handleSubmitForApproval = async (resourceId: string) => {
    try {
      const response = await resourceApi.submitForApproval(resourceId);
      if (response.data?.success) {
        setResources(prev =>
          prev.map(resource =>
            resource._id === resourceId
              ? { ...resource, status: 'pending' }
              : resource
          )
        );
        showSuccess('Resource submitted for approval successfully');
      }
    } catch (error: any) {
      console.error('Error submitting resource for approval:', error);
      showError(error.message || 'Failed to submit resource for approval');
    }
  };

  const handleDeleteResource = (resourceId: string) => {
    setResourceToDelete(resourceId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteResource = async () => {
    if (!resourceToDelete) return;

    try {
      const response = await resourceApi.delete(resourceToDelete);
      if (response.data?.success) {
        setResources(prev => prev.filter(resource => resource._id !== resourceToDelete));
        showSuccess('Resource deleted successfully');
        setShowDeleteConfirm(false);
        setResourceToDelete(null);
      }
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      showError(error.message || 'Failed to delete resource');
    }
  };

  const filteredResources = resources.filter(resource => {
    if (filter.status !== 'all' && resource.status !== filter.status) return false;
    if (filter.courseId !== 'all' && resource.courseId._id !== filter.courseId) return false;
    if (filter.type !== 'all' && resource.type !== filter.type) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || colors.draft;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Resource Management</h2>
          <p className="text-gray-600">Upload and manage course resources</p>
        </div>
        <Button
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          📄 Upload Resource
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filter.status}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course
            </label>
            <select
              value={filter.courseId}
              onChange={(e) => setFilter(prev => ({ ...prev, courseId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Courses</option>
              {courses.map(course => (
                <option key={course._id} value={course._id}>
                  {course.title} ({course.level})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={filter.type}
              onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="document">Document</option>
              <option value="audio">Audio</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={fetchData}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700"
            >
              🔄 Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Resources List */}
      <div className="space-y-6">
        {filteredResources.length > 0 ? (
          filteredResources.map(resource => (
            <div key={resource._id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{resource.title}</h3>
                  <p className="text-sm text-gray-600">
                    {resource.courseId.title} ({resource.courseId.level})
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(resource.status)}`}>
                    {resource.status.charAt(0).toUpperCase() + resource.status.slice(1)}
                  </span>
                </div>
              </div>

              <ResourceViewer
                resource={resource}
                showProgress={false}
              />

              {/* Actions */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Uploaded: {new Date(resource.uploadedAt).toLocaleDateString()} •
                  Downloads: {resource.downloadCount}
                </div>

                <div className="flex space-x-2">
                  {(resource.status === 'draft' || resource.status === 'rejected') && (
                    <Button
                      onClick={() => handleSubmitForApproval(resource._id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1"
                    >
                      {resource.status === 'rejected' ? 'Resubmit for Approval' : 'Submit for Approval'}
                    </Button>
                  )}

                  <Button
                    onClick={() => handleDeleteResource(resource._id)}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
            <p className="text-gray-600 mb-4">
              {filter.status !== 'all' || filter.courseId !== 'all' || filter.type !== 'all'
                ? 'Try adjusting your filters or upload your first resource.'
                : 'Upload your first resource to get started.'
              }
            </p>
            <Button
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Upload Resource
            </Button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <Modal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          title="Upload Course Resource"
        >
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Course
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Choose a course...</option>
              {courses.map(course => (
                <option key={course._id} value={course._id}>
                  {course.title} ({course.level})
                </option>
              ))}
            </select>
          </div>

          {selectedCourseId && (
            <ResourceUpload
              courseId={selectedCourseId}
              onUploadComplete={handleUploadComplete}
              onClose={() => setShowUploadModal(false)}
            />
          )}
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setResourceToDelete(null);
        }}
        onConfirm={confirmDeleteResource}
        title="Delete Resource"
        message="Are you sure you want to delete this resource? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default ResourceManagement;
