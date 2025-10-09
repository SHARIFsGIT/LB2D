import { Response } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import CourseResource from '../models/CourseResource.model';
import Course from '../models/Course.model';
import User from '../models/User.model';
import ResourceProgress from '../models/ResourceProgress.model';
import Enrollment from '../models/Enrollment.model';
import notificationService from '../services/notification.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Import other models needed for progress calculation
import Video from '../models/Video.model';
import VideoProgress from '../models/VideoProgress.model';
import Quiz from '../models/Quiz.model';
import QuizAttempt from '../models/QuizAttempt.model';

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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'course-resources');
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

const fileFilter = (req: any, file: any, cb: any) => {
  // Allow documents, audio, images
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp3',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, MP3, WAV, OGG, JPG, PNG, GIF, and TXT files are allowed.'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Upload course resource
export const uploadResource = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId, title, description, category, sequenceNumber } = req.body;
    const supervisorId = req.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (!sequenceNumber) {
      return res.status(400).json({
        success: false,
        message: 'Sequence number is required'
      });
    }

    // Verify supervisor has access to this course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Determine resource type based on MIME type
    let resourceType = 'document';
    if (file.mimetype.startsWith('audio/')) {
      resourceType = 'audio';
    } else if (file.mimetype.startsWith('image/')) {
      resourceType = 'image';
    }

    // Determine if file can be viewed inline
    const inlineViewableTypes = [
      'application/pdf',
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/svg+xml',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg'
    ];
    const isViewableInline = inlineViewableTypes.includes(file.mimetype);
    const fileExtension = path.extname(file.originalname).toLowerCase();

    // Create resource record in draft status
    const resource = await CourseResource.create({
      courseId,
      supervisorId,
      title,
      description,
      type: resourceType,
      fileUrl: `/uploads/course-resources/${file.filename}`,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      fileExtension,
      isViewableInline,
      category,
      sequenceNumber: parseInt(sequenceNumber),
      status: 'draft' // Start as draft
    });

    await resource.populate('courseId', 'title level');

    // Notify admins about pending resource approval (PERSISTED)
    try {
      const supervisor = await User.findById(supervisorId);
      if (supervisor) {
        await notificationService.notifyRole('Admin', {
          type: 'document',
          title: 'New Resource Awaiting Approval',
          message: `${supervisor.firstName} ${supervisor.lastName} uploaded ${resourceType} "${title}" for ${course.title}`,
          fromRole: 'Supervisor',
          urgent: false,
          data: {
            fromUserId: supervisorId,
            resourceId: resource._id.toString(),
            resourceTitle: title,
            resourceType: resourceType,
            courseId: course._id.toString(),
            courseTitle: course.title,
            actionUrl: '/admin/content-management'
          }
        });
      }
    } catch (notificationError) {
      console.error('Failed to notify admins about pending resource:', notificationError);
    }

    return res.status(201).json({
      success: true,
      message: 'Resource uploaded successfully.',
      data: resource
    });
  } catch (error: any) {
    console.error('Error uploading resource:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload resource',
      error: error.message
    });
  }
};

// Submit resource for approval
export const submitResourceForApproval = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { resourceId } = req.params;
    const supervisorId = req.userId;

    const resource = await CourseResource.findOne({ _id: resourceId, supervisorId })
      .populate('supervisorId', 'firstName lastName')
      .populate('courseId', 'title level');
      
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found or you do not have permission'
      });
    }

    if (resource.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Resource is already pending approval'
      });
    }

    if (resource.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Resource is already approved and active'
      });
    }

    const wasRejected = resource.status === 'rejected';
    
    if (resource.status === 'rejected') {
      // Allow resubmission of rejected resources - clear rejection data
      resource.rejectionReason = undefined;
    }

    resource.status = 'pending';
    await resource.save();

    // Notify admins about pending resource approval (PERSISTED)
    try {
      const supervisorInfo = resource.supervisorId as any;
      const courseInfo = resource.courseId as any;
      const actionMessage = wasRejected
        ? `resubmitted resource "${resource.title}" for approval`
        : `submitted resource "${resource.title}" for approval`;

      if (supervisorInfo && courseInfo) {
        await notificationService.notifyRole('Admin', {
          type: 'document',
          title: wasRejected ? 'Resource Resubmitted for Approval' : 'New Resource Awaiting Approval',
          message: `${supervisorInfo.firstName} ${supervisorInfo.lastName} ${actionMessage} for ${courseInfo.title}`,
          fromRole: 'Supervisor',
          urgent: false,
          data: {
            fromUserId: supervisorId,
            resourceId: resource._id.toString(),
            resourceTitle: resource.title,
            resourceType: resource.type,
            courseId: resource.courseId,
            courseTitle: courseInfo.title,
            actionUrl: '/admin/content-management'
          }
        });
      }
    } catch (notificationError) {
      console.error('Failed to send admin resource approval notification:', notificationError);
    }

    return res.status(200).json({
      success: true,
      message: 'Resource submitted for approval successfully',
      data: { status: resource.status }
    });
  } catch (error: any) {
    console.error('Error submitting resource for approval:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit resource for approval',
      error: error.message
    });
  }
};

// Approve resource (Admin only)
export const approveResource = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { resourceId } = req.params;
    const adminId = req.userId;

    const resource = await CourseResource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    if (resource.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Resource is not pending approval'
      });
    }

    resource.status = 'approved';
    resource.approvedBy = adminId as any;
    resource.approvedAt = new Date();
    await resource.save();

    // Notify supervisor and students about resource approval (PERSISTED)
    try {
      const course = await Course.findById(resource.courseId);
      const supervisor = await User.findById(resource.supervisorId);

      if (course && supervisor) {
        // Notify the supervisor who uploaded the resource
        await notificationService.createNotification(resource.supervisorId.toString(), {
          type: 'document',
          title: 'Resource Approved',
          message: `Your resource "${resource.title}" for ${course.title} has been approved and is now visible to enrolled students.`,
          fromRole: 'Admin',
          urgent: false,
          data: {
            fromUserId: adminId,
            resourceId: resource._id.toString(),
            courseId: resource.courseId,
            actionUrl: `/resources/${resource._id}`
          }
        });

        // Notify enrolled students about the new resource
        const enrollments = await Enrollment.find({
          courseId: resource.courseId,
          status: { $in: ['confirmed', 'active', 'completed'] }
        }).select('userId');

        if (enrollments.length > 0) {
          const studentIds = enrollments.map(e => e.userId.toString());
          await notificationService.createBulkNotifications(studentIds, {
            type: 'document',
            title: 'New Resource Available',
            message: `A new ${resource.type} "${resource.title}" is now available in ${course.title}`,
            fromRole: 'Admin',
            urgent: false,
            data: {
              fromUserId: adminId,
              resourceId: resource._id,
              resourceTitle: resource.title,
              resourceType: resource.type,
              courseId: resource.courseId,
              courseTitle: course.title,
              actionUrl: `/courses/${resource.courseId}/resources/${resource._id}`
            }
          });
        }
      }
    } catch (notificationError) {
      console.error('Failed to send resource approval notifications:', notificationError);
    }

    return res.status(200).json({
      success: true,
      message: 'Resource approved successfully'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to approve resource',
      error: error.message
    });
  }
};

// Reject resource (Admin only)
export const rejectResource = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { resourceId } = req.params;
    const { rejectionReason } = req.body;

    const resource = await CourseResource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    if (resource.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Resource is not pending approval'
      });
    }

    resource.status = 'rejected';
    resource.rejectionReason = rejectionReason;
    await resource.save();

    // Notify supervisor about resource rejection (PERSISTED)
    try {
      const supervisorId = resource.supervisorId.toString();
      const course = await Course.findById(resource.courseId);

      if (course) {
        await notificationService.createNotification(supervisorId, {
          type: 'document',
          title: 'Resource Rejected',
          message: `Your resource "${resource.title}" was not approved. Reason: ${rejectionReason}`,
          fromRole: 'Admin',
          urgent: true,
          data: {
            fromUserId: req.userId,
            resourceId: resource._id.toString(),
            courseId: resource.courseId,
            reason: rejectionReason,
            actionUrl: `/supervisor/resources`
          }
        });
      }
    } catch (notificationError) {
      console.error('Failed to send resource rejection notification:', notificationError);
    }

    return res.status(200).json({
      success: true,
      message: 'Resource rejected successfully'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reject resource',
      error: error.message
    });
  }
};

// Get pending resources for approval (Admin only)
export const getPendingResources = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Return resources that need admin review - pending, approved, and rejected
    // Exclude resources with deletionStatus 'pending' (they appear in pending-deletion endpoint)
    // Include 'approved' deletions so admin can still see them
    const resources = await CourseResource.find({
      status: { $in: ['pending', 'approved', 'rejected'] },
      $or: [
        { deletionStatus: { $exists: false } },
        { deletionStatus: { $in: ['none', 'rejected', 'approved'] } }
      ]
    })
      .populate('supervisorId', 'firstName lastName')
      .populate('courseId', 'title level')
      .populate('approvedBy', 'firstName lastName')
      .sort({ uploadedAt: -1 });

    return res.status(200).json({
      success: true,
      count: resources.length,
      data: resources
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch resources for admin review',
      error: error.message
    });
  }
};

// Get course resources
export const getCourseResources = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const { type, category } = req.query;
    const userRole = req.userRole;

    const filter: any = { courseId, isActive: true };

    // Students can only see approved resources
    if (userRole === 'Student') {
      filter.status = 'approved';
    }

    if (type) filter.type = type;
    if (category) filter.category = category;

    // Supervisors don't see approved deletions
    if (userRole === 'Supervisor') {
      filter.$or = [
        { deletionStatus: { $exists: false } },
        { deletionStatus: { $in: ['none', 'rejected'] } }
      ];
    }

    const resources = await CourseResource.find(filter)
      .populate('supervisorId', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ uploadedAt: -1 });

    return res.status(200).json({
      success: true,
      data: resources
    });
  } catch (error: any) {
    console.error('Error fetching course resources:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch resources',
      error: error.message
    });
  }
};

// Update resource
export const updateResource = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { resourceId } = req.params;
    const supervisorId = req.userId;
    const { title, description, category, isActive } = req.body;

    const resource = await CourseResource.findOne({ _id: resourceId, supervisorId });
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found or you do not have permission'
      });
    }

    // Update fields
    resource.title = title || resource.title;
    resource.description = description || resource.description;
    resource.category = category || resource.category;
    if (isActive !== undefined) resource.isActive = isActive;

    await resource.save();

    return res.status(200).json({
      success: true,
      message: 'Resource updated successfully',
      data: resource
    });
  } catch (error: any) {
    console.error('Error updating resource:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update resource',
      error: error.message
    });
  }
};

// Delete resource
export const deleteResource = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { resourceId } = req.params;
    const userId = req.userId;
    const userRole = req.userRole;

    // Admin can delete any resource directly
    if (userRole === 'Admin') {
      const resource = await CourseResource.findById(resourceId);
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Delete file from filesystem
      const filePath = path.join(process.cwd(), resource.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete the resource and related progress
      await CourseResource.findByIdAndDelete(resourceId);
      await ResourceProgress.deleteMany({ resourceId });

      return res.status(200).json({
        success: true,
        message: 'Resource deleted successfully'
      });
    }

    // Supervisor flow - check ownership
    const resource = await CourseResource.findOne({ _id: resourceId, supervisorId: userId });
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found or you do not have permission'
      });
    }

    // If resource is approved, require admin approval for deletion
    if (resource.status === 'approved') {
      resource.deletionStatus = 'pending';
      resource.deletionRequestedBy = userId as any;
      resource.deletionRequestedAt = new Date();
      await resource.save();

      return res.status(200).json({
        success: true,
        message: 'Deletion request submitted to admin for approval',
        data: { requiresApproval: true, resource }
      });
    }

    // If resource is not approved (pending or rejected), delete directly
    // Delete file from filesystem
    const filePath = path.join(process.cwd(), resource.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete record
    await CourseResource.findByIdAndDelete(resourceId);

    return res.status(200).json({
      success: true,
      message: 'Resource deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting resource:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete resource',
      error: error.message
    });
  }
};

// View resource inline (for supported file types)
export const viewResource = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { resourceId } = req.params;
    const userId = req.userId;

    const resource = await CourseResource.findById(resourceId);
    if (!resource || !resource.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Check if resource is approved (students can only view approved resources)
    const userRole = req.userRole;
    if (userRole === 'Student' && resource.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Resource is not available'
      });
    }

    // Track resource access
    await ResourceProgress.findOneAndUpdate(
      { userId, resourceId },
      {
        userId,
        resourceId,
        courseId: resource.courseId,
        accessedAt: new Date(),
        $inc: { downloadCount: 1 }
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );

    // Increment global download count
    resource.downloadCount += 1;
    await resource.save();
    // Send file for inline viewing
    const filePath = path.join(process.cwd(), resource.fileUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Set appropriate headers for inline viewing
    res.setHeader('Content-Type', resource.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${resource.fileName}"`);
    
    // For security, add headers to prevent XSS
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error('Error viewing resource:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to view resource',
      error: error.message
    });
  }
};

// Download resource (increments download count)
export const downloadResource = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { resourceId } = req.params;
    const userId = req.userId;

    const resource = await CourseResource.findById(resourceId);
    if (!resource || !resource.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Track resource access/download
    await ResourceProgress.findOneAndUpdate(
      { userId, resourceId },
      {
        userId,
        resourceId,
        courseId: resource.courseId,
        accessedAt: new Date(),
        $inc: { downloadCount: 1 }
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );

    // Increment global download count
    resource.downloadCount += 1;
    await resource.save();
    // Send file
    const filePath = path.join(process.cwd(), resource.fileUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    res.download(filePath, resource.fileName);
  } catch (error: any) {
    console.error('Error downloading resource:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to download resource',
      error: error.message
    });
  }
};

// Mark resource as completed (for students)
export const markResourceCompleted = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { resourceId } = req.params;
    const { timeSpent } = req.body;
    const userId = req.userId;

    const resource = await CourseResource.findById(resourceId);
    if (!resource || !resource.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Check if already completed
    const existingProgress = await ResourceProgress.findOne({ userId, resourceId });
    const wasAlreadyCompleted = existingProgress?.completed;

    // Update or create progress record
    const progressData = await ResourceProgress.findOneAndUpdate(
      { userId, resourceId },
      {
        userId,
        resourceId,
        courseId: resource.courseId,
        completed: true,
        completedAt: new Date(),
        accessedAt: new Date(),
        ...(timeSpent && { timeSpent: Math.max(timeSpent, 0) }),
        $inc: { downloadCount: existingProgress ? 0 : 1 } // Only increment if new record
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );

    // Update course progress if resource was newly completed
    if (!wasAlreadyCompleted) {
      try {
        await updateCourseProgress(userId, resource.courseId.toString());
      } catch (progressError) {
        console.error('Error updating course progress after resource completion:', progressError);
        // Don't fail the resource completion if progress update fails
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Resource marked as completed successfully',
      data: progressData
    });
  } catch (error: any) {
    console.error('Error marking resource as completed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark resource as completed',
      error: error.message
    });
  }
};

// Get resource progress for a student
export const getResourceProgress = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { resourceId } = req.params;
    const userId = req.userId;

    const progress = await ResourceProgress.findOne({ userId, resourceId });
    
    return res.status(200).json({
      success: true,
      data: progress || {
        completed: false,
        accessedAt: null,
        downloadCount: 0,
        timeSpent: 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching resource progress:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch resource progress',
      error: error.message
    });
  }
};

// Get resources by supervisor
export const getSupervisorResources = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supervisorId = req.userId;
    const userRole = req.userRole;

    // Build query - Supervisors don't see approved deletions
    const query: any = { supervisorId };

    if (userRole === 'Supervisor') {
      query.$or = [
        { deletionStatus: { $exists: false } },
        { deletionStatus: { $in: ['none', 'rejected'] } }
      ];
    }

    const resources = await CourseResource.find(query)
      .populate('courseId', 'title level')
      .populate('supervisorId', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ uploadedAt: -1 });

    return res.status(200).json({
      success: true,
      data: resources
    });
  } catch (error: any) {
    console.error('Error fetching supervisor resources:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch supervisor resources',
      error: error.message
    });
  }
};

// Get resource statistics
export const getResourceStatistics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supervisorId = req.userId;

    const stats = await CourseResource.aggregate([
      { $match: { supervisorId: supervisorId as any } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalDownloads: { $sum: '$downloadCount' },
          totalSize: { $sum: '$fileSize' }
        }
      }
    ]);

    const totalResources = await CourseResource.countDocuments({ supervisorId });
    const activeResources = await CourseResource.countDocuments({ supervisorId, isActive: true });

    return res.status(200).json({
      success: true,
      data: {
        totalResources,
        activeResources,
        byType: stats
      }
    });
  } catch (error: any) {
    console.error('Error fetching resource statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch resource statistics',
      error: error.message
    });
  }
};

// Get resources pending deletion (Admin only)
export const getResourcesPendingDeletion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const resources = await CourseResource.find({
      deletionStatus: 'pending'
    })
    .populate('supervisorId', 'firstName lastName email')
    .populate('courseId', 'title level')
    .populate('deletionRequestedBy', 'firstName lastName email')
    .sort({ deletionRequestedAt: -1 });

    return res.status(200).json({
      success: true,
      count: resources.length,
      data: resources
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch resources pending deletion',
      error: error.message
    });
  }
};

// Admin: Approve resource deletion
export const approveDeletion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { resourceId } = req.params;
    const adminId = req.userId;

    const resource = await CourseResource.findOne({
      _id: resourceId,
      deletionStatus: 'pending'
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found or not pending deletion'
      });
    }

    // Mark resource as deleted (hide from supervisor) instead of actually deleting it
    resource.deletionStatus = 'approved';
    resource.deletionApprovedBy = adminId as any;
    resource.deletionApprovedAt = new Date();
    await resource.save();

    return res.status(200).json({
      success: true,
      message: 'Resource deletion approved - resource hidden from supervisor',
      data: resource
    });
  } catch (error: any) {
    console.error('Error approving resource deletion:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve resource deletion',
      error: error.message
    });
  }
};

// Admin: Reject resource deletion
export const rejectDeletion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { resourceId } = req.params;
    const { reason } = req.body;
    const adminId = req.userId;

    const resource = await CourseResource.findOne({
      _id: resourceId,
      deletionStatus: 'pending'
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found or not pending deletion'
      });
    }

    // Update deletion status to rejected
    resource.deletionStatus = 'rejected';
    resource.deletionApprovedBy = adminId as any;
    resource.deletionApprovedAt = new Date();
    resource.deletionRejectionReason = reason || 'Deletion request rejected by admin';

    await resource.save();

    await resource.populate('supervisorId', 'firstName lastName email');
    await resource.populate('courseId', 'title level');

    return res.status(200).json({
      success: true,
      message: 'Resource deletion rejected successfully',
      data: resource
    });
  } catch (error: any) {
    console.error('Error rejecting resource deletion:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject resource deletion',
      error: error.message
    });
  }
};