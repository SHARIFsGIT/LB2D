import { Request, Response } from 'express';
import Course from '../models/Course.model';
import Enrollment from '../models/Enrollment.model';
import Payment from '../models/Payment.model';
import User from '../models/User.model';
import PaymentService from '../services/payment.service';
import stripeService from '../services/stripe.service';
import emailService from '../services/email.service';
import mobileBankingService, { MobileBankingPayment } from '../services/mobileBanking.service';
import logger from '../utils/logger';
import { ResponseUtil } from '../utils/response.util';
import { CustomError } from '../middleware/errorHandler.middleware';

interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

// Get available payment methods
export const getPaymentMethods = async (req: Request, res: Response) => {
  try {
    const paymentMethods = [
      // International payment methods
      {
        id: 'stripe_card',
        name: 'Credit/Debit Card',
        type: 'international',
        icon: '/images/card-icon.png',
        description: 'Pay with Visa, Mastercard, American Express',
        supported: true
      },
      // Bangladeshi mobile banking (temporarily disabled - no API keys)
      {
        id: 'bkash',
        name: 'bKash',
        type: 'mobile_banking',
        icon: '/images/bkash-logo.png',
        description: 'Pay with bKash mobile banking (Coming Soon)',
        supported: false
      },
      {
        id: 'nagad',
        name: 'Nagad',
        type: 'mobile_banking', 
        icon: '/images/nagad-logo.png',
        description: 'Pay with Nagad mobile banking (Coming Soon)',
        supported: false
      },
      {
        id: 'rocket',
        name: 'Rocket',
        type: 'mobile_banking',
        icon: '/images/rocket-logo.png', 
        description: 'Pay with Dutch-Bangla Rocket (Coming Soon)',
        supported: false
      },
      {
        id: 'surecash',
        name: 'SureCash',
        type: 'mobile_banking',
        icon: '/images/surecash-logo.png',
        description: 'Pay with SureCash mobile banking (Coming Soon)',
        supported: false
      },
      {
        id: 'upay',
        name: 'Upay',
        type: 'mobile_banking',
        icon: '/images/upay-logo.png',
        description: 'Pay with UCB Upay (Coming Soon)',
        supported: false
      }
    ];
    
    return res.status(200).json({
      success: true,
      data: paymentMethods
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods',
      error: error.message
    });
  }
};

// Initialize payment
export const initializePayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId, paymentMethod } = req.body;
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get course info
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if course is available
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

    // Create Stripe Payment Intent
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    const stripeResult = await stripeService.createPaymentIntent({
      amount: course.price,
      currency: course.currency || 'EUR',
      courseId: courseId,
      userId: userId,
      userEmail: user.email,
      userName: userName,
      courseName: course.title,
      paymentMethod: paymentMethod
    });

    if (!stripeResult.success || !stripeResult.data) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create payment intent',
        error: stripeResult.error
      });
    }

    // Generate transaction ID (max 12 characters)
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const userIdShort = userId.toString().slice(-4); // Last 4 characters of userId
    const transactionId = `TX${timestamp}${userIdShort}`; // TX + 6 digits + 4 chars = 12 chars max

    // Create payment record in database
    const payment = await Payment.create({
      userId,
      courseId,
      amount: course.price,
      currency: course.currency || 'EUR',
      paymentMethod,
      transactionId,
      stripePaymentIntentId: stripeResult.data.paymentIntentId,
      status: 'pending'
    });
    return res.status(201).json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        transactionId: payment.transactionId,
        clientSecret: stripeResult.data.clientSecret,
        paymentIntentId: stripeResult.data.paymentIntentId,
        course: {
          id: course._id,
          title: course.title,
          level: course.level,
          price: course.price,
          currency: course.currency
        },
        paymentMethod
      }
    });
  } catch (error: any) {
    logger.error('Payment initialization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initialize payment',
      error: error.message
    });
  }
};

// Verify and complete payment
export const verifyPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { transactionId, ...gatewayData } = req.body;

    // Verify payment
    const verificationResult = await PaymentService.verifyPayment(transactionId, gatewayData);

    if (!verificationResult.success || !verificationResult.payment) {
      return res.status(400).json({
        success: false,
        message: verificationResult.message || 'Payment verification failed'
      });
    }

    const payment = verificationResult.payment;

    // Create enrollment
    const enrollment = await Enrollment.create({
      userId: payment.userId,
      courseId: payment.courseId,
      paymentId: payment._id,
      status: 'confirmed'
    });

    // Update course student count
    await Course.findByIdAndUpdate(
      payment.courseId,
      { $inc: { currentStudents: 1 } }
    );

    // Get course and user details for email
    const course = await Course.findById(payment.courseId);
    const user = await User.findById(payment.userId);

    if (course && user) {
      // Send enrollment confirmation email
      try {
        await emailService.sendEnrollmentConfirmation(
          user.email,
          `${user.firstName} ${user.lastName}`,
          {
            title: course.title,
            level: course.level,
            startDate: course.startDate,
            instructor: course.instructor,
            schedule: course.schedule
          },
          {
            transactionId: payment.transactionId,
            amount: payment.amount,
            currency: payment.currency,
            paymentMethod: payment.paymentMethod
          }
        );
      } catch (emailError) {
        logger.error('Failed to send enrollment email:', emailError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified and enrollment confirmed',
      data: {
        enrollment,
        payment: {
          transactionId: payment.transactionId,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
};

// Get payment status
export const getPaymentStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { transactionId } = req.params;

    const payment = await Payment.findOne({ transactionId })
      .populate('courseId')
      .populate('userId', 'firstName lastName email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if user can access this payment
    if ((payment.userId as any)._id.toString() !== req.userId && req.userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    return res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: error.message
    });
  }
};

// Cancel payment
export const cancelPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { transactionId } = req.params;

    const payment = await Payment.findOne({ transactionId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check ownership
    if (payment.userId.toString() !== req.userId && req.userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Can only cancel pending or processing payments
    if (!['pending', 'processing'].includes(payment.status)) {
      return res.status(400).json({
        success: false,
        message: 'Payment cannot be cancelled'
      });
    }

    payment.status = 'failed';
    payment.notes = 'Cancelled by user';
    await payment.save();

    return res.status(200).json({
      success: true,
      message: 'Payment cancelled successfully'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel payment',
      error: error.message
    });
  }
};

// Get user's payment history
export const getPaymentHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payments = await Payment.find({ userId: req.userId })
      .populate('courseId')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: error.message
    });
  }
};

// Admin: Get all payments
export const getAllPayments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status, paymentMethod } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    const payments = await Payment.find(filter)
      .populate('userId', 'firstName lastName email')
      .populate('courseId', 'title level')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Payment.countDocuments(filter);

    return res.status(200).json({
      success: true,
      count: payments.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: payments
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message
    });
  }
};

// Complete payment after Stripe confirmation
export const completePayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.userId;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID is required'
      });
    }

    // Find payment record
    const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Verify the payment belongs to the current user
    if (payment.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Verify payment with Stripe
    const stripePayment = await stripeService.getPaymentIntent(paymentIntentId);
    if (!stripePayment.success || !stripePayment.data || stripePayment.data.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not confirmed by Stripe'
      });
    }

    // Update payment status if not already completed
    if (payment.status !== 'completed') {
      payment.status = 'completed';
      payment.paymentDate = new Date();
      payment.paymentGatewayId = paymentIntentId;
      await payment.save();
    }

    // Create or update enrollment
    let enrollment = await Enrollment.findOne({ 
      userId: payment.userId, 
      courseId: payment.courseId 
    });

    if (!enrollment) {
      enrollment = await Enrollment.create({
        userId: payment.userId,
        courseId: payment.courseId,
        paymentId: payment._id,
        status: 'confirmed',
        enrollmentDate: new Date()
      });

      // Update course student count
      await Course.findByIdAndUpdate(
        payment.courseId,
        { $inc: { currentStudents: 1 } }
      );
    }

    // Get course and user details for response
    const course = await Course.findById(payment.courseId);
    const user = await User.findById(payment.userId);

    return res.status(200).json({
      success: true,
      message: 'Payment completed and enrollment confirmed',
      data: {
        enrollment,
        payment: {
          transactionId: payment.transactionId,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status
        },
        course: {
          id: course?._id,
          title: course?.title,
          level: course?.level
        }
      }
    });
  } catch (error: any) {
    logger.error('Payment completion error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete payment',
      error: error.message
    });
  }
};

// Admin: Get payment statistics
export const getPaymentStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const totalPayments = await Payment.countDocuments();
    const completedPayments = await Payment.countDocuments({ status: 'completed' });
    const pendingPayments = await Payment.countDocuments({ status: 'pending' });
    const failedPayments = await Payment.countDocuments({ status: 'failed' });

    // Revenue calculation
    const revenueResult = await Payment.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$currency',
          totalRevenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Payments by method
    const paymentsByMethod = await Payment.aggregate([
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
            }
          }
        }
      }
    ]);

    // Monthly revenue
    const monthlyRevenue = await Payment.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' }
          },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalPayments,
        completedPayments,
        pendingPayments,
        failedPayments,
        successRate: totalPayments > 0 ? (completedPayments / totalPayments * 100).toFixed(2) : 0,
        revenue: revenueResult,
        paymentsByMethod,
        monthlyRevenue
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment statistics',
      error: error.message
    });
  }
};

// Admin: Clear all payment records
export const clearAllPayments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only allow admin users to clear payment data
    if (req.userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Count current payments before deletion
    const totalPayments = await Payment.countDocuments();
    
    // Clear all payment records
    const result = await Payment.deleteMany({});
    return res.status(200).json({
      success: true,
      message: `Successfully cleared ${result.deletedCount} payment records`,
      data: {
        deletedCount: result.deletedCount,
        previousTotal: totalPayments
      }
    });
  } catch (error: any) {
    logger.error('Error clearing payments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear payment records',
      error: error.message
    });
  }
};

// Initialize Mobile Banking Payment
export const initiateMobileBankingPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      courseId,
      provider, 
      customerPhone, 
      customerEmail 
    } = req.body;

    const userId = req.userId;

    // Validation
    if (!provider || !courseId || !customerPhone || !userId) {
      throw new CustomError('Missing required payment fields', 400);
    }

    if (!['bkash', 'nagad', 'rocket', 'surecash', 'upay'].includes(provider)) {
      throw new CustomError('Invalid payment provider', 400);
    }

    // Get user and course info
    const user = await User.findById(userId);
    const course = await Course.findById(courseId);

    if (!user || !course) {
      throw new CustomError('User or course not found', 404);
    }

    // Check if course is available
    if (course.status !== 'upcoming') {
      throw new CustomError('Course is not available for enrollment', 400);
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({ userId, courseId });
    if (existingEnrollment) {
      throw new CustomError('Already enrolled in this course', 400);
    }

    // Generate transaction ID
    const timestamp = Date.now().toString().slice(-6);
    const userIdShort = userId.toString().slice(-4);
    const orderId = `MB${timestamp}${userIdShort}`;

    // Create payment record
    const payment = await Payment.create({
      userId,
      courseId,
      amount: course.price,
      currency: course.currency || 'BDT',
      paymentMethod: provider,
      transactionId: orderId,
      status: 'pending'
    });

    // Prepare mobile banking payment
    const mobileBankingPayment: MobileBankingPayment = {
      provider: provider as any,
      amount: course.price,
      currency: course.currency || 'BDT',
      orderId,
      customerPhone,
      customerEmail: customerEmail || user.email,
      description: `Payment for ${course.title}`
    };

    logger.info('Initiating mobile banking payment:', mobileBankingPayment);

    const result = await mobileBankingService.processPayment(mobileBankingPayment);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Mobile banking payment initiated successfully',
        data: {
          transactionId: orderId,
          paymentUrl: result.paymentUrl,
          provider,
          course: {
            id: course._id,
            title: course.title,
            price: course.price,
            currency: course.currency
          }
        }
      });
    } else {
      // Update payment status to failed
      payment.status = 'failed';
      payment.notes = result.error;
      await payment.save();
      
      throw new CustomError(result.error || 'Payment initialization failed', 400);
    }

  } catch (error: any) {
    logger.error('Mobile banking payment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate mobile banking payment',
      error: error.message
    });
  }
};

// Handle Mobile Banking Callback
export const handleMobileBankingCallback = async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const callbackData = req.body;

    logger.info('Mobile banking callback received:', { provider, data: callbackData });

    // Process callback based on provider
    switch (provider) {
      case 'bkash':
        return await handleBkashCallback(req, res);
      case 'nagad':
        return await handleNagadCallback(req, res);
      case 'sslcommerz':
        return await handleSSLCommerzCallback(req, res);
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid callback provider'
        });
    }

  } catch (error: any) {
    logger.error('Mobile banking callback error:', error);
    return res.status(500).json({
      success: false,
      message: 'Callback processing failed',
      error: error.message
    });
  }
};

const handleBkashCallback = async (req: Request, res: Response) => {
  const { paymentID, status, trxID } = req.body;

  if (status === 'success') {
    const payment = await Payment.findOne({ transactionId: trxID });
    if (payment) {
      payment.status = 'completed';
      payment.paymentGatewayId = paymentID;
      payment.paymentDate = new Date();
      await payment.save();

      await createEnrollmentFromPayment(payment);
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: { paymentID }
    });
  } else {
    return res.status(400).json({
      success: false,
      message: 'Payment failed or cancelled'
    });
  }
};

const handleNagadCallback = async (req: Request, res: Response) => {
  const { payment_ref_id, status, order_id } = req.body;

  if (status === 'Success') {
    const payment = await Payment.findOne({ transactionId: order_id });
    if (payment) {
      payment.status = 'completed';
      payment.paymentGatewayId = payment_ref_id;
      payment.paymentDate = new Date();
      await payment.save();

      await createEnrollmentFromPayment(payment);
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: { payment_ref_id }
    });
  } else {
    return res.status(400).json({
      success: false,
      message: 'Payment failed'
    });
  }
};

const handleSSLCommerzCallback = async (req: Request, res: Response) => {
  const { status, tran_id, val_id } = req.body;

  if (status === 'VALID') {
    const payment = await Payment.findOne({ transactionId: tran_id });
    if (payment) {
      payment.status = 'completed';
      payment.paymentGatewayId = val_id;
      payment.paymentDate = new Date();
      await payment.save();

      await createEnrollmentFromPayment(payment);
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: { tran_id, val_id }
    });
  } else {
    return res.status(400).json({
      success: false,
      message: 'Payment failed'
    });
  }
};

// Helper function to create enrollment from payment
const createEnrollmentFromPayment = async (payment: any) => {
  try {
    const existingEnrollment = await Enrollment.findOne({
      userId: payment.userId,
      courseId: payment.courseId
    });

    if (!existingEnrollment) {
      await Enrollment.create({
        userId: payment.userId,
        courseId: payment.courseId,
        paymentId: payment._id,
        status: 'confirmed',
        enrollmentDate: new Date()
      });

      await Course.findByIdAndUpdate(
        payment.courseId,
        { $inc: { currentStudents: 1 } }
      );

      const user = await User.findById(payment.userId);
      const course = await Course.findById(payment.courseId);

      if (user && course) {
        await emailService.sendEnrollmentConfirmation(
          user.email,
          `${user.firstName} ${user.lastName}`,
          {
            title: course.title,
            level: course.level,
            startDate: course.startDate,
            instructor: course.instructor,
            schedule: course.schedule
          },
          {
            transactionId: payment.transactionId,
            amount: payment.amount,
            currency: payment.currency,
            paymentMethod: payment.paymentMethod
          }
        );
      }
    }
  } catch (error) {
    logger.error('Error creating enrollment:', error);
  }
};