import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

    console.log('📧 EMAIL SERVICE CONFIGURATION:');
    console.log('   RESEND_API_KEY:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');
    console.log('   EMAIL_FROM:', this.fromEmail);
    console.log('   CLIENT_URL:', this.clientUrl);

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('✅ Email service initialized with Resend API');
      this.logger.log(`📧 Emails will be sent from: ${this.fromEmail}`);
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
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(
    email: string,
    token: string,
    firstName: string,
  ): Promise<void> {
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
  async sendPasswordResetEmail(
    email: string,
    token: string,
    firstName: string,
  ): Promise<void> {
    console.log('📧 sendPasswordResetEmail called with:');
    console.log('   To:', email);
    console.log('   Token:', token);
    console.log('   First Name:', firstName);

    if (!this.resend) {
      this.logger.warn('❌ Email service not configured - Resend instance is null');
      console.log('❌ Cannot send email - Resend is not initialized');
      return;
    }

    const resetUrl = `${this.configService.get('CLIENT_URL')}/reset-password?token=${token}`;
    console.log('🔗 Reset URL:', resetUrl);
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
    courseId: string,
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
    certificateUrl: string,
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
    currency: string,
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
    courseTitle: string,
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
    rejectionReason: string,
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
    courseTitle: string,
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
    rejectionReason: string,
  ): Promise<void> {
    await this.sendWithRetry({
      to: email,
      subject: `❌ Resource Rejected - ${resourceTitle}`,
      html: this.getResourceRejectionTemplate(firstName, resourceTitle, courseTitle, rejectionReason),
    });
  }

  /**
   * Send role change approval notification
   */
  async sendRoleChangeApprovalNotification(
    email: string,
    firstName: string,
    newRole: string,
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
    rejectionReason: string,
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
    message: string,
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
  private getVerificationEmailTemplate(
    firstName: string,
    verificationUrl: string,
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
  private getPasswordResetTemplate(
    firstName: string,
    resetUrl: string,
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
  private getEnrollmentConfirmationTemplate(firstName: string, courseName: string, courseId: string): string {
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
    certificateUrl: string,
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
    currency: string,
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
  private getVideoApprovalTemplate(firstName: string, videoTitle: string, courseTitle: string): string {
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
    rejectionReason: string,
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
  private getResourceApprovalTemplate(firstName: string, resourceTitle: string, courseTitle: string): string {
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
    rejectionReason: string,
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
    rejectionReason: string,
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

    await this.sendWithRetry({
      to: adminEmail,
      subject: `New Contact Form Submission: ${data.subject}`,
      html: this.getContactNotificationTemplate(data),
    });
  }

  /**
   * Send contact form confirmation to sender
   */
  async sendContactConfirmation(data: {
    to: string;
    name: string;
  }): Promise<void> {
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
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f3f4f6; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 40px 20px; text-align: center; }
            .content { padding: 40px 30px; }
            .info-box { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
            .message-box { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .label { font-weight: 600; color: #4b5563; margin-bottom: 5px; }
            .value { color: #1f2937; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📨 New Contact Form Submission</h1>
            </div>
            <div class="content">
              <p>You have received a new message from the contact form:</p>

              <div class="info-box">
                <div class="label">From:</div>
                <div class="value"><strong>${data.name}</strong></div>
                <div class="value">${data.email}</div>
              </div>

              <div class="info-box">
                <div class="label">Subject:</div>
                <div class="value"><strong>${data.subject}</strong></div>
              </div>

              <div class="message-box">
                <div class="label">Message:</div>
                <div class="value" style="white-space: pre-wrap;">${data.message}</div>
              </div>

              <p style="color: #6b7280; font-size: 14px;">
                <strong>Reply to:</strong> <a href="mailto:${data.email}" style="color: #3b82f6;">${data.email}</a>
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
   * Contact confirmation template (to sender)
   */
  private getContactConfirmationTemplate(name: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f3f4f6; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 20px; text-align: center; }
            .content { padding: 40px 30px; }
            .success-box { background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #10b981; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Message Received!</h1>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <div class="success-box">
                <p style="font-size: 18px; font-weight: 600; margin: 0;">
                  We've received your message!
                </p>
              </div>
              <p>Thank you for reaching out to LB2D. Our team has received your message and will get back to you as soon as possible.</p>
              <p>Typically, we respond within 24-48 hours during business days.</p>
              <p>In the meantime, feel free to explore our courses and resources:</p>
              <p style="text-align: center;">
                <a href="${this.clientUrl}/courses" class="button">Browse Courses</a>
              </p>
              <p>If you have any urgent questions, you can also reach us at:</p>
              <p style="text-align: center;">
                <strong>Email:</strong> support@lb2d.com<br>
                <strong>Phone:</strong> +880 1XXX-XXXXXX
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
}
