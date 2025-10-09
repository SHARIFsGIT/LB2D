import { Response } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import Course from '../models/Course.model';
import Video from '../models/Video.model';
import VideoProgress from '../models/VideoProgress.model';
import User from '../models/User.model';
import Enrollment from '../models/Enrollment.model';
import Quiz from '../models/Quiz.model';
import QuizAttempt from '../models/QuizAttempt.model';
import CourseResource from '../models/CourseResource.model';
import ResourceProgress from '../models/ResourceProgress.model';
import emailService from '../services/email.service';
import notificationService from '../services/notification.service';
import { notifySupervisors, notifyStudents } from '../services/websocket.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Utility function to update course progress
const updateCourseProgress = async (userId: string, courseId: string) => {
  try {
    // Find the student's enrollment for this course
    const enrollment = await Enrollment.findOne({
      userId,
      courseId
    });

    if (!enrollment) {
      return;
    }

    // Get course details
    const course = await Course.findById(courseId);
    if (!course) {
      return;
    }

    // Count total approved and active quizzes in the course
    const totalQuizzes = await Quiz.countDocuments({
      courseId,
      status: 'approved',
      isActive: true
    });

    // Count total approved videos in the course
    const totalVideos = await Video.countDocuments({
      courseId,
      status: 'approved'
    });

    // Count total approved resources in the course
    const totalResources = await CourseResource.countDocuments({
      courseId,
      status: 'approved',
      isActive: true
    });

    // Count completed videos by this student for this course
    const completedVideos = await VideoProgress.countDocuments({
      userId,
      courseId,
      completed: true
    });

    // Count completed resources by this student for this course
    const completedResources = await ResourceProgress.countDocuments({
      userId,
      courseId,
      completed: true
    });

    // Count completed quizzes by this student for this course
    const completedQuizAttempts = await QuizAttempt.find({
      studentId: userId,
      status: { $in: ['submitted', 'graded'] }
    }).populate({
      path: 'quizId',
      match: { courseId },
      select: '_id'
    });

    const completedQuizzes = completedQuizAttempts.filter(attempt => attempt.quizId).length;

    // Calculate total lessons and completed lessons
    const totalLessons = totalVideos + totalQuizzes + totalResources;
    const completedLessons = completedVideos + completedQuizzes + completedResources;

    // Calculate progress percentage
    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Update enrollment with new progress
    await Enrollment.findByIdAndUpdate(enrollment._id, {
      $set: {
        'progress.lessonsCompleted': completedLessons,
        'progress.totalLessons': totalLessons,
        'progress.percentage': progressPercentage,
        status: progressPercentage >= 100 ? 'completed' : 'active'
      }
    });
    return {
      totalLessons,
      completedLessons,
      progressPercentage
    };

  } catch (error) {
    console.error('Error in updateCourseProgress:', error);
    throw error;
  }
};

// Function to convert Google Drive share URL to direct download URL
const convertGoogleDriveURL = (url: string): string => {
  // Check if it's a Google Drive URL
  if (url.includes('drive.google.com/file/d/')) {
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch) {
      const fileId = fileIdMatch[1];
      const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      return directUrl;
    }
  }
  
  // If not a Google Drive URL or conversion failed, return original
  return url;
};

// Configure multer for video uploads
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'videos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const videoFileFilter = (req: any, file: any, cb: any) => {
  // Allow video files
  const allowedTypes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo', // AVI
    'video/x-ms-wmv', // WMV
    'video/webm'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only MP4, MPEG, MOV, AVI, WMV, and WEBM video files are allowed.'), false);
  }
};

export const videoUpload = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

// Get videos for a course (only approved videos for students)
export const getCourseVideos = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const userRole = req.userRole;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get videos based on user role
    let filter: any = { courseId };
    
    if (userRole === 'Student') {
      filter.status = 'approved';
    }

    const videos = await Video.find(filter)
      .populate('uploadedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ sequenceNumber: 1 });

    return res.status(200).json({
      success: true,
      count: videos.length,
      data: videos
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch course videos',
      error: error.message
    });
  }
};

// Upload video (Admin/Supervisor) - handles both file uploads and URL uploads
export const uploadVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      courseId,
      title,
      description,
      videoUrl,
      thumbnailUrl,
      duration,
      sequenceNumber,
      videoSize,
      videoFormat
    } = req.body;

    const userId = req.userId;
    const userRole = req.userRole;
    // Check if user has permission to upload
    if (!userRole || !['Admin', 'Supervisor'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only Admin and Supervisor can upload videos'
      });
    }
    // Check if course exists
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    // Handle file upload vs URL upload
    let finalVideoUrl = videoUrl;
    let finalVideoSize = parseInt(videoSize) || 0;
    let finalVideoFormat = videoFormat || 'mp4';
    
    // Convert Google Drive URLs if provided
    if (videoUrl) {
      finalVideoUrl = convertGoogleDriveURL(videoUrl);
    }

    // Check if this is a file upload
    const uploadedFile = (req as any).file;
    if (uploadedFile) {
      // File was uploaded, use the uploaded file path
      finalVideoUrl = `/uploads/videos/${uploadedFile.filename}`;
      finalVideoSize = uploadedFile.size;
      finalVideoFormat = path.extname(uploadedFile.originalname).substring(1).toLowerCase();
    } else if (!videoUrl) {
      // No file and no URL provided
      return res.status(400).json({
        success: false,
        message: 'Either upload a video file or provide a video URL'
      });
    }

    // Check if sequence number already exists (excluding rejected videos by same user)
    const existingVideo = await Video.findOne({ 
      courseId, 
      sequenceNumber,
      $or: [
        { status: { $ne: 'rejected' } }, // Not rejected
        { uploadedBy: { $ne: userId } }  // Or not uploaded by current user
      ]
    });
    if (existingVideo) {
      return res.status(400).json({
        success: false,
        message: 'A video with this sequence number already exists'
      });
    }

    // Auto-approve for Admin, require approval for Supervisor
    const status = userRole === 'Admin' ? 'approved' : 'pending';
    const approvedBy = userRole === 'Admin' ? userId : undefined;
    const approvedAt = userRole === 'Admin' ? new Date() : undefined;

    const video = await Video.create({
      courseId,
      title,
      description,
      videoUrl: finalVideoUrl,
      thumbnailUrl,
      duration,
      sequenceNumber,
      uploadedBy: userId,
      uploadedByRole: userRole,
      status,
      approvedBy,
      approvedAt,
      videoSize: finalVideoSize,
      videoFormat: finalVideoFormat
    });

    // If supervisor uploaded, send email to admin for approval
    if (userRole === 'Supervisor') {
      try {
        const supervisor = await User.findById(userId);
        const admins = await User.find({ role: 'Admin' });
        
        for (const admin of admins) {
          await emailService.sendVideoApprovalRequest(
            admin.email,
            `${admin.firstName} ${admin.lastName}`,
            {
              supervisorName: `${supervisor?.firstName} ${supervisor?.lastName}`,
              videoTitle: title,
              courseName: course.title,
              videoId: video._id.toString()
            }
          );
        }
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }

      // Notify admins about pending video approval (PERSISTED)
      try {
        const supervisor = await User.findById(userId);
        if (supervisor) {
          await notificationService.notifyRole('Admin', {
            type: 'video',
            title: 'New Video Awaiting Approval',
            message: `${supervisor.firstName} ${supervisor.lastName} uploaded video "${title}" for ${course.title}`,
            fromRole: 'Supervisor',
            urgent: false,
            data: {
              fromUserId: userId,
              videoId: video._id.toString(),
              videoTitle: title,
              courseId: course._id.toString(),
              courseTitle: course.title,
              actionUrl: '/admin/content-management',
              supervisorName: `${supervisor.firstName} ${supervisor.lastName}`,
              sequenceNumber: sequenceNumber,
              duration: duration,
              status: 'pending',
              uploadedAt: new Date().toISOString(),
              userRole: 'Supervisor',
              actionType: 'upload'
            }
          });
        }
      } catch (notificationError) {
        console.error('Failed to notify admins about pending video:', notificationError);
      }
    }

    // If admin uploaded, notify supervisors and students immediately
    if (userRole === 'Admin') {
      try {
        const admin = await User.findById(userId);
        if (admin) {
          // Notify supervisors
          await notifySupervisors({
            type: 'video',
            title: 'Admin',
            message: `${admin.firstName} ${admin.lastName} uploaded ${title}`,
            fromRole: 'Admin',
            targetRole: 'Supervisor',
            data: {
              videoId: video._id.toString(),
              videoTitle: title,
              courseId: course._id.toString(),
              courseTitle: course.title,
              adminId: userId,
              adminName: `${admin.firstName} ${admin.lastName}`,
              sequenceNumber: sequenceNumber,
              duration: duration,
              status: 'approved',
              userRole: 'Admin',
              actionType: 'upload'
            }
          });

          // Notify students directly since it's auto-approved
          await notifyStudents({
            type: 'video',
            title: 'Admin',
            message: `${admin.firstName} ${admin.lastName} uploaded ${title}`,
            fromRole: 'Admin',
            targetRole: 'Student',
            data: {
              videoId: video._id.toString(),
              videoTitle: title,
              courseId: course._id.toString(),
              courseTitle: course.title,
              sequenceNumber: sequenceNumber,
              duration: duration,
              uploadedBy: `${admin.firstName} ${admin.lastName}`,
              uploadedByRole: 'Admin',
              userRole: 'Admin',
              actionType: 'upload'
            }
          });
        }
      } catch (notificationError) {
        console.error('Failed to notify about admin video upload:', notificationError);
      }
    }

    const populatedVideo = await Video.findById(video._id)
      .populate('uploadedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    return res.status(201).json({
      success: true,
      message: userRole === 'Admin' ? 'Video uploaded and approved successfully' : 'Video uploaded successfully. Awaiting admin approval.',
      data: populatedVideo
    });
  } catch (error: any) {
    console.error('💥 Video upload error occurred:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
      userId: req.userId,
      userRole: req.userRole,
      hasFile: !!(req as any).file
    });

    // Handle specific multer errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 500MB.',
        error: 'File size exceeded'
      });
    }
    
    if (error.message && error.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only MP4, MPEG, MOV, AVI, WMV, and WEBM video files are allowed.',
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to upload video',
      error: error.message,
      details: 'Check server logs for more information'
    });
  }
};

// Approve video (Admin only)
export const approveVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    if (video.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Video is not pending approval'
      });
    }

    video.status = 'approved';
    video.approvedBy = userId;
    video.approvedAt = new Date();
    await video.save();

    // Send notification email to supervisor
    try {
      const supervisor = await User.findById(video.uploadedBy);
      if (supervisor) {
        await emailService.sendVideoApprovalNotification(
          supervisor.email,
          `${supervisor.firstName} ${supervisor.lastName}`,
          {
            videoTitle: video.title,
            status: 'approved'
          }
        );
      }
    } catch (emailError) {
      console.error('Failed to send approval notification:', emailError);
    }

    // Notify supervisor and students about video approval (PERSISTED)
    try {
      const course = await Course.findById(video.courseId);
      const uploader = await User.findById(video.uploadedBy);

      if (course && uploader) {
        // Notify the supervisor who uploaded the video
        await notificationService.createNotification(video.uploadedBy.toString(), {
          type: 'video',
          title: 'Video Approved',
          message: `Your video "${video.title}" for ${course.title} has been approved and is now visible to enrolled students.`,
          fromRole: 'Admin',
          urgent: false,
          data: {
            fromUserId: userId,
            videoId: video._id.toString(),
            courseId: course._id,
            actionUrl: `/videos/${video._id}`
          }
        });

        // Notify enrolled students about the new video
        const enrollments = await Enrollment.find({
          courseId: video.courseId,
          status: { $in: ['confirmed', 'active', 'completed'] }
        }).select('userId');

        if (enrollments.length > 0) {
          const studentIds = enrollments.map(e => e.userId.toString());
          await notificationService.createBulkNotifications(studentIds, {
            type: 'video',
            title: 'New Video Available',
            message: `A new video "${video.title}" is now available in ${course.title}`,
            fromRole: 'Admin',
            urgent: false,
            data: {
              fromUserId: userId,
              videoId: video._id,
              videoTitle: video.title,
              courseId: video.courseId,
              courseTitle: course.title,
              actionUrl: `/courses/${video.courseId}/videos/${video._id}`
            }
          });
        }
      }
    } catch (notificationError) {
      console.error('Failed to send video approval notifications:', notificationError);
    }

    return res.status(200).json({
      success: true,
      message: 'Video approved successfully'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to approve video',
      error: error.message
    });
  }
};

// Reject video (Admin only)
export const rejectVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const { rejectionReason } = req.body;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    if (video.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Video is not pending approval'
      });
    }

    video.status = 'rejected';
    video.rejectionReason = rejectionReason;
    await video.save();

    // Send notification email to supervisor
    try {
      const supervisor = await User.findById(video.uploadedBy);
      if (supervisor) {
        await emailService.sendVideoApprovalNotification(
          supervisor.email,
          `${supervisor.firstName} ${supervisor.lastName}`,
          {
            videoTitle: video.title,
            status: 'rejected',
            rejectionReason
          }
        );
      }
    } catch (emailError) {
      console.error('Failed to send rejection notification:', emailError);
    }

    // Notify supervisor about video rejection (PERSISTED)
    try {
      const supervisorId = video.uploadedBy.toString();
      const course = await Course.findById(video.courseId);

      if (course) {
        await notificationService.createNotification(supervisorId, {
          type: 'video',
          title: 'Video Rejected',
          message: `Your video "${video.title}" was not approved. Reason: ${rejectionReason}`,
          fromRole: 'Admin',
          urgent: true,
          data: {
            fromUserId: req.userId,
            videoId: video._id.toString(),
            courseId: video.courseId,
            reason: rejectionReason,
            actionUrl: `/supervisor/videos`
          }
        });
      }
    } catch (notificationError) {
      console.error('Failed to send video rejection notification:', notificationError);
    }

    return res.status(200).json({
      success: true,
      message: 'Video rejected successfully'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reject video',
      error: error.message
    });
  }
};

// Delete video (Admin can delete any, Supervisor needs approval for approved videos with views)
export const deleteVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;
    const userRole = req.userRole;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check permissions
    if (userRole === 'Admin') {
      // Admin can delete any video directly
      await Video.findByIdAndDelete(videoId);
      // Also delete all related video progress
      await VideoProgress.deleteMany({ videoId });

      return res.status(200).json({
        success: true,
        message: 'Video deleted successfully'
      });
    } else if (userRole === 'Supervisor') {
      // Supervisor can only delete their own videos
      if (video.uploadedBy.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own videos'
        });
      }

      // If video is approved, require admin approval for deletion
      if (video.status === 'approved') {
        video.deletionStatus = 'pending';
        video.deletionRequestedBy = userId as any;
        video.deletionRequestedAt = new Date();
        await video.save();

        return res.status(200).json({
          success: true,
          message: 'Deletion request submitted to admin for approval',
          data: { requiresApproval: true, video }
        });
      }

      // If video is not approved (pending or rejected), delete directly
      await Video.findByIdAndDelete(videoId);

      return res.status(200).json({
        success: true,
        message: 'Video deleted successfully'
      });
    } else {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete video',
      error: error.message
    });
  }
};

// Get pending videos for approval (Admin only)
export const getPendingVideos = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Return videos that need admin review - pending, approved, and rejected
    // Exclude videos with deletionStatus 'pending' (they appear in pending-deletion endpoint)
    // Include 'approved' deletions so admin can still see them
    const videos = await Video.find({
      status: { $in: ['pending', 'approved', 'rejected'] },
      $or: [
        { deletionStatus: { $exists: false } },
        { deletionStatus: { $in: ['none', 'rejected', 'approved'] } }
      ]
    })
      .populate('uploadedBy', 'firstName lastName')
      .populate('courseId', 'title')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: videos.length,
      data: videos
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch pending videos',
      error: error.message
    });
  }
};

// Get videos by uploader (Admin/Supervisor)
export const getMyVideos = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;

    // Build query - Supervisors don't see approved deletions
    const query: any = { uploadedBy: userId };

    if (userRole === 'Supervisor') {
      query.$or = [
        { deletionStatus: { $exists: false } },
        { deletionStatus: { $in: ['none', 'rejected'] } }
      ];
    }

    const videos = await Video.find(query)
      .populate('courseId', 'title')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: videos.length,
      data: videos
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch your videos',
      error: error.message
    });
  }
};

// Update video (Admin/Supervisor - only if pending)
export const updateVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;
    const userRole = req.userRole;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check permissions
    if (userRole !== 'Admin' && video.uploadedBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own videos'
      });
    }

    // Supervisor can only update pending videos
    if (userRole === 'Supervisor' && video.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'You can only update pending videos'
      });
    }

    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('uploadedBy', 'firstName lastName')
    .populate('approvedBy', 'firstName lastName');

    return res.status(200).json({
      success: true,
      message: 'Video updated successfully',
      data: updatedVideo
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update video',
      error: error.message
    });
  }
};

// Resubmit rejected video for approval
export const resubmitVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;

    const video = await Video.findOne({ _id: videoId, uploadedBy: userId })
      .populate('uploadedBy', 'firstName lastName')
      .populate('courseId', 'title');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found or you do not have permission'
      });
    }

    if (video.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Only rejected videos can be resubmitted'
      });
    }

    // Clear previous rejection data and set to pending
    video.status = 'pending';
    video.rejectionReason = undefined;
    await video.save();

    // Notify admins about resubmitted video (PERSISTED)
    try {
      const uploaderInfo = video.uploadedBy as any;
      const courseInfo = video.courseId as any;

      if (uploaderInfo && courseInfo) {
        await notificationService.notifyRole('Admin', {
          type: 'video',
          title: 'Video Resubmitted for Approval',
          message: `${uploaderInfo.firstName} ${uploaderInfo.lastName} resubmitted video "${video.title}" for ${courseInfo.title}`,
          fromRole: 'Supervisor',
          urgent: false,
          data: {
            fromUserId: userId,
            videoId: video._id.toString(),
            videoTitle: video.title,
            courseId: video.courseId,
            courseTitle: courseInfo.title,
            actionUrl: '/admin/content-management'
          }
        });
      }
    } catch (notificationError) {
      console.error('Failed to notify admins about resubmitted video:', notificationError);
    }

    return res.status(200).json({
      success: true,
      message: 'Video resubmitted for approval successfully',
      data: { status: video.status }
    });
  } catch (error: any) {
    console.error('Error resubmitting video:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resubmit video',
      error: error.message
    });
  }
};

// Get all videos for admin management
export const getAllVideos = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Exclude videos with deletionStatus 'pending' (they appear in pending-deletion endpoint)
    // Include 'approved' deletions so admin can still see them
    const videos = await Video.find({
      $or: [
        { deletionStatus: { $exists: false } },
        { deletionStatus: { $in: ['none', 'rejected', 'approved'] } }
      ]
    })
      .populate('uploadedBy', 'firstName lastName')
      .populate('courseId', 'title')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: videos.length,
      data: videos
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch all videos',
      error: error.message
    });
  }
};

// Get video progress for a course
export const getCourseVideoProgress = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.userId;

    const progress = await VideoProgress.find({
      userId,
      courseId
    })
    .populate('videoId', 'title duration sequenceNumber')
    .sort('videoId.sequenceNumber');

    return res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch video progress',
      error: error.message
    });
  }
};

// Update video progress
export const updateVideoProgress = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const { progress, watchTime, completed } = req.body;
    const userId = req.userId;

    // Get video and course information
    const video = await Video.findById(videoId).populate('courseId');
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    const courseId = (video.courseId as any)._id;
    const wasCompleted = progress >= 90 || completed;

    // Get existing progress to check if this is a new completion
    const existingProgress = await VideoProgress.findOne({ userId, videoId });
    const wasAlreadyCompleted = existingProgress?.completed;

    // Update or create progress record
    const progressData = await VideoProgress.findOneAndUpdate(
      { userId, videoId },
      {
        userId,
        videoId,
        courseId,
        progress: Math.min(Math.max(progress || 0, 0), 100),
        watchTime: Math.max(watchTime || 0, 0),
        completed: wasCompleted,
        lastWatchedAt: new Date(),
        ...(wasCompleted ? { completedAt: new Date() } : {})
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );

    // Update course progress if video was newly completed
    if (wasCompleted && !wasAlreadyCompleted) {
      try {
        await updateCourseProgress(userId, courseId);
      } catch (progressError) {
        console.error('Error updating course progress after video completion:', progressError);
        // Don't fail the video progress update if course progress update fails
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Video progress updated successfully',
      data: progressData
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update video progress',
      error: error.message
    });
  }
};

// Get student progress for supervisor dashboard
export const getStudentProgressBySupervisor = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supervisorId = req.userId;

    // Get courses supervised by this supervisor
    const courses = await Course.find({ supervisor: supervisorId });
    const courseIds = courses.map(course => course._id);

    // Get enrollments for these courses (which include updated progress from quiz completion)
    const enrollments = await Enrollment.find({
      courseId: { $in: courseIds }
    })
    .populate('userId', 'firstName lastName email')
    .populate('courseId', 'title level');

    // Get detailed video progress for additional info
    const videoProgress = await VideoProgress.find({
      courseId: { $in: courseIds }
    })
    .populate('userId', 'firstName lastName email')
    .populate('videoId', 'title duration sequenceNumber')
    .populate('courseId', 'title level');

    // Group data by student
    const studentProgress: any = {};

    // First, process enrollments which have the accurate overall progress
    enrollments.forEach(enrollment => {
      const student = enrollment.userId as any;
      const course = enrollment.courseId as any;
      const studentId = student._id.toString();
      
      if (!studentProgress[studentId]) {
        studentProgress[studentId] = {
          student: {
            id: student._id,
            name: `${student.firstName} ${student.lastName}`,
            email: student.email
          },
          courses: {}
        };
      }
      
      const courseId = course._id.toString();
      studentProgress[studentId].courses[courseId] = {
        courseName: course.title,
        course: {
          id: course._id,
          title: course.title,
          level: course.level
        },
        // Use enrollment progress which includes quiz completion
        overallProgress: enrollment.progress.percentage || 0,
        completedVideos: 0, // Will be filled from video progress
        totalVideos: 0, // Will be calculated
        completedQuizzes: 0, // Will be calculated
        totalQuizzes: 0, // Will be calculated
        completedResources: 0, // Will be calculated
        totalResources: 0, // Will be calculated
        videos: []
      };
    });

    // Then add detailed video progress information
    videoProgress.forEach(progress => {
      const student = progress.userId as any;
      const course = progress.courseId as any;
      const studentId = student._id.toString();
      const courseId = course._id.toString();
      
      // Ensure student and course exist in our data structure
      if (studentProgress[studentId] && studentProgress[studentId].courses[courseId]) {
        studentProgress[studentId].courses[courseId].videos.push({
          videoId: (progress.videoId as any)._id,
          videoTitle: (progress.videoId as any).title,
          progress: progress.progress,
          completed: progress.completed,
          watchTime: progress.watchTime,
          lastWatchedAt: progress.lastWatchedAt
        });
      }
    });

    // Calculate comprehensive stats for each course
    for (const studentId of Object.keys(studentProgress)) {
      const student = studentProgress[studentId];
      
      for (const courseId of Object.keys(student.courses)) {
        const courseData = student.courses[courseId];
        
        // Calculate video stats
        const videos = courseData.videos;
        courseData.totalVideos = videos.length;
        courseData.completedVideos = videos.filter((v: any) => v.completed).length;
        
        // Calculate quiz stats
        const totalQuizzes = await Quiz.countDocuments({
          courseId,
          status: 'approved',
          isActive: true
        });
        
        const completedQuizzes = await QuizAttempt.countDocuments({
          userId: studentId,
          quizId: { $in: await Quiz.find({ courseId, status: 'approved', isActive: true }).distinct('_id') },
          status: { $in: ['submitted', 'graded'] }
        });
        
        courseData.totalQuizzes = totalQuizzes;
        courseData.completedQuizzes = completedQuizzes;
        // Calculate resource stats
        const totalResources = await CourseResource.countDocuments({
          courseId,
          status: 'approved'
        });
        
        const completedResources = await ResourceProgress.countDocuments({
          userId: studentId,
          resourceId: { $in: await CourseResource.find({ courseId, status: 'approved' }).distinct('_id') },
          completed: true
        });
        
        courseData.totalResources = totalResources;
        courseData.completedResources = completedResources;
        
        // Keep the enrollment progress as the authoritative overall progress
        // (this already includes quiz completion)
      }
    }

    return res.status(200).json({
      success: true,
      data: Object.values(studentProgress)
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch student progress',
      error: error.message
    });
  }
};

// Get videos pending deletion (Admin only)
export const getVideosPendingDeletion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const videos = await Video.find({
      deletionStatus: 'pending'
    })
    .populate('uploadedBy', 'firstName lastName email')
    .populate('courseId', 'title level')
    .populate('deletionRequestedBy', 'firstName lastName email')
    .sort({ deletionRequestedAt: -1 });

    return res.status(200).json({
      success: true,
      count: videos.length,
      data: videos
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch videos pending deletion',
      error: error.message
    });
  }
};

// Admin: Approve video deletion
export const approveDeletion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const adminId = req.userId;

    const video = await Video.findOne({
      _id: videoId,
      deletionStatus: 'pending'
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found or not pending deletion'
      });
    }

    // Mark video as deleted (hide from supervisor) instead of actually deleting it
    video.deletionStatus = 'approved';
    video.deletionApprovedBy = adminId as any;
    video.deletionApprovedAt = new Date();
    await video.save();

    return res.status(200).json({
      success: true,
      message: 'Video deletion approved - video hidden from supervisor',
      data: video
    });
  } catch (error: any) {
    console.error('Error approving video deletion:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve video deletion',
      error: error.message
    });
  }
};

// Admin: Reject video deletion
export const rejectDeletion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const { reason } = req.body;
    const adminId = req.userId;

    const video = await Video.findOne({
      _id: videoId,
      deletionStatus: 'pending'
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found or not pending deletion'
      });
    }

    // Update deletion status to rejected
    video.deletionStatus = 'rejected';
    video.deletionApprovedBy = adminId as any;
    video.deletionApprovedAt = new Date();
    video.deletionRejectionReason = reason || 'Deletion request rejected by admin';

    await video.save();

    await video.populate('uploadedBy', 'firstName lastName email');
    await video.populate('courseId', 'title level');

    return res.status(200).json({
      success: true,
      message: 'Video deletion rejected successfully',
      data: video
    });
  } catch (error: any) {
    console.error('Error rejecting video deletion:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject video deletion',
      error: error.message
    });
  }
};