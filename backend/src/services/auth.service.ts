import User from '../models/User.model';
import emailService from './email.service';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.utils';
import { CustomError } from '../middleware/errorHandler.middleware';
import { notifyAdmins, broadcast } from './websocket.service';
import logger from '../utils/logger';

export interface RegisterUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: string;
}

export interface LoginUserData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: string;
    requestedRole?: string;
    rejectionReason?: string;
    rejectionDate?: Date;
    firstName: string;
    lastName: string;
    phone?: string;
    profilePhoto?: string;
    isEmailVerified: boolean;
    isActive: boolean;
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  async register(userData: RegisterUserData): Promise<{ message: string; user: any; tokens: any }> {
    const { email, password, role = 'Student', firstName, lastName, phone } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Allow re-registration for rejected users
      if (existingUser.rejectionReason && existingUser.rejectionDate) {
        // Delete the rejected user account to allow fresh registration
        await User.findByIdAndDelete(existingUser._id);
        logger.info(`Deleted rejected user account for re-registration: ${email}`);
      } else {
        throw new CustomError('User with this email already exists', 400);
      }
    }

    // Handle role assignment
    const actualRole = 'Pending'; // All roles require approval
    const requestedRole = role;

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
      await emailService.sendVerificationEmail(user.email, verificationToken, user.firstName);
      logger.info(`Verification email sent to ${user.email}`);
    } catch (error: any) {
      logger.error('Error sending verification email:', error);
    }

    // Send admin notification
    if (requestedRole) {
      try {
        await emailService.sendAdminNotificationEmail(
          user.email,
          `${user.firstName} ${user.lastName}`,
          requestedRole
        );
        logger.info(`Admin notification sent for ${requestedRole} registration: ${user.email}`);
      } catch (error: any) {
        logger.error('Error sending admin notification:', error);
      }
    }

    // Send WebSocket notifications
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
      logger.error('Error sending WebSocket notification:', error);
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Add device session for registration
    user.deviceSessions.push({
      deviceId: tokens.refreshToken,
      refreshToken: tokens.refreshToken,
      loginTime: new Date(),
      userAgent: 'Registration'
    });

    // Save refresh token (for backward compatibility)
    user.refreshToken = tokens.refreshToken;
    await user.save();

    const message = `Registration successful! You requested ${requestedRole} privileges. An admin has been notified and will review your request. You currently have Pending access. Please check your email to verify your account.`;

    return {
      message,
      user: this.formatUserResponse(user),
      tokens
    };
  }

  async login(userData: LoginUserData, userAgent?: string): Promise<AuthResponse> {
    const { email, password } = userData;

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw new CustomError('Invalid credentials', 401);
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      throw new CustomError('Invalid credentials', 401);
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new CustomError('Please verify your email before logging in', 403);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new CustomError('Your account has been deactivated', 403);
    }

    // Check device limit (maximum 2 devices)
    if (user.deviceSessions && user.deviceSessions.length >= 2) {
      throw new CustomError('Maximum device limit reached. Please logout from another device first.', 403);
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Generate unique device ID
    const deviceId = tokens.refreshToken; // Using refresh token as unique device identifier

    // Add new device session
    user.deviceSessions.push({
      deviceId,
      refreshToken: tokens.refreshToken,
      loginTime: new Date(),
      userAgent: userAgent || 'Unknown'
    });

    // Update user's refresh token and last login (keep for backward compatibility)
    user.refreshToken = tokens.refreshToken;
    user.lastLogin = new Date();
    await user.save();

    return {
      user: this.formatUserResponse(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    if (!token) {
      throw new CustomError('Verification token is required', 400);
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new CustomError('Invalid or expired verification token', 400);
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    logger.info(`Email verified successfully for user: ${user.email}`);

    return { message: 'Email verified successfully' };
  }

  async requestOTP(email: string): Promise<{ message: string }> {
    const user = await User.findOne({ email });
    
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    // Generate OTP
    const otp = user.createOTP();
    await user.save();

    // Send OTP via email
    try {
      await emailService.sendOTPEmail(user.email, otp, user.firstName);
      logger.info(`OTP sent to ${user.email}`);
    } catch (error) {
      logger.error('Error sending OTP:', error);
      throw new CustomError('Failed to send OTP', 500);
    }

    return { message: 'OTP sent to your email' };
  }

  async verifyOTP(email: string, otp: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await User.findOne({
      email,
      otpCode: otp,
      otpExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new CustomError('Invalid or expired OTP', 400);
    }

    // Clear OTP
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Generate tokens
    const tokens = generateTokens(user);

    return tokens;
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await User.findOne({ email });

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    // Generate reset token (no OTP needed)
    const resetToken = user.createPasswordResetToken();
    await user.save();

    // Send reset email
    try {
      await emailService.sendPasswordResetEmail(user.email, resetToken, user.firstName);
      logger.info(`Password reset email sent to ${user.email}`);
    } catch (error: any) {
      logger.error('Error sending password reset email:', error);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      throw new CustomError(`Failed to send reset email: ${error.message || error}`, 500);
    }

    return { message: 'Password reset link sent to your email' };
  }

  async getMaskedPhone(token: string): Promise<{ maskedPhone: string | null }> {
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new CustomError('Invalid or expired reset token', 400);
    }

    // Return null if no phone number (phone verification is now optional)
    if (!user.phone) {
      return { maskedPhone: null };
    }

    // Mask the middle 6 digits of the phone number
    const phone = user.phone;
    if (phone.length < 10) {
      return { maskedPhone: null };
    }

    // Calculate where to hide the 6 digits (from the middle)
    const totalLength = phone.length;
    const startHidden = Math.floor((totalLength - 6) / 2);
    const endHidden = startHidden + 6;

    const maskedPhone =
      phone.substring(0, startHidden) +
      '******' +
      phone.substring(endHidden);

    return { maskedPhone };
  }

  async verifyPhoneDigits(token: string, phoneDigits: string): Promise<{ verified: boolean }> {
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new CustomError('Invalid or expired reset token', 400);
    }

    // If no phone, skip verification (phone verification is now optional)
    if (!user.phone) {
      return { verified: true };
    }

    // Extract the middle 6 digits from the actual phone number
    const phone = user.phone;
    if (phone.length < 10) {
      return { verified: true };
    }

    const totalLength = phone.length;
    const startHidden = Math.floor((totalLength - 6) / 2);
    const endHidden = startHidden + 6;
    const actualDigits = phone.substring(startHidden, endHidden);

    if (actualDigits !== phoneDigits) {
      throw new CustomError('Phone number verification failed', 400);
    }

    return { verified: true };
  }

  async resetPassword(token: string, password: string, phoneDigits?: string): Promise<{ message: string }> {
    if (!token || !password) {
      throw new CustomError('Token and new password are required', 400);
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new CustomError('Invalid or expired reset token', 400);
    }

    // Verify phone digits only if user has a phone number and phoneDigits provided
    if (user.phone && phoneDigits) {
      const phone = user.phone;
      if (phone.length >= 10) {
        const totalLength = phone.length;
        const startHidden = Math.floor((totalLength - 6) / 2);
        const endHidden = startHidden + 6;
        const actualDigits = phone.substring(startHidden, endHidden);

        if (actualDigits !== phoneDigits) {
          throw new CustomError('Phone number verification failed', 400);
        }
      }
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    logger.info(`Password reset successful for user: ${user.email}`);

    return { message: 'Password reset successful' };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshToken) {
      throw new CustomError('Refresh token is required', 400);
    }

    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      
      // Find user
      const user = await User.findById(decoded.userId);
      
      if (!user || user.refreshToken !== refreshToken) {
        throw new CustomError('Invalid refresh token', 401);
      }

      // Generate new tokens
      const tokens = generateTokens(user);
      
      // Update refresh token
      user.refreshToken = tokens.refreshToken;
      await user.save();

      return tokens;
    } catch (error) {
      throw new CustomError('Invalid refresh token', 401);
    }
  }

  async logout(userId: string): Promise<{ message: string }> {
    const user = await User.findById(userId);
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }

    return { message: 'Logged out successfully' };
  }

  async validateToken(userId: string): Promise<{ user: any }> {
    const user = await User.findById(userId)
      .select('-password -refreshToken -emailVerificationToken -passwordResetToken -otpCode');
    
    if (!user) {
      throw new CustomError('User not found', 404);
    }
    
    return { user: this.formatUserResponse(user) };
  }

  private formatUserResponse(user: any) {
    return {
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
    };
  }
}

export default new AuthService();