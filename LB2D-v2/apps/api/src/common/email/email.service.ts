import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private fromEmail: string;
  private clientUrl: string;
  private readonly MAX_RETRIES = 3;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') || 'noreply@lb2d.com';
    this.clientUrl = this.configService.get<string>('CLIENT_URL') || 'http://localhost:3000';

    console.log('EMAIL SERVICE CONFIGURATION:');
    console.log('   RESEND_API_KEY:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');
    console.log('   EMAIL_FROM:', this.fromEmail);
    console.log('   CLIENT_URL:', this.clientUrl);

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('✅ Email service initialized with Resend API');
      this.logger.log(`Emails will be sent from: ${this.fromEmail}`);
    } else {
      this.logger.warn('⚠️ RESEND_API_KEY not configured - emails will not be sent');
    }
  }

  /**
   * Send email with retry logic
   */
  private async sendWithRetry(options: EmailOptions, retries = this.MAX_RETRIES): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Email service not configured - skipping email send');
      return;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.resend.emails.send({
          from: this.fromEmail,
          ...options,
        });

        this.logger.log(`✅ Email sent to ${options.to}: ${options.subject}`);
        return;
      } catch (error) {
        this.logger.error(`❌ Email send attempt ${attempt}/${retries} failed:`, error);

        if (attempt === retries) {
          this.logger.error(`Failed to send email to ${options.to} after ${retries} attempts`);
          // Don't throw - email failures shouldn't break the application
          return;
        }

        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  /**
   * Send email via Gmail SMTP (for contact form notifications)
   */
  private async sendViaGmail(options: EmailOptions): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: parseInt(this.configService.get<string>('EMAIL_PORT') || '587'),
      secure: false,
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });

    try {
      await transporter.sendMail({
        from: this.configService.get<string>('EMAIL_USER'),
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      this.logger.log(`✅ Email sent via Gmail to ${options.to}: ${options.subject}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send email via Gmail to ${options.to}`, error);
      throw error;
    }
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(email: string, token: string, firstName: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Email service not configured');
      return;
    }

    const verificationUrl = `${this.configService.get('CLIENT_URL')}/email-verification?token=${token}`;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Verify Your Email - LB2D',
        html: this.getVerificationEmailTemplate(firstName, verificationUrl),
      });

      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string, firstName: string): Promise<void> {
    console.log('sendPasswordResetEmail called with:');
    console.log('   To:', email);
    console.log('   Token:', token);
    console.log('   First Name:', firstName);

    const resetUrl = `${this.configService.get('CLIENT_URL')}/reset-password?token=${token}`;
    console.log('🔗 Reset URL:', resetUrl);

    // Try Resend first, then fallback to Gmail SMTP
    if (!this.resend) {
      this.logger.warn('⚠️ Resend not configured - attempting Gmail SMTP fallback');
      console.log('⚠️ Resend is not initialized, trying Gmail SMTP...');

      const gmailUser = this.configService.get<string>('EMAIL_USER');
      const gmailPass = this.configService.get<string>('EMAIL_PASS');

      if (!gmailUser || !gmailPass) {
        this.logger.error('❌ Email service not configured - neither Resend nor Gmail SMTP is available');
        console.log('❌ Cannot send email - No email service is configured');
        console.log('   Please configure either:');
        console.log('   1. RESEND_API_KEY in .env file, OR');
        console.log('   2. EMAIL_USER and EMAIL_PASS for Gmail SMTP');
        throw new Error('Email service not configured');
      }

      try {
        await this.sendViaGmail({
          to: email,
          subject: 'Reset Your Password - LB2D',
          html: this.getPasswordResetTemplate(firstName, resetUrl),
        });

        console.log('✅ Password reset email sent via Gmail SMTP to', email);
        this.logger.log(`✅ Password reset email sent via Gmail SMTP to ${email}`);
        return;
      } catch (error) {
        console.error('❌ Gmail SMTP error:', error);
        this.logger.error(`❌ Failed to send password reset email via Gmail to ${email}`, error);
        throw error;
      }
    }

    console.log('📤 Sending email from:', this.fromEmail);

    try {
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Reset Your Password - LB2D',
        html: this.getPasswordResetTemplate(firstName, resetUrl),
      });

      console.log('✅ Resend API response:', result);
      this.logger.log(`✅ Password reset email sent to ${email}`);
    } catch (error) {
      console.error('❌ Resend API error:', error);
      this.logger.error(`❌ Failed to send password reset email to ${email}`, error);
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    await this.sendWithRetry({
      to: email,
      subject: 'Welcome to LB2D! 🎉',
      html: this.getWelcomeEmailTemplate(firstName),
    });
  }

  /**
   * Send enrollment confirmation email
   */
  async sendEnrollmentConfirmation(
    email: string,
    firstName: string,
    courseName: string,
    courseId: string
  ): Promise<void> {
    await this.sendWithRetry({
      to: email,
      subject: `Enrollment Confirmed - ${courseName}`,
      html: this.getEnrollmentConfirmationTemplate(firstName, courseName, courseId),
    });
  }

  /**
   * Send certificate email with PDF attachment
   */
  async sendCertificateEmail(
    email: string,
    firstName: string,
    courseName: string,
    certificateId: string,
    certificateUrl: string
  ): Promise<void> {
    await this.sendWithRetry({
      to: email,
      subject: `🎓 Your Certificate is Ready - ${courseName}`,
      html: this.getCertificateEmailTemplate(firstName, courseName, certificateId, certificateUrl),
    });
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(
    email: string,
    firstName: string,
    courseName: string,
    amount: number,
    currency: string
  ): Promise<void> {
    await this.sendWithRetry({
      to: email,
      subject: `Payment Confirmed - ${courseName}`,
      html: this.getPaymentConfirmationTemplate(firstName, courseName, amount, currency),
    });
  }

  /**
   * Send video approval notification
   */
  async sendVideoApprovalNotification(
    email: string,
    firstName: string,
    videoTitle: string,
    courseTitle: string
  ): Promise<void> {
    await this.sendWithRetry({
      to: email,
      subject: `✅ Video Approved - ${videoTitle}`,
      html: this.getVideoApprovalTemplate(firstName, videoTitle, courseTitle),
    });
  }

  /**
   * Send video rejection notification
   */
  async sendVideoRejectionNotification(
    email: string,
    firstName: string,
    videoTitle: string,
    courseTitle: string,
    rejectionReason: string
  ): Promise<void> {
    await this.sendWithRetry({
      to: email,
      subject: `❌ Video Rejected - ${videoTitle}`,
      html: this.getVideoRejectionTemplate(firstName, videoTitle, courseTitle, rejectionReason),
    });
  }

  /**
   * Send resource approval notification
   */
  async sendResourceApprovalNotification(
    email: string,
    firstName: string,
    resourceTitle: string,
    courseTitle: string
  ): Promise<void> {
    await this.sendWithRetry({
      to: email,
      subject: `✅ Resource Approved - ${resourceTitle}`,
      html: this.getResourceApprovalTemplate(firstName, resourceTitle, courseTitle),
    });
  }

  /**
   * Send resource rejection notification
   */
  async sendResourceRejectionNotification(
    email: string,
    firstName: string,
    resourceTitle: string,
    courseTitle: string,
    rejectionReason: string
  ): Promise<void> {
    await this.sendWithRetry({
      to: email,
      subject: `❌ Resource Rejected - ${resourceTitle}`,
      html: this.getResourceRejectionTemplate(
        firstName,
        resourceTitle,
        courseTitle,
        rejectionReason
      ),
    });
  }

  /**
   * Send role change approval notification
   */
  async sendRoleChangeApprovalNotification(
    email: string,
    firstName: string,
    newRole: string
  ): Promise<void> {
    await this.sendWithRetry({
      to: email,
      subject: `🎉 Role Change Approved - ${newRole}`,
      html: this.getRoleChangeApprovalTemplate(firstName, newRole),
    });
  }

  /**
   * Send role change rejection notification
   */
  async sendRoleChangeRejectionNotification(
    email: string,
    firstName: string,
    requestedRole: string,
    rejectionReason: string
  ): Promise<void> {
    await this.sendWithRetry({
      to: email,
      subject: `Role Change Request - Update`,
      html: this.getRoleChangeRejectionTemplate(firstName, requestedRole, rejectionReason),
    });
  }

  /**
   * Send urgent notification email
   */
  async sendUrgentNotification(
    email: string,
    firstName: string,
    title: string,
    message: string
  ): Promise<void> {
    await this.sendWithRetry({
      to: email,
      subject: `🔔 ${title}`,
      html: this.getUrgentNotificationTemplate(firstName, title, message),
    });
  }

  /**
   * Email verification template
   */
  private getVerificationEmailTemplate(firstName: string, verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #f59e0b, #ef4444); padding: 30px; text-align: center; color: white; }
            .content { background: #f9fafb; padding: 30px; }
            .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Learn Bangla to Deutsch</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName}!</h2>
              <p>Thank you for registering with LB2D. Please verify your email address to activate your account.</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
              <p>This link will expire in 24 hours.</p>
              <p>If you didn't create an account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 LB2D. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Password reset email template
   */
  private getPasswordResetTemplate(firstName: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #f59e0b, #ef4444); padding: 30px; text-align: center; color: white; }
            .content { background: #f9fafb; padding: 30px; }
            .button { display: inline-block; padding: 12px 30px; background: #ef4444; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
              <p>This link will expire in 1 hour.</p>
              <p><strong>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</strong></p>
            </div>
            <div class="footer">
              <p>&copy; 2025 LB2D. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Welcome email template
   */
  private getWelcomeEmailTemplate(firstName: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #f59e0b, #ef4444); padding: 30px; text-align: center; color: white; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to LB2D! 🎉</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>Welcome to Learn Bangla to Deutsch! We're excited to have you join our German language learning community.</p>
              <p>With LB2D, you can:</p>
              <ul>
                <li>Access comprehensive German language courses (A1-C2)</li>
                <li>Watch high-quality video lessons from native speakers</li>
                <li>Practice with interactive quizzes and assessments</li>
                <li>Download course resources and study materials</li>
                <li>Earn internationally recognized certificates</li>
              </ul>
              <p style="text-align: center;">
                <a href="${this.clientUrl}/courses" class="button">Browse Courses</a>
              </p>
              <p>Happy learning!</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 LB2D. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Enrollment confirmation template
   */
  private getEnrollmentConfirmationTemplate(
    firstName: string,
    courseName: string,
    courseId: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #f59e0b, #ef4444); padding: 30px; text-align: center; color: white; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Enrollment Confirmed!</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <div class="success-box">
                <strong>You're now enrolled in: ${courseName}</strong>
              </div>
              <p>Congratulations! Your enrollment has been confirmed. You now have full access to all course materials, videos, quizzes, and resources.</p>
              <h3>What's Next?</h3>
              <ul>
                <li>Watch the introductory videos</li>
                <li>Download course materials</li>
                <li>Complete quizzes to track your progress</li>
                <li>Interact with other students in discussions</li>
              </ul>
              <p style="text-align: center;">
                <a href="${this.clientUrl}/course/${courseId}/videos" class="button">Start Learning</a>
              </p>
              <p>Good luck with your German language journey!</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 LB2D. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Certificate email template
   */
  private getCertificateEmailTemplate(
    firstName: string,
    courseName: string,
    certificateId: string,
    certificateUrl: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #f59e0b, #ef4444); padding: 30px; text-align: center; color: white; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .certificate-box { background: white; border: 2px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Congratulations! Your Certificate is Ready</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>Congratulations on completing <strong>${courseName}</strong>! We're proud of your achievement.</p>
              <div class="certificate-box">
                <h3 style="color: #10b981; margin: 0;">Certificate of Completion</h3>
                <p style="margin: 10px 0;"><strong>Certificate ID:</strong> ${certificateId}</p>
                <p style="font-size: 14px; color: #6b7280;">This certificate verifies your successful completion of the course.</p>
              </div>
              <p style="text-align: center;">
                <a href="${certificateUrl}" class="button">Download Certificate (PDF)</a>
              </p>
              <p>Share your achievement on social media and with potential employers!</p>
              <p>Keep learning and exploring more courses to advance your German language skills.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 LB2D. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Payment confirmation template
   */
  private getPaymentConfirmationTemplate(
    firstName: string,
    courseName: string,
    amount: number,
    currency: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #f59e0b, #ef4444); padding: 30px; text-align: center; color: white; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .payment-summary { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💳 Payment Successful!</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>Thank you for your payment. Your enrollment has been confirmed!</p>
              <div class="payment-summary">
                <h3 style="margin-top: 0;">Payment Summary</h3>
                <p><strong>Course:</strong> ${courseName}</p>
                <p><strong>Amount Paid:</strong> ${currency} ${amount.toFixed(2)}</p>
                <p><strong>Status:</strong> <span style="color: #10b981;">Completed</span></p>
              </div>
              <p style="text-align: center;">
                <a href="${this.clientUrl}/my-courses" class="button">View My Courses</a>
              </p>
              <p>You can now access all course materials and start learning immediately.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 LB2D. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Video approval template
   */
  private getVideoApprovalTemplate(
    firstName: string,
    videoTitle: string,
    courseTitle: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #f59e0b, #ef4444); padding: 30px; text-align: center; color: white; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Video Approved!</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>Great news! Your video has been approved and is now live for students.</p>
              <p><span class="success-badge">APPROVED</span></p>
              <p><strong>Video:</strong> ${videoTitle}</p>
              <p><strong>Course:</strong> ${courseTitle}</p>
              <p>Students enrolled in this course can now watch your video. Keep up the great work!</p>
              <p style="text-align: center;">
                <a href="${this.clientUrl}/supervisor" class="button">View Dashboard</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2025 LB2D. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Video rejection template
   */
  private getVideoRejectionTemplate(
    firstName: string,
    videoTitle: string,
    courseTitle: string,
    rejectionReason: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444, #f59e0b, #10b981); padding: 30px; text-align: center; color: white; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .rejection-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Video Review Update</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>Your video submission requires some revisions before it can be published.</p>
              <p><strong>Video:</strong> ${videoTitle}</p>
              <p><strong>Course:</strong> ${courseTitle}</p>
              <div class="rejection-box">
                <strong>Feedback:</strong>
                <p>${rejectionReason}</p>
              </div>
              <p>Please review the feedback and resubmit your video with the necessary changes.</p>
              <p style="text-align: center;">
                <a href="${this.clientUrl}/supervisor/upload-video" class="button">Upload Revised Video</a>
              </p>
              <p>If you have questions, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 LB2D. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Resource approval template
   */
  private getResourceApprovalTemplate(
    firstName: string,
    resourceTitle: string,
    courseTitle: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #f59e0b, #ef4444); padding: 30px; text-align: center; color: white; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Resource Approved!</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>Your course resource has been approved and is now available for students.</p>
              <p><span class="success-badge">APPROVED</span></p>
              <p><strong>Resource:</strong> ${resourceTitle}</p>
              <p><strong>Course:</strong> ${courseTitle}</p>
              <p>Students can now download and access this resource. Thank you for contributing quality content!</p>
              <p style="text-align: center;">
                <a href="${this.clientUrl}/supervisor" class="button">View Dashboard</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2025 LB2D. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Resource rejection template
   */
  private getResourceRejectionTemplate(
    firstName: string,
    resourceTitle: string,
    courseTitle: string,
    rejectionReason: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444, #f59e0b, #10b981); padding: 30px; text-align: center; color: white; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .rejection-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Resource Review Update</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>Your resource submission requires revisions before it can be published.</p>
              <p><strong>Resource:</strong> ${resourceTitle}</p>
              <p><strong>Course:</strong> ${courseTitle}</p>
              <div class="rejection-box">
                <strong>Feedback:</strong>
                <p>${rejectionReason}</p>
              </div>
              <p>Please review the feedback and upload a revised version of the resource.</p>
              <p style="text-align: center;">
                <a href="${this.clientUrl}/supervisor/upload-resource" class="button">Upload Revised Resource</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2025 LB2D. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Role change approval template
   */
  private getRoleChangeApprovalTemplate(firstName: string, newRole: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #f59e0b, #ef4444); padding: 30px; text-align: center; color: white; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Role Change Approved!</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <div class="success-box">
                <strong>Your role change request has been approved!</strong>
                <p style="margin: 10px 0 0 0;">New Role: <strong>${newRole}</strong></p>
              </div>
              <p>Congratulations! You now have access to ${newRole.toLowerCase()} features and capabilities.</p>
              <p style="text-align: center;">
                <a href="${this.clientUrl}/dashboard" class="button">Go to Dashboard</a>
              </p>
              <p>Please log out and log back in to see your new permissions.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 LB2D. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Role change rejection template
   */
  private getRoleChangeRejectionTemplate(
    firstName: string,
    requestedRole: string,
    rejectionReason: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444, #f59e0b, #10b981); padding: 30px; text-align: center; color: white; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Role Change Request Update</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>Thank you for your interest in becoming a ${requestedRole} on our platform.</p>
              <div class="info-box">
                <strong>Status Update:</strong>
                <p>${rejectionReason}</p>
              </div>
              <p>If you have questions or would like to provide additional information, please contact our support team.</p>
              <p style="text-align: center;">
                <a href="${this.clientUrl}/contact" class="button">Contact Support</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2025 LB2D. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Urgent notification template
   */
  private getUrgentNotificationTemplate(firstName: string, title: string, message: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444, #f59e0b, #10b981); padding: 30px; text-align: center; color: white; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #ef4444; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .urgent-box { background: #fee2e2; border: 2px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 ${title}</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <div class="urgent-box">
                <p>${message}</p>
              </div>
              <p style="text-align: center;">
                <a href="${this.clientUrl}/dashboard" class="button">View Dashboard</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2025 LB2D. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Send contact form notification to admin team
   */
  async sendContactNotification(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<void> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL') || 'admin@lb2d.com';

    await this.sendViaGmail({
      to: adminEmail,
      subject: `New Contact Form Submission: ${data.subject}`,
      html: this.getContactNotificationTemplate(data),
    });
  }

  /**
   * Send contact form confirmation to sender
   */
  async sendContactConfirmation(data: { to: string; name: string }): Promise<void> {
    await this.sendWithRetry({
      to: data.to,
      subject: 'We received your message - LB2D',
      html: this.getContactConfirmationTemplate(data.name),
    });
  }

  /**
   * Contact notification template (to admin)
   */
  private getContactNotificationTemplate(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): string {
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'long',
      timeZone: 'Asia/Dhaka'
    });
    const senderInitial = data.name.charAt(0).toUpperCase();
    const currentYear = new Date().getFullYear();

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Contact Inquiry - LB2D</title>
          <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; }
            .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #dc2626 0%, #fbbf24 50%, #16a34a 100%); padding: 48px 32px; text-align: center; }
            .logo { font-size: 42px; font-weight: 900; color: #ffffff; letter-spacing: 2px; margin-bottom: 8px; }
            .tagline { font-size: 16px; color: rgba(255, 255, 255, 0.95); font-weight: 600; }
            .alert { background: #dc2626; color: #ffffff; padding: 16px 32px; text-align: center; font-weight: 700; font-size: 15px; letter-spacing: 0.5px; }
            .content { padding: 40px 32px; }
            .section-title { font-size: 12px; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; }
            .card { background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 10px; padding: 24px; margin-bottom: 24px; }
            .sender-info { text-align: center; margin-bottom: 16px; }
            .avatar { width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg, #dc2626, #fbbf24); display: inline-flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 900; color: #ffffff; margin-bottom: 16px; }
            .name { font-size: 22px; font-weight: 700; color: #111827; margin-bottom: 4px; }
            .email { font-size: 15px; color: #6b7280; }
            .subject-box { background: #fef3c7; border-left: 4px solid #fbbf24; padding: 20px; border-radius: 8px; margin-bottom: 24px; }
            .subject-label { font-size: 12px; font-weight: 700; color: #92400e; text-transform: uppercase; margin-bottom: 8px; }
            .subject-text { font-size: 18px; font-weight: 600; color: #78350f; }
            .message-box { background: #ffffff; border: 2px solid #e5e7eb; padding: 24px; border-radius: 8px; margin-bottom: 24px; }
            .message-text { font-size: 15px; line-height: 1.8; color: #374151; white-space: pre-wrap; }
            .button-container { text-align: center; margin: 32px 0; }
            .btn { display: inline-block; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; transition: all 0.2s; }
            .btn-primary { background: #dc2626; color: #ffffff !important; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3); }
            .btn-secondary { background: #ffffff; color: #dc2626 !important; border: 2px solid #dc2626; margin-left: 12px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
            .info-item { background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; }
            .info-label { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; margin-bottom: 6px; }
            .info-value { font-size: 14px; font-weight: 600; color: #1f2937; }
            .footer { background: #111827; color: #9ca3af; padding: 32px; text-align: center; }
            .footer-logo { font-size: 24px; font-weight: 900; color: #fbbf24; margin-bottom: 12px; }
            .footer-text { font-size: 14px; margin-bottom: 16px; }
            .footer-links { margin: 16px 0; padding: 16px 0; border-top: 1px solid #374151; border-bottom: 1px solid #374151; }
            .footer-link { color: #fbbf24; text-decoration: none; margin: 0 12px; font-weight: 600; }
            .footer-copy { font-size: 12px; color: #6b7280; margin-top: 16px; }
            @media only screen and (max-width: 600px) {
              .info-grid { grid-template-columns: 1fr; }
              .btn { display: block; margin: 8px 0 !important; width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">LB2D</div>
              <div class="tagline">Learn Bangla to Deutsch</div>
            </div>

            <div class="alert">NEW CONTACT INQUIRY - RESPONSE REQUIRED</div>

            <div class="content">
              <div class="section-title">Sender Information</div>
              <div class="card">
                <div class="sender-info">
                  <div class="avatar">${senderInitial}</div>
                  <div class="name">${data.name}</div>
                  <div class="email">${data.email}</div>
                </div>
              </div>

              <div class="section-title">Subject</div>
              <div class="subject-box">
                <div class="subject-label">Topic</div>
                <div class="subject-text">${data.subject}</div>
              </div>

              <div class="section-title">Message</div>
              <div class="message-box">
                <div class="message-text">${data.message}</div>
              </div>

              <div class="button-container">
                <a href="mailto:${data.email}?subject=Re: ${data.subject.replace(/'/g, '%27')}" class="btn btn-primary">Reply to Message</a>
                <a href="mailto:${data.email}" class="btn btn-secondary">Quick Reply</a>
              </div>

              <div class="section-title">Message Details</div>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Timestamp</div>
                  <div class="info-value">${timestamp}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Source</div>
                  <div class="info-value">Contact Form</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Priority</div>
                  <div class="info-value" style="color: #dc2626;">High</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Response Target</div>
                  <div class="info-value">24 Hours</div>
                </div>
              </div>
            </div>

            <div class="footer">
              <div class="footer-logo">LB2D</div>
              <div class="footer-text">Empowering Bengali speakers to master German</div>
              <div class="footer-links">
                <a href="${this.clientUrl}" class="footer-link">Home</a>
                <a href="${this.clientUrl}/courses" class="footer-link">Courses</a>
                <a href="${this.clientUrl}/about" class="footer-link">About</a>
                <a href="${this.clientUrl}/contact" class="footer-link">Contact</a>
              </div>
              <div class="footer-copy">
                © ${currentYear} Learn Bangla to Deutsch. All Rights Reserved.<br>
                Dhaka, Bangladesh | Munich, Germany
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }


  /**
   * Contact confirmation template (to sender)
   */
  private getContactConfirmationTemplate(name: string): string {
    const currentYear = new Date().getFullYear();

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Message Received - LB2D</title>
          <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; }
            .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #16a34a 0%, #fbbf24 50%, #dc2626 100%); padding: 48px 32px; text-align: center; }
            .logo { font-size: 42px; font-weight: 900; color: #ffffff; letter-spacing: 2px; margin-bottom: 8px; }
            .tagline { font-size: 16px; color: rgba(255, 255, 255, 0.95); font-weight: 600; }
            .success-banner { background: #16a34a; color: #ffffff; padding: 16px 32px; text-align: center; font-weight: 700; font-size: 15px; }
            .content { padding: 40px 32px; }
            .greeting { font-size: 28px; font-weight: 700; color: #111827; margin-bottom: 16px; }
            .message { font-size: 16px; line-height: 1.8; color: #374151; margin-bottom: 24px; }
            .card { background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 10px; padding: 24px; margin-bottom: 24px; }
            .card-title { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 12px; }
            .card-text { font-size: 15px; line-height: 1.7; color: #4b5563; }
            .highlight-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #fbbf24; padding: 20px; border-radius: 8px; margin-bottom: 24px; }
            .highlight-text { font-size: 15px; color: #78350f; font-weight: 600; line-height: 1.6; }
            .steps { list-style: none; padding: 0; }
            .step { padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
            .step:last-child { border-bottom: none; }
            .step-text { font-size: 15px; color: #374151; }
            .button-container { text-align: center; margin: 32px 0; }
            .btn { display: inline-block; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; }
            .btn-primary { background: #16a34a; color: #ffffff !important; box-shadow: 0 4px 6px rgba(22, 163, 74, 0.3); }
            .footer { background: #111827; color: #9ca3af; padding: 32px; text-align: center; }
            .footer-logo { font-size: 24px; font-weight: 900; color: #fbbf24; margin-bottom: 12px; }
            .footer-text { font-size: 14px; margin-bottom: 16px; }
            .footer-links { margin: 16px 0; padding: 16px 0; border-top: 1px solid #374151; border-bottom: 1px solid #374151; }
            .footer-link { color: #fbbf24; text-decoration: none; margin: 0 12px; font-weight: 600; }
            .footer-copy { font-size: 12px; color: #6b7280; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">LB2D</div>
              <div class="tagline">Learn Bangla to Deutsch</div>
            </div>

            <div class="success-banner">MESSAGE RECEIVED SUCCESSFULLY</div>

            <div class="content">
              <div class="greeting">Hello ${name},</div>

              <div class="message">
                Thank you for contacting Learn Bangla to Deutsch (LB2D). We have successfully received your message and our team will review it shortly.
              </div>

              <div class="highlight-box">
                <div class="highlight-text">
                  We typically respond to all inquiries within 24-48 hours during business days.
                  Our team will get back to you with a personalized response.
                </div>
              </div>

              <div class="card">
                <div class="card-title">What Happens Next?</div>
                <div class="card-text">
                  <ul class="steps">
                    <li class="step"><span class="step-text">Our team reviews your inquiry carefully</span></li>
                    <li class="step"><span class="step-text">We prepare a personalized response</span></li>
                    <li class="step"><span class="step-text">You receive our detailed reply via email</span></li>
                    <li class="step"><span class="step-text">We schedule a consultation if needed</span></li>
                  </ul>
                </div>
              </div>

              <div class="card">
                <div class="card-title">Contact Information</div>
                <div class="card-text">
                  <p style="margin-bottom: 8px;"><strong>Email:</strong> learnbangla2deutsch@gmail.com</p>
                  <p style="margin-bottom: 8px;"><strong>Response Time:</strong> Within 24-48 hours</p>
                  <p><strong>Office Hours:</strong> Saturday - Thursday, 9:00 AM - 6:00 PM (Dhaka Time)</p>
                </div>
              </div>

              <div class="button-container">
                <a href="${this.clientUrl}/courses" class="btn btn-primary">Explore Our Courses</a>
              </div>
            </div>

            <div class="footer">
              <div class="footer-logo">LB2D</div>
              <div class="footer-text">Empowering Bengali speakers to master German</div>
              <div class="footer-links">
                <a href="${this.clientUrl}" class="footer-link">Home</a>
                <a href="${this.clientUrl}/courses" class="footer-link">Courses</a>
                <a href="${this.clientUrl}/about" class="footer-link">About</a>
                <a href="${this.clientUrl}/contact" class="footer-link">Contact</a>
              </div>
              <div class="footer-copy">
                © ${currentYear} Learn Bangla to Deutsch. All Rights Reserved.<br>
                Dhaka, Bangladesh | Munich, Germany
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}