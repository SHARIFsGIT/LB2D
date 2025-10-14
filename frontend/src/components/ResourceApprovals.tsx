import React, { useState, useEffect } from 'react';
import { resourceApi } from '../utils/api';
import ResourceViewer from './ResourceViewer';
import Button from './common/Button';
import Modal from './common/Modal';
import { useNotification } from '../hooks/useNotification';

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
  status: 'pending' | 'approved' | 'rejected';
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

const ResourceApprovals: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchPendingResources();
  }, []);

  const fetchPendingResources = async () => {
    try {
      setLoading(true);
      const response = await resourceApi.getPending();
      if (response.success) {
        setResources(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching pending resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (resourceId: string) => {
    if (processingIds.has(resourceId)) return;

    try {
      setProcessingIds(prev => new Set(prev).add(resourceId));
      const response = await resourceApi.approve(resourceId);
      
      if (response.success) {
        setResources(prev => prev.map(resource =>
          resource._id === resourceId
            ? { ...resource, status: 'approved' as const }
            : resource
        ));
        showSuccess('Resource approved successfully', 'Approved');
      }
    } catch (error: any) {
      console.error('Error approving resource:', error);
      showError(error.message || 'Failed to approve resource', 'Approval Failed');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(resourceId);
        return newSet;
      });
    }
  };

  const handleReject = async () => {
    if (!selectedResource || !rejectionReason.trim()) {
      showError('Please provide a rejection reason', 'Reason Required');
      return;
    }

    if (processingIds.has(selectedResource._id)) return;

    try {
      setProcessingIds(prev => new Set(prev).add(selectedResource._id));
      const response = await resourceApi.reject(selectedResource._id, rejectionReason.trim());
      
      if (response.success) {
        setResources(prev => prev.map(resource =>
          resource._id === selectedResource._id
            ? { ...resource, status: 'rejected' as const, rejectionReason: rejectionReason.trim() }
            : resource
        ));
        showSuccess('Resource rejected successfully', 'Rejected');
        setShowRejectModal(false);
        setSelectedResource(null);
        setRejectionReason('');
      }
    } catch (error: any) {
      console.error('Error rejecting resource:', error);
      showError(error.message || 'Failed to reject resource', 'Rejection Failed');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedResource._id);
        return newSet;
      });
    }
  };

  const openRejectModal = (resource: Resource) => {
    setSelectedResource(resource);
    setShowRejectModal(true);
    setRejectionReason('');
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setSelectedResource(null);
    setRejectionReason('');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      lesson: 'bg-blue-100 text-blue-800',
      homework: 'bg-orange-100 text-orange-800',
      reference: 'bg-green-100 text-green-800',
      exercise: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || colors.other;
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
          <h3 className="text-xl font-bold text-gray-900">Pending Resource Approvals</h3>
          <p className="text-gray-600">Review and approve resources submitted by supervisors</p>
        </div>
        <Button
          onClick={fetchPendingResources}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700"
        >
          🔄 Refresh
        </Button>
      </div>

      {/* Resource Approvals */}
      {resources.length > 0 ? (
        <div className="space-y-6">
          {resources.map((resource) => (
            <div key={resource._id} className={`bg-white rounded-lg shadow-md overflow-hidden ${
              resource.status === 'pending' ? 'border border-yellow-200' :
              resource.status === 'approved' ? 'border border-green-200' :
              'border border-red-200'
            }`}>
              {/* Header */}
              <div className={`px-6 py-4 border-b ${
                resource.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
                resource.status === 'approved' ? 'bg-green-50 border-green-200' :
                'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{resource.title}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <span>Course: {resource.courseId.title} ({resource.courseId.level})</span>
                      <span>•</span>
                      <span>Submitted by: {resource.supervisorId.firstName} {resource.supervisorId.lastName}</span>
                      <span>•</span>
                      <span>Uploaded: {new Date(resource.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(resource.category)}`}>
                      {resource.category.charAt(0).toUpperCase() + resource.category.slice(1)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      resource.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      resource.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {resource.status === 'pending' ? 'Pending Approval' :
                       resource.status === 'approved' ? 'Approved' :
                       'Rejected'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Resource Details */}
              <div className="p-6">
                {resource.description && (
                  <p className="text-gray-700 mb-4">{resource.description}</p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                  <div>
                    <span className="font-medium text-gray-500">File Name:</span>
                    <p className="text-gray-900">{resource.fileName}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">File Size:</span>
                    <p className="text-gray-900">{formatFileSize(resource.fileSize)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">File Type:</span>
                    <p className="text-gray-900">{resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">MIME Type:</span>
                    <p className="text-gray-900">{resource.mimeType}</p>
                  </div>
                </div>

                {/* Resource Preview */}
                <div className="mb-6">
                  <ResourceViewer
                    resource={resource}
                    showProgress={false}
                  />
                </div>

                {/* Action Buttons or Status Information */}
                {resource.status === 'pending' ? (
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <Button
                      onClick={() => openRejectModal(resource)}
                      disabled={processingIds.has(resource._id)}
                      className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                    >
                      {processingIds.has(resource._id) ? 'Processing...' : '✖ Reject'}
                    </Button>
                    <Button
                      onClick={() => handleApprove(resource._id)}
                      disabled={processingIds.has(resource._id)}
                      className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                    >
                      {processingIds.has(resource._id) ? 'Processing...' : '✓ Approve'}
                    </Button>
                  </div>
                ) : resource.status === 'rejected' ? (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                      <p className="text-sm text-red-700 mt-1">{resource.rejectionReason}</p>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <p className="text-sm font-medium text-green-800">✓ This resource has been approved and is now available to students.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
          <p className="text-gray-600">There are no resources pending approval at the moment.</p>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedResource && (
        <Modal
          isOpen={showRejectModal}
          onClose={closeRejectModal}
          title="Reject Resource"
        >
          <div className="space-y-4">
            <div>
              <p className="text-gray-700 mb-2">
                You are about to reject the resource "<strong>{selectedResource.title}</strong>" 
                submitted by <strong>{selectedResource.supervisorId.firstName} {selectedResource.supervisorId.lastName}</strong>.
              </p>
              <p className="text-sm text-gray-600">
                Please provide a clear reason for rejection to help the supervisor improve their submission.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                placeholder="Please provide a specific reason for rejecting this resource..."
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                onClick={closeRejectModal}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processingIds.has(selectedResource._id)}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {processingIds.has(selectedResource._id) ? 'Processing...' : 'Reject Resource'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ResourceApprovals;