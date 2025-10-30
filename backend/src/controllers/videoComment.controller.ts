import { Response } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import mongoose from 'mongoose';
import VideoComment from '../models/VideoComment.model';
import Video from '../models/Video.model';
import User from '../models/User.model';
import Course from '../models/Course.model';
import notificationService from '../services/notification.service';
import logger from '../utils/logger';

// Get comments for a video
export const getVideoComments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    
    // Check if video exists and user has access
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Only show comments for approved videos (unless admin/supervisor)
    if (video.status !== 'approved' && !['Admin', 'Supervisor'].includes(req.userRole!)) {
      return res.status(403).json({
        success: false,
        message: 'Video not available for comments'
      });
    }

    const comments = await VideoComment.find({ videoId })
      .populate('userId', 'firstName lastName profilePhoto role')
      .sort({ createdAt: 1 });
    // Organize comments with replies - fixed comparison
    const organizedComments = comments
      .filter(comment => !comment.parentCommentId)
      .map(comment => {
        const commentIdStr = comment._id.toString();
        const replies = comments
          .filter(reply => {
            if (!reply.parentCommentId) return false;
            const parentIdStr = reply.parentCommentId.toString();
            return parentIdStr === commentIdStr;
          })
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        return {
          _id: comment._id,
          comment: comment.comment,
          userId: comment.userId,
          userRole: comment.userRole,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          isResolved: comment.isResolved,
          replies: replies.map(reply => ({
            _id: reply._id,
            comment: reply.comment,
            userId: reply.userId,
            userRole: reply.userRole,
            createdAt: reply.createdAt,
            updatedAt: reply.updatedAt
          }))
        };
      });

    return res.status(200).json({
      success: true,
      count: organizedComments.length,
      data: organizedComments
    });
  } catch (error: any) {
    logger.error('Error in getVideoComments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch video comments',
      error: error.message
    });
  }
};

// Add comment to video
export const addVideoComment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const { comment, parentCommentId } = req.body;
    const userId = req.userId;
    const userRole = req.userRole;

    // Validate required fields
    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    if (!userId || !userRole) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Prevent pending users from posting comments
    if (userRole === 'Pending') {
      return res.status(403).json({
        success: false,
        message: 'Account pending approval. You cannot post comments until your account is approved by an administrator.'
      });
    }

    // Check if video exists
    const video = await Video.findById(videoId).populate('courseId');
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Only allow comments on approved videos
    if (video.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Comments are only allowed on approved videos'
      });
    }

    // Ensure courseId exists
    let courseId = video.courseId;
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Video course information not found'
      });
    }

    // Handle populated courseId (it will be an object if populated)
    if (typeof courseId === 'object' && courseId._id) {
      courseId = courseId._id;
    }

    // Verify parent comment exists if provided
    if (parentCommentId) {
      const parentComment = await VideoComment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(400).json({
          success: false,
          message: 'Parent comment not found'
        });
      }
      
      if (parentComment.videoId.toString() !== videoId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Parent comment belongs to different video'
        });
      }
    }

    const commentData: any = {
      videoId,
      courseId,
      userId,
      userRole: userRole,
      comment: comment.trim()
    };

    // Only add parentCommentId if it exists - ensure proper ObjectId
    if (parentCommentId) {
      commentData.parentCommentId = new mongoose.Types.ObjectId(parentCommentId);
    }

    const newComment = await VideoComment.create(commentData);

    // Send notification to supervisors when a student comments (not for replies) (PERSISTED)
    if (userRole === 'Student' && !parentCommentId) {
      try {
        const user = await User.findById(userId).select('firstName lastName');
        const video = await Video.findById(videoId).select('title');
        const course = await Course.findById(courseId).select('title supervisor').populate('supervisor', 'firstName lastName');

        if (user && video && course) {
          // Send notification to course-specific supervisor if assigned
          if (course.supervisor && course.supervisor._id) {
            await notificationService.createNotification(course.supervisor._id.toString(), {
              type: 'video_comment',
              title: 'New Comment on Video',
              message: `${user.firstName} ${user.lastName} posted a comment on "${video.title}"`,
              fromRole: 'Student',
              urgent: false,
              data: {
                fromUserId: userId,
                studentId: userId,
                studentName: `${user.firstName} ${user.lastName}`,
                videoId: videoId,
                videoTitle: video.title,
                courseId: courseId,
                courseTitle: course.title,
                commentId: newComment._id,
                comment: comment.trim(),
                actionUrl: `/videos/${videoId}#comment-${newComment._id}`
              }
            });
          } else {
            // Fallback: Send to all supervisors if no specific supervisor is assigned
            await notificationService.notifyRole('Supervisor', {
              type: 'video_comment',
              title: 'New Comment on Video',
              message: `${user.firstName} ${user.lastName} posted a comment on "${video.title}"`,
              fromRole: 'Student',
              urgent: false,
              data: {
                fromUserId: userId,
                studentId: userId,
                studentName: `${user.firstName} ${user.lastName}`,
                videoId: videoId,
                videoTitle: video.title,
                courseId: courseId,
                courseTitle: course.title,
                commentId: newComment._id,
                comment: comment.trim(),
                actionUrl: `/videos/${videoId}#comment-${newComment._id}`
              }
            });
          }
        }
      } catch (notificationError) {
        logger.error('Error sending notification to supervisors:', notificationError);
        // Don't fail the comment creation if notification fails
      }
    }

    // Send notification to student when a supervisor replies to their comment (PERSISTED)
    if (userRole === 'Supervisor' && parentCommentId) {
      try {
        // Get the parent comment to find the original student
        const parentComment = await VideoComment.findById(parentCommentId).populate('userId', 'firstName lastName');
        const supervisor = await User.findById(userId).select('firstName lastName');
        const video = await Video.findById(videoId).select('title');
        const course = await Course.findById(courseId).select('title');

        if (parentComment && parentComment.userId && supervisor && video && course) {
          const studentId = parentComment.userId._id.toString();

          // Only notify if the parent comment was made by a student
          if (parentComment.userRole === 'Student') {
            await notificationService.createNotification(studentId, {
              type: 'video_comment',
              title: 'Reply to Your Comment',
              message: `${supervisor.firstName} ${supervisor.lastName} replied to your comment on "${video.title}"`,
              fromRole: 'Supervisor',
              urgent: false,
              data: {
                fromUserId: userId,
                supervisorId: userId,
                supervisorName: `${supervisor.firstName} ${supervisor.lastName}`,
                videoId: videoId,
                videoTitle: video.title,
                courseId: courseId,
                courseTitle: course.title,
                commentId: newComment._id,
                parentCommentId: parentCommentId,
                reply: comment.trim(),
                actionUrl: `/videos/${videoId}#comment-${newComment._id}`
              }
            });
          }
        }
      } catch (notificationError) {
        logger.error('Error sending reply notification to student:', notificationError);
        // Don't fail the comment creation if notification fails
      }
    }

    // Send notification when a supervisor comments (not replies) on a video (PERSISTED)
    // This helps admins and supervisors coordinate about course content
    if (userRole === 'Supervisor' && !parentCommentId) {
      try {
        const supervisor = await User.findById(userId).select('firstName lastName');
        const video = await Video.findById(videoId).select('title');
        const course = await Course.findById(courseId).select('title supervisor').populate('supervisor', 'firstName lastName');

        if (supervisor && video && course) {
          // Notify admins about supervisor comments for oversight
          await notificationService.notifyRole('Admin', {
            type: 'video_comment',
            title: 'Supervisor Comment on Video',
            message: `${supervisor.firstName} ${supervisor.lastName} posted a comment on "${video.title}"`,
            fromRole: 'Supervisor',
            urgent: false,
            data: {
              fromUserId: userId,
              supervisorId: userId,
              supervisorName: `${supervisor.firstName} ${supervisor.lastName}`,
              videoId: videoId,
              videoTitle: video.title,
              courseId: courseId,
              courseTitle: course.title,
              commentId: newComment._id,
              comment: comment.trim(),
              actionUrl: `/videos/${videoId}#comment-${newComment._id}`
            }
          });

          // Also notify other supervisors if there's a specific course supervisor and it's not the same person
          if (course.supervisor && course.supervisor._id && course.supervisor._id.toString() !== userId) {
            await notificationService.createNotification(course.supervisor._id.toString(), {
              type: 'video_comment',
              title: 'Supervisor Comment on Video',
              message: `${supervisor.firstName} ${supervisor.lastName} posted a comment on "${video.title}"`,
              fromRole: 'Supervisor',
              urgent: false,
              data: {
                fromUserId: userId,
                supervisorId: userId,
                supervisorName: `${supervisor.firstName} ${supervisor.lastName}`,
                videoId: videoId,
                videoTitle: video.title,
                courseId: courseId,
                courseTitle: course.title,
                commentId: newComment._id,
                comment: comment.trim(),
                actionUrl: `/videos/${videoId}#comment-${newComment._id}`
              }
            });
          }
        }
      } catch (notificationError) {
        logger.error('Error sending supervisor comment notification:', notificationError);
        // Don't fail the comment creation if notification fails
      }
    }

    const populatedComment = await VideoComment.findById(newComment._id)
      .populate('userId', 'firstName lastName profilePhoto role');

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: populatedComment
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message
    });
  }
};

// Update comment (only by the author)
export const updateVideoComment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const { comment } = req.body;
    const userId = req.userId;

    const existingComment = await VideoComment.findById(commentId);
    if (!existingComment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Only allow author to update their own comment
    if (existingComment.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own comments'
      });
    }

    existingComment.comment = comment;
    await existingComment.save();

    const updatedComment = await VideoComment.findById(commentId)
      .populate('userId', 'firstName lastName profilePhoto role');

    return res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      data: updatedComment
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update comment',
      error: error.message
    });
  }
};

// Delete comment (author, supervisor, or admin)
export const deleteVideoComment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId;
    const userRole = req.userRole;

    const comment = await VideoComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Allow deletion by author, supervisor, or admin
    const canDelete = 
      comment.userId.toString() === userId || 
      ['Admin', 'Supervisor'].includes(userRole!);

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    // Also delete any replies to this comment
    await VideoComment.deleteMany({ parentCommentId: commentId });
    await VideoComment.findByIdAndDelete(commentId);

    return res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
      error: error.message
    });
  }
};

// Mark comment as resolved (supervisor/admin only)
export const markCommentResolved = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const { isResolved } = req.body;
    const userRole = req.userRole;

    if (!['Admin', 'Supervisor'].includes(userRole!)) {
      return res.status(403).json({
        success: false,
        message: 'Only supervisors and admins can mark comments as resolved'
      });
    }

    const comment = await VideoComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    comment.isResolved = isResolved;
    await comment.save();

    const updatedComment = await VideoComment.findById(commentId)
      .populate('userId', 'firstName lastName profilePhoto role');

    return res.status(200).json({
      success: true,
      message: `Comment marked as ${isResolved ? 'resolved' : 'unresolved'}`,
      data: updatedComment
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update comment status',
      error: error.message
    });
  }
};

// Get comments by user (for supervisor dashboard)
export const getUserComments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserRole = req.userRole;

    // Only supervisors and admins can view user comments
    if (!['Admin', 'Supervisor'].includes(requestingUserRole!)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    const comments = await VideoComment.find({ userId })
      .populate('videoId', 'title courseId')
      .populate('courseId', 'title')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      count: comments.length,
      data: comments
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user comments',
      error: error.message
    });
  }
};