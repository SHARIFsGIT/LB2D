import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import sgMail from '@sendgrid/mail';

dotenv.config();

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;
  private useSendGrid: boolean = false;
  private useResend: boolean = false;

  constructor() {
    // Priority 1: SendGrid (preferred for production)
    if (process.env.SENDGRID_API_KEY) {
      this.useSendGrid = true;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
    // Priority 2: Resend
    else if (process.env.RESEND_API_KEY) {
      this.useResend = true;
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
    // Priority 3: Fallback to SMTP (nodemailer)
    else {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
      });
    }
  }

  // Send verification email
  async sendVerificationEmail(email: string, token: string, firstName: string) {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #667eea; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">LEARN BANGLA TO DEUTSCH</h1>
        </div>
        <div style="padding: 30px; background-color: #f7f7f7;">
          <h2>Hello ${firstName}!</h2>
          <p style="font-size: 16px; color: #333;">Thank you for registering with our platform. To complete your registration, please verify your email address.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
              Verify Email Address
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
          <p style="background-color: #fff; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px;">
            ${verificationUrl}
          </p>

          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This link will expire in 24 hours. If you didn't register for an account, you can safely ignore this email.
          </p>
        </div>
        <div style="background-color: #333; color: #fff; padding: 20px; text-align: center; font-size: 12px;">
          © 2025 LEARN BANGLA TO DEUTSCH. All rights reserved.
        </div>
      </div>
    `;

    try {
      if (this.useSendGrid) {
        const msg = {
          to: email,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@learnbangla2deutsch.com',
          subject: 'Verify Your Email - LEARN BANGLA TO DEUTSCH',
          html: htmlContent
        };
        const result = await sgMail.send(msg);
        return result;
      } else if (this.useResend && this.resend) {
        const result = await this.resend.emails.send({
          from: 'LEARN BANGLA TO DEUTSCH <onboarding@resend.dev>',
          to: email,
          subject: 'Verify Your Email - LEARN BANGLA TO DEUTSCH',
          html: htmlContent
        });
        return result;
      } else if (this.transporter) {
        const mailOptions = {
          from: `"LEARN BANGLA TO DEUTSCH" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Verify Your Email - LEARN BANGLA TO DEUTSCH',
          html: htmlContent
        };
        const info = await this.transporter.sendMail(mailOptions);
        return info;
      } else {
        throw new Error('No email service configured');
      }
    } catch (error: any) {
      throw error;
    }
  }

  // Send OTP email
  async sendOTPEmail(email: string, otp: string, firstName: string) {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #667eea; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">LEARN BANGLA TO DEUTSCH</h1>
        </div>
        <div style="padding: 30px; background-color: #f7f7f7;">
          <h2>Hello ${firstName}!</h2>
          <p style="font-size: 16px; color: #333;">Your One-Time Password (OTP) for verification is:</p>

          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #fff; border: 2px solid #667eea; border-radius: 10px; padding: 20px; display: inline-block;">
              <h1 style="color: #667eea; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
            </div>
          </div>

          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>

          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
        <div style="background-color: #333; color: #fff; padding: 20px; text-align: center; font-size: 12px;">
          © 2025 LEARN BANGLA TO DEUTSCH. All rights reserved.
        </div>
      </div>
    `;

    try {
      if (this.useSendGrid) {
        const msg = {
          to: email,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@learnbangla2deutsch.com',
          subject: 'Your OTP Code - LEARN BANGLA TO DEUTSCH',
          html: htmlContent
        };
        const result = await sgMail.send(msg);
        return result;
      } else if (this.useResend && this.resend) {
        const result = await this.resend.emails.send({
          from: 'LEARN BANGLA TO DEUTSCH <onboarding@resend.dev>',
          to: email,
          subject: 'Your OTP Code - LEARN BANGLA TO DEUTSCH',
          html: htmlContent
        });
        return result;
      } else if (this.transporter) {
        const mailOptions = {
          from: `"LEARN BANGLA TO DEUTSCH" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Your OTP Code - LEARN BANGLA TO DEUTSCH',
          html: htmlContent
        };
        const info = await this.transporter.sendMail(mailOptions);
        return info;
      } else {
        throw new Error('No email service configured');
      }
    } catch (error: any) {
      throw error;
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email: string, token: string, firstName: string) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #667eea; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">LEARN BANGLA TO DEUTSCH</h1>
        </div>
        <div style="padding: 30px; background-color: #f7f7f7;">
          <h2>Hello ${firstName}!</h2>
          <p style="font-size: 16px; color: #333;">We received a request to reset your password. Click the button below to create a new password:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
              Reset Password
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
          <p style="background-color: #fff; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px;">
            ${resetUrl}
          </p>

          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
        <div style="background-color: #333; color: #fff; padding: 20px; text-align: center; font-size: 12px;">
          © 2025 LEARN BANGLA TO DEUTSCH. All rights reserved.
        </div>
      </div>
    `;

    try {
      if (this.useSendGrid) {
        const msg = {
          to: email,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@learnbangla2deutsch.com',
          subject: 'Password Reset Request - LEARN BANGLA TO DEUTSCH',
          html: htmlContent
        };
        const result = await sgMail.send(msg);
        return result;
      } else if (this.useResend && this.resend) {
        const result = await this.resend.emails.send({
          from: 'LEARN BANGLA TO DEUTSCH <onboarding@resend.dev>',
          to: email,
          subject: 'Password Reset Request - LEARN BANGLA TO DEUTSCH',
          html: htmlContent
        });
        return result;
      } else if (this.transporter) {
        const mailOptions = {
          from: `"LEARN BANGLA TO DEUTSCH" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Password Reset Request - LEARN BANGLA TO DEUTSCH',
          html: htmlContent
        };
        const info = await this.transporter.sendMail(mailOptions);
        return info;
      } else {
        throw new Error('No email service configured');
      }
    } catch (error: any) {
      throw error;
    }
  }

  // Send admin notification for new admin/supervisor registration
  async sendAdminNotificationEmail(newUserEmail: string, newUserName: string, requestedRole: string) {
    // Find all admin users to notify
    const User = require('../models/User.model').default;
    const admins = await User.find({ role: 'Admin', isEmailVerified: true });
    
    if (admins.length === 0) {
      return;
    }

    let mailOptions = {
      from: `"LEARN BANGLA TO DEUTSCH" <${process.env.EMAIL_USER}>`,
      to: '', // Will be set in the loop
      subject: `New ${requestedRole} Registration Request`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f59e0b; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">⚠️ Admin Attention Required</h1>
          </div>
          <div style="padding: 30px; background-color: #f7f7f7;">
            <h2>New ${requestedRole} Registration</h2>
            <p style="font-size: 16px; color: #333;">A new user has registered requesting <strong>${requestedRole}</strong> privileges:</p>
            
            <div style="background-color: #fff; border-left: 4px solid #f59e0b; border-radius: 5px; padding: 20px; margin: 20px 0;">
              <p><strong>Name:</strong> ${newUserName}</p>
              <p><strong>Email:</strong> ${newUserEmail}</p>
              <p><strong>Requested Role:</strong> ${requestedRole}</p>
              <p><strong>Registration Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div style="background-color: #fef3c7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-weight: bold;">Action Required:</p>
              <p style="margin: 5px 0 0 0; color: #92400e;">Please review this registration request and approve/deny the ${requestedRole} role through the admin panel.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}/admin" style="background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
                Review in Admin Panel
              </a>
            </div>
          </div>
          <div style="background-color: #333; color: #fff; padding: 20px; text-align: center; font-size: 12px;">
            © 2025 LEARN BANGLA TO DEUTSCH. All rights reserved.
          </div>
        </div>
      `
    };

    // Send to all admin users
    for (const admin of admins) {
      try {
        mailOptions.to = admin.email;
        await this.transporter.sendMail(mailOptions);
      } catch (error) {
        // Silent fail for individual admin notifications
      }
    }
  }

  // Send enrollment confirmation email
  async sendEnrollmentConfirmation(email: string, firstName: string, courseInfo: any, paymentInfo: any) {
    const mailOptions = {
      from: `"LEARN BANGLA TO DEUTSCH" <learnbangla2deutsch@gmail.com>`,
      to: email,
      subject: `🎉 Enrollment Confirmed - ${courseInfo.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10b981; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Learn Bangla to Deutsch</h1>
            <p style="color: #d1fae5; margin: 5px 0 0 0; font-size: 14px;">German Language Learning Platform</p>
          </div>
          <div style="padding: 30px; background-color: #f7f7f7;">
            <h2>🎉 Congratulations ${firstName}!</h2>
            <p style="font-size: 16px; color: #333;">Your enrollment has been confirmed! Welcome to your German language learning journey.</p>
            
            <div style="background-color: #fff; border-radius: 10px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="color: #10b981; margin-top: 0;">Course Details:</h3>
              <p><strong>Course:</strong> ${courseInfo.title}</p>
              <p><strong>Level:</strong> ${courseInfo.level}</p>
              <p><strong>Instructor:</strong> ${courseInfo.instructor}</p>
              <p><strong>Start Date:</strong> ${new Date(courseInfo.startDate).toLocaleDateString()}</p>
              <p><strong>Schedule:</strong> ${courseInfo.schedule.days.join(', ')} at ${courseInfo.schedule.time}</p>
            </div>

            <div style="background-color: #f0fdf4; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #059669; margin-top: 0;">Payment Confirmation:</h3>
              <p><strong>Transaction ID:</strong> ${paymentInfo.transactionId}</p>
              <p><strong>Amount:</strong> ${paymentInfo.currency} ${paymentInfo.amount}</p>
              <p><strong>Payment Method:</strong> ${paymentInfo.paymentMethod}</p>
              <p><strong>Status:</strong> ✅ Completed</p>
            </div>

            <div style="background-color: #eff6ff; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h4 style="color: #1d4ed8; margin-top: 0;">What's Next?</h4>
              <ul style="color: #374151; margin: 0; padding-left: 20px;">
              <li>Access your dashboard for course progress</li>
              <li>Join our WhatsApp/Telegram group for updates</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}/dashboard" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px; margin-right: 10px;">
                View Dashboard
              </a>
              <a href="${process.env.CLIENT_URL}/courses/my-courses" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
                My Courses
              </a>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                <strong>Need Help?</strong><br>
                📧 Email: learnbangla2deutsch@gmail.com<br>
                📱 WhatsApp: +49 (177) 879-7486<br>
                🌐 Website: www.learnbangla2deutsch.com
              </p>
            </div>
          </div>
          <div style="background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2025 Learn Bangla to Deutsch. All rights reserved.</p>
          </div>
        </div>
      `,
      attachments: [
        // Will add PDF certificate generation later
      ]
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      console.error('Failed to send enrollment confirmation email:', error);
      throw error;
    }
  }

  // Send test completion email
  async sendTestCompletionEmail(email: string, firstName: string, score: number, level: string) {
    const mailOptions = {
      from: `"LEARN BANGLA TO DEUTSCH" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Test Completed - You achieved ${level} certification!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #667eea; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">LEARN BANGLA TO DEUTSCH</h1>
          </div>
          <div style="padding: 30px; background-color: #f7f7f7;">
            <h2>Congratulations ${firstName}!</h2>
            <p style="font-size: 16px; color: #333;">You have successfully completed your assessment!</p>
            
            <div style="background-color: #fff; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #667eea; margin-top: 0;">Your Results:</h3>
              <p style="font-size: 18px;"><strong>Score:</strong> ${score}%</p>
              <p style="font-size: 18px;"><strong>Certification Level:</strong> ${level}</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Your certificate is now available in your dashboard. You can download it anytime.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}/dashboard" style="background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
                View Dashboard
              </a>
            </div>
          </div>
          <div style="background-color: #333; color: #fff; padding: 20px; text-align: center; font-size: 12px;">
            © 2025 LEARN BANGLA TO DEUTSCH. All rights reserved.
          </div>
        </div>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      throw error;
    }
  }

  // Send contact form email to admin
  async sendContactFormEmail(contactData: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) {
    const adminEmail = 'learnbangla2deutsch@gmail.com';

    const mailOptions = {
      from: `"Contact Form - Learn Bangla to Deutsch" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      replyTo: contactData.email,
      subject: `Contact Form: ${contactData.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc2626; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">New Contact Form Message</h1>
            <p style="color: #fecaca; margin: 5px 0 0 0; font-size: 14px;">Learn Bangla to Deutsch</p>
          </div>
          <div style="padding: 30px; background-color: #f7f7f7;">
            <h2 style="color: #dc2626;">Contact Form Submission</h2>
            <p style="font-size: 16px; color: #333;">You have received a new message from the contact form.</p>
            
            <div style="background-color: #fff; border-radius: 10px; padding: 20px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3 style="color: #dc2626; margin-top: 0;">Contact Details:</h3>
              <p><strong>Name:</strong> ${contactData.name}</p>
              <p><strong>Email:</strong> <a href="mailto:${contactData.email}" style="color: #dc2626;">${contactData.email}</a></p>
              <p><strong>Subject:</strong> ${contactData.subject}</p>
              <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <div style="background-color: #f3f4f6; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #374151; margin-top: 0;">Message:</h3>
              <div style="background-color: #fff; padding: 15px; border-radius: 5px; border-left: 3px solid #10b981;">
                <p style="color: #374151; margin: 0; white-space: pre-wrap; line-height: 1.6;">${contactData.message}</p>
              </div>
            </div>

            <div style="background-color: #dbeafe; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h4 style="color: #1d4ed8; margin-top: 0;">Quick Actions:</h4>
              <div style="text-align: center; margin: 15px 0;">
                <a href="mailto:${contactData.email}?subject=Re: ${contactData.subject}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 14px; margin-right: 10px;">
                  Reply to ${contactData.name}
                </a>
                <a href="mailto:${contactData.email}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 14px;">
                  New Email
                </a>
              </div>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #6b7280; font-size: 12px;">
              <p style="margin: 0;"><strong>System Info:</strong></p>
              <p style="margin: 5px 0;">This email was automatically generated from the contact form on your website.</p>
              <p style="margin: 5px 0;">You can reply directly to this email to respond to ${contactData.name}.</p>
            </div>
          </div>
          <div style="background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 Learn Bangla to Deutsch. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">Contact Form Notification System</p>
          </div>
        </div>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      throw error;
    }
  }

  // Send video approval request email to admin
  async sendVideoApprovalRequest(adminEmail: string, adminName: string, videoInfo: {
    supervisorName: string;
    videoTitle: string;
    courseName: string;
    videoId: string;
  }) {
    const mailOptions = {
      from: `"Learn Bangla to Deutsch - Video Upload" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: `Video Approval Required - ${videoInfo.videoTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f59e0b; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Video Approval Required</h1>
            <p style="color: #fef3c7; margin: 5px 0 0 0; font-size: 14px;">Learn Bangla to Deutsch</p>
          </div>
          <div style="padding: 30px; background-color: #f7f7f7;">
            <h2 style="color: #f59e0b;">New Video Upload</h2>
            <p style="font-size: 16px; color: #333;">Hello ${adminName},</p>
            <p style="font-size: 16px; color: #333;">A supervisor has uploaded a new video that requires your approval.</p>
            
            <div style="background-color: #fff; border-radius: 10px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="color: #f59e0b; margin-top: 0;">Video Details:</h3>
              <p><strong>Supervisor:</strong> ${videoInfo.supervisorName}</p>
              <p><strong>Video Title:</strong> ${videoInfo.videoTitle}</p>
              <p><strong>Course:</strong> ${videoInfo.courseName}</p>
              <p><strong>Upload Time:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <div style="background-color: #fef3c7; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h4 style="color: #92400e; margin-top: 0;">Action Required:</h4>
              <p style="color: #92400e; margin: 0;">Please review this video upload and approve/reject it through the admin panel.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}/admin/videos/pending" style="background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px; margin-right: 10px;">
                Review Videos
              </a>
              <a href="${process.env.CLIENT_URL}/admin/videos/${videoInfo.videoId}" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
                View Video
              </a>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #6b7280; font-size: 12px;">
              <p style="margin: 0;"><strong>System Info:</strong></p>
              <p style="margin: 5px 0;">This video is currently hidden from students until approved.</p>
              <p style="margin: 5px 0;">The supervisor will be notified once you take action.</p>
            </div>
          </div>
          <div style="background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 Learn Bangla to Deutsch. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">Video Management System</p>
          </div>
        </div>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      throw error;
    }
  }

  // Send video approval/rejection notification to supervisor
  async sendVideoApprovalNotification(supervisorEmail: string, supervisorName: string, videoInfo: {
    videoTitle: string;
    status: 'approved' | 'rejected';
    rejectionReason?: string;
  }) {
    const isApproved = videoInfo.status === 'approved';
    
    const mailOptions = {
      from: `"Learn Bangla to Deutsch - Video Status" <${process.env.EMAIL_USER}>`,
      to: supervisorEmail,
      subject: `Video ${isApproved ? 'Approved' : 'Rejected'} - ${videoInfo.videoTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${isApproved ? '#10b981' : '#ef4444'}; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">${isApproved ? '✅' : '❌'} Video ${isApproved ? 'Approved' : 'Rejected'}</h1>
            <p style="color: ${isApproved ? '#d1fae5' : '#fecaca'}; margin: 5px 0 0 0; font-size: 14px;">Learn Bangla to Deutsch</p>
          </div>
          <div style="padding: 30px; background-color: #f7f7f7;">
            <h2 style="color: ${isApproved ? '#10b981' : '#ef4444'};">Video Status Update</h2>
            <p style="font-size: 16px; color: #333;">Hello ${supervisorName},</p>
            <p style="font-size: 16px; color: #333;">Your video upload has been ${isApproved ? 'approved' : 'rejected'} by the admin.</p>
            
            <div style="background-color: #fff; border-radius: 10px; padding: 20px; margin: 20px 0; border-left: 4px solid ${isApproved ? '#10b981' : '#ef4444'};">
              <h3 style="color: ${isApproved ? '#10b981' : '#ef4444'}; margin-top: 0;">📹 Video Details:</h3>
              <p><strong>Video Title:</strong> ${videoInfo.videoTitle}</p>
              <p><strong>Status:</strong> <span style="color: ${isApproved ? '#10b981' : '#ef4444'}; font-weight: bold;">${videoInfo.status.toUpperCase()}</span></p>
              <p><strong>Decision Time:</strong> ${new Date().toLocaleString()}</p>
              ${!isApproved && videoInfo.rejectionReason ? `<p><strong>Rejection Reason:</strong> ${videoInfo.rejectionReason}</p>` : ''}
            </div>

            ${isApproved ? `
              <div style="background-color: #d1fae5; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <h4 style="color: #065f46; margin-top: 0;">🎉 Congratulations!</h4>
                <p style="color: #065f46; margin: 0;">Your video is now live and visible to students in the course.</p>
              </div>
            ` : `
              <div style="background-color: #fee2e2; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <h4 style="color: #991b1b; margin-top: 0;">Next Steps:</h4>
                <p style="color: #991b1b; margin: 0;">Please review the feedback and make necessary changes before uploading again.</p>
              </div>
            `}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}/supervisor/videos" style="background-color: ${isApproved ? '#10b981' : '#ef4444'}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
                📹 My Videos
              </a>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #6b7280; font-size: 12px;">
              <p style="margin: 0;"><strong>System Info:</strong></p>
              <p style="margin: 5px 0;">This is an automated notification from the video management system.</p>
              ${isApproved ? '<p style="margin: 5px 0;">Students can now access your video in the course.</p>' : '<p style="margin: 5px 0;">You can upload a revised version if needed.</p>'}
            </div>
          </div>
          <div style="background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2025 Learn Bangla to Deutsch. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">Video Management System</p>
          </div>
        </div>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      throw error;
    }
  }

  // Send role rejection notification email
  async sendRoleRejectionNotification(email: string, firstName: string, lastName: string, requestedRole: string, rejectionReason?: string) {
    const mailOptions = {
      from: `"LEARN BANGLA TO DEUTSCH" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Role Request Update - ${requestedRole} Request`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ef4444; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Role Request Update</h1>
            <p style="color: #fecaca; margin: 5px 0 0 0; font-size: 14px;">LEARN BANGLA TO DEUTSCH</p>
          </div>
          <div style="padding: 30px; background-color: #f7f7f7;">
            <h2 style="color: #ef4444;">Hello ${firstName},</h2>
            <p style="font-size: 16px; color: #333;">Thank you for your interest in the <strong>${requestedRole}</strong> role on our platform.</p>
            
            <div style="background-color: #fff; border-radius: 10px; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <h3 style="color: #ef4444; margin-top: 0;">Request Status Update</h3>
              <p><strong>Full Name:</strong> ${firstName} ${lastName}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Requested Role:</strong> ${requestedRole}</p>
              <p><strong>Status:</strong> <span style="color: #ef4444; font-weight: bold;">NOT APPROVED</span></p>
              <p><strong>Decision Date:</strong> ${new Date().toLocaleString()}</p>
              ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
            </div>

            <div style="background-color: #fee2e2; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h4 style="color: #991b1b; margin-top: 0;">What This Means:</h4>
              <p style="color: #991b1b; margin: 0;">
                After careful review, we are unable to approve your request for the ${requestedRole} role at this time.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}/" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px; margin-right: 10px;">
                Home Page
              </a>
              <a href="${process.env.CLIENT_URL}/contact" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
                Contact Support
              </a>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                <strong>Need Help?</strong><br>
                📧 Email: learnbangla2deutsch@gmail.com<br>
                📱 WhatsApp: +49 (177) 879-7486<br>
                🌐 Website: ${process.env.CLIENT_URL}
              </p>
            </div>
          </div>
          <div style="background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 LEARN BANGLA TO DEUTSCH Platform. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">Continue your German learning journey! 🇩🇪</p>
          </div>
        </div>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      throw error;
    }
  }

  // Send role approval confirmation email
  async sendRoleApprovalConfirmation(email: string, firstName: string, lastName: string, approvedRole: string) {
    const roleInfo = {
      'Student': {
        color: '#3b82f6',
        benefits: [
          'Access to all course materials and assessments',
          'Track your learning progress through the dashboard',
          'Take placement tests to determine your German level',
          'Earn certificates upon your assesment completion'
        ]
      },
      'Supervisor': {
        color: '#10b981',
        benefits: [
          'Create and manage course materials',
          'Upload and manage course video content',
          'Monitor student progress and performance',
        ]
      }
    };

    const info = roleInfo[approvedRole as keyof typeof roleInfo];
    
    const mailOptions = {
      from: `"LEARN BANGLA TO DEUTSCH" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `🎉 Congratulations! Your ${approvedRole} Role has been Approved`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${info.color}; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Role Approved!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">LEARN BANGLA TO DEUTSCH</p>
          </div>
          <div style="padding: 30px; background-color: #f7f7f7;">
            <h2 style="color: ${info.color};">Congratulations ${firstName}!</h2>
            <p style="font-size: 16px; color: #333;">Great news! Your request for <strong>${approvedRole}</strong> role has been approved by our admin team.</p>
            
            <div style="background-color: #fff; border-radius: 10px; padding: 20px; margin: 20px 0; border-left: 4px solid ${info.color};">
              <h3 style="color: ${info.color}; margin-top: 0;">Your New Role: ${approvedRole}</h3>
              <p><strong>Full Name:</strong> ${firstName} ${lastName}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Role Status:</strong> <span style="color: ${info.color}; font-weight: bold;">APPROVED</span></p>
              <p><strong>Approved On:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <div style="background-color: #f0fdf4; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h4 style="color: #065f46; margin-top: 0;">What You Can Do Now:</h4>
              <ul style="color: #374151; margin: 0; padding-left: 20px;">
                ${info.benefits.map(benefit => `<li style="margin-bottom: 8px;">${benefit}</li>`).join('')}
              </ul>
            </div>

            ${approvedRole === 'Supervisor' ? `
              <div style="background-color: #fef3c7; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <h4 style="color: #92400e; margin-top: 0;">Supervisor Guidelines:</h4>
                <ul style="color: #92400e; margin: 0; padding-left: 20px; font-size: 14px;">
                  <li>Maintain high-quality educational content standards</li>
                  <li>All video uploads require admin approval before going live</li>
                  <li>Follow the platform's content guidelines and policies</li>
                  <li>Respond to student queries and provide support when needed</li>
                </ul>
              </div>
            ` : ''}

            <div style="background-color: #eff6ff; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h4 style="color: #1d4ed8; margin-top: 0;">Next Steps:</h4>
              <ol style="color: #374151; margin: 0; padding-left: 20px;">
                <li>Log in to your dashboard to explore your new capabilities</li>
                <li>Complete your profile if you haven't already</li>
                ${approvedRole === 'Student' ? '<li>Take your placement test to determine your German level</li>' : ''}
                ${approvedRole === 'Supervisor' ? '<li>Familiarize yourself with the video upload process</li>' : ''}
                <li>Join our community and start your German learning journey!</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}/dashboard" style="background-color: ${info.color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px; margin-right: 10px;">
                Access Dashboard
              </a>
              ${approvedRole === 'Student' ? `
                <a href="${process.env.CLIENT_URL}/assessment" style="background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
                  Start Assessment
                </a>
              ` : `
                <a href="${process.env.CLIENT_URL}/supervisor" style="background-color: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
                  Supervisor Panel
                </a>
              `}
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                <strong>Need Help?</strong><br>
                📧 Email: learnbangla2deutsch@gmail.com<br>
                📱 WhatsApp: +49 (177) 879-7486<br>
                🌐 Website: ${process.env.CLIENT_URL}
              </p>
            </div>
          </div>
          <div style="background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2025 LEARN BANGLA TO DEUTSCH. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">Welcome to your German learning journey!</p>
          </div>
        </div>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      throw error;
    }
  }

  // Send course assignment notification to instructor
  async sendCourseAssignmentNotification(email: string, firstName: string, lastName: string, courseInfo: {
    courseTitle: string;
    courseLevel: string;
    startDate: string;
    endDate: string;
    courseId: string;
  }) {
    const mailOptions = {
      from: `"LEARN BANGLA TO DEUTSCH" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `New Course Assigned - ${courseInfo.courseTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">New Course Assigned!</h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">You've been assigned as an instructor</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background-color: white; border-radius: 10px; padding: 25px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 20px; font-size: 20px;">Hello ${firstName} ${lastName}!</h2>
              <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
                Great news! You have been assigned as the instructor for a new German language course. This is an exciting opportunity to share your knowledge and help students on their language learning journey.
              </p>
              
              <div style="background-color: #dbeafe; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <h3 style="color: #1d4ed8; margin-top: 0; font-size: 16px;">Course Details</h3>
                <div style="background-color: white; border-radius: 6px; padding: 15px; margin: 10px 0;">
                  <p style="margin: 5px 0; color: #374151;"><strong>Course Title:</strong> ${courseInfo.courseTitle}</p>
                  <p style="margin: 5px 0; color: #374151;"><strong>Level:</strong> <span style="background-color: #3b82f6; color: white; padding: 2px 8px; border-radius: 5px; font-size: 12px;">${courseInfo.courseLevel}</span></p>
                  <p style="margin: 5px 0; color: #374151;"><strong>Start Date:</strong> ${new Date(courseInfo.startDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                  <p style="margin: 5px 0; color: #374151;"><strong>End Date:</strong> ${new Date(courseInfo.endDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>
              </div>

              <div style="background-color: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="color: #059669; margin-top: 0; font-size: 16px;">Your Next Steps</h3>
                <ul style="color: #374151; margin: 10px 0; padding-left: 20px; line-height: 1.8;">
                  <li>Access your supervisor dashboard to view course details</li>
                  <li>Review the curriculum and course requirements</li>
                  <li>Prepare engaging content for your students</li>
                  <li>Start preparing and uploading course video materials</li>
                  <li>All videos need admin approval before going live</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 25px 0;">
                <a href="${process.env.CLIENT_URL}/supervisor/courses" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px; margin-right: 10px;">
                  View Course Dashboard
                </a>
                <a href="${process.env.CLIENT_URL}/supervisor/videos/upload" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
                  Upload Videos
                </a>
              </div>
            </div>

            <div style="background-color: white; border-radius: 10px; padding: 20px; text-align: center; border: 2px dashed #e2e8f0;">
              <h4 style="color: #64748b; margin-top: 0; font-size: 14px;">💡 Need Help?</h4>
              <p style="color: #64748b; margin: 5px 0; font-size: 13px;">If you have any questions about your course assignment or need assistance</p>
              <a href="${process.env.CLIENT_URL}/contact" style="color: #3b82f6; text-decoration: none; font-weight: bold; font-size: 13px;">contact our support team</a>
            </div>

            <div style="background-color: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h4 style="color: #92400e; margin-top: 0; font-size: 14px;">⚠️ Important Notes</h4>
              <ul style="color: #92400e; margin: 5px 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
                <li>All course materials must be uploaded before the start date</li>
                <li>Videos require admin approval before becoming visible to students</li>
                <li>Maintain high-quality educational content standards</li>
                <li>Follow the platform's content guidelines and policies</li>
              </ul>
            </div>
          </div>
          
          <div style="background-color: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px;">
            <p style="margin: 0;">© 2025 LEARN BANGLA TO DEUTSCH. All rights reserved.</p>
          </div>
        </div>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      throw error;
    }
  }

  // Send direct role change notification
  async sendRoleChangeNotification(email: string, firstName: string, lastName: string, oldRole: string, newRole: string) {
    const mailOptions = {
      from: `"LEARN BANGLA TO DEUTSCH" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Role Updated - LEARN BANGLA TO DEUTSCH',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Role Updated!</h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Your account privileges have been updated</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background-color: white; border-radius: 10px; padding: 25px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 20px; font-size: 20px;">Hello ${firstName} ${lastName}!</h2>
              
              <div style="background-color: #dbeafe; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <h3 style="color: #1d4ed8; margin-top: 0; font-size: 16px;">Role Update Details</h3>
                <div style="background-color: white; border-radius: 6px; padding: 15px; margin: 10px 0;">
                  <p style="margin: 5px 0; color: #374151;"><strong>Previous Role:</strong> <span style="color: #ef4444;">${oldRole}</span></p>
                  <p style="margin: 5px 0; color: #374151;"><strong>New Role:</strong> <span style="color: #10b981;">${newRole}</span></p>
                  <p style="margin: 5px 0; color: #374151;"><strong>Updated:</strong> ${new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                </div>
              </div>

              <div style="background-color: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="color: #059669; margin-top: 0; font-size: 16px;">What This Means</h3>
                <p style="color: #374151; line-height: 1.6; margin: 10px 0;">
                  Your account has been updated with <strong>${newRole}</strong> privileges. When you log in next, you'll have access to all features and permissions associated with your new role.
                </p>
              </div>

              <div style="text-align: center; margin: 25px 0;">
                <a href="${process.env.CLIENT_URL}/login" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px;">
                  Login to Your Account
                </a>
              </div>
            </div>

            <div style="background-color: white; border-radius: 10px; padding: 20px; text-align: center; border: 2px dashed #e2e8f0;">
              <h4 style="color: #64748b; margin-top: 0; font-size: 14px;">💡 Need Help?</h4>
              <p style="color: #64748b; margin: 5px 0; font-size: 13px;">If you have any questions about your new role or permissions,</p>
              <a href="${process.env.CLIENT_URL}/contact" style="color: #3b82f6; text-decoration: none; font-weight: bold; font-size: 13px;">contact our support team</a>
            </div>
          </div>
          
          <div style="background-color: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px;">
            <p style="margin: 0;">© 2025 Learn Bangla to Deutsch. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">This is an automated notification about your account update.</p>
          </div>
        </div>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      throw error;
    }
  }

  // Send admin notification when student enrolls
  async sendStudentEnrollmentNotification(
    adminEmail: string, 
    adminFirstName: string, 
    adminLastName: string,
    enrollmentData: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      courseTitle: string;
      courseLevel: string;
      amount: number;
      currency: string;
      paymentMethod: string;
      transactionId: string;
    }
  ) {
    const mailOptions = {
      from: `"LEARN BANGLA TO DEUTSCH" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: '🎉 New Student Enrollment - LEARN BANGLA TO DEUTSCH',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">New Student Enrollment!</h1>
            <p style="color: #f0f4f8; margin: 10px 0 0 0; font-size: 16px;">A new student has successfully enrolled in a course</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
            <div style="margin-bottom: 30px;">
              <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 22px;">Hello ${adminFirstName} ${adminLastName},</h2>
              <p style="color: #4a5568; line-height: 1.6; margin: 0;">Great news! A new student has just enrolled in one of our German language courses. Here are the details:</p>
            </div>

            <div style="background-color: #f7fafc; padding: 25px; border-radius: 8px; border-left: 4px solid #4299e1; margin: 20px 0;">
              <h3 style="color: #2b6cb0; margin: 0 0 15px 0; font-size: 18px;">Course Information</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #4a5568; font-weight: 600;">Course:</span>
                <span style="color: #2d3748; font-weight: bold;">${enrollmentData.courseTitle}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #4a5568; font-weight: 600;">Level:</span>
                <span style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 4px 12px; border-radius: 15px; font-size: 12px; font-weight: bold;">${enrollmentData.courseLevel}</span>
              </div>
            </div>

            <div style="background-color: #f0fff4; padding: 25px; border-radius: 8px; border-left: 4px solid #48bb78; margin: 20px 0;">
              <h3 style="color: #2f855a; margin: 0 0 15px 0; font-size: 18px;">Student Information</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #4a5568; font-weight: 600;">Name:</span>
                <span style="color: #2d3748; font-weight: bold;">${enrollmentData.firstName} ${enrollmentData.lastName}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #4a5568; font-weight: 600;">Email:</span>
                <span style="color: #2d3748;">${enrollmentData.email}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #4a5568; font-weight: 600;">Phone:</span>
                <span style="color: #2d3748;">${enrollmentData.phone}</span>
              </div>
            </div>

            <div style="background-color: #fffaf0; padding: 25px; border-radius: 8px; border-left: 4px solid #ed8936; margin: 20px 0;">
              <h3 style="color: #c05621; margin: 0 0 15px 0; font-size: 18px;">Payment Information</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #4a5568; font-weight: 600;">Amount:</span>
                <span style="color: #2d3748; font-weight: bold;">${enrollmentData.amount} ${enrollmentData.currency}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #4a5568; font-weight: 600;">Method:</span>
                <span style="color: #2d3748;">${enrollmentData.paymentMethod}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #4a5568; font-weight: 600;">Transaction ID:</span>
                <span style="color: #2d3748; font-family: monospace; font-size: 12px;">${enrollmentData.transactionId}</span>
              </div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #4a5568; line-height: 1.6; margin: 0;">You can view more details about this enrollment in your admin dashboard.</p>
            </div>

            <div style="background-color: #edf2f7; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="color: #4a5568; margin: 0; font-size: 14px;">
                <strong>Next Steps:</strong><br>
                • Welcome the new student<br>
                • Ensure course materials are ready<br>
                • Update attendance tracking systems
              </p>
            </div>
          </div>
          
          <div style="background-color: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px;">
            <p style="margin: 0;">© 2025 Learn Bangla to Deutsch. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">This is an automated notification about new student enrollment.</p>
          </div>
        </div>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      throw error;
    }
  }
}

export default new EmailService();