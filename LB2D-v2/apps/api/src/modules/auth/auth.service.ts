import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EmailService } from '@/common/email/email.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly MAX_DEVICES = 2;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto, ipAddress?: string, userAgent?: string) {
    const { email, password, firstName, lastName, role, phone, deviceName, fingerprint } =
      registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate email verification token
    const emailVerificationToken = this.generateToken();
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24); // 24 hours

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role: role, // Role assigned as requested
        phone,
        emailVerificationToken,
        emailVerificationExpires,
        isEmailVerified: false,
        isActive: true,
      },
    });

    // Send verification email (async, non-blocking)
    this.emailService.sendVerificationEmail(user.email, emailVerificationToken, firstName)
      .catch(err => console.error('Failed to send verification email:', err));

    // Generate device ID
    const deviceId = fingerprint || this.generateDeviceId();

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      deviceId,
    );

    // Create device session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.deviceSession.create({
      data: {
        userId: user.id,
        deviceId,
        deviceName: deviceName || 'Unknown Device',
        fingerprint,
        refreshToken,
        userAgent,
        ipAddress,
        loginTime: new Date(),
        lastActivityAt: new Date(),
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
      },
      accessToken,
      refreshToken,
      message: 'Registration successful. Please verify your email.',
    };
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const { email, password, deviceName, fingerprint } = loginDto;

    // Validate user credentials
    const user = await this.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    // Generate or use existing device ID
    const deviceId = fingerprint || this.generateDeviceId();

    // Check existing device sessions
    const existingSessions = await this.prisma.deviceSession.findMany({
      where: {
        userId: user.id,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        loginTime: 'desc',
      },
    });

    // Check if this device already has a session (always delete old session for same device)
    const existingDevice = existingSessions.find(
      (session) => session.deviceId === deviceId || session.fingerprint === fingerprint,
    );

    if (existingDevice) {
      // Delete the existing session for this device
      await this.prisma.deviceSession.delete({
        where: { id: existingDevice.id },
      });
    } else if (existingSessions.length >= this.MAX_DEVICES) {
      // New device and at max limit
      throw new BadRequestException(
        `Maximum ${this.MAX_DEVICES} devices allowed. Please logout from another device.`,
      );
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      deviceId,
    );

    // Create new device session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.deviceSession.create({
      data: {
        userId: user.id,
        deviceId,
        deviceName: deviceName || 'Unknown Device',
        fingerprint,
        refreshToken,
        userAgent,
        ipAddress,
        loginTime: new Date(),
        lastActivityAt: new Date(),
        expiresAt,
      },
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
      },
      accessToken,
      refreshToken,
      message: 'Login successful',
    };
  }

  /**
   * Refresh access token
   */
  async refreshTokens(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Find device session
      const deviceSession = await this.prisma.deviceSession.findFirst({
        where: {
          userId: payload.sub,
          refreshToken,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });

      if (!deviceSession) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (!deviceSession.user.isActive) {
        throw new UnauthorizedException('Account has been deactivated');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(
        deviceSession.user.id,
        deviceSession.user.email,
        deviceSession.user.role,
        deviceSession.deviceId,
      );

      // Update device session with new refresh token
      await this.prisma.deviceSession.update({
        where: { id: deviceSession.id },
        data: {
          refreshToken: tokens.refreshToken,
          lastActivityAt: new Date(),
        },
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Update user
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    return {
      message: 'Email verified successfully',
    };
  }

  /**
   * Forgot password - send reset email
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Don't reveal if email exists or not (security best practice)
    if (!user) {
      return {
        message: 'If the email exists, a password reset link has been sent',
      };
    }

    // Generate reset token
    const passwordResetToken = this.generateToken();
    const passwordResetExpires = new Date();
    passwordResetExpires.setHours(passwordResetExpires.getHours() + 1); // 1 hour

    // Save token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken,
        passwordResetExpires,
      },
    });

    // Send password reset email (async, non-blocking)
    console.log('🔔 Attempting to send password reset email to:', user.email);
    console.log('📧 Reset token:', passwordResetToken);
    console.log('🔗 Reset URL will be:', `${process.env.CLIENT_URL}/reset-password?token=${passwordResetToken}`);

    this.emailService.sendPasswordResetEmail(user.email, passwordResetToken, user.firstName)
      .then(() => {
        console.log('✅ Password reset email sent successfully to:', user.email);
      })
      .catch(err => {
        console.error('❌ Failed to send password reset email:', err);
        console.error('Error details:', err.message);
        console.error('Stack:', err.stack);
      });

    return {
      message: 'If the email exists, a password reset link has been sent',
    };
  }

  /**
   * Reset password
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Invalidate all sessions (force re-login)
    await this.prisma.deviceSession.deleteMany({
      where: { userId: user.id },
    });

    return {
      message: 'Password reset successful. Please login with your new password.',
    };
  }

  /**
   * Logout from device
   */
  async logout(userId: string, deviceId: string) {
    await this.prisma.deviceSession.deleteMany({
      where: {
        userId,
        deviceId,
      },
    });

    return {
      message: 'Logged out successfully',
    };
  }

  /**
   * Logout from all devices
   */
  async logoutFromAllDevices(userId: string) {
    await this.prisma.deviceSession.deleteMany({
      where: { userId },
    });

    return {
      message: 'Logged out from all devices successfully',
    };
  }

  /**
   * Logout from specific device
   */
  async logoutFromDevice(userId: string, targetDeviceId: string) {
    const session = await this.prisma.deviceSession.findFirst({
      where: {
        userId,
        deviceId: targetDeviceId,
      },
    });

    if (!session) {
      throw new NotFoundException('Device session not found');
    }

    await this.prisma.deviceSession.delete({
      where: { id: session.id },
    });

    return {
      message: 'Logged out from device successfully',
    };
  }

  /**
   * Get active device sessions
   */
  async getDeviceSessions(userId: string) {
    const sessions = await this.prisma.deviceSession.findMany({
      where: {
        userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        deviceId: true,
        deviceName: true,
        loginTime: true,
        lastActivityAt: true,
        userAgent: true,
        ipAddress: true,
      },
      orderBy: {
        loginTime: 'desc',
      },
    });

    return { sessions };
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    deviceId: string,
  ) {
    const payload = {
      sub: userId,
      email,
      role,
      deviceId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Generate random token
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate device ID
   */
  private generateDeviceId(): string {
    return `device_${Date.now()}_${randomBytes(16).toString('hex')}`;
  }
}
