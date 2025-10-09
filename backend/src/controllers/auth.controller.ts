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
  const result = await authService.login(req.body);
  
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

  if (!phoneDigits) {
    return res.status(400).json({
      success: false,
      message: 'Phone verification is required'
    });
  }

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