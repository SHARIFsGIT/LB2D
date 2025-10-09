import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import User from '../models/User.model';
import Video from '../models/Video.model';
import CourseResource from '../models/CourseResource.model';
import Enrollment from '../models/Enrollment.model';
import emailService from '../services/email.service';
import notificationService from '../services/notification.service';
import { notifyRoleHierarchy } from '../services/websocket.service';

// Get all users (only Admin can access)
export const getAllUsers = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  const { page = 1, limit = 10, role, verified } = req.query;
  
  // Build filter object
  const filter: any = {};
  if (role) filter.role = role;
  if (verified !== undefined) filter.isEmailVerified = verified === 'true';
  
  const skip = (Number(page) - 1) * Number(limit);
  
  // Get users with pagination
  const users = await User.find(filter)
    .select('-password -refreshToken -emailVerificationToken -passwordResetToken -otpCode')
    .sort('-createdAt')
    .limit(Number(limit))
    .skip(skip);
    
  const total = await User.countDocuments(filter);
  
  return res.status(200).json({
    success: true,
    data: {
      users: users.map(user => ({
        id: user._id,
        email: user.email,
        role: user.role,
        requestedRole: user.requestedRole,
        previousRole: user.previousRole,
        rejectionReason: user.rejectionReason,
        rejectionDate: user.rejectionDate,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
});

// Get single user (only Admin can access)
export const getUser = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  const { userId } = req.params;
  
  const user = await User.findById(userId)
    .select('-password -refreshToken -emailVerificationToken -passwordResetToken -otpCode');
    
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  return res.status(200).json({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      profilePhoto: user.profilePhoto,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  });
});

// Update user (only Admin can access)
export const updateUser = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  const { userId } = req.params;
  const { firstName, lastName, email, role, requestedRole, phone, isActive, isEmailVerified } = req.body;
  
  const user = await User.findById(userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  // Prevent admin from demoting himself
  const requestingUserId = (req as any).userId;
  if (userId === requestingUserId && role !== 'Admin') {
    return res.status(400).json({
      success: false,
      message: 'You cannot change your own admin role'
    });
  }
  
  // Check if this is a role approval (role is changing from current to requestedRole)
  const isRoleApproval = role !== undefined && 
                        user.requestedRole && 
                        user.requestedRole !== user.role && 
                        role === user.requestedRole;

  // Check if this is a role rejection (requestedRole is being cleared)
  const isRoleRejection = requestedRole === null && user.requestedRole && user.requestedRole !== user.role;
  
  // Check if this is a direct admin role change (role change without prior request)
  const isDirectRoleChange = role !== undefined && 
                            role !== user.role && 
                            !isRoleApproval && 
                            !isRoleRejection;

  // Store original user data for email notification
  const originalRole = user.role;
  const originalRequestedRole = user.requestedRole;
  const userEmailData = {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    newRole: role,
    requestedRole: originalRequestedRole,
    rejectionReason: req.body.rejectionReason
  };

  // Update fields if provided
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (email !== undefined) user.email = email;
  if (role !== undefined) {
    // Store previous role before changing
    user.previousRole = user.role;
    user.role = role;
  }
  // Only update requestedRole if it's not a rejection (preserve original requested role for rejected users)
  if (requestedRole !== undefined && !isRoleRejection) user.requestedRole = requestedRole;
  if (phone !== undefined) user.phone = phone;
  if (isActive !== undefined) user.isActive = isActive;
  if (isEmailVerified !== undefined) user.isEmailVerified = isEmailVerified;
  
  // Store rejection information when rejecting a role
  if (isRoleRejection) {
    user.rejectionReason = req.body.rejectionReason || 'No reason provided';
    user.rejectionDate = new Date();
  }
  
  // Clear rejection info for role approvals
  if (isRoleApproval) {
    user.rejectionReason = undefined;
    user.rejectionDate = undefined;
  }
  
  // Clear requestedRole and rejection info for direct role changes
  if (isDirectRoleChange) {
    user.requestedRole = undefined;
    user.rejectionReason = undefined;
    user.rejectionDate = undefined;
  }
  
  // Clear refresh token when role changes to force re-login with updated role
  if (isRoleApproval || isDirectRoleChange) {
    user.refreshToken = undefined;
  }
  
  await user.save();

  // Send role approval confirmation email if this was a role approval
  if (isRoleApproval && userEmailData.newRole) {
    try {
      await emailService.sendRoleApprovalConfirmation(
        userEmailData.email,
        userEmailData.firstName,
        userEmailData.lastName,
        userEmailData.newRole
      );
    } catch (emailError) {
      console.error(`Failed to send role approval email to ${userEmailData.email}:`, emailError);
    }

    // Send notification for role approval (PERSISTED)
    try {
      // Notify the user about their role approval
      await notificationService.createNotification(userId, {
        type: 'role_change',
        title: 'Role Approved',
        message: `Your ${userEmailData.newRole} role request has been approved. Please log in again to access your new features.`,
        urgent: true,
        targetRole: userEmailData.newRole as any,
        fromRole: 'Admin',
        data: {
          fromUserId: req.userId,
          newRole: userEmailData.newRole,
          actionUrl: '/profile'
        }
      });

      // Notify all admins about the approval
      await notificationService.notifyRole('Admin', {
        type: 'admin',
        title: 'Role Approved',
        message: `${userEmailData.firstName} ${userEmailData.lastName} has been approved as ${userEmailData.newRole}`,
        fromRole: 'Admin',
        data: {
          fromUserId: req.userId,
          userId,
          userEmail: userEmailData.email,
          newRole: userEmailData.newRole,
          actionUrl: `/admin/users/${userId}`
        }
      });

      // Notify supervisors if a new supervisor was approved
      if (userEmailData.newRole === 'Supervisor') {
        await notificationService.notifyRole('Supervisor', {
          type: 'admin',
          title: 'New Team Member',
          message: `${userEmailData.firstName} ${userEmailData.lastName} has joined the supervision team`,
          fromRole: 'Admin',
          data: {
            fromUserId: req.userId,
            userId,
            newSupervisorName: `${userEmailData.firstName} ${userEmailData.lastName}`,
            newSupervisorEmail: userEmailData.email
          }
        });
      }

      // Additional notification placeholder for analytics refresh
      if (userEmailData.newRole === 'Supervisor') {
        await notificationService.notifyRole('Admin', {
          type: 'supervisor_action',
          title: 'Analytics Update',
          message: `Supervisor analytics updated. New supervisor: ${userEmailData.firstName} ${userEmailData.lastName}`,
          fromRole: 'Admin',
          urgent: false,
          data: {
            action: 'supervisor_added',
            analyticsSection: 'supervisor_salary_compensation',
            userId,
            supervisorName: `${userEmailData.firstName} ${userEmailData.lastName}`,
            supervisorEmail: userEmailData.email,
            approvalDate: new Date(),
            timestamp: new Date()
          }
        });
      }
    } catch (notificationError) {
      console.error('Failed to send role approval notifications:', notificationError);
    }
  }

  // Send role rejection notification email if this was a role rejection
  if (isRoleRejection && userEmailData.requestedRole) {
    try {
      await emailService.sendRoleRejectionNotification(
        userEmailData.email,
        userEmailData.firstName,
        userEmailData.lastName,
        userEmailData.requestedRole,
        userEmailData.rejectionReason
      );
    } catch (emailError) {
      console.error(`Failed to send role rejection email to ${userEmailData.email}:`, emailError);
    }

    // Send notification for role rejection (PERSISTED)
    try {
      // Notify the user about rejection
      await notificationService.createNotification(userId, {
        type: 'role_change',
        title: 'Role Request Not Approved',
        message: `Your ${userEmailData.requestedRole} role request was not approved. Reason: ${userEmailData.rejectionReason}`,
        urgent: true,
        targetRole: originalRole as any,
        fromRole: 'Admin',
        data: {
          fromUserId: req.userId,
          rejectedRole: userEmailData.requestedRole,
          rejectionReason: userEmailData.rejectionReason,
          actionUrl: '/profile'
        }
      });

      // Notify admins about the rejection
      await notificationService.notifyRole('Admin', {
        type: 'admin',
        title: 'Role Request Rejected',
        message: `${userEmailData.firstName} ${userEmailData.lastName}'s ${userEmailData.requestedRole} request has been rejected`,
        fromRole: 'Admin',
        data: {
          fromUserId: req.userId,
          userId,
          userEmail: userEmailData.email,
          rejectedRole: userEmailData.requestedRole,
          rejectionReason: userEmailData.rejectionReason,
          actionUrl: `/admin/users/${userId}`
        }
      });
    } catch (notificationError) {
      console.error('Failed to send role rejection notifications:', notificationError);
    }
  }

  // Send direct role change notification email
  if (isDirectRoleChange && userEmailData.newRole) {
    try {
      await emailService.sendRoleChangeNotification(
        userEmailData.email,
        userEmailData.firstName,
        userEmailData.lastName,
        originalRole,
        userEmailData.newRole
      );
    } catch (emailError) {
      console.error(`Failed to send role change email to ${userEmailData.email}:`, emailError);
    }

    // Send notification for direct role change (PERSISTED)
    try {
      // Notify the user
      await notificationService.createNotification(userId, {
        type: 'role_change',
        title: 'Role Changed',
        message: `Your role has been changed from ${originalRole} to ${userEmailData.newRole} by an admin. Please log in again.`,
        urgent: true,
        targetRole: userEmailData.newRole as any,
        fromRole: 'Admin',
        data: {
          fromUserId: req.userId,
          oldRole: originalRole,
          newRole: userEmailData.newRole,
          actionUrl: '/profile'
        }
      });

      // Notify all relevant roles using role hierarchy
      await notifyRoleHierarchy('Admin', 'all', {
        type: 'admin',
        title: 'User Role Updated',
        message: `${userEmailData.firstName} ${userEmailData.lastName} role changed: ${originalRole} → ${userEmailData.newRole}`,
        data: {
          userId,
          userEmail: userEmailData.email,
          oldRole: originalRole,
          newRole: userEmailData.newRole,
          changedBy: (req as any).userId,
          timestamp: new Date()
        }
      });
    } catch (notificationError) {
      console.error('Failed to send role change notifications:', notificationError);
    }
  }
  
  return res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: {
      id: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      profilePhoto: user.profilePhoto,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive
    }
  });
});

// Delete user (only Admin can access)
export const deleteUser = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  const { userId } = req.params;
  
  // Prevent admin from deleting himself
  const requestingUserId = (req as any).userId;
  if (userId === requestingUserId) {
    return res.status(400).json({
      success: false,
      message: 'You cannot delete your own account'
    });
  }
  
  const user = await User.findById(userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  // Prevent deleting the last admin
  if (user.role === 'Admin') {
    const adminCount = await User.countDocuments({ role: 'Admin' });
    if (adminCount <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the last admin user'
      });
    }
  }
  
  await User.findByIdAndDelete(userId);
  
  return res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

// Get user statistics (Admin only)
export const getUserStats = asyncHandler(async (_req: Request, res: Response): Promise<any> => {
  const totalUsers = await User.countDocuments();
  const totalStudents = await User.countDocuments({ role: 'Student' });
  const totalSupervisors = await User.countDocuments({ role: 'Supervisor' });
  const totalAdmins = await User.countDocuments({ role: 'Admin' });
  const totalPending = await User.countDocuments({ role: 'Pending' });
  const verifiedUsers = await User.countDocuments({ isEmailVerified: true });
  const activeUsers = await User.countDocuments({ isActive: true });
  
  return res.status(200).json({
    success: true,
    data: {
      total: totalUsers,
      byRole: {
        students: totalStudents,
        supervisors: totalSupervisors,
        admins: totalAdmins,
        pending: totalPending
      },
      verified: verifiedUsers,
      active: activeUsers
    }
  });
});

// Video approval functions
export const getPendingVideos = asyncHandler(async (_req: Request, res: Response): Promise<any> => {
  const pendingVideos = await Video.find({ status: 'pending' })
    .populate('uploadedBy', 'firstName lastName email')
    .populate('courseId', 'title level')
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    data: pendingVideos
  });
});

export const approveVideo = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  const { videoId } = req.params;
  const { userId } = req as any;

  const video = await Video.findById(videoId)
    .populate('uploadedBy', 'firstName lastName email')
    .populate('courseId', 'title');

  if (!video) {
    return res.status(404).json({
      success: false,
      message: 'Video not found'
    });
  }

  video.status = 'approved';
  video.approvedBy = userId;
  video.approvedAt = new Date();
  await video.save();

  // Notify the supervisor who uploaded the video (PERSISTED)
  try {
    await notificationService.createNotification(video.uploadedBy._id.toString(), {
      type: 'video',
      title: 'Video Approved',
      message: `Your video "${video.title}" for ${(video.courseId as any).title} has been approved and is now visible to enrolled students.`,
      fromRole: 'Admin',
      urgent: false,
      data: {
        fromUserId: userId,
        videoId: video._id,
        courseId: video.courseId._id,
        actionUrl: `/videos/${video._id}`
      }
    });
  } catch (notificationError) {
    console.error('Failed to send video approval notification:', notificationError);
  }

  // Notify enrolled students about the new video (PERSISTED)
  try {
    const enrollments = await Enrollment.find({
      courseId: video.courseId._id,
      status: 'active'
    }).select('studentId');

    if (enrollments.length > 0) {
      const studentIds = enrollments.map(e => e.studentId.toString());
      await notificationService.createBulkNotifications(studentIds, {
        type: 'video',
        title: 'New Video Available',
        message: `A new video "${video.title}" is now available in ${(video.courseId as any).title}`,
        fromRole: 'Admin',
        urgent: false,
        data: {
          fromUserId: userId,
          videoId: video._id,
          videoTitle: video.title,
          courseId: video.courseId._id,
          courseTitle: (video.courseId as any).title,
          actionUrl: `/courses/${video.courseId._id}/videos/${video._id}`
        }
      });
    }
  } catch (notificationError) {
    console.error('Failed to notify students about approved video:', notificationError);
  }

  return res.status(200).json({
    success: true,
    message: 'Video approved successfully',
    data: video
  });
});

export const rejectVideo = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  const { videoId } = req.params;
  const { reason } = req.body;
  const { userId } = req as any;

  const video = await Video.findById(videoId)
    .populate('uploadedBy', 'firstName lastName email')
    .populate('courseId', 'title');

  if (!video) {
    return res.status(404).json({
      success: false,
      message: 'Video not found'
    });
  }

  video.status = 'rejected';
  video.rejectionReason = reason;
  video.approvedBy = userId;
  video.approvedAt = new Date();
  await video.save();

  // Notify the supervisor who uploaded the video (PERSISTED)
  try {
    const supervisorId = video.uploadedBy._id.toString();

    await notificationService.createNotification(supervisorId, {
      type: 'video',
      title: 'Video Rejected',
      message: `Your video "${video.title}" was not approved. Reason: ${reason}`,
      fromRole: 'Admin',
      urgent: true,
      data: {
        fromUserId: userId,
        videoId: video._id,
        courseId: video.courseId._id,
        reason,
        actionUrl: `/supervisor/videos`
      }
    });
  } catch (notificationError) {
    console.error('Failed to send video rejection notification:', notificationError);
  }

  return res.status(200).json({
    success: true,
    message: 'Video rejected successfully',
    data: video
  });
});

// Resource approval functions
export const getPendingResources = asyncHandler(async (_req: Request, res: Response): Promise<any> => {
  const pendingResources = await CourseResource.find({ status: 'pending' })
    .populate('supervisorId', 'firstName lastName email')
    .populate('courseId', 'title level')
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    data: pendingResources
  });
});

export const approveResource = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  const { resourceId } = req.params;
  const { userId } = req as any;

  const resource = await CourseResource.findById(resourceId)
    .populate('supervisorId', 'firstName lastName email')
    .populate('courseId', 'title');

  if (!resource) {
    return res.status(404).json({
      success: false,
      message: 'Resource not found'
    });
  }

  resource.status = 'approved';
  resource.approvedBy = userId;
  resource.approvedAt = new Date();
  await resource.save();

  // Notify the supervisor who uploaded the resource (PERSISTED)
  try {
    await notificationService.createNotification(resource.supervisorId._id.toString(), {
      type: 'resource',
      title: 'Resource Approved',
      message: `Your resource "${resource.title}" for ${(resource.courseId as any).title} has been approved and is now visible to enrolled students.`,
      fromRole: 'Admin',
      urgent: false,
      data: {
        fromUserId: userId,
        resourceId: resource._id,
        courseId: resource.courseId._id,
        actionUrl: `/resources/${resource._id}`
      }
    });
  } catch (notificationError) {
    console.error('Failed to send resource approval notification:', notificationError);
  }

  // Notify enrolled students about the new resource (PERSISTED)
  try {
    const enrollments = await Enrollment.find({
      courseId: resource.courseId._id,
      status: 'active'
    }).select('studentId');

    if (enrollments.length > 0) {
      const studentIds = enrollments.map(e => e.studentId.toString());
      await notificationService.createBulkNotifications(studentIds, {
        type: 'resource',
        title: 'New Resource Available',
        message: `A new ${resource.type} "${resource.title}" is now available in ${(resource.courseId as any).title}`,
        fromRole: 'Admin',
        urgent: false,
        data: {
          fromUserId: userId,
          resourceId: resource._id,
          resourceTitle: resource.title,
          resourceType: resource.type,
          courseId: resource.courseId._id,
          courseTitle: (resource.courseId as any).title,
          actionUrl: `/courses/${resource.courseId._id}/resources/${resource._id}`
        }
      });
    }
  } catch (notificationError) {
    console.error('Failed to notify students about approved resource:', notificationError);
  }

  return res.status(200).json({
    success: true,
    message: 'Resource approved successfully',
    data: resource
  });
});

export const rejectResource = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  const { resourceId } = req.params;
  const { reason } = req.body;
  const { userId } = req as any;

  const resource = await CourseResource.findById(resourceId)
    .populate('supervisorId', 'firstName lastName email')
    .populate('courseId', 'title');

  if (!resource) {
    return res.status(404).json({
      success: false,
      message: 'Resource not found'
    });
  }

  resource.status = 'rejected';
  resource.rejectionReason = reason;
  resource.approvedBy = userId;
  resource.approvedAt = new Date();
  await resource.save();

  // Notify the supervisor who uploaded the resource (PERSISTED)
  try {
    const supervisorId = resource.supervisorId._id.toString();

    await notificationService.createNotification(supervisorId, {
      type: 'resource',
      title: 'Resource Rejected',
      message: `Your resource "${resource.title}" was not approved. Reason: ${reason}`,
      fromRole: 'Admin',
      urgent: true,
      data: {
        fromUserId: userId,
        resourceId: resource._id,
        courseId: resource.courseId._id,
        reason,
        actionUrl: `/supervisor/resources`
      }
    });
  } catch (notificationError) {
    console.error('Failed to send resource rejection notification:', notificationError);
  }

  return res.status(200).json({
    success: true,
    message: 'Resource rejected successfully',
    data: resource
  });
});