import { Request, Response } from 'express';
import User from '../models/User.model';
import notificationService from '../services/notification.service';
import logger from '../utils/logger';

// Update user profile
export const updateProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;
    const { firstName, lastName, phone, profilePhoto } = req.body;
    // Validate required fields
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required'
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    // Update only allowed fields
    const allowedUpdates = { firstName, lastName, phone, profilePhoto };
    
    // Remove undefined values
    Object.keys(allowedUpdates).forEach(key => {
      if (allowedUpdates[key as keyof typeof allowedUpdates] === undefined) {
        delete allowedUpdates[key as keyof typeof allowedUpdates];
      }
    });
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      allowedUpdates,
      { new: true, runValidators: true }
    ).select('-password -refreshToken -emailVerificationToken -passwordResetToken -otpCode');

    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update user'
      });
    }

    // Notify user about profile update (PERSISTED)
    try {
      const updatedFields = Object.keys(allowedUpdates).join(', ');
      await notificationService.createNotification(userId, {
        type: 'general',
        title: 'Profile Updated',
        message: `Your profile settings have been updated successfully.`,
        fromRole: updatedUser.role as any,
        urgent: false,
        data: {
          fromUserId: userId,
          updatedFields: allowedUpdates,
          actionUrl: '/settings'
        }
      });
    } catch (notificationError) {
      logger.error('Failed to send profile update notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error: any) {
    logger.error('Profile update error:', error);
    
    // Check if it's a validation error
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Check if it's a duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate field error',
        error: 'A user with this information already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// Get user profile
export const getProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;

    const user = await User.findById(userId).select('-password -refreshToken -emailVerificationToken -passwordResetToken -otpCode');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error: any) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

// Clear rejection notification
export const clearRejectionNotification = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Clear rejection information
    user.rejectionReason = undefined;
    user.rejectionDate = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Rejection notification cleared successfully'
    });
  } catch (error: any) {
    logger.error('Clear rejection notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear rejection notification',
      error: error.message
    });
  }
};