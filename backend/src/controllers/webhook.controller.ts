import { Request, Response } from 'express';
import stripeService from '../services/stripe.service';
import Payment from '../models/Payment.model';
import Enrollment from '../models/Enrollment.model';
import Course from '../models/Course.model';
import User from '../models/User.model';
import emailService from '../services/email.service';
import logger from '../utils/logger';

// Handle Stripe webhooks
export const handleStripeWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const body = req.body;

    // Verify webhook signature
    const event = stripeService.verifyWebhookSignature(body, signature);
    
    if (!event) {
      logger.error('Webhook signature verification failed');
      return res.status(400).json({
        success: false,
        message: 'Webhook signature verification failed'
      });
    }
    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
        
      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object);
        break;
        
      case 'payment_intent.requires_action':
        await handlePaymentIntentRequiresAction(event.data.object);
        break;
        
      default:
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook received and processed'
    });
  } catch (error: any) {
    logger.error('Webhook processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
      error: error.message
    });
  }
};

// Handle successful payment
async function handlePaymentIntentSucceeded(paymentIntent: any) {
  try {
    const { id: paymentIntentId, metadata } = paymentIntent;
    // Find payment record
    const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
    if (!payment) {
      logger.error('Payment record not found for payment intent:', paymentIntentId);
      return;
    }

    // Update payment status
    payment.status = 'completed';
    payment.paymentDate = new Date();
    payment.paymentGatewayId = paymentIntentId;

    // Extract payment method details if available
    if (paymentIntent.payment_method) {
      const paymentMethodDetails = paymentIntent.payment_method;
      if (paymentMethodDetails.card) {
        payment.paymentDetails.cardLast4 = paymentMethodDetails.card.last4;
        payment.paymentDetails.cardBrand = paymentMethodDetails.card.brand;
        payment.paymentDetails.country = paymentMethodDetails.card.country;
      }
    }

    await payment.save();

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
    } else {
      enrollment.status = 'confirmed';
      enrollment.paymentId = payment._id as any;
      await enrollment.save();
    }

    // Update course student count
    await Course.findByIdAndUpdate(
      payment.courseId,
      { $inc: { currentStudents: 1 } }
    );

    // Send emails
    try {
      const student = await User.findById(payment.userId);
      const course = await Course.findById(payment.courseId);
      
      if (student && course) {
        // Send enrollment confirmation email to student
        try {
          await emailService.sendEnrollmentConfirmation(
            student.email,
            `${student.firstName} ${student.lastName}`,
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
        } catch (studentEmailError) {
          logger.error('❌ CRITICAL: Failed to send student enrollment email:', studentEmailError);
          logger.error('Email config check required. Student will not receive enrollment confirmation.');
        }

        // Send admin notification email
        try {
          const adminUsers = await User.find({ role: 'Admin' });
          if (adminUsers.length === 0) {
            logger.warn('⚠️ WARNING: No admin users found to notify about enrollment');
          }
          
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
        } catch (adminEmailError) {
          logger.error('❌ CRITICAL: Failed to send admin notification email:', adminEmailError);
          logger.error('Admins will not be notified about this enrollment.');
        }
      } else {
        logger.error('❌ CRITICAL: Missing student or course data for email notifications');
        logger.error(`Student found: ${!!student}, Course found: ${!!course}`);
      }
    } catch (emailError) {
      logger.error('❌ CRITICAL: Failed to send notification emails:', emailError);
      logger.error('Check email service configuration and database connectivity');
    }
  } catch (error: any) {
    logger.error('Error processing successful payment:', error);
  }
}

// Handle failed payment
async function handlePaymentIntentFailed(paymentIntent: any) {
  try {
    const { id: paymentIntentId } = paymentIntent;
    // Find payment record
    const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
    if (!payment) {
      logger.error('Payment record not found for payment intent:', paymentIntentId);
      return;
    }

    // Update payment status
    payment.status = 'failed';
    payment.notes = paymentIntent.last_payment_error?.message || 'Payment failed';
    await payment.save();

    // Update enrollment status if exists
    await Enrollment.updateOne(
      { userId: payment.userId, courseId: payment.courseId },
      { status: 'cancelled' }
    );
  } catch (error: any) {
    logger.error('Error processing failed payment:', error);
  }
}

// Handle canceled payment
async function handlePaymentIntentCanceled(paymentIntent: any) {
  try {
    const { id: paymentIntentId } = paymentIntent;
    // Find payment record
    const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
    if (!payment) {
      logger.error('Payment record not found for payment intent:', paymentIntentId);
      return;
    }

    // Update payment status
    payment.status = 'canceled';
    await payment.save();

    // Update enrollment status if exists
    await Enrollment.updateOne(
      { userId: payment.userId, courseId: payment.courseId },
      { status: 'cancelled' }
    );
  } catch (error: any) {
    logger.error('Error processing canceled payment:', error);
  }
}

// Handle payment requiring action
async function handlePaymentIntentRequiresAction(paymentIntent: any) {
  try {
    const { id: paymentIntentId } = paymentIntent;
    // Find payment record
    const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
    if (!payment) {
      logger.error('Payment record not found for payment intent:', paymentIntentId);
      return;
    }

    // Update payment status
    payment.status = 'requires_action';
    await payment.save();
  } catch (error: any) {
    logger.error('Error processing payment requiring action:', error);
  }
}