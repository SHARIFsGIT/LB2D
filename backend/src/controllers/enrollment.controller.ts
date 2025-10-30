import { Request, Response } from 'express';
import Course from '../models/Course.model';
import Enrollment from '../models/Enrollment.model';
import Payment from '../models/Payment.model';
import User from '../models/User.model';
import emailService from '../services/email.service';
import notificationService from '../services/notification.service';
import { notifyAdmins, notifySupervisors, notifyStudents, notifyUser, notifyRoleHierarchy } from '../services/websocket.service';
import logger from '../utils/logger';

interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

// Initiate course enrollment (creates pending payment)
export const initiateEnrollment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId, paymentMethod } = req.body;
    const userId = req.userId;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if course is available for enrollment
    if (course.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: 'Course is not available for enrollment'
      });
    }

    // Check if course is full
    if (course.currentStudents >= course.maxStudents) {
      return res.status(400).json({
        success: false,
        message: 'Course is full'
      });
    }

    // Check if user is already enrolled
    const existingEnrollment = await Enrollment.findOne({ userId, courseId });
    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }

    // Generate transaction ID
    const transactionId = `TXN_${Date.now()}_${userId}`;

    // Create payment record
    const payment = await Payment.create({
      userId,
      courseId,
      amount: course.price,
      currency: course.currency,
      paymentMethod,
      transactionId,
      status: 'pending'
    });

    // Create enrollment record
    const enrollment = await Enrollment.create({
      userId,
      courseId,
      paymentId: payment._id,
      status: 'pending'
    });

    return res.status(201).json({
      success: true,
      message: 'Enrollment initiated. Please complete payment.',
      data: {
        enrollment,
        payment: {
          id: payment._id,
          transactionId: payment.transactionId,
          amount: payment.amount,
          currency: payment.currency,
          paymentMethod: payment.paymentMethod
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate enrollment',
      error: error.message
    });
  }
};

// Confirm payment and complete enrollment
export const confirmEnrollment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { transactionId, paymentGatewayId } = req.body;

    // Find payment
    const payment = await Payment.findOne({ transactionId });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update payment status
    payment.status = 'completed';
    payment.paymentGatewayId = paymentGatewayId;
    payment.paymentDate = new Date();
    await payment.save();

    // Update enrollment status
    const enrollment = await Enrollment.findOne({ paymentId: payment._id });
    if (enrollment) {
      enrollment.status = 'confirmed';
      await enrollment.save();

      // Update course current students count
      await Course.findByIdAndUpdate(
        payment.courseId,
        { $inc: { currentStudents: 1 } }
      );

      // Send notifications about the enrollment
      try {
        const student = await User.findById(payment.userId);
        const course = await Course.findById(payment.courseId).populate('supervisor');
        
        if (student && course) {
          // Get all admin users
          const adminUsers = await User.find({ role: 'Admin' });
          
          // Send email notifications to admins
          for (const admin of adminUsers) {
            await emailService.sendStudentEnrollmentNotification(
              admin.email,
              admin.firstName,
              admin.lastName,
              {
                firstName: student.firstName,
                lastName: student.lastName,
                email: student.email,
                phone: student.phone || 'Not provided',
                courseTitle: course.title,
                courseLevel: course.level,
                amount: payment.amount,
                currency: payment.currency,
                paymentMethod: payment.paymentMethod,
                transactionId: payment.transactionId
              }
            );
          }
          
          // Send persisted notification to student
          await notificationService.createNotification(payment.userId.toString(), {
            type: 'enrollment',
            title: 'Enrollment Confirmed',
            message: `Your enrollment in ${course.title} has been confirmed! You can now access all course materials.`,
            fromRole: 'Admin',
            urgent: true,
            data: {
              courseId: (course._id as any).toString(),
              courseTitle: course.title,
              courseLevel: course.level,
              enrollmentId: (enrollment._id as any).toString(),
              paymentAmount: payment.amount,
              currency: payment.currency,
              actionUrl: `/courses/${course._id}`
            }
          });
          
          // Send WebSocket notification to admins
          await notifyAdmins({
            id: `admin_enrollment_${enrollment._id}_${Date.now()}`,
            type: 'enrollment',
            title: 'Student Enrollment Confirmed',
            message: `${student.firstName} ${student.lastName} successfully enrolled in ${course.title} (${course.level})`,
            targetRole: 'Admin',
            fromRole: 'System',
            urgent: false,
            timestamp: new Date(),
            data: {
              studentId: (student._id as any).toString(),
              studentName: `${student.firstName} ${student.lastName}`,
              studentEmail: student.email,
              courseId: (course._id as any).toString(),
              courseTitle: course.title,
              courseLevel: course.level,
              enrollmentId: (enrollment._id as any).toString(),
              paymentAmount: payment.amount,
              currency: payment.currency,
              transactionId: payment.transactionId,
              enrollmentDate: new Date()
            }
          });

          // Send additional notification for admin dashboard analytics update
          await notifyAdmins({
            id: `admin_analytics_update_${enrollment._id}_${Date.now()}`,
            type: 'student_action',
            title: 'Analytics Update Required',
            message: `Student enrollment analytics require refresh. New enrollment: ${student.firstName} ${student.lastName} → ${course.title}`,
            targetRole: 'Admin',
            fromRole: 'System',
            urgent: false,
            timestamp: new Date(),
            data: {
              action: 'student_enrolled',
              analyticsSection: 'recently_registered_students',
              studentId: (student._id as any).toString(),
              studentName: `${student.firstName} ${student.lastName}`,
              studentEmail: student.email,
              courseId: (course._id as any).toString(),
              courseTitle: course.title,
              courseLevel: course.level,
              enrollmentId: (enrollment._id as any).toString(),
              enrollmentDate: new Date()
            }
          });
          
          // Send WebSocket notification to course supervisor if assigned
          if (course.supervisor) {
            await notifyUser((course.supervisor as any)._id.toString(), {
              id: `supervisor_enrollment_${enrollment._id}_${Date.now()}`,
              type: 'enrollment',
              title: 'New Student in Your Course',
              message: `${student.firstName} ${student.lastName} has enrolled in your supervised course: ${course.title}`,
              targetRole: 'Supervisor',
              fromRole: 'Student',
              urgent: true,
              timestamp: new Date(),
              data: {
                studentId: (student._id as any).toString(),
                studentName: `${student.firstName} ${student.lastName}`,
                studentEmail: student.email,
                courseId: (course._id as any).toString(),
                courseTitle: course.title,
                enrollmentId: (enrollment._id as any).toString()
              }
            });
          }
        }
      } catch (error) {
        logger.error('Failed to send enrollment notifications:', error);
        // Don't fail the enrollment if notifications fail
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Enrollment confirmed successfully',
      data: enrollment
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to confirm enrollment',
      error: error.message
    });
  }
};

// Get enrollment details
export const getEnrollmentDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('courseId')
      .populate('paymentId')
      .populate('userId', 'name email');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check if user can access this enrollment
    if (enrollment.userId.toString() !== req.userId && req.userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    return res.status(200).json({
      success: true,
      data: enrollment
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to get enrollment details',
      error: error.message
    });
  }
};

// Cancel enrollment (before course starts)
export const cancelEnrollment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check ownership
    if (enrollment.userId.toString() !== req.userId && req.userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if course has started
    const course = await Course.findById(enrollment.courseId);
    if (course && new Date() >= course.startDate) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel enrollment after course has started'
      });
    }

    // Update enrollment status
    enrollment.status = 'cancelled';
    await enrollment.save();

    // Update payment status (for refund processing)
    await Payment.findByIdAndUpdate(
      enrollment.paymentId,
      { status: 'refunded' }
    );

    // Decrease course current students count
    if (course) {
      await Course.findByIdAndUpdate(
        course._id,
        { $inc: { currentStudents: -1 } }
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Enrollment cancelled successfully'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel enrollment',
      error: error.message
    });
  }
};