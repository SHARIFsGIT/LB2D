import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import User from '../models/User.model';
import Video from '../models/Video.model';
import CourseResource from '../models/CourseResource.model';
import emailService from '../services/email.service';
import { notifyAdmins, notifySupervisors, notifyStudents, notifyUser, notifyRoleHierarchy } from '../services/websocket.service';

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
      console.log(`Role approval confirmation email sent to ${userEmailData.email} for ${userEmailData.newRole} role`);
    } catch (emailError) {
      console.error(`Failed to send role approval email to ${userEmailData.email}:`, emailError);
    }

    // Send WebSocket notification for role approval
    try {
      // Notify the user
      await notifyUser(userId, {
        type: 'admin',
        title: 'Role Approved',
        message: `Your ${userEmailData.newRole} role request has been approved by an admin`,
        targetRole: userEmailData.newRole as any,
        urgent: true,
        data: {
          userId,
          newRole: userEmailData.newRole,
          timestamp: new Date()
        }
      });

      // Notify other admins about the approval
      await notifyAdmins({
        type: 'admin',
        title: 'Role Approved',
        message: `${userEmailData.firstName} ${userEmailData.lastName} has been approved as ${userEmailData.newRole}`,
        targetRole: 'Admin',
        data: {
          userId,
          userEmail: userEmailData.email,
          newRole: userEmailData.newRole,
          approvedBy: (req as any).userId,
          timestamp: new Date()
        }
      });

      // Notify supervisors if a new supervisor was approved
      if (userEmailData.newRole === 'Supervisor') {
        await notifySupervisors({
          type: 'admin',
          title: 'Welcome New Team Member',
          message: `${userEmailData.firstName} ${userEmailData.lastName} has joined the supervision team`,
          targetRole: 'Supervisor',
          data: {
            userId,
            newSupervisorName: `${userEmailData.firstName} ${userEmailData.lastName}`,
            newSupervisorEmail: userEmailData.email,
            approvalDate: new Date(),
            timestamp: new Date()
          }
        });

        // Notify admins to update supervisor salary & compensation analytics
        await notifyAdmins({
          type: 'supervisor_action',
          title: 'Analytics Update Required',
          message: `Supervisor compensation analytics require refresh. New supervisor approved: ${userEmailData.firstName} ${userEmailData.lastName}`,
          targetRole: 'Admin',
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
      console.log(`Role rejection notification email sent to ${userEmailData.email} for ${userEmailData.requestedRole} role`);
    } catch (emailError) {
      console.error(`Failed to send role rejection email to ${userEmailData.email}:`, emailError);
    }

    // Send WebSocket notification for role rejection
    try {
      // Notify the user
      await notifyUser(userId, {
        type: 'admin',
        title: 'Role Request Rejected',
        message: `Your ${userEmailData.requestedRole} role request has been rejected`,
        targetRole: originalRole as any,
        urgent: true,
        data: {
          userId,
          rejectedRole: userEmailData.requestedRole,
          rejectionReason: userEmailData.rejectionReason,
          timestamp: new Date()
        }
      });

      // Notify other admins about the rejection
      await notifyAdmins({
        type: 'admin',
        title: 'Role Request Rejected',
        message: `${userEmailData.firstName} ${userEmailData.lastName}'s ${userEmailData.requestedRole} request has been rejected`,
        targetRole: 'Admin',
        data: {
          userId,
          userEmail: userEmailData.email,
          rejectedRole: userEmailData.requestedRole,
          rejectionReason: userEmailData.rejectionReason,
          rejectedBy: (req as any).userId,
          timestamp: new Date()
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
      console.log(`Role change notification email sent to ${userEmailData.email}: ${originalRole} → ${userEmailData.newRole}`);
    } catch (emailError) {
      console.error(`Failed to send role change email to ${userEmailData.email}:`, emailError);
    }

    // Send WebSocket notification for direct role change
    try {
      // Notify the user
      await notifyUser(userId, {
        type: 'admin',
        title: 'Role Changed',
        message: `Your role has been changed from ${originalRole} to ${userEmailData.newRole} by an admin`,
        targetRole: userEmailData.newRole as any,
        urgent: true,
        data: {
          userId,
          oldRole: originalRole,
          newRole: userEmailData.newRole,
          timestamp: new Date()
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

  // Notify the supervisor who uploaded the video
  try {
    await notifyUser(video.uploadedBy._id.toString(), {
      type: 'video',
      title: 'Video Approved',
      message: `Your video "${video.title}" has been approved and is now visible to students.`,
      data: { videoId: video._id, courseId: video.courseId._id }
    });
  } catch (notificationError) {
    console.error('Failed to send video approval notification:', notificationError);
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

  // Notify the supervisor who uploaded the video
  try {
    await notifyUser(video.uploadedBy._id.toString(), {
      type: 'video',
      title: 'Video Rejected',
      message: `Your video "${video.title}" has been rejected. Reason: ${reason}`,
      data: { videoId: video._id, courseId: video.courseId._id, reason }
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

  // Notify the supervisor who uploaded the resource
  try {
    await notifyUser(resource.supervisorId._id.toString(), {
      type: 'document',
      title: 'Resource Approved',
      message: `Your resource "${resource.title}" has been approved and is now visible to students.`,
      data: { resourceId: resource._id, courseId: resource.courseId._id }
    });
  } catch (notificationError) {
    console.error('Failed to send resource approval notification:', notificationError);
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

  // Notify the supervisor who uploaded the resource
  try {
    await notifyUser(resource.supervisorId._id.toString(), {
      type: 'document',
      title: 'Resource Rejected',
      message: `Your resource "${resource.title}" has been rejected. Reason: ${reason}`,
      data: { resourceId: resource._id, courseId: resource.courseId._id, reason }
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