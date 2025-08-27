import { NextFunction, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import User from '../models/User.model';
import emailService from '../services/email.service';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.utils';
import { notifyAdmins, broadcast } from '../services/websocket.service';

// Register new user
export const register = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const { email, password, role = 'Student', firstName, lastName, phone } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this email already exists'
    });
  }

  // Handle role assignment based on request
  let actualRole = role;
  let requestedRole = role;
  
  // All roles require admin approval, assign Pending temporarily 
  actualRole = 'Pending'; // Temporarily assign Pending role
  requestedRole = role;   // Store the requested role for admin review

  // Create new user
  const user = await User.create({
    email,
    password,
    role: actualRole,
    requestedRole: requestedRole,
    firstName,
    lastName,
    phone
  });

  // Generate email verification token
  const verificationToken = user.createEmailVerificationToken();
  await user.save();

  // Send verification email
  try {
    const emailResult = await emailService.sendVerificationEmail(user.email, verificationToken, user.firstName);
  } catch (error: any) {
    console.error('Error sending verification email:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response,
      stack: error.stack
    });
  }

  // Send admin notification for all role requests
  if (requestedRole) {
    try {
      await emailService.sendAdminNotificationEmail(
        user.email, 
        `${user.firstName} ${user.lastName}`, 
        requestedRole
      );
      console.log(`Admin notification sent for ${requestedRole} registration: ${user.email}`);
    } catch (error: any) {
      console.error('Error sending admin notification:', error);
    }
  }

  // Send real-time WebSocket notification to admins
  try {
    await notifyAdmins({
      type: 'user_registration',
      title: 'New User Registration',
      message: `${user.firstName} ${user.lastName} registered as ${requestedRole}`,
      targetRole: 'Admin',
      urgent: requestedRole === 'Admin',
      data: {
        userId: user._id?.toString(),
        email: user.email,
        role: requestedRole,
        timestamp: new Date()
      }
    });
    
    // Send general notification to all users about platform growth
    await broadcast({
      type: 'general',
      title: 'Platform Update',
      message: `Welcome new ${requestedRole.toLowerCase()} to our learning community!`,
      targetRole: 'all',
      data: {
        type: 'new_member',
        timestamp: new Date()
      }
    });
  } catch (error: any) {
    console.error('Error sending WebSocket notification:', error);
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);
  
  // Save refresh token to user
  user.refreshToken = refreshToken;
  await user.save();

  // Customize message based on role request
  let message = `Registration successful! You requested ${requestedRole} privileges. An admin has been notified and will review your request. You currently have Pending access. Please check your email to verify your account.`;

  return res.status(201).json({
    success: true,
    message,
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        requestedRole: user.requestedRole,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt
      },
      accessToken,
      refreshToken
    }
  });
});

// Login user
export const login = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password'
    });
  }

  // Find user and include password
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check if email is verified
  if (!user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email before logging in'
    });
  }

  // Check if user is active
  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been deactivated'
    });
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);
  
  // Update user's refresh token and last login
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save();

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        requestedRole: user.requestedRole,
        rejectionReason: user.rejectionReason,
        rejectionDate: user.rejectionDate,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt
      },
      accessToken,
      refreshToken
    }
  });
});

// Verify email
export const verifyEmail = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const { token } = req.query;

  console.log('Email verification attempt:', {
    token: token,
    tokenType: typeof token,
    tokenLength: token ? String(token).length : 0
  });

  if (!token) {
    console.log('No token provided in request');
    return res.status(400).json({
      success: false,
      message: 'Verification token is required'
    });
  }

  console.log('Searching for user with token:', token);
  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() }
  });

  console.log('User found:', user ? `${user.email} (${user._id})` : 'No user found');

  if (!user) {
    // Let's also check if there's a user with this token but expired
    const expiredUser = await User.findOne({ emailVerificationToken: token });
    console.log('Expired token check:', expiredUser ? `Found user ${expiredUser.email} but token expired` : 'No user with this token at all');
    
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired verification token'
    });
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  console.log('Email verified successfully for user:', user.email);

  return res.status(200).json({
    success: true,
    message: 'Email verified successfully'
  });
});

// Request OTP
export const requestOTP = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Generate OTP
  const otp = user.createOTP();
  await user.save();

  // Send OTP via email
  try {
    await emailService.sendOTPEmail(user.email, otp, user.firstName);
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }

  return res.status(200).json({
    success: true,
    message: 'OTP sent to your email'
  });
});

// Verify OTP
export const verifyOTP = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const { email, otp } = req.body;

  const user = await User.findOne({
    email,
    otpCode: otp,
    otpExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired OTP'
    });
  }

  // Clear OTP
  user.otpCode = undefined;
  user.otpExpires = undefined;
  await user.save();

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);

  return res.status(200).json({
    success: true,
    message: 'OTP verified successfully',
    data: {
      accessToken,
      refreshToken
    }
  });
});

// Forgot password
export const forgotPassword = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Generate reset token
  const resetToken = user.createPasswordResetToken();
  await user.save();

  // Send reset email
  try {
    await emailService.sendPasswordResetEmail(user.email, resetToken, user.firstName);
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    
    return res.status(500).json({
      success: false,
      message: 'Failed to send reset email'
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Password reset link sent to your email'
  });
});

// Reset password
export const resetPassword = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const { token } = req.query;
  const { password } = req.body;

  if (!token || !password) {
    return res.status(400).json({
      success: false,
      message: 'Token and new password are required'
    });
  }

  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired reset token'
    });
  }

  // Update password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return res.status(200).json({
    success: true,
    message: 'Password reset successful'
  });
});

// Refresh token
export const refreshToken = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required'
    });
  }

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Find user
    const user = await User.findById(decoded.userId);
    
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user);
    
    // Update refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return res.status(200).json({
      success: true,
      data: tokens
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

// Logout
export const logout = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const userId = (req as any).userId; // We'll add this from auth middleware
  
  const user = await User.findById(userId);
  if (user) {
    user.refreshToken = undefined;
    await user.save();
  }

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Resend OTP
export const resendOTP = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check if previous OTP is still valid
  if (user.otpExpires && user.otpExpires > new Date()) {
    return res.status(400).json({
      success: false,
      message: 'Previous OTP is still valid. Please wait before requesting a new one.'
    });
  }

  // Generate new OTP
  const otp = user.createOTP();
  await user.save();

  // Send OTP via email
  try {
    await emailService.sendOTPEmail(user.email, otp, user.firstName);
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }

  return res.status(200).json({
    success: true,
    message: 'New OTP sent to your email'
  });
});

// Validate token endpoint
export const validateToken = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  // If this endpoint is reached, the token is valid (protected by auth middleware)
  const userId = (req as any).userId;
  
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
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        requestedRole: user.requestedRole,
        rejectionReason: user.rejectionReason,
        rejectionDate: user.rejectionDate,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    }
  });
});