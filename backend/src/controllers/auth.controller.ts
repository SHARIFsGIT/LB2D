import { NextFunction, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.middleware';
import authService from '../services/auth.service';
import { ResponseUtil } from '../utils/response.util';
import User from '../models/User.model';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.utils';
import emailService from '../services/email.service';

// Register new user
export const register = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const result = await authService.register(req.body);
  
  return ResponseUtil.created(res, result.message, {
    user: result.user,
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken
  });
});

// Login user
export const login = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const userAgent = req.get('user-agent') || 'Unknown';
  const result = await authService.login(req.body, userAgent);

  return ResponseUtil.success(res, 'Login successful', result);
});

// Verify email
export const verifyEmail = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const { token } = req.query;
  const result = await authService.verifyEmail(token as string);
  
  return ResponseUtil.success(res, result.message);
});

// Request OTP
export const requestOTP = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const { email } = req.body;
  const result = await authService.requestOTP(email);
  
  return ResponseUtil.success(res, result.message);
});

// Verify OTP
export const verifyOTP = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const { email, otp } = req.body;
  const userAgent = req.get('user-agent') || 'Unknown';

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

  // Check device limit
  if (user.deviceSessions && user.deviceSessions.length >= 2) {
    return res.status(403).json({
      success: false,
      message: 'Maximum device limit reached. Please logout from another device first.'
    });
  }

  // Clear OTP
  user.otpCode = undefined;
  user.otpExpires = undefined;

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);

  // Add device session
  user.deviceSessions.push({
    deviceId: refreshToken,
    refreshToken: refreshToken,
    loginTime: new Date(),
    userAgent: userAgent
  });

  // Update refresh token (for backward compatibility)
  user.refreshToken = refreshToken;
  await user.save();

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
  const result = await authService.forgotPassword(email);

  return ResponseUtil.success(res, result.message);
});

// Get masked phone for reset password verification display
export const getMaskedPhone = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Token is required'
    });
  }

  const result = await authService.getMaskedPhone(token as string);

  return res.status(200).json({
    success: true,
    maskedPhone: result.maskedPhone
  });
});

// Verify phone digits for password reset
export const verifyPhoneDigits = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const { token, phoneDigits } = req.body;

  if (!token || !phoneDigits) {
    return res.status(400).json({
      success: false,
      message: 'Token and phone digits are required'
    });
  }

  const result = await authService.verifyPhoneDigits(token, phoneDigits);

  return res.status(200).json({
    success: true,
    message: 'Phone digits verified successfully',
    verified: result.verified
  });
});

// Reset password
export const resetPassword = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const { token } = req.query;
  const { password, phoneDigits } = req.body;

  if (!token || !password) {
    return res.status(400).json({
      success: false,
      message: 'Token and new password are required'
    });
  }

  // phoneDigits is now optional - only used for users with phone numbers
  const result = await authService.resetPassword(token as string, password, phoneDigits);

  return res.status(200).json({
    success: true,
    message: result.message
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

    // Check if refresh token exists in device sessions
    const deviceSession = user?.deviceSessions.find(
      session => session.refreshToken === refreshToken
    );

    if (!user || !deviceSession) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    // Update device session with new refresh token
    const sessionIndex = user.deviceSessions.findIndex(
      session => session.refreshToken === refreshToken
    );

    if (sessionIndex !== -1) {
      user.deviceSessions[sessionIndex].refreshToken = tokens.refreshToken;
      user.deviceSessions[sessionIndex].deviceId = tokens.refreshToken;
    }

    // Update refresh token (for backward compatibility)
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
  const { refreshToken } = req.body;

  const user = await User.findById(userId);
  if (user) {
    // Remove the specific device session
    if (refreshToken) {
      user.deviceSessions = user.deviceSessions.filter(
        session => session.refreshToken !== refreshToken
      );
    } else {
      // If no refresh token provided, clear all sessions
      user.deviceSessions = [];
    }

    // Clear refresh token (for backward compatibility)
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

// Get user's active device sessions
export const getDeviceSessions = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const userId = (req as any).userId;

  const user = await User.findById(userId).select('deviceSessions');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get current refresh token from query parameter
  const currentRefreshToken = req.query.refreshToken as string;

  // Sort sessions by login time (most recent first)
  const sortedSessions = [...user.deviceSessions].sort(
    (a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime()
  );

  // Format device sessions for frontend
  const formattedSessions = sortedSessions.map((session, index) => ({
    deviceId: session.deviceId,
    loginTime: session.loginTime,
    userAgent: session.userAgent || 'Unknown Device',
    isCurrent: currentRefreshToken ? session.refreshToken === currentRefreshToken : index === 0
  }));

  return res.status(200).json({
    success: true,
    data: {
      sessions: formattedSessions,
      totalSessions: formattedSessions.length,
      maxSessions: 2
    }
  });
});

// Logout from a specific device
export const logoutFromDevice = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<any> => {
  const userId = (req as any).userId;
  const { deviceId } = req.params;

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Find the device session
  const sessionIndex = user.deviceSessions.findIndex(
    session => session.deviceId === deviceId
  );

  if (sessionIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Device session not found'
    });
  }

  // Remove the device session
  user.deviceSessions.splice(sessionIndex, 1);
  await user.save();

  return res.status(200).json({
    success: true,
    message: 'Logged out from device successfully'
  });
});