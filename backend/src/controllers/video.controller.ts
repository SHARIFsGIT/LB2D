import { Response } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import Course from '../models/Course.model';
import Video from '../models/Video.model';
import VideoProgress from '../models/VideoProgress.model';
import User from '../models/User.model';
import emailService from '../services/email.service';
import { notifyStudents, notifyAdmins, notifySupervisors, notifyUser } from '../services/websocket.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Function to convert Google Drive share URL to direct download URL
const convertGoogleDriveURL = (url: string): string => {
  console.log('🔍 Processing URL:', url);
  
  // Check if it's a Google Drive URL
  if (url.includes('drive.google.com/file/d/')) {
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch) {
      const fileId = fileIdMatch[1];
      const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      console.log('✅ Converted Google Drive URL:', directUrl);
      return directUrl;
    }
  }
  
  // If not a Google Drive URL or conversion failed, return original
  console.log('⚠️ URL unchanged:', url);
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
  console.log('🎬 Video upload request received');
  console.log('📋 Request body:', req.body);
  console.log('👤 User info:', { userId: req.userId, userRole: req.userRole });
  console.log('📁 Has file:', !!(req as any).file);

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

    console.log('🔍 Extracted data:', {
      courseId,
      title,
      description,
      videoUrl: videoUrl ? 'provided' : 'not provided',
      sequenceNumber,
      userId,
      userRole
    });

    // Check if user has permission to upload
    console.log('🔐 Checking user permissions...');
    if (!userRole || !['Admin', 'Supervisor'].includes(userRole)) {
      console.log('❌ Permission denied - userRole:', userRole);
      return res.status(403).json({
        success: false,
        message: 'Only Admin and Supervisor can upload videos'
      });
    }
    console.log('✅ User permission check passed');

    // Check if course exists
    console.log('🔍 Checking if course exists:', courseId);
    if (!courseId) {
      console.log('❌ Missing courseId');
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      console.log('❌ Course not found:', courseId);
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    console.log('✅ Course found:', course.title);

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

      // Notify admins via WebSocket about pending video approval
      try {
        const supervisor = await User.findById(userId);
        if (supervisor) {
          await notifyAdmins({
            type: 'video',
            title: 'Supervisor',
            message: `${supervisor.firstName} ${supervisor.lastName} uploaded ${title} - awaiting approval`,
            fromRole: 'Supervisor',
            targetRole: 'Admin',
            urgent: false,
            data: {
              videoId: video._id.toString(),
              videoTitle: title,
              courseId: course._id.toString(),
              courseTitle: course.title,
              supervisorId: userId,
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

    // Notify supervisor and students about video approval
    try {
      const course = await Course.findById(video.courseId);
      const uploader = await User.findById(video.uploadedBy);
      const admin = await User.findById(userId);
      
      if (course && uploader && admin) {
        // Notify the supervisor who uploaded the video
        await notifyUser(video.uploadedBy.toString(), {
          type: 'video',
          title: 'Admin',
          message: `${admin.firstName} ${admin.lastName} approved ${video.title}`,
          targetRole: 'Supervisor',
          fromRole: 'Admin',
          urgent: false,
          data: {
            videoId: video._id.toString(),
            videoTitle: video.title,
            courseId: course._id.toString(),
            courseTitle: course.title,
            adminId: userId,
            adminName: `${admin.firstName} ${admin.lastName}`,
            status: 'approved',
            approvedAt: new Date().toISOString(),
            userRole: 'Admin',
            actionType: 'approve'
          }
        });

        // Notify all students about new video availability
        await notifyStudents({
          type: 'video',
          title: 'Supervisor',
          message: `${uploader.firstName} ${uploader.lastName} uploaded ${video.title}`,
          targetRole: 'Student',
          fromRole: 'Supervisor',
          urgent: false,
          data: {
            videoId: video._id.toString(),
            videoTitle: video.title,
            courseId: course._id.toString(),
            courseTitle: course.title,
            courseName: course.title,
            courseLevel: course.level,
            sequenceNumber: video.sequenceNumber,
            duration: video.duration,
            uploadedBy: `${uploader.firstName} ${uploader.lastName}`,
            uploadedByRole: uploader.role,
            timestamp: new Date(),
            userRole: 'Supervisor',
            actionType: 'upload'
          }
        });
        console.log(`Notified supervisor ${uploader.firstName} ${uploader.lastName} about video approval`);
        console.log(`Notified all students about new video: ${video.title} in course: ${course.title}`);
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

    // Send WebSocket notification to supervisor about rejection
    try {
      const supervisor = await User.findById(video.uploadedBy);
      const course = await Course.findById(video.courseId);
      if (supervisor && course) {
        await notifyUser(video.uploadedBy.toString(), {
          type: 'video',
          title: 'Video Rejected',
          message: `Your video "${video.title}" for course "${course.title}" was rejected. Reason: ${rejectionReason}`,
          fromRole: 'Admin',
          targetRole: 'Supervisor',
          urgent: true,
          data: {
            videoId: video._id.toString(),
            videoTitle: video.title,
            courseId: course._id.toString(),
            courseTitle: course.title,
            status: 'rejected',
            rejectionReason: rejectionReason,
            rejectedAt: new Date().toISOString()
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

// Delete video (Admin can delete any, Supervisor can delete own rejected videos)
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
      // Admin can delete any video
    } else if (userRole === 'Supervisor') {
      // Supervisor can only delete their own rejected videos
      if (video.uploadedBy.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own videos'
        });
      }
      if (video.status !== 'rejected') {
        return res.status(403).json({
          success: false,
          message: 'You can only delete rejected videos'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    await Video.findByIdAndDelete(videoId);

    return res.status(200).json({
      success: true,
      message: 'Video deleted successfully'
    });
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
    const videos = await Video.find({ status: 'pending' })
      .populate('uploadedBy', 'firstName lastName')
      .populate('courseId', 'title')
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

    const videos = await Video.find({ uploadedBy: userId })
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

// Get all videos for admin management
export const getAllVideos = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const videos = await Video.find({})
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

    // Update or create progress record
    const progressData = await VideoProgress.findOneAndUpdate(
      { userId, videoId },
      {
        userId,
        videoId,
        courseId,
        progress: Math.min(Math.max(progress || 0, 0), 100),
        watchTime: Math.max(watchTime || 0, 0),
        completed: completed || progress >= 90,
        lastWatchedAt: new Date(),
        ...(completed || progress >= 90 ? { completedAt: new Date() } : {})
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );

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

    // Get all progress for these courses
    const allProgress = await VideoProgress.find({
      courseId: { $in: courseIds }
    })
    .populate('userId', 'firstName lastName email')
    .populate('videoId', 'title duration sequenceNumber')
    .populate('courseId', 'title level')
    .sort('userId courseId videoId.sequenceNumber');

    // Group progress by student and course
    const studentProgress: any = {};
    
    allProgress.forEach(progress => {
      const student = progress.userId as any;
      const course = progress.courseId as any;
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
      if (!studentProgress[studentId].courses[courseId]) {
        studentProgress[studentId].courses[courseId] = {
          course: {
            id: course._id,
            title: course.title,
            level: course.level
          },
          videos: [],
          overallProgress: 0,
          completedVideos: 0,
          totalVideos: 0
        };
      }
      
      studentProgress[studentId].courses[courseId].videos.push({
        videoId: (progress.videoId as any)._id,
        videoTitle: (progress.videoId as any).title,
        progress: progress.progress,
        completed: progress.completed,
        watchTime: progress.watchTime,
        lastWatchedAt: progress.lastWatchedAt
      });
    });

    // Calculate overall progress for each course
    Object.values(studentProgress).forEach((student: any) => {
      Object.values(student.courses).forEach((courseData: any) => {
        const videos = courseData.videos;
        courseData.totalVideos = videos.length;
        courseData.completedVideos = videos.filter((v: any) => v.completed).length;
        courseData.overallProgress = videos.length > 0 ? 
          videos.reduce((sum: number, v: any) => sum + v.progress, 0) / videos.length : 0;
      });
    });

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