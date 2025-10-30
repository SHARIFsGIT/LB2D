'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { updateUser } from '@/store/slices/authSlice';
import { useNotification } from '@/hooks/useNotification';
import ConfirmModal from '@/components/common/ConfirmModal';
import { appConfig } from '@/config/app.config';

interface VideoComment {
  _id: string;
  comment: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
    role: string;
  };
  userRole: string;
  createdAt: string;
  updatedAt: string;
  isResolved: boolean;
  replies?: VideoComment[];
}

interface VideoCommentsProps {
  videoId: string;
  courseId: string;
}

const VideoComments: React.FC<VideoCommentsProps> = ({ videoId, courseId }) => {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const { showSuccess, showError, showWarning, showInfo } = useNotification();

  // Check if user can post comments (must have approved role)
  const canPostComments = user && ['Student', 'Supervisor', 'Admin'].includes(user.role);
  const isPending = user?.role === 'Pending';
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;

  useEffect(() => {
    fetchComments();
    testApiConnection();

    // Only auto-check role if user appears to be pending (less intrusive)
    if (user?.role === 'Pending') {
    }

    // Debug user role information
  }, [videoId]);

  const testApiConnection = async () => {
    try {
      const response = await fetch(`${appConfig.api.baseUrl}/../health`);
      if (response.ok) {
        const data = await response.json();
      } else {
        console.error('API server health check failed');
      }
    } catch (error) {
      console.error('Cannot connect to API server:', error);
      console.error('Make sure backend is running on port 5005');
    }
  };

  const checkCurrentUserRole = async () => {
    try {
      const response = await fetch(`${appConfig.api.baseUrl}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // The backend returns user data under data.user, not data.data
        const serverUser = data.data?.user;

        if (!serverUser) {
          console.error('No user data received from server');
          showError('Failed to get your profile data from server. Please try logging out and back in.');
          return;
        }

        // Only update if both roles are valid and different
        if (serverUser.role && user?.role && serverUser.role !== user.role) {
          // Validate that the server role is a valid role
          const validRoles = ['Student', 'Supervisor', 'Admin', 'Pending'];
          if (!validRoles.includes(serverUser.role)) {
            console.error('Invalid role received from server:', serverUser.role);
            showError(`Invalid role received from server: "${serverUser.role}". Please contact support.`);
            return;
          }

          // Convert MongoDB user to frontend User format
          const updatedUserData = {
            id: serverUser._id || serverUser.id,
            email: serverUser.email,
            role: serverUser.role,
            firstName: serverUser.firstName,
            lastName: serverUser.lastName,
            phone: serverUser.phone,
            profilePhoto: serverUser.profilePhoto,
            isEmailVerified: serverUser.isEmailVerified,
            isActive: serverUser.isActive,
            createdAt: serverUser.createdAt
          };
          // Update the Redux store with the current server data
          dispatch(updateUser(updatedUserData));

          showSuccess(
            `Your role has been updated from "${user.role}" to "${serverUser.role}". You can now post comments!`
          );

          // Refresh the page to update UI
          setTimeout(() => window.location.reload(), 2000);
        } else if (!serverUser.role) {
          console.error('Server returned empty role');
          showError('Server returned invalid user data. Please try logging out and back in.');
        } else {
          showInfo('Your role is up to date!');
        }
      } else {
        console.error('Failed to fetch profile from server');
        showError('Failed to check your current role. Please try logging out and back in.');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      showError('Network error checking role. Please check your connection.');
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`${appConfig.api.baseUrl}/video-comments/video/${videoId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Debug: Check if any comment has replies
        const hasAnyReplies = data.data.some((c: any) => c.replies && c.replies.length > 0);
        if (hasAnyReplies) {
        } else {
        }
        setComments(data.data || []);
      } else {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Failed to fetch comments:', {
          status: response.status,
          statusText: response.statusText,
          error
        });
      }
    } catch (error) {
      console.error('Network error fetching comments:', error);
      console.error('Error details:', {
        name: (error as Error).name,
        message: (error as Error).message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    // Check if user can post comments
    if (!canPostComments) {
      showWarning('You need to have an approved account to post comments. Please wait for account approval.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${appConfig.api.baseUrl}/video-comments/video/${videoId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment: newComment.trim(),
          courseId: courseId // Add course ID for supervisor notification
        })
      });
      if (response.ok) {
        setNewComment('');
        fetchComments(); // Refresh comments

        // If user is a student, notify supervisors
        if (user?.role === 'Student') {
        }
      } else {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Comment post failed:', error);
        console.error('Response details:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          error
        });
        showError(`Failed to post comment: ${error.message || response.statusText || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Network error posting comment:', error);
      console.error('Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      showError(`Failed to post comment: ${(error as Error).message || 'Network error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!replyText.trim()) return;

    // Check if user can post comments
    if (!canPostComments) {
      showWarning('You need to have an approved account to post replies. Please wait for account approval.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`${appConfig.api.baseUrl}/video-comments/video/${videoId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment: replyText.trim(),
          parentCommentId,
          courseId: courseId // Add course ID for consistency
        })
      });
      if (response.ok) {
        const result = await response.json();
        setReplyText('');
        setReplyTo(null);
        fetchComments(); // Refresh comments
      } else {
        const error = await response.json();
        showError(error.message || 'Failed to post reply');
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      showError('Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = (commentId: string, currentText: string) => {
    setEditingComment(commentId);
    setEditText(currentText);
  };

  const handleEditReply = (replyId: string, currentText: string) => {
    setEditingReply(replyId);
    setEditReplyText(currentText);
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editText.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${appConfig.api.baseUrl}/video-comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment: editText.trim()
        })
      });

      if (response.ok) {
        setEditingComment(null);
        setEditText('');
        fetchComments(); // Refresh comments
      } else {
        const error = await response.json();
        showError(error.message || 'Failed to update comment');
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      showError('Failed to update comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateReply = async (replyId: string) => {
    if (!editReplyText.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${appConfig.api.baseUrl}/video-comments/${replyId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment: editReplyText.trim()
        })
      });

      if (response.ok) {
        setEditingReply(null);
        setEditReplyText('');
        fetchComments(); // Refresh comments
      } else {
        const error = await response.json();
        showError(error.message || 'Failed to update reply');
      }
    } catch (error) {
      console.error('Error updating reply:', error);
      showError('Failed to update reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    setCommentToDelete(commentId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;

    try {
      const response = await fetch(`${appConfig.api.baseUrl}/video-comments/${commentToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        showSuccess('Comment deleted successfully');
        fetchComments(); // Refresh comments
        setShowDeleteConfirm(false);
        setCommentToDelete(null);
      } else {
        const error = await response.json();
        showError(error.message || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      showError('Failed to delete comment');
    }
  };

  const handleMarkResolved = async (commentId: string, isResolved: boolean) => {
    try {
      const response = await fetch(`${appConfig.api.baseUrl}/video-comments/${commentId}/resolve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isResolved })
      });

      if (response.ok) {
        fetchComments(); // Refresh comments
      } else {
        const error = await response.json();
        showError(error.message || 'Failed to update comment status');
      }
    } catch (error) {
      console.error('Error updating comment status:', error);
      showError('Failed to update comment status');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-red-100 text-red-800';
      case 'Supervisor': return 'bg-purple-100 text-purple-800';
      case 'Student': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin': return 'A';
      case 'Supervisor': return '';
      case 'Student': return '';
      default: return 'U';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span>Discussion & Questions</span>
        <span className="ml-4 text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </span>
      </h3>

      {/* Account Status Warning for Pending Users */}
      {isPending && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-yellow-500 mr-3">⏳</div>
              <div>
                <h4 className="text-yellow-800 font-semibold">Account Pending Approval</h4>
                <p className="text-yellow-700 text-sm mt-1">
                  Your account is pending approval. You can view discussions but cannot post comments until your account is approved by an administrator.
                </p>
                <p className="text-yellow-600 text-xs mt-2">
                  If your account was recently approved, you may need to log out and log back in to refresh your permissions.
                </p>
              </div>
            </div>
            <button
              onClick={checkCurrentUserRole}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs font-medium"
            >
              Check Role
            </button>
          </div>
        </div>
      )}

      {/* New Comment Form */}
      {canPostComments ? (
        <form onSubmit={handleSubmitComment} className="mb-8">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
              {user?.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Ask a question or share your thoughts about this video..."
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                disabled={submitting}
              />
              <div className="mt-3 flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  {user?.role === 'Student' ? 'Ask questions to get help from your supervisor' : 'Share your expertise with students'}
                </p>
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-center">
            <div className="text-4xl mb-3">💬</div>
            <h4 className="text-gray-800 font-semibold mb-2">Comments Restricted</h4>
            <p className="text-gray-600 text-sm">
              {isPending
                ? 'Please wait for account approval to participate in discussions.'
                : 'You need appropriate permissions to post comments.'
              }
            </p>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {comments.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">No comments yet</h4>
            <p className="text-gray-600">Be the first to ask a question or share your thoughts!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className={`border-l-4 pl-6 py-4 ${
              comment.isResolved ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'
            } rounded-r-2xl`}>
              {/* Comment Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                    {comment.userId.profilePhoto ? (
                      <img src={comment.userId.profilePhoto} alt={`${comment.userId.firstName} ${comment.userId.lastName}`} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {comment.userId.firstName.charAt(0)}{comment.userId.lastName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-900">
                        {comment.userId.firstName} {comment.userId.lastName}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(comment.userRole)}`}>
                        {getRoleIcon(comment.userRole)}{getRoleIcon(comment.userRole) && ' '}{comment.userRole}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(comment.createdAt).toLocaleString()}
                      {comment.updatedAt !== comment.createdAt && ' (edited)'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {comment.isResolved && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      Resolved
                    </span>
                  )}

                  {/* Edit button for comment author */}
                  {comment.userId._id === user?.id && (
                    <button
                      onClick={() => handleEditComment(comment._id, comment.comment)}
                      className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Edit comment"
                    >
                      ✏️
                    </button>
                  )}

                  {/* Actions for supervisors/admins */}
                  {(['Admin', 'Supervisor'].includes(user?.role || '')) && (
                    <button
                      onClick={() => handleMarkResolved(comment._id, !comment.isResolved)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        comment.isResolved
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {comment.isResolved ? 'Mark Unresolved' : 'Mark Resolved'}
                    </button>
                  )}

                  {/* Delete button for comment author or supervisors/admins */}
                  {(comment.userId._id === user?.id || ['Admin', 'Supervisor'].includes(user?.role || '')) && (
                    <button
                      onClick={() => handleDeleteComment(comment._id)}
                      className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete comment"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Comment Content */}
              <div className="mb-4">
                {editingComment === comment._id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Edit your comment..."
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleUpdateComment(comment._id)}
                        disabled={!editText.trim() || submitting}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Updating...' : 'Update'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingComment(null);
                          setEditText('');
                        }}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-800 whitespace-pre-wrap">{comment.comment}</p>
                )}
              </div>

              {/* Reply Button */}
              {editingComment !== comment._id && canPostComments && (
                <button
                  onClick={() => setReplyTo(replyTo === comment._id ? null : comment._id)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Reply
                </button>
              )}

              {/* Reply Disabled Message */}
              {editingComment !== comment._id && !canPostComments && (
                <p className="text-gray-400 text-sm italic">
                  {isPending ? 'Account approval required to reply' : 'Cannot reply'}
                </p>
              )}

              {/* Reply Form */}
              {replyTo === comment._id && (
                <div className="mt-4 pl-4 border-l-2 border-blue-300">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                      {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your reply..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                        rows={2}
                        disabled={submitting}
                      />
                      <div className="mt-2 flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setReplyTo(null);
                            setReplyText('');
                          }}
                          className="px-3 py-1 text-gray-600 hover:text-gray-800 text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSubmitReply(comment._id)}
                          disabled={!replyText.trim() || submitting}
                          className="bg-blue-600 text-white px-4 py-1 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? 'Posting...' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-4 space-y-4">
                  {comment.replies.map((reply) => (
                    <div key={reply._id} className="pl-4 border-l-2 border-blue-200 bg-white rounded-r-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500">
                            {reply.userId.profilePhoto ? (
                              <img src={reply.userId.profilePhoto} alt={`${reply.userId.firstName} ${reply.userId.lastName}`} className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <span className="text-white font-semibold text-xs">
                                {reply.userId.firstName.charAt(0)}{reply.userId.lastName.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900 text-sm">
                                {reply.userId.firstName} {reply.userId.lastName}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(reply.userRole)}`}>
                                {getRoleIcon(reply.userRole)}{getRoleIcon(reply.userRole) && ' '}{reply.userRole}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {new Date(reply.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Edit button for reply author */}
                          {reply.userId._id === user?.id && (
                            <button
                              onClick={() => handleEditReply(reply._id, reply.comment)}
                              className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Edit reply"
                            >
                              ✏️
                            </button>
                          )}

                          {/* Delete button for reply author or supervisors/admins */}
                          {(reply.userId._id === user?.id || ['Admin', 'Supervisor'].includes(user?.role || '')) && (
                            <button
                              onClick={() => handleDeleteComment(reply._id)}
                              className="text-red-600 hover:text-red-800 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                              title="Delete reply"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Reply Content */}
                      {editingReply === reply._id ? (
                        <div className="space-y-3 mt-2">
                          <textarea
                            value={editReplyText}
                            onChange={(e) => setEditReplyText(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            rows={2}
                            placeholder="Edit your reply..."
                          />
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleUpdateReply(reply._id)}
                              disabled={!editReplyText.trim() || submitting}
                              className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {submitting ? 'Updating...' : 'Update'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingReply(null);
                                setEditReplyText('');
                              }}
                              className="bg-gray-300 text-gray-700 px-3 py-1 rounded-lg text-xs font-medium hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-800 text-sm whitespace-pre-wrap">{reply.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setCommentToDelete(null);
        }}
        onConfirm={confirmDeleteComment}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default VideoComments;
