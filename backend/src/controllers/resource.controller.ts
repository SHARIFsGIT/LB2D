import { Response } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import CourseResource from '../models/CourseResource.model';
import Course from '../models/Course.model';
import User from '../models/User.model';
import { notifyStudents, notifyAdmins, notifyUser } from '../services/websocket.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
    const { courseId, title, description, category } = req.body;
    const supervisorId = req.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
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
      category,
      status: 'draft' // Start as draft
    });

    await resource.populate('courseId', 'title level');

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

    if (resource.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Resource was rejected. Please edit and resubmit or create a new resource'
      });
    }

    resource.status = 'pending';
    await resource.save();

    // Notify admin about pending resource approval
    try {
      const supervisorInfo = resource.supervisorId as any;
      const courseInfo = resource.courseId as any;
      
      await notifyAdmins({
        type: 'document_approval',
        title: 'Supervisor',
        message: `${supervisorInfo?.firstName} ${supervisorInfo?.lastName} submitted ${resource.title} for approval`,
        targetRole: 'Admin',
        fromRole: 'Supervisor',
        urgent: false,
        data: {
          resourceId: resource._id.toString(),
          resourceTitle: resource.title,
          resourceType: resource.type,
          category: resource.category,
          fileName: resource.fileName,
          courseId: resource.courseId,
          courseTitle: courseInfo?.title,
          courseLevel: courseInfo?.level,
          supervisorId: supervisorId,
          supervisorName: `${supervisorInfo?.firstName} ${supervisorInfo?.lastName}`,
          status: 'pending',
          submittedAt: new Date().toISOString(),
          userRole: 'Supervisor',
          actionType: 'submit_approval'
        }
      });
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

    // Notify supervisor and students about resource approval
    try {
      const course = await Course.findById(resource.courseId);
      const supervisor = await User.findById(resource.supervisorId);
      const admin = await User.findById(adminId);

      if (course && supervisor && admin) {
        // Notify the supervisor who uploaded the resource
        await notifyUser(resource.supervisorId.toString(), {
          type: 'document',
          title: 'Admin',
          message: `${admin.firstName} ${admin.lastName} approved ${resource.title}`,
          targetRole: 'Supervisor',
          fromRole: 'Admin',
          urgent: false,
          data: {
            resourceId: resource._id.toString(),
            resourceTitle: resource.title,
            resourceType: resource.type,
            courseId: course._id.toString(),
            courseTitle: course.title,
            adminId: adminId,
            adminName: `${admin.firstName} ${admin.lastName}`,
            status: 'approved',
            approvedAt: new Date().toISOString(),
            userRole: 'Admin',
            actionType: 'approve'
          }
        });

        // Notify all students about new resource availability
        await notifyStudents({
          type: 'document',
          title: 'Supervisor',
          message: `${supervisor.firstName} ${supervisor.lastName} uploaded ${resource.title}`,
          targetRole: 'Student',
          fromRole: 'Supervisor',
          urgent: false,
          data: {
            resourceId: resource._id.toString(),
            resourceTitle: resource.title,
            resourceType: resource.type,
            category: resource.category,
            fileName: resource.fileName,
            courseId: course._id.toString(),
            courseTitle: course.title,
            courseLevel: course.level,
            uploadedBy: `${supervisor.firstName} ${supervisor.lastName}`,
            uploadedByRole: supervisor.role,
            timestamp: new Date(),
            userRole: 'Supervisor',
            actionType: 'upload'
          }
        });
        console.log(`Notified supervisor ${supervisor.firstName} ${supervisor.lastName} about resource approval`);
        console.log(`Notified all students about new ${resource.type}: ${resource.title} in course: ${course.title}`);
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

    // Send WebSocket notification to supervisor about rejection
    try {
      const supervisor = await User.findById(resource.supervisorId);
      const course = await Course.findById(resource.courseId);
      if (supervisor && course) {
        await notifyUser(resource.supervisorId.toString(), {
          type: 'document',
          title: 'Admin',
          message: `Your file ${resource.title} was rejected - ${rejectionReason}`,
          fromRole: 'Admin',
          targetRole: 'Supervisor',
          urgent: true,
          data: {
            resourceId: resource._id.toString(),
            resourceTitle: resource.title,
            courseId: course._id.toString(),
            courseTitle: course.title,
            status: 'rejected',
            rejectionReason: rejectionReason,
            rejectedAt: new Date().toISOString(),
            userRole: 'Admin',
            actionType: 'reject'
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
    const resources = await CourseResource.find({ status: 'pending' })
      .populate('supervisorId', 'firstName lastName')
      .populate('courseId', 'title')
      .sort({ uploadedAt: -1 });

    return res.status(200).json({
      success: true,
      count: resources.length,
      data: resources
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch pending resources',
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
    const supervisorId = req.userId;

    const resource = await CourseResource.findOne({ _id: resourceId, supervisorId });
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found or you do not have permission'
      });
    }

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

// Download resource (increments download count)
export const downloadResource = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { resourceId } = req.params;

    const resource = await CourseResource.findById(resourceId);
    if (!resource || !resource.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Increment download count
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