import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/common/ConfirmModal';
import PromptModal from '../components/common/PromptModal';
import { useNotification } from '../hooks/useNotification';
import { NotificationData, useWebSocket } from '../hooks/useWebSocket';
import { updateUser } from '../store/slices/authSlice';
import { RootState } from '../store/store';

interface User {
  id: string;
  email: string;
  role: string;
  requestedRole?: string;
  previousRole?: string;
  rejectionReason?: string;
  rejectionDate?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  profilePhoto?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

interface Video {
  _id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  courseId: {
    _id: string;
    title: string;
  };
  uploadedBy: {
    firstName: string;
    lastName: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  sequenceNumber: number;
  duration: number;
  createdAt: string;
  approvedAt?: string;
  rejectionReason?: string;
  videoFormat?: string;
  deletionStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  deletionRequestedBy?: string;
  deletionRequestedAt?: string;
  deletionApprovedBy?: string;
  deletionApprovedAt?: string;
  deletionRejectionReason?: string;
}

interface Quiz {
  _id: string;
  title: string;
  description?: string;
  type: 'quiz' | 'exam' | 'practice';
  questions: any[];
  totalPoints: number;
  timeLimit?: number;
  sequenceNumber: number;
  courseId: {
    _id: string;
    title: string;
    level: string;
  };
  supervisorId: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  rejectionReason?: string;
  deletionStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  deletionRequestedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  deletionRequestedAt?: string;
  deletionApprovedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  deletionApprovedAt?: string;
  deletionRejectionReason?: string;
}

interface Resource {
  _id: string;
  title: string;
  description?: string;
  type: 'document' | 'audio' | 'image' | 'video' | 'link';
  fileName: string;
  fileSize?: number;
  category: 'lesson' | 'homework' | 'reference' | 'exercise' | 'other';
  sequenceNumber: number;
  courseId: {
    _id: string;
    title: string;
    level: string;
  };
  supervisorId: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  approvedAt?: string;
  rejectionReason?: string;
  deletionStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  deletionRequestedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  deletionRequestedAt?: string;
  deletionApprovedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  deletionApprovedAt?: string;
  deletionRejectionReason?: string;
}

interface EditModalProps {
  user: User;
  onClose: () => void;
  onSave: (updatedUser: Partial<User>) => void;
}

interface VideoPreviewModalProps {
  video: Video | null;
  onClose: () => void;
  onApprove: (videoId: string) => void;
  onReject: (videoId: string) => void;
}

const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({ video, onClose, onApprove, onReject }) => {
  if (!video) return null;

  // Function to convert Google Drive sharing URL to direct video URL
  const convertGoogleDriveUrl = (url: string): string => {
    // Check if it's a Google Drive sharing link
    const googleDriveRegex = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view/;
    const match = url.match(googleDriveRegex);
    
    if (match) {
      const fileId = match[1];
      // Convert to direct download/preview URL
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    
    // Check if it's a locally uploaded video (starts with /uploads/)
    if (url.startsWith('/uploads/')) {
      // Remove /api from the base URL if present, since static files are served at root level
      const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5005';
      return `${baseUrl}${url}`;
    }
    
    return url; // Return original URL if not a Google Drive link or local upload
  };

  const processedVideoUrl = convertGoogleDriveUrl(video.videoUrl);
  const isGoogleDriveUrl = video.videoUrl.includes('drive.google.com');

  // Prevent recording shortcuts and inspect tools
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Block F12 (Developer Tools)
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    
    // Block Ctrl+Shift+I (Developer Tools)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      return false;
    }
    
    // Block Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      return false;
    }
    
    // Block Ctrl+U (View Source)
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      return false;
    }
    
    // Block Ctrl+S (Save)
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      return false;
    }
    
    // Block Print Screen
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      return false;
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-5xl max-h-[95vh] overflow-y-auto shadow-2xl transform transition-all duration-300 scale-100 animate-fade-in"
        onKeyDown={handleKeyDown}
      >
        {/* Header with enhanced styling */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white p-8 relative overflow-hidden">
          
          <div className="flex justify-between items-start relative z-10">
            <div className="flex-1">
              <div className="flex items-center mb-3">
                <span className="text-sm font-medium bg-white bg-opacity-20 px-3 py-1 rounded-full">
                  Video Preview
                </span>
              </div>
              <h2 className="text-3xl font-bold mb-2 leading-tight">{video.title}</h2>
              <p className="text-blue-100 text-lg">
                Course: {video.courseId?.title || 'Unknown Course'}
              </p>
            </div>
            
            <div className="flex flex-col items-end space-y-2 ml-6">
              <button
                onClick={onClose}
                className="text-white hover:text-blue-200 text-3xl font-light w-10 h-10 flex items-center justify-center rounded-full hover:bg-white hover:bg-opacity-20 transition-all duration-200 transform hover:scale-110"
              >
                ×
              </button>
              <div className="text-right space-y-1">
                <p className="text-blue-100 text-sm">
                  Uploaded by: {video.uploadedBy?.firstName} {video.uploadedBy?.lastName}
                </p>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    video.status === 'approved' ? 'bg-green-500 bg-opacity-90' :
                    video.status === 'pending' ? 'bg-yellow-500 bg-opacity-90' :
                    'bg-red-500 bg-opacity-90'
                  }`}>
                    {video.status === 'approved' && video.approvedAt 
                      ? `APPROVED ${new Date(video.approvedAt).toLocaleDateString()}`
                      : video.status?.toUpperCase()
                    }
                  </span>
                  <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                    Sequence {video.sequenceNumber}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Video Player Section */}
        <div className="p-6">
          <div 
            className="aspect-video bg-black rounded-2xl overflow-hidden mb-4 relative shadow-2xl border border-gray-200 select-none"
            style={{ 
              userSelect: 'none', 
              WebkitUserSelect: 'none', 
              MozUserSelect: 'none',
              WebkitTouchCallout: 'none'
            } as React.CSSProperties}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          >

            {isGoogleDriveUrl ? (
              /* Google Drive Iframe Player */
              <iframe
                src={`https://drive.google.com/file/d/${video.videoUrl.match(/\/d\/([a-zA-Z0-9_-]+)\//)?.[1]}/preview`}
                className="w-full h-full"
                allowFullScreen
                title={video.title}
                onError={() => {
                  console.error('Google Drive iframe failed to load');
                }}
              />
            ) : (
              /* Standard Video Player */
              <video
                key={video._id}
                className="w-full h-full object-contain"
                controls
                preload="auto"
                controlsList="nodownload noremoteplayback nofullscreen"
                disablePictureInPicture
                poster={video.thumbnailUrl}
                onContextMenu={(e) => e.preventDefault()}
                onLoadStart={() => {
                }}
                onLoadedMetadata={() => {
                }}
                onCanPlay={() => {
                }}
                onCanPlayThrough={() => {
                }}
                onLoadedData={() => {
                }}
                onError={(e) => {
                  console.error('Video load error:', e);
                  console.error('🔗 Original URL:', video.videoUrl);
                  console.error('Processed URL:', processedVideoUrl);
                  console.error('📄 Video format:', video.videoFormat);
                  console.error('🎯 Error event:', e.currentTarget.error);
                  
                  const target = e.target as HTMLVideoElement;
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="flex items-center justify-center h-full text-white bg-gray-800">
                        <div class="text-center max-w-md">
                          <p class="text-xl mb-2 font-semibold">Video Unavailable</p>
                          <p class="text-sm text-gray-300 mb-4">Unable to load video content</p>
                          <div class="mt-4 p-4 bg-gray-700 rounded text-xs text-left">
                            <p class="mb-2"><strong>Original URL:</strong></p>
                            <p class="break-all mb-3 bg-gray-600 p-2 rounded">${video.videoUrl}</p>
                            <p class="mb-2"><strong>Processed URL:</strong></p>
                            <p class="break-all mb-3 bg-gray-600 p-2 rounded">${processedVideoUrl}</p>
                            <p><strong>Format:</strong> ${video.videoFormat || 'Unknown'}</p>
                            <p><strong>Error:</strong> ${e.currentTarget.error?.message || 'Unknown error'}</p>
                          </div>
                          <p class="text-xs text-gray-400 mt-4">Consider using a proper video hosting service</p>
                        </div>
                      </div>
                    `;
                  }
                }}
                onStalled={() => {
                  console.warn('Video stalled:', processedVideoUrl);
                }}
                onSuspend={() => {
                }}
                onWaiting={() => {
                }}
              >
                <source src={processedVideoUrl} type="video/mp4" />
                <source src={processedVideoUrl} type="video/webm" />
                <source src={processedVideoUrl} type="video/ogg" />
                <source src={processedVideoUrl} type="video/mov" />
                <source src={processedVideoUrl} type="video/avi" />
                Your browser does not support the video tag.
              </video>
            )}
          </div>

          {/* Video Details Section */}
          <div className="mb-6">
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Description
              </h3>
              <p className="text-gray-700 leading-relaxed">{video.description || 'No description provided'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface QuizPreviewModalProps {
  quiz: Quiz | null;
  onClose: () => void;
  onApprove: (quizId: string) => void;
  onReject: (quizId: string) => void;
  onApproveDeletion?: (quizId: string, quizTitle: string) => void;
  onRejectDeletion?: (quizId: string, quizTitle: string) => void;
}

const QuizPreviewModal: React.FC<QuizPreviewModalProps> = ({ quiz, onClose, onApprove, onReject, onApproveDeletion, onRejectDeletion }) => {
  if (!quiz) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 text-white">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{quiz.title}</h2>
              {quiz.description && (
                <p className="text-white text-opacity-90 text-sm">{quiz.description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold ml-4"
            >
              ×
            </button>
          </div>
        </div>

        {/* Quiz Information */}
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-gray-800">{quiz.questions?.length || 0}</div>
              <div className="text-xs text-gray-600">Questions</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-gray-800">{quiz.totalPoints}</div>
              <div className="text-xs text-gray-600">Total Points</div>
            </div>
            {quiz.timeLimit && (
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-gray-800">{quiz.timeLimit}</div>
                <div className="text-xs text-gray-600">Minutes</div>
              </div>
            )}
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-gray-800">{quiz.courseId?.level}</div>
              <div className="text-xs text-gray-600">Level</div>
            </div>
          </div>

          {/* Questions Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Questions Preview</h3>
            {quiz.questions && quiz.questions.length > 0 ? (
              quiz.questions.slice(0, 5).map((question, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium text-gray-800">Question {index + 1}</h4>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {question.points || 10} pts
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">{question.questionText}</p>
                  
                  {question.questionType === 'multiple-choice' && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option: string, optIndex: number) => (
                        <div 
                          key={optIndex} 
                          className={`p-2 rounded text-sm ${
                            option === question.correctAnswer 
                              ? 'bg-green-100 border border-green-300' 
                              : 'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span> {option}
                          {option === question.correctAnswer && (
                            <span className="ml-2 text-green-600 font-medium">✓ Correct</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {question.questionType === 'true-false' && (
                    <div className="text-sm">
                      <span className="font-medium">Correct Answer:</span> 
                      <span className={`ml-2 px-2 py-1 rounded ${
                        question.correctAnswer === 'true' || question.correctAnswer === true
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {question.correctAnswer === 'true' || question.correctAnswer === true ? 'True' : 'False'}
                      </span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p>No questions available to preview</p>
              </div>
            )}
            
            {quiz.questions && quiz.questions.length > 5 && (
              <div className="text-center py-4">
                <p className="text-gray-600 text-sm">
                  ... and {quiz.questions.length - 5} more questions
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Only show for deletion approval */}
        {quiz.deletionStatus === 'pending' && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  onRejectDeletion?.(quiz._id, quiz.title);
                  onClose();
                }}
                className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg transition-all duration-300"
              >
                Reject Deletion
              </button>
              <button
                onClick={() => {
                  onApproveDeletion?.(quiz._id, quiz.title);
                  onClose();
                }}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all duration-300"
              >
                Approve Deletion
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const EditModal: React.FC<EditModalProps> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleApproveRejectedUser = () => {
    if (user.requestedRole && user.rejectionReason) {
      const updatedData = {
        ...formData,
        role: user.requestedRole, // Approve the originally requested role
      };
      setFormData(updatedData);
      // Automatically save the changes
      onSave(updatedData);
    }
  };

  // Check if this user was rejected and has a requested role that can be approved
  const canApproveRejection = user.requestedRole && user.rejectionReason && user.role !== user.requestedRole;

  // Check if user is Admin role (hide Active and Email Verified checkboxes for admins)
  const isAdminRole = user.role === 'Admin';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Edit User</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="Student">Student</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          {/* Show Active and Email Verified checkboxes only for non-Admin users */}
          {!isAdminRole && (
            <>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isEmailVerified}
                    onChange={(e) => setFormData({ ...formData, isEmailVerified: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Email Verified</span>
                </label>
              </div>
            </>
          )}

          {/* Show rejection information if user was rejected */}
          {canApproveRejection && (
            <div className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4 shadow-sm">
              <div className="space-y-2 text-sm">
                <h3 className="text-sm font-semibold text-orange-800 mb-2 text-center">
                  Role Request Rejected
                </h3>
                <div className="bg-white rounded-lg p-3 border border-orange-100">
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Requested Role:</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                        {user.requestedRole}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-gray-600 font-medium">Reason:</span>
                      <span className="text-gray-800 text-xs max-w-48 text-right">
                        {user.rejectionReason}
                      </span>
                    </div>
                    {user.rejectionDate && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Rejected:</span>
                        <span className="text-gray-700 text-xs">
                          {new Date(user.rejectionDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short', 
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-center mt-4">
                  <button
                    type="button"
                    onClick={handleApproveRejectedUser}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md"
                  >
                    Approve as {user.requestedRole}
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-200 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { showSuccess, showError, showWarning, showInfo } = useNotification();

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  } | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptConfig, setPromptConfig] = useState<{
    title: string;
    message: string;
    onSubmit: (value: string) => void;
    defaultValue?: string;
    placeholder?: string;
  } | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    students: 0,
    supervisors: 0,
    admins: 0,
    verified: 0
  });
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [videoCount, setVideoCount] = useState(0);
  const [allQuizzes, setAllQuizzes] = useState<Quiz[]>([]);
  const [quizCount, setQuizCount] = useState(0);
  const [quizzesPendingDeletion, setQuizzesPendingDeletion] = useState<Quiz[]>([]);
  const [deletionRequestsCount, setDeletionRequestsCount] = useState(0);
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [resourcesPendingDeletion, setResourcesPendingDeletion] = useState<Resource[]>([]);
  const [resourceCount, setResourceCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'users' | 'videos' | 'approvals'>('users');
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [realTimeUpdates, setRealTimeUpdates] = useState<NotificationData[]>([]);
  const [lastDataUpdate, setLastDataUpdate] = useState<string>('');
  const itemsPerPage = 10;

  // Get access token from session storage
  const token = sessionStorage.getItem('accessToken');

  // Handle real-time notifications for admin dashboard updates
  const handleAdminNotification = useCallback((notification: NotificationData) => {
    // Check if this notification is about the current user's role change
    if (notification.type === 'admin' && notification.data?.userId && currentUser?.id === notification.data.userId) {
      if (notification.title?.includes('Role Approved') || notification.title?.includes('Role Changed')) {
        // Refresh current user data from server
        const refreshUserData = async () => {
          try {
            const validateResponse = await fetch(`${process.env.REACT_APP_API_URL}/auth/validate-token`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (validateResponse.ok) {
              const validateData = await validateResponse.json();
              if (validateData.success && validateData.data && validateData.data.user) {
                dispatch(updateUser(validateData.data.user));
                
                // Show notification about role change
                if (notification.data?.newRole) {
                  showInfo(`Your role has been updated to ${notification.data.newRole}. Please refresh the page to see the new interface.`, 'Role Updated');
                } else if (notification.title?.includes('Role Approved')) {
                  showInfo(`Your role request has been approved! Please refresh the page to see the new interface.`, 'Role Approved');
                }
              }
            }
          } catch (error) {
            console.error('Error refreshing user data after role change:', error);
          }
        };
        
        refreshUserData();
      }
    }
    
    // Add to real-time updates list
    setRealTimeUpdates(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10
    setLastDataUpdate(new Date().toLocaleTimeString());
    
    // Determine what data needs to be refreshed based on notification type
    const refreshActions = {
      // User Management notifications
      user_registration: () => {
        fetchUsers();
        fetchStats();
      },
      admin: () => {
        if (notification.title.includes('Role') || notification.title.includes('User')) {
          fetchUsers();
          fetchStats();
        }
        if (notification.title.includes('Profile')) {
          fetchUsers(); // Refresh user list for profile updates
        }
      },
      
      // Video Management notifications  
      video: () => {
        fetchVideoCount();
        if (activeTab === 'videos') {
          fetchAllVideos();
        }
      },
      
      // Quiz Management notifications
      quiz_approval: () => {
        fetchQuizCount();
        if (activeTab === 'videos') {
          fetchAllQuizzes();
        }
      },
      
      // Resource Management notifications
      document_approval: () => {
        fetchResourceCount();
        if (activeTab === 'videos') {
          fetchAllResources();
        }
      },
      
      // Course Management notifications
      course: () => {
        fetchVideoCount(); // Courses affect video analytics
        if (activeTab === 'videos') {
          fetchAllVideos(); // Videos are tied to courses
        }
      },
      
      // Enrollment notifications (affects student analytics)
      enrollment: () => {
        fetchStats(); // Student enrollment affects user stats
      },
      
      // Payment notifications (affects revenue analytics)
      payment: () => {
        fetchStats(); // Payment affects overall analytics
      },
      
      // Supervisor notifications (affects salary & compensation)
      supervisor_action: () => {
        fetchStats(); // Supervisor activities affect analytics
        fetchUsers(); // May affect supervisor user data
      },
      
      // Student notifications (affects student analytics)
      student_action: () => {
        fetchStats(); // Student activities affect analytics
      },
      
      // General notifications
      general: () => {
        fetchStats();
        fetchUsers();
      }
    };

    // Execute appropriate refresh action
    const refreshAction = refreshActions[notification.type as keyof typeof refreshActions];
    if (refreshAction) {
      setTimeout(refreshAction, 1000); // Small delay to ensure backend processing is complete
    }
    
    // Show console log for debugging specific notification types
  }, [activeTab, token, currentUser, dispatch]);

  // WebSocket connection for admin dashboard
  const { isConnected, subscribe } = useWebSocket({
    onNotification: handleAdminNotification,
    onConnect: () => {
      // Subscribe to all admin-relevant notification types
      subscribe([
        'admin',              // Role approvals, user management
        'admin_notification', // Direct admin notifications
        'quiz_approval',      // Quiz approval requests
        'document_approval',  // Document/resource approval requests
        'user_registration',  // New user registrations 
        'enrollment',         // Course enrollments (student analytics)
        'course',            // Course management updates
        'video',             // Video management updates
        'payment',           // Payment & revenue analytics
        'supervisor_action', // Supervisor activities & compensation
        'student_action',    // Student results & analytics
        'general'            // General system notifications
      ]);
    },
    onDisconnect: () => {
    }
  });
  
  // Debug: Log current auth state
  useEffect(() => {
  }, [token]);

  // Fetch users from API
  const fetchUsers = async () => {
    if (!token) {
      console.error('No token available for admin API call');
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      // Debug log
      const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/users?page=${currentPage}&limit=${itemsPerPage}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Debug log

      if (response.ok) {
        const data = await response.json();
        // Debug log
        setUsers(data.data.users);
        setTotalPages(data.data.pagination.pages);
      } else if (response.status === 401) {
        console.error('Unauthorized access - redirecting to login');
        navigate('/login');
      } else if (response.status === 403) {
        console.error('Forbidden access - insufficient permissions');
        showError('Access denied. Admin privileges required.', 'Access Denied');
        navigate('/dashboard');
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Admin API error:', response.status, errorData);
      }
    } catch (error) {
      console.error('Network error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/users/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats({
          total: data.data.total,
          students: data.data.byRole.students,
          supervisors: data.data.byRole.supervisors,
          admins: data.data.byRole.admins,
          verified: data.data.verified
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStats();
    fetchVideoCount(); // Always fetch video count for the badge
    fetchQuizCount(); // Always fetch quiz count for the badge
    fetchResourceCount(); // Always fetch resource count for the badge
    fetchQuizzesPendingDeletion(); // Always fetch deletion requests for the badge
    fetchResourcesPendingDeletion(); // Always fetch resource deletion requests
    if (activeTab === 'videos') {
      fetchAllVideos();
      fetchAllQuizzes();
      fetchAllResources();
    }
  }, [currentPage, activeTab]);

  // Periodic updates disabled to prevent automatic page refresh
  // Set up periodic update for video, quiz, and resource counts
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     fetchVideoCount();
  //     fetchQuizCount();
  //     fetchResourceCount();
  //   }, 30000); // Update every 30 seconds

  //   return () => clearInterval(interval);
  // }, []);

  // Fetch video count only
  const fetchVideoCount = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/videos/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVideoCount(data.count || data.data.length);
      }
    } catch (error) {
      console.error('Error fetching video count:', error);
    }
  };

  // Fetch all videos
  const fetchAllVideos = async () => {
    try {
      setLoadingVideos(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/videos/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAllVideos(data.data);
        setVideoCount(data.count || data.data.length);
      }
    } catch (error) {
      console.error('Error fetching all videos:', error);
    } finally {
      setLoadingVideos(false);
    }
  };

  // Fetch quiz count only (pending and rejected quizzes)
  const fetchQuizCount = async () => {
    try {
      // Try admin-review endpoint first
      let response = await fetch(`${process.env.REACT_APP_API_URL}/quizzes/admin-review`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // If admin-review endpoint doesn't exist, fallback to pending
      if (!response.ok && response.status === 404) {
        // Get pending quizzes
        const pendingResponse = await fetch(`${process.env.REACT_APP_API_URL}/quizzes/pending`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        // Get rejected quizzes  
        const rejectedResponse = await fetch(`${process.env.REACT_APP_API_URL}/quizzes/rejected`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        // Get approved quizzes
        const approvedResponse = await fetch(`${process.env.REACT_APP_API_URL}/quizzes/approved`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        let totalCount = 0;
        if (pendingResponse.ok) {
          const pendingData = await pendingResponse.json();
          totalCount += pendingData.count || pendingData.data?.length || 0;
        }
        if (rejectedResponse.ok) {
          const rejectedData = await rejectedResponse.json();
          totalCount += rejectedData.count || rejectedData.data?.length || 0;
        }
        if (approvedResponse.ok) {
          const approvedData = await approvedResponse.json();
          totalCount += approvedData.count || approvedData.data?.length || 0;
        }
        
        setQuizCount(totalCount);
      } else if (response.ok) {
        const data = await response.json();
        setQuizCount(data.count || data.data.length);
      }
    } catch (error) {
      console.error('Error fetching quiz count:', error);
    }
  };

  // Fetch all quizzes needing admin review (pending, rejected, and approved)
  const fetchAllQuizzes = async () => {
    try {
      setLoadingQuizzes(true);
      
      // Try admin-review endpoint first
      let response = await fetch(`${process.env.REACT_APP_API_URL}/quizzes/admin-review`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // If admin-review endpoint doesn't exist, fallback to combining pending + rejected
      if (!response.ok && response.status === 404) {
        const allQuizzes = [];
        
        // Get pending quizzes
        try {
          const pendingResponse = await fetch(`${process.env.REACT_APP_API_URL}/quizzes/pending`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (pendingResponse.ok) {
            const pendingData = await pendingResponse.json();
            if (pendingData.data && Array.isArray(pendingData.data)) {
              allQuizzes.push(...pendingData.data);
            }
          }
        } catch (error) {
          console.error('Error fetching pending quizzes:', error);
        }

        // Get rejected quizzes
        try {
          const rejectedResponse = await fetch(`${process.env.REACT_APP_API_URL}/quizzes/rejected`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (rejectedResponse.ok) {
            const rejectedData = await rejectedResponse.json();
            if (rejectedData.data && Array.isArray(rejectedData.data)) {
              allQuizzes.push(...rejectedData.data);
            }
          }
        } catch (error) {
          console.error('Error fetching rejected quizzes:', error);
        }

        // Get approved quizzes
        try {
          const approvedResponse = await fetch(`${process.env.REACT_APP_API_URL}/quizzes/approved`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (approvedResponse.ok) {
            const approvedData = await approvedResponse.json();
            if (approvedData.data && Array.isArray(approvedData.data)) {
              allQuizzes.push(...approvedData.data);
            }
          }
        } catch (error) {
          console.error('Error fetching approved quizzes:', error);
        }

        setAllQuizzes(allQuizzes);
        setQuizCount(allQuizzes.length);
      } else if (response.ok) {
        const data = await response.json();
        setAllQuizzes(data.data);
        setQuizCount(data.count || data.data.length);
      }
    } catch (error) {
      console.error('Error fetching all quizzes:', error);
    } finally {
      setLoadingQuizzes(false);
    }
  };

  // Fetch resource count only
  const fetchResourceCount = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/resources/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setResourceCount(data.count || data.data.length);
      }
    } catch (error) {
      console.error('Error fetching resource count:', error);
    }
  };

  // Fetch all pending resources
  const fetchAllResources = async () => {
    try {
      setLoadingResources(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/resources/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAllResources(data.data);
        setResourceCount(data.count || data.data.length);
      }
    } catch (error) {
      console.error('Error fetching all resources:', error);
    } finally {
      setLoadingResources(false);
    }
  };

  // Approve video
  const handleApproveVideo = async (videoId: string) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/videos/${videoId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        showSuccess('Video approved successfully', 'Success');
        fetchAllVideos();
        fetchVideoCount(); // Update count immediately
      } else {
        const error = await response.json();
        showError(error.message || 'Failed to approve video', 'Error');
      }
    } catch (error) {
      console.error('Error approving video:', error);
      showError('Failed to approve video', 'Error');
    }
  };

  // Reject video
  const handleRejectVideo = async (videoId: string) => {
    setPromptConfig({
      title: 'Reject Video',
      message: 'Please provide a reason for rejection:',
      placeholder: 'Enter rejection reason...',
      onSubmit: async (rejectionReason) => {
        setShowPromptModal(false);

        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/videos/${videoId}/reject`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rejectionReason })
          });

          if (response.ok) {
            showSuccess('Video rejected successfully', 'Success');
            fetchAllVideos();
            fetchVideoCount(); // Update count immediately
          } else {
            const error = await response.json();
            showError(error.message || 'Failed to reject video', 'Error');
          }
        } catch (error) {
          console.error('Error rejecting video:', error);
          showError('Failed to reject video', 'Error');
        }
      }
    });
    setShowPromptModal(true);
  };

  // Delete video
  const handleDeleteVideo = async (videoId: string) => {
    if (!token) {
      showError('Authentication token not found. Please log in again.', 'Error');
      return;
    }

    setConfirmConfig({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this video? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        setShowConfirmModal(false);

        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/videos/${videoId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            showSuccess('Video deleted successfully', 'Success');
            fetchAllVideos();
            fetchVideoCount(); // Update count immediately
          } else {
            const error = await response.json();
            console.error('Delete video error response:', error);
            showError(error.message || `Failed to delete video (Status: ${response.status})`, 'Error');
          }
        } catch (error) {
          console.error('Error deleting video:', error);
          showError('Failed to delete video. Please check your connection and try again.', 'Error');
        }
      }
    });
    setShowConfirmModal(true);
  };

  // Delete quiz
  const handleDeleteQuiz = async (quizId: string) => {
    if (!token) {
      showError('Authentication token not found. Please log in again.', 'Error');
      return;
    }

    setConfirmConfig({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this quiz? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        setShowConfirmModal(false);

        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/quizzes/${quizId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            showSuccess('Quiz deleted successfully', 'Success');
            fetchAllQuizzes();
            fetchQuizCount(); // Update count immediately
          } else {
            const error = await response.json();
            console.error('Delete quiz error response:', error);
            showError(error.message || `Failed to delete quiz (Status: ${response.status})`, 'Error');
          }
        } catch (error) {
          console.error('Delete quiz error:', error);
          showError('Failed to delete quiz. Please check your connection and try again.', 'Error');
        }
      }
    });
    setShowConfirmModal(true);
  };

  // Delete resource
  const handleDeleteResource = async (resourceId: string) => {
    if (!token) {
      showError('Authentication token not found. Please log in again.', 'Error');
      return;
    }

    setConfirmConfig({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this resource? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        setShowConfirmModal(false);

        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/resources/${resourceId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            showSuccess('Resource deleted successfully', 'Success');
            fetchAllResources();
            fetchResourceCount(); // Update count immediately
          } else {
            const error = await response.json();
            console.error('Delete resource error response:', error);
            showError(error.message || `Failed to delete resource (Status: ${response.status})`, 'Error');
          }
        } catch (error) {
          console.error('Delete resource error:', error);
          showError('Failed to delete resource. Please check your connection and try again.', 'Error');
        }
      }
    });
    setShowConfirmModal(true);
  };

  // Approve quiz
  const handleApproveQuiz = async (quizId: string) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/quizzes/${quizId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        showSuccess('Quiz approved successfully', 'Success');
        fetchAllQuizzes();
        fetchQuizCount(); // Update count immediately
      } else {
        const error = await response.json();
        showError(error.message || 'Failed to approve quiz', 'Error');
      }
    } catch (error) {
      console.error('Error approving quiz:', error);
      showError('Failed to approve quiz', 'Error');
    }
  };

  // Reject quiz
  const handleRejectQuiz = async (quizId: string) => {
    setPromptConfig({
      title: 'Reject Quiz',
      message: 'Please provide a reason for rejection:',
      placeholder: 'Enter rejection reason...',
      onSubmit: async (rejectionReason) => {
        setShowPromptModal(false);

        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/quizzes/${quizId}/reject`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rejectionReason })
          });

          if (response.ok) {
            showSuccess('Quiz rejected successfully', 'Success');
            fetchAllQuizzes();
            fetchQuizCount(); // Update count immediately
          } else {
            const error = await response.json();
            showError(error.message || 'Failed to reject quiz', 'Error');
          }
        } catch (error) {
          console.error('Error rejecting quiz:', error);
          showError('Failed to reject quiz', 'Error');
        }
      }
    });
    setShowPromptModal(true);
  };

  // Fetch quizzes pending deletion approval
  const fetchQuizzesPendingDeletion = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/quizzes/pending-deletion`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQuizzesPendingDeletion(data.data || []);
        setDeletionRequestsCount(data.data?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching quizzes pending deletion:', error);
    }
  };

  // Fetch resources pending deletion approval
  const fetchResourcesPendingDeletion = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/resources/pending-deletion`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setResourcesPendingDeletion(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching resources pending deletion:', error);
    }
  };

  // Approve video deletion
  const handleApproveVideoDeletion = async (videoId: string, videoTitle: string) => {
    setConfirmConfig({
      title: 'Approve Video Deletion',
      message: `Are you sure you want to approve the deletion of "${videoTitle}"? This will hide the video from supervisors.`,
      type: 'warning',
      onConfirm: async () => {
        setShowConfirmModal(false);

        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/videos/${videoId}/approve-deletion`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            showSuccess('Video deletion approved - video hidden from supervisor', 'Success');
            fetchAllVideos(); // Refresh main video list
            fetchVideoCount(); // Update count
          } else {
            const error = await response.json();
            showError(error.message || 'Failed to approve deletion', 'Error');
          }
        } catch (error) {
          console.error('Error approving video deletion:', error);
          showError('Failed to approve deletion', 'Error');
        }
      }
    });
    setShowConfirmModal(true);
  };

  // Reject video deletion
  const handleRejectVideoDeletion = async (videoId: string, videoTitle: string) => {
    setPromptConfig({
      title: 'Reject Video Deletion',
      message: `Please provide a reason for rejecting the deletion of "${videoTitle}":`,
      placeholder: 'Enter rejection reason...',
      onSubmit: async (rejectionReason) => {
        setShowPromptModal(false);

        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/videos/${videoId}/reject-deletion`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason: rejectionReason })
          });

          if (response.ok) {
            showSuccess('Deletion request rejected successfully', 'Success');
            fetchAllVideos(); // Refresh to show rejection reason
          } else {
            const error = await response.json();
            showError(error.message || 'Failed to reject deletion', 'Error');
          }
        } catch (error) {
          console.error('Error rejecting video deletion:', error);
          showError('Failed to reject deletion', 'Error');
        }
      }
    });
    setShowPromptModal(true);
  };

  // Approve quiz deletion
  const handleApproveQuizDeletion = async (quizId: string, quizTitle: string) => {
    setConfirmConfig({
      title: 'Approve Quiz Deletion',
      message: `Are you sure you want to approve the deletion of "${quizTitle}"? This will hide the quiz from supervisors.`,
      type: 'warning',
      onConfirm: async () => {
        setShowConfirmModal(false);

        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/quizzes/${quizId}/approve-deletion`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            showSuccess('Quiz deletion approved - quiz hidden from supervisor', 'Success');
            fetchQuizzesPendingDeletion();
            fetchAllQuizzes(); // Refresh main quiz list
            fetchQuizCount(); // Update count
          } else {
            const error = await response.json();
            showError(error.message || 'Failed to approve deletion', 'Error');
          }
        } catch (error) {
          console.error('Error approving deletion:', error);
          showError('Failed to approve deletion', 'Error');
        }
      }
    });
    setShowConfirmModal(true);
  };

  // Reject quiz deletion
  const handleRejectQuizDeletion = async (quizId: string, quizTitle: string) => {
    setPromptConfig({
      title: 'Reject Quiz Deletion',
      message: `Please provide a reason for rejecting the deletion of "${quizTitle}":`,
      placeholder: 'Enter rejection reason...',
      onSubmit: async (rejectionReason) => {
        setShowPromptModal(false);

        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/quizzes/${quizId}/reject-deletion`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason: rejectionReason })
          });

          if (response.ok) {
            showSuccess('Deletion request rejected successfully', 'Success');
            fetchQuizzesPendingDeletion();
            fetchAllQuizzes(); // Refresh to show rejection reason
          } else {
            const error = await response.json();
            showError(error.message || 'Failed to reject deletion', 'Error');
          }
        } catch (error) {
          console.error('Error rejecting deletion:', error);
          showError('Failed to reject deletion', 'Error');
        }
      }
    });
    setShowPromptModal(true);
  };

  // Approve resource deletion
  const handleApproveResourceDeletion = async (resourceId: string, resourceTitle: string) => {
    setConfirmConfig({
      title: 'Approve Resource Deletion',
      message: `Are you sure you want to approve the deletion of "${resourceTitle}"? This will hide the resource from supervisors.`,
      type: 'warning',
      onConfirm: async () => {
        setShowConfirmModal(false);

        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/resources/${resourceId}/approve-deletion`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            showSuccess('Resource deletion approved - resource hidden from supervisor', 'Success');
            fetchResourcesPendingDeletion();
            fetchAllResources(); // Refresh main resource list
            fetchResourceCount(); // Update count
          } else {
            const error = await response.json();
            showError(error.message || 'Failed to approve deletion', 'Error');
          }
        } catch (error) {
          console.error('Error approving resource deletion:', error);
          showError('Failed to approve deletion', 'Error');
        }
      }
    });
    setShowConfirmModal(true);
  };

  // Reject resource deletion
  const handleRejectResourceDeletion = async (resourceId: string, resourceTitle: string) => {
    setPromptConfig({
      title: 'Reject Resource Deletion',
      message: `Please provide a reason for rejecting the deletion of "${resourceTitle}":`,
      placeholder: 'Enter rejection reason...',
      onSubmit: async (rejectionReason) => {
        setShowPromptModal(false);

        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/resources/${resourceId}/reject-deletion`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason: rejectionReason })
          });

          if (response.ok) {
            showSuccess('Deletion request rejected successfully', 'Success');
            fetchResourcesPendingDeletion();
            fetchAllResources(); // Refresh to show rejection reason
          } else {
            const error = await response.json();
            showError(error.message || 'Failed to reject deletion', 'Error');
          }
        } catch (error) {
          console.error('Error rejecting resource deletion:', error);
          showError('Failed to reject deletion', 'Error');
        }
      }
    });
    setShowPromptModal(true);
  };

  // Approve resource
  const handleApproveResource = async (resourceId: string) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/resources/${resourceId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        showSuccess('Resource approved successfully', 'Success');
        fetchAllResources();
        fetchResourceCount(); // Update count immediately
      } else {
        const error = await response.json();
        showError(error.message || 'Failed to approve resource', 'Error');
      }
    } catch (error) {
      console.error('Error approving resource:', error);
      showError('Failed to approve resource', 'Error');
    }
  };

  // Reject resource
  const handleRejectResource = async (resourceId: string) => {
    setPromptConfig({
      title: 'Reject Resource',
      message: 'Please provide a reason for rejection:',
      placeholder: 'Enter rejection reason...',
      onSubmit: async (rejectionReason) => {
        setShowPromptModal(false);

        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/resources/${resourceId}/reject`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rejectionReason })
          });

          if (response.ok) {
            showSuccess('Resource rejected successfully', 'Success');
            fetchAllResources();
            fetchResourceCount(); // Update count immediately
          } else {
            const error = await response.json();
            showError(error.message || 'Failed to reject resource', 'Error');
          }
        } catch (error) {
          console.error('Error rejecting resource:', error);
          showError('Failed to reject resource', 'Error');
        }
      }
    });
    setShowPromptModal(true);
  };

  // View/Open resource (document)
  const handleViewResource = async (resource: Resource) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/resources/${resource._id}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // For documents, PDFs, and images - open in new tab
        if (resource.type === 'document' || resource.fileName.toLowerCase().includes('.pdf') || 
            resource.fileName.toLowerCase().includes('.doc') || resource.fileName.toLowerCase().includes('.docx') ||
            resource.type === 'image') {
          const newWindow = window.open(url, '_blank');
          if (newWindow) {
            // Clean up the blob URL after a delay to allow the new window to load
            setTimeout(() => {
              window.URL.revokeObjectURL(url);
            }, 1000);
          } else {
            // Fallback: trigger download if popup blocked
            triggerDownload(url, resource.fileName);
          }
        } else {
          // For other file types, trigger download
          triggerDownload(url, resource.fileName);
        }
      } else {
        showError("Failed to open resource", "Error");
      }
    } catch (error) {
      console.error("Error opening resource:", error);
      showError("Failed to open resource", "Error");
    }
  };

  // Helper function to trigger download
  const triggerDownload = (url: string, fileName: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "download";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Handle user update
  const handleUpdateUser = async (updatedData: Partial<User>) => {
    if (!editingUser) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
      });

      if (response.ok) {
        const result = await response.json();
        
        setEditingUser(null);
        fetchUsers();
        fetchStats();
        
        // If the updated user is the currently logged-in user, update their data in the auth state
        if (currentUser && editingUser.id === currentUser.id) {
          // Update the current user's data in Redux state
          dispatch(updateUser(updatedData));
          
          // Also refresh the user data from the server to ensure consistency
          try {
            const validateResponse = await fetch(`${process.env.REACT_APP_API_URL}/auth/validate-token`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (validateResponse.ok) {
              const validateData = await validateResponse.json();
              if (validateData.success && validateData.data && validateData.data.user) {
                dispatch(updateUser(validateData.data.user));
              }
            }
          } catch (refreshError) {
            console.error('Error refreshing user data:', refreshError);
          }
          
          // Show appropriate message based on what was changed
          if (updatedData.role && updatedData.role !== currentUser.role) {
            showInfo(`Role updated successfully! Your role has been changed to ${updatedData.role}. Please refresh the page to see the new interface.`, 'Role Updated');
          } else {
            showSuccess('Your profile has been updated successfully!', 'Success');
          }
        } else {
          showSuccess('User updated successfully', 'Success');
        }
      } else {
        const error = await response.json();
        showError(error.message || 'Failed to update user', 'Error');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showError('Failed to update user', 'Error');
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setDeleteConfirm(null);
        fetchUsers();
        fetchStats();
        showSuccess('User deleted successfully', 'Success');
      } else {
        const error = await response.json();
        showError(error.message || 'Failed to delete user', 'Error');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showError('Failed to delete user', 'Error');
    }
  };

  // Handle role approval
  const handleApproveRole = async (userId: string, requestedRole: string) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          role: requestedRole,
          requestedRole: undefined // Clear the requested role
        })
      });

      if (response.ok) {
        fetchUsers();
        fetchStats();
        showSuccess(`Role approved! User is now a ${requestedRole}.`, 'Success');
      } else {
        const error = await response.json();
        showError(error.message || 'Failed to approve role', 'Error');
      }
    } catch (error) {
      console.error('Error approving role:', error);
      showError('Failed to approve role', 'Error');
    }
  };

  // Handle role rejection
  const handleRejectRole = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Confirm rejection
    setConfirmConfig({
      title: 'Reject Role Request',
      message: `Are you sure you want to reject ${user.firstName} ${user.lastName}'s request for ${user.requestedRole} role?`,
      type: 'warning',
      onConfirm: () => {
        setShowConfirmModal(false);

        // Ask for rejection reason (optional)
        setPromptConfig({
          title: 'Rejection Reason',
          message: 'Please provide a reason for rejection (optional):',
          placeholder: 'Enter rejection reason...',
          defaultValue: '',
          onSubmit: async (rejectionReason) => {
            setShowPromptModal(false);

            try {
              const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  requestedRole: null, // Clear the requested role
                  rejectionReason: rejectionReason || 'No reason provided'
                })
              });

              if (response.ok) {
                fetchUsers();
                fetchStats();
                showSuccess(`Role request for ${user.firstName} ${user.lastName} has been rejected.`, 'Success');
              } else {
                const error = await response.json();
                showError(error.message || 'Failed to reject role request', 'Error');
              }
            } catch (error) {
              console.error('Error rejecting role:', error);
              showError('Failed to reject role request. Please try again.', 'Error');
            }
          }
        });
        setShowPromptModal(true);
      }
    });
    setShowConfirmModal(true);
  };

  const clearUserManagementData = async () => {
    setConfirmConfig({
      title: 'Clear User Management Data',
      message: 'WARNING: This will permanently delete ALL user management data.\n\nThis includes user activity logs, session data, and management records.\n\nThis action cannot be undone. Are you absolutely sure you want to proceed?',
      type: 'danger',
      onConfirm: async () => {
        setShowConfirmModal(false);

        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/analytics/clear-user-management`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            showSuccess('User management data cleared successfully!', 'Success');
            fetchUsers();
            fetchStats();
          } else {
            showError('Failed to clear user management data', 'Error');
          }
        } catch (error) {
          console.error('Error clearing user management data:', error);
          showError('Error clearing user management data', 'Error');
        }
      }
    });
    setShowConfirmModal(true);
  };

  const clearVideoManagementData = async () => {
    setConfirmConfig({
      title: 'Clear Video Management Data',
      message: 'WARNING: This will permanently delete ALL video management data.\n\nThis includes video metadata, upload history, and management records.\n\nThis action cannot be undone. Are you absolutely sure you want to proceed?',
      type: 'danger',
      onConfirm: async () => {
        setShowConfirmModal(false);

        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/analytics/clear-video-management`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            showSuccess('Video management data cleared successfully!', 'Success');
            fetchAllVideos();
            fetchVideoCount();
          } else {
            showError('Failed to clear video management data', 'Error');
          }
        } catch (error) {
          console.error('Error clearing video management data:', error);
          showError('Error clearing video management data', 'Error');
        }
      }
    });
    setShowConfirmModal(true);
  };

  const clearQuizManagementData = async () => {
    setConfirmConfig({
      title: 'Clear Quiz Management Data',
      message: 'WARNING: This will permanently delete ALL quiz management data.\n\nThis includes quiz metadata, questions, attempts, and management records.\n\nThis action cannot be undone. Are you absolutely sure you want to proceed?',
      type: 'danger',
      onConfirm: async () => {
        setShowConfirmModal(false);

        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/analytics/clear-quiz-management`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            showSuccess('Quiz management data cleared successfully!', 'Success');
            fetchAllQuizzes();
            fetchQuizCount();
          } else {
            showError('Failed to clear quiz management data', 'Error');
          }
        } catch (error) {
          console.error('Error clearing quiz management data:', error);
          showError('Error clearing quiz management data', 'Error');
        }
      }
    });
    setShowConfirmModal(true);
  };

  const clearResourceManagementData = async () => {
    setConfirmConfig({
      title: 'Clear Resource Management Data',
      message: 'WARNING: This will permanently delete ALL resource management data.\n\nThis includes document metadata, upload history, and management records.\n\nThis action cannot be undone. Are you absolutely sure you want to proceed?',
      type: 'danger',
      onConfirm: async () => {
        setShowConfirmModal(false);

        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/analytics/clear-resource-management`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            showSuccess('Resource management data cleared successfully!', 'Success');
            fetchAllResources();
            fetchResourceCount();
          } else {
            showError('Failed to clear resource management data', 'Error');
          }
        } catch (error) {
          console.error('Error clearing resource management data:', error);
          showError('Error clearing resource management data', 'Error');
        }
      }
    });
    setShowConfirmModal(true);
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-purple-50 via-white to-indigo-50 pb-16" style={{minHeight: '100vh'}}>
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-4">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12">
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 rounded-xl opacity-30 blur animate-pulse"></div>
            <div className="relative bg-gray-100 backdrop-blur-md py-12 px-6 rounded-xl shadow-xl border border-white border-opacity-30 overflow-hidden">
              <h3 className="text-sm font-medium text-gray-700 relative z-10">Total Users</h3>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-8xl font-bold text-green-600 opacity-20">
                {stats.total}
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 rounded-xl opacity-30 blur animate-pulse"></div>
            <div className="relative bg-gray-100 backdrop-blur-md py-12 px-6 rounded-xl shadow-xl border border-white border-opacity-30 overflow-hidden">
              <h3 className="text-sm font-medium text-gray-700 relative z-10">Students</h3>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-8xl font-bold text-yellow-600 opacity-20">
                {stats.students}
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 rounded-xl opacity-30 blur animate-pulse"></div>
            <div className="relative bg-gray-100 backdrop-blur-md py-12 px-6 rounded-xl shadow-xl border border-white border-opacity-30 overflow-hidden">
              <h3 className="text-sm font-medium text-gray-700 relative z-10">Supervisors</h3>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-8xl font-bold text-red-600 opacity-20">
                {stats.supervisors}
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 rounded-xl opacity-30 blur animate-pulse"></div>
            <div className="relative bg-gray-100 backdrop-blur-md py-12 px-6 rounded-xl shadow-xl border border-white border-opacity-30 overflow-hidden">
              <h3 className="text-sm font-medium text-gray-700 relative z-10">Admins</h3>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-8xl font-bold text-cyan-600 opacity-20">
                {stats.admins}
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 rounded-xl opacity-30 blur animate-pulse"></div>
            <div className="relative bg-gray-100 backdrop-blur-md py-12 px-6 rounded-xl shadow-xl border border-white border-opacity-30 overflow-hidden">
              <h3 className="text-sm font-medium text-gray-700 relative z-10">Verified</h3>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-8xl font-bold text-green-600 opacity-20">
                {stats.verified}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500'
                }`}
              >
                <span>User Management</span>
                <span className="bg-gray-100 text-gray-600 rounded-full px-2 py-1 text-xs">
                  {stats.total}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'approvals'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500'
                }`}
              >
                <span>Role Approvals</span>
                <span className="bg-red-100 text-red-600 rounded-full px-2 py-1 text-xs">
                  {users.filter(u => u.requestedRole && u.requestedRole !== u.role && !u.rejectionReason).length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('videos')}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'videos'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500'
                }`}
              >
                <span>Content Management</span>
                <div className="flex space-x-1">
                  <span className="bg-blue-100 text-blue-600 rounded-full px-2 py-1 text-xs">
                    {videoCount} videos
                  </span>
                  <span className="bg-yellow-100 text-yellow-600 rounded-full px-2 py-1 text-xs">
                    {quizCount} quizzes
                  </span>
                  {deletionRequestsCount > 0 && (
                    <span className="bg-orange-100 text-orange-600 rounded-full px-2 py-1 text-xs">
                      {deletionRequestsCount} deletions
                    </span>
                  )}
                  <span className="bg-purple-100 text-purple-600 rounded-full px-2 py-1 text-xs">
                    {resourceCount} docs
                  </span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'users' && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-tr from-cyan-900 via-sky-800 to-gray-400 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-white flex items-center">
                User Management
              </h2>
              <button
                onClick={clearUserManagementData}
                className="bg-transparent hover:bg-white hover:bg-opacity-20 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 border border-white border-opacity-30 hover:border-opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                <span>Clear Data</span>
              </button>
            </div>
          </div>
          <div className="p-6">
          
          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2">Loading users...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User Info
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role & Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account Details
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map(user => (
                      <tr key={user.id}>
                        <td className="px-4 py-4 text-sm">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center overflow-hidden">
                              {user.profilePhoto ? (
                                <img 
                                  src={user.profilePhoto} 
                                  alt="Profile" 
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                <span className="text-white font-semibold text-sm">
                                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div className="ml-3">
                              <div className="font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {user.id.slice(-8)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <div className="space-y-2">
                            <div className="bg-blue-50 p-2 rounded">
                              <div className="text-gray-900">{user.email}</div>
                            </div>
                            <div className="bg-gray-50 p-2 rounded flex items-center justify-between">
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                user.phone ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-200 text-gray-600'
                              }`}>
                                {user.phone || 'No phone'}
                              </span>
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                user.isEmailVerified ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                              }`}>
                                {user.isEmailVerified ? 'Verified' : 'Unverified'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="bg-gray-50 p-2 rounded space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              {/* Role Badge - Show previous role → current role if changed */}
                              {user.previousRole && user.previousRole !== user.role && user.previousRole !== 'Pending' ? (
                                <div className="flex items-center gap-1">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                    user.previousRole === 'Admin' ? 'bg-red-50 text-red-600' :
                                    user.previousRole === 'Supervisor' ? 'bg-yellow-50 text-yellow-600' :
                                    user.previousRole === 'Student' ? 'bg-blue-50 text-blue-600' :
                                    'bg-orange-50 text-orange-600'
                                  }`}>
                                    {user.previousRole}
                                  </span>
                                  <span className="text-gray-500 text-xs">→</span>
                                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                    ((user.role === 'Pending' || user.rejectionReason) && user.requestedRole ? user.requestedRole : user.role) === 'Admin' ? 'bg-red-100 text-red-800' :
                                    ((user.role === 'Pending' || user.rejectionReason) && user.requestedRole ? user.requestedRole : user.role) === 'Supervisor' ? 'bg-yellow-100 text-yellow-800' :
                                    ((user.role === 'Pending' || user.rejectionReason) && user.requestedRole ? user.requestedRole : user.role) === 'Student' ? 'bg-blue-100 text-blue-800' :
                                    'bg-orange-100 text-orange-800'
                                  }`}>
                                    {(user.role === 'Pending' || user.rejectionReason) && user.requestedRole ? user.requestedRole : user.role}
                                  </span>
                                </div>
                              ) : (
                                <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                  ((user.role === 'Pending' || user.rejectionReason) && user.requestedRole ? user.requestedRole : user.role) === 'Admin' ? 'bg-red-100 text-red-800' :
                                  ((user.role === 'Pending' || user.rejectionReason) && user.requestedRole ? user.requestedRole : user.role) === 'Supervisor' ? 'bg-yellow-100 text-yellow-800' :
                                  ((user.role === 'Pending' || user.rejectionReason) && user.requestedRole ? user.requestedRole : user.role) === 'Student' ? 'bg-blue-100 text-blue-800' :
                                  'bg-orange-100 text-orange-800'
                                }`}>
                                  {(user.role === 'Pending' || user.rejectionReason) && user.requestedRole ? user.requestedRole : user.role}
                                </span>
                              )}
                              
                              {/* Active/Inactive Badge - Always in middle */}
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                user.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                              }`}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </span>
                              
                              {/* Status Badges - Always last */}
                              {/* Show Pending status when user has requested role but was not rejected */}
                              {user.requestedRole && user.requestedRole !== user.role && !user.rejectionReason && (
                                <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800">
                                  Pending
                                </span>
                              )}
                              
                              {/* Show Rejected status */}
                              {user.rejectionReason && (
                                <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">
                                  Rejected
                                </span>
                              )}
                              
                              {/* Show Approved status for users who got their requested role */}
                              {user.requestedRole && user.role === user.requestedRole && !user.rejectionReason && (
                                <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-800">
                                  Approved
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <div className="space-y-1">
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Joined:</span>
                            </div>
                            <div className="text-xs text-gray-900">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(user.createdAt).toLocaleTimeString()}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <div className="flex flex-col space-y-2">
                            <button 
                              onClick={() => setEditingUser(user)}
                              className="text-white font-medium text-xs bg-gradient-to-r from-green-500 to-green-600 px-2 py-1 rounded"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => setDeleteConfirm(user.id)}
                              className="text-white font-medium text-xs bg-gradient-to-r from-red-500 to-red-600 px-2 py-1 rounded"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-center space-x-4">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="flex items-center">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </>
          )}
          </div>

        </div>
        )}

        {/* Content Management Section (Videos & Quizzes) */}
        {activeTab === 'videos' && (
        <div className="space-y-8">
          {/* Videos Section */}
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-tr from-cyan-900 via-sky-800 to-gray-400 p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white flex items-center">
                  Video Management
                </h2>
                <button
                  onClick={clearVideoManagementData}
                  className="bg-transparent hover:bg-white hover:bg-opacity-20 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 border border-white border-opacity-30 hover:border-opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                  <span>Clear Data</span>
                </button>
              </div>
            </div>
            <div className="p-6">
            {loadingVideos ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2">Loading videos...</p>
              </div>
            ) : allVideos.length === 0 ? (
              <div className="text-center py-10">
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Videos</h3>
                <p className="text-gray-600">No videos have been uploaded yet!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allVideos.map((video) => (
                  <div key={video._id} className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {/* Video Header */}
                    <div className={`p-4 text-white ${
                      video?.deletionStatus === 'pending' ? 'bg-gradient-to-r from-orange-600 to-red-600' :
                      video?.status === 'approved' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                      video?.status === 'pending' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                      'bg-gradient-to-r from-red-500 to-pink-500'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium bg-white bg-opacity-20 px-2 py-1 rounded">
                            Video
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          video?.deletionStatus === 'pending' ? 'bg-orange-700' :
                          video?.status === 'approved' ? 'bg-green-600' :
                          video?.status === 'pending' ? 'bg-yellow-600' :
                          'bg-red-600'
                        }`}>
                          {video?.deletionStatus === 'pending' ? 'DELETION PENDING' : video?.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </div>
                    </div>

                    {/* Video Content */}
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{video?.title || 'Untitled Video'}</h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-3">{video?.description || 'No description'}</p>
                      
                      <div className="space-y-2 text-xs text-gray-500">
                        <div className="flex justify-between">
                          <span>Sequence:</span>
                          <span className="font-medium">{video.sequenceNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Course:</span>
                          <span className="font-medium">{video.courseId?.title || 'Unknown Course'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Uploaded by:</span>
                          <span className="font-medium">{video.uploadedBy?.firstName || ''} {video.uploadedBy?.lastName || 'Unknown User'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Duration:</span>
                          <span className="font-medium">
                            {video?.duration ?
                              `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` :
                              '0:00'
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Uploaded:</span>
                          <span className="font-medium">
                            {video?.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Video Actions */}
                    <div className="border-t border-gray-200 p-3 bg-gray-50">
                      {video?.status === 'rejected' && video?.rejectionReason && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2">
                          <strong>Reason:</strong> {video.rejectionReason}
                        </div>
                      )}

                      <div className="flex justify-center space-x-2">
                        {/* Watch/View button */}
                        <button
                          onClick={() => setSelectedVideo(video)}
                          className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center text-xs"
                          title="Watch Video"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => video?._id && handleDeleteVideo(video._id)}
                          className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center text-xs"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>

                        {/* Show deletion approval buttons if deletionStatus is pending */}
                        {video?.deletionStatus === 'pending' ? (
                          <>
                            <button
                              onClick={() => video?._id && handleApproveVideoDeletion(video._id, video.title)}
                              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center text-xs"
                              title="Approve Deletion"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => video?._id && handleRejectVideoDeletion(video._id, video.title)}
                              className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center text-xs"
                              title="Reject Deletion"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Approve button - only show for pending videos */}
                            {video?.status === 'pending' && (
                              <button
                                onClick={() => video?._id && handleApproveVideo(video._id)}
                                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center text-xs"
                                title="Approve"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                            )}

                            {/* Reject button - only show for pending videos */}
                            {video?.status === 'pending' && (
                              <button
                                onClick={() => video?._id && handleRejectVideo(video._id)}
                                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center text-xs"
                                title="Reject"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>

          {/* Quizzes Section */}
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-tr from-cyan-900 via-sky-800 to-gray-400 p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white flex items-center">
                  Quiz/Exam Approval
                </h2>
                <button
                  onClick={clearQuizManagementData}
                  className="bg-transparent hover:bg-white hover:bg-opacity-20 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 border border-white border-opacity-30 hover:border-opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                  <span>Clear Data</span>
                </button>
              </div>
            </div>
            <div className="p-6">
              {loadingQuizzes ? (
                <div className="text-center py-10">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  <p className="mt-2">Loading quizzes...</p>
                </div>
              ) : [...allQuizzes, ...quizzesPendingDeletion].length === 0 ? (
                <div className="text-center py-10">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No Quizzes for Review</h3>
                  <p className="text-gray-600">No pending, rejected, or approved quizzes to display!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...allQuizzes, ...quizzesPendingDeletion].map((quiz) => (
                    <div key={quiz._id} className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      {/* Quiz Header */}
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-4 text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium bg-white bg-opacity-20 px-2 py-1 rounded">
                              {quiz.type.charAt(0).toUpperCase() + quiz.type.slice(1)}
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded font-medium ${
                            quiz.deletionStatus === 'pending' ? 'bg-orange-600' :
                            quiz.status === 'rejected' ? 'bg-red-600' : 
                            quiz.status === 'approved' ? 'bg-green-600' : 'bg-yellow-600'
                          }`}>
                            {quiz.deletionStatus === 'pending' ? 'DELETION PENDING' :
                             quiz.status === 'rejected' ? 'REJECTED' : 
                             quiz.status === 'approved' ? 'APPROVED' : 'PENDING'}
                          </span>
                        </div>
                      </div>

                      {/* Quiz Content */}
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{quiz.title}</h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-3">{quiz.description || 'No description'}</p>
                        
                        <div className="space-y-2 text-xs text-gray-500">
                          <div className="flex justify-between">
                            <span>Sequence:</span>
                            <span className="font-medium">{quiz.sequenceNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Course:</span>
                            <span className="font-medium">{quiz.courseId?.title} ({quiz.courseId?.level})</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Created by:</span>
                            <span className="font-medium">{quiz.supervisorId?.firstName} {quiz.supervisorId?.lastName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Questions:</span>
                            <span className="font-medium">{quiz.questions?.length || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Points:</span>
                            <span className="font-medium">{quiz.totalPoints}</span>
                          </div>
                          {quiz.timeLimit && (
                            <div className="flex justify-between">
                              <span>Time Limit:</span>
                              <span className="font-medium">{quiz.timeLimit} min</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Created:</span>
                            <span className="font-medium">{new Date(quiz.createdAt).toLocaleDateString()}</span>
                          </div>
                          {quiz.status === 'rejected' && quiz.rejectionReason && (
                            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
                              <span className="font-medium text-red-800">Rejection Reason:</span>
                              <p className="text-red-700 mt-1">{quiz.rejectionReason}</p>
                            </div>
                          )}
                          {quiz.deletionStatus === 'pending' && (
                            <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                              <span className="font-medium text-orange-800">Deletion Request:</span>
                              <div className="text-orange-700 mt-1 space-y-1">
                                <div>Requested on: {quiz.deletionRequestedAt ? new Date(quiz.deletionRequestedAt).toLocaleDateString() : 'N/A'}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quiz Actions */}
                      <div className="border-t border-gray-200 p-3 bg-gray-50">
                        <div className="flex justify-center space-x-2">
                          {/* View button */}
                          <button
                            onClick={() => setSelectedQuiz(quiz)}
                            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center text-xs"
                            title="View Quiz"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteQuiz(quiz._id)}
                            className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center text-xs"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>

                          {/* Show deletion approval buttons if deletionStatus is pending */}
                          {quiz.deletionStatus === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleApproveQuizDeletion(quiz._id, quiz.title)}
                                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center text-xs"
                                title="Approve Deletion"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleRejectQuizDeletion(quiz._id, quiz.title)}
                                className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center text-xs"
                                title="Reject Deletion"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Approve button - only show for pending quizzes */}
                              {quiz.status === 'pending' && (
                                <button
                                  onClick={() => handleApproveQuiz(quiz._id)}
                                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center text-xs"
                                  title="Approve"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                              )}

                              {/* Reject button - only show for pending quizzes */}
                              {quiz.status === 'pending' && (
                                <button
                                  onClick={() => handleRejectQuiz(quiz._id)}
                                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center text-xs"
                                  title="Reject"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Resources Section */}
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-tr from-cyan-900 via-sky-800 to-gray-400 p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white flex items-center">
                  Document/Resource Approval
                </h2>
                <button
                  onClick={clearResourceManagementData}
                  className="bg-transparent hover:bg-white hover:bg-opacity-20 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 border border-white border-opacity-30 hover:border-opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                  <span>Clear Data</span>
                </button>
              </div>
            </div>
            <div className="p-6">
              {loadingResources ? (
                <div className="text-center py-10">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  <p className="mt-2">Loading resources...</p>
                </div>
              ) : [...allResources, ...resourcesPendingDeletion].length === 0 ? (
                <div className="text-center py-10">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No Resources for Review</h3>
                  <p className="text-gray-600">No pending, rejected, or approved resources to display!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...allResources, ...resourcesPendingDeletion].map((resource) => (
                    <div key={resource._id} className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      {/* Resource Header */}
                      <div className="bg-gradient-to-r from-purple-400 to-pink-500 p-4 text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">
                              {resource.type === 'document' ? '📄' : 
                               resource.type === 'audio' ? '🎵' :
                               resource.type === 'image' ? 'Image' : 'File'}
                            </span>
                            <span className="text-sm font-medium bg-white bg-opacity-20 px-2 py-1 rounded">
                              {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded font-medium ${
                            resource.deletionStatus === 'pending' ? 'bg-orange-600' :
                            resource.status === 'pending' ? 'bg-yellow-600' :
                            resource.status === 'approved' ? 'bg-green-600' :
                            'bg-red-600'
                          }`}>
                            {resource.deletionStatus === 'pending' ? 'DELETION PENDING' :
                             resource.status === 'pending' ? 'PENDING' :
                             resource.status === 'approved' ? 'APPROVED' :
                             'REJECTED'}
                          </span>
                        </div>
                      </div>

                      {/* Resource Content */}
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{resource.title}</h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-3">{resource.description || 'No description'}</p>
                        
                        <div className="space-y-2 text-xs text-gray-500">
                          <div className="flex justify-between">
                            <span>Sequence:</span>
                            <span className="font-medium">{resource.sequenceNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Course:</span>
                            <span className="font-medium">{resource.courseId?.title} ({resource.courseId?.level})</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Uploaded by:</span>
                            <span className="font-medium">{resource.supervisorId?.firstName} {resource.supervisorId?.lastName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>File:</span>
                            <span className="font-medium">{resource.fileName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Size:</span>
                            <span className="font-medium">{resource.fileSize ? `${Math.round(resource.fileSize / 1024)} KB` : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Category:</span>
                            <span className="font-medium capitalize">{resource.category}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Uploaded:</span>
                            <span className="font-medium">{new Date(resource.uploadedAt).toLocaleDateString()}</span>
                          </div>
                          {resource.status === 'rejected' && resource.rejectionReason && (
                            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
                              <span className="font-medium text-red-800">Rejection Reason:</span>
                              <p className="text-red-700 mt-1">{resource.rejectionReason}</p>
                            </div>
                          )}
                          {resource.deletionStatus === 'pending' && (
                            <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                              <span className="font-medium text-orange-800">Deletion Request:</span>
                              <div className="text-orange-700 mt-1 space-y-1">
                                <div>Requested on: {resource.deletionRequestedAt ? new Date(resource.deletionRequestedAt).toLocaleDateString() : 'N/A'}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Resource Actions */}
                      <div className="border-t border-gray-200 p-3 bg-gray-50">
                        <div className="flex justify-center space-x-2">
                          {/* View button */}
                          <button
                            onClick={() => handleViewResource(resource)}
                            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center text-xs"
                            title="View"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Delete button - only show if not pending deletion */}
                          {resource.deletionStatus !== 'pending' && (
                            <button
                              onClick={() => handleDeleteResource(resource._id)}
                              className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center text-xs"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}

                          {/* Approve/Reject buttons for pending content approval */}
                          {resource.status === 'pending' && (!resource.deletionStatus || resource.deletionStatus === 'none') && (
                            <>
                              <button
                                onClick={() => handleApproveResource(resource._id)}
                                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center text-xs"
                                title="Approve"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleRejectResource(resource._id)}
                                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center text-xs"
                                title="Reject"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          )}

                          {/* Approve/Reject buttons for deletion approval */}
                          {resource.deletionStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveResourceDeletion(resource._id, resource.title)}
                                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center text-xs"
                                title="Approve Deletion"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleRejectResourceDeletion(resource._id, resource.title)}
                                className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center text-xs"
                                title="Reject Deletion"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Role Approvals Section */}
        {activeTab === 'approvals' && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-tr from-cyan-900 via-sky-800 to-gray-400 p-6">
            <h2 className="text-3xl font-bold text-white flex items-center">
              Role Approval Requests
            </h2>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2">Loading approval requests...</p>
              </div>
            ) : users.filter(u => u.requestedRole && u.requestedRole !== u.role && !u.rejectionReason).length === 0 ? (
              <div className="text-center py-10">
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Pending Requests</h3>
                <p className="text-gray-600">All role requests have been processed!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.filter(u => u.requestedRole && u.requestedRole !== u.role && !u.rejectionReason).map((user) => (
                  <div key={user.id} className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {/* Request Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-sky-400 p-4 text-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">👤</span>
                          <span className="text-sm font-medium bg-white bg-opacity-20 px-2 py-1 rounded">
                            {user.requestedRole} Request
                          </span>
                        </div>
                        <span className="text-xs bg-yellow-600 px-2 py-1 rounded">
                          PENDING
                        </span>
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-2">{user.firstName} {user.lastName}</h3>
                      <p className="text-sm text-gray-600 mb-3">{user.email}</p>
                      
                      <div className="space-y-2 text-xs text-gray-500">
                        <div className="flex justify-between">
                          <span>Current Role:</span>
                          <span className="font-medium text-blue-600">{user.role}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Requested Role:</span>
                          <span className="font-medium text-purple-600">{user.requestedRole}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Phone:</span>
                          <span className="font-medium">{user.phone || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Registered:</span>
                          <span className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Email Verified:</span>
                          <span className={`font-medium ${user.isEmailVerified ? 'text-green-600' : 'text-red-600'}`}>
                            {user.isEmailVerified ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Approval Actions */}
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveRole(user.id, user.requestedRole!)}
                          className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-3 rounded-lg text-sm font-medium"
                          disabled={!user.isEmailVerified}
                        >
                          <span className="flex items-center justify-center">
                            Approve
                          </span>
                        </button>
                        <button
                          onClick={() => handleRejectRole(user.id)}
                          className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-2 px-3 rounded-lg text-sm font-medium"
                        >
                          <span className="flex items-center justify-center">
                            Reject
                          </span>
                        </button>
                      </div>
                      {!user.isEmailVerified && (
                        <p className="text-xs text-red-600 mt-2 text-center">Email must be verified before approval</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <EditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleUpdateUser}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
            <p className="mb-6">Are you sure you want to delete this user? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(deleteConfirm)}
                className="px-4 py-2 text-white bg-red-600 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      <VideoPreviewModal
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
        onApprove={handleApproveVideo}
        onReject={handleRejectVideo}
      />

      {/* Quiz Preview Modal */}
      <QuizPreviewModal
        quiz={selectedQuiz}
        onClose={() => setSelectedQuiz(null)}
        onApprove={handleApproveQuiz}
        onReject={handleRejectQuiz}
        onApproveDeletion={handleApproveQuizDeletion}
        onRejectDeletion={handleRejectQuizDeletion}
      />

      {/* Modals */}
      {showConfirmModal && confirmConfig && (
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false);
            setConfirmConfig(null);
          }}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          message={confirmConfig.message}
          type={confirmConfig.type}
          confirmText="Confirm"
          cancelText="Cancel"
        />
      )}
      {showPromptModal && promptConfig && (
        <PromptModal
          isOpen={showPromptModal}
          onClose={() => {
            setShowPromptModal(false);
            setPromptConfig(null);
          }}
          onSubmit={promptConfig.onSubmit}
          title={promptConfig.title}
          message={promptConfig.message}
          defaultValue={promptConfig.defaultValue}
          placeholder={promptConfig.placeholder}
        />
      )}
    </div>
  );
};

export default AdminDashboard;