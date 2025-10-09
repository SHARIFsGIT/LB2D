import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { apiClient } from '../utils/api';

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
  status: string;
  downloadCount: number;
  supervisorId: {
    firstName: string;
    lastName: string;
  };
  uploadedAt: string;
}

interface ResourceViewerProps {
  resource: Resource;
  onMarkCompleted?: () => void;
  showProgress?: boolean;
}

const ResourceViewer: React.FC<ResourceViewerProps> = ({ 
  resource, 
  onMarkCompleted, 
  showProgress = true 
}) => {
  const [isViewing, setIsViewing] = useState(false);
  const [progress, setProgress] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (showProgress && user?.role === 'Student') {
      fetchProgress();
    }
  }, [resource._id, showProgress, user]);

  const fetchProgress = async () => {
    try {
      const response = await apiClient.get(`/resources/${resource._id}/progress`);
      if (response.success) {
        setProgress(response.data);
      }
    } catch (error) {
      console.error('Error fetching resource progress:', error);
    }
  };

  const handleView = () => {
    if (resource.isViewableInline) {
      setIsViewing(true);
    } else {
      handleDownload();
    }
  };

  const handleDownload = () => {
    window.open(`${process.env.REACT_APP_API_URL || 'http://localhost:5005/api'}/resources/${resource._id}/download`, '_blank');
  };

  const handleMarkCompleted = async () => {
    if (progress?.completed) return;
    
    setIsLoading(true);
    try {
      const response = await apiClient.post(`/resources/${resource._id}/complete`, {
        timeSpent: 60 // Default time spent
      });
      
      if (response.success) {
        setProgress({ ...progress, completed: true });
        onMarkCompleted?.();
      }
    } catch (error: any) {
      console.error('Error marking resource as completed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string, extension: string) => {
    switch (type) {
      case 'image':
        return '🖼️';
      case 'audio':
        return '🎵';
      case 'video':
        return '🎬';
      case 'document':
        if (extension === '.pdf') return '📄';
        if (['.doc', '.docx'].includes(extension)) return '📝';
        if (['.xls', '.xlsx'].includes(extension)) return '📊';
        if (['.ppt', '.pptx'].includes(extension)) return '📊';
        return '📄';
      default:
        return '📄';
    }
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getFileIcon(resource.type, resource.fileExtension || '')}</span>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">{resource.title}</h3>
            <p className="text-sm text-gray-600">{resource.fileName}</p>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(resource.category)}`}>
            {resource.category.charAt(0).toUpperCase() + resource.category.slice(1)}
          </span>
          {progress?.completed && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✓ Completed
            </span>
          )}
        </div>
      </div>

      {resource.description && (
        <p className="text-gray-700 mb-4">{resource.description}</p>
      )}

      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <span>Size: {formatFileSize(resource.fileSize)}</span>
        <span>Downloads: {resource.downloadCount}</span>
        <span>
          Uploaded by: {resource.supervisorId.firstName} {resource.supervisorId.lastName}
        </span>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={handleView}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          {resource.isViewableInline ? '👁️ View' : '📥 Download'}
        </button>
        
        {resource.isViewableInline && (
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors"
          >
            📥 Download
          </button>
        )}

        {user?.role === 'Student' && !progress?.completed && (
          <button
            onClick={handleMarkCompleted}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {isLoading ? '...' : '✓ Complete'}
          </button>
        )}
      </div>

      {/* Inline Viewer Modal */}
      {isViewing && resource.isViewableInline && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{resource.title}</h3>
              <button
                onClick={() => setIsViewing(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-100px)]">
              {resource.type === 'image' && (
                <img
                  src={`${process.env.REACT_APP_API_URL || 'http://localhost:5005/api'}/resources/${resource._id}/view`}
                  alt={resource.title}
                  className="max-w-full h-auto"
                />
              )}
              
              {resource.type === 'audio' && (
                <audio
                  controls
                  className="w-full"
                  src={`${process.env.REACT_APP_API_URL || 'http://localhost:5005/api'}/resources/${resource._id}/view`}
                >
                  Your browser does not support the audio element.
                </audio>
              )}
              
              {resource.type === 'document' && resource.mimeType === 'application/pdf' && (
                <iframe
                  src={`${process.env.REACT_APP_API_URL || 'http://localhost:5005/api'}/resources/${resource._id}/view`}
                  className="w-full h-96"
                  title={resource.title}
                />
              )}
              
              {resource.type === 'document' && resource.mimeType === 'text/plain' && (
                <iframe
                  src={`${process.env.REACT_APP_API_URL || 'http://localhost:5005/api'}/resources/${resource._id}/view`}
                  className="w-full h-96 border rounded"
                  title={resource.title}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceViewer;