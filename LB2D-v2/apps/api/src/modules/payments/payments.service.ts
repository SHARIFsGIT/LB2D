import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EmailService } from '@/common/email/email.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { MobilePaymentDto } from './dto/mobile-payment.dto';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2023-10-16',
      });
    }
  }

  /**
   * Create payment intent (Stripe or Mobile Banking)
   */
  async createPaymentIntent(
    userId: string,
    createPaymentIntentDto: CreatePaymentIntentDto,
  ) {
    const { courseId, paymentMethod } = createPaymentIntentDto;

    // Get course
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if already enrolled
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      throw new BadRequestException('Already enrolled in this course');
    }

    const amount = course.discountPrice || course.price;

    // Handle free courses
    if (amount === 0) {
      const payment = await this.prisma.payment.create({
        data: {
          userId,
          courseId,
          amount: 0,
          currency: 'USD',
          paymentMethod: 'FREE',
          status: 'COMPLETED',
          paidAt: new Date(),
        },
      });

      // Auto-enroll for free courses
      await this.prisma.enrollment.create({
        data: {
          userId,
          courseId,
          status: 'ACTIVE',
        },
      });

      return {
        message: 'Enrolled in free course successfully',
        payment,
      };
    }

    // Handle Stripe payment
    if (paymentMethod === 'STRIPE') {
      if (!this.stripe) {
        throw new BadRequestException('Stripe not configured');
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          userId,
          courseId,
        },
      });

      const payment = await this.prisma.payment.create({
        data: {
          userId,
          courseId,
          amount,
          currency: 'USD',
          paymentMethod: 'STRIPE',
          status: 'PENDING',
          stripePaymentId: paymentIntent.id,
        },
      });

      return {
        message: 'Payment intent created',
        clientSecret: paymentIntent.client_secret,
        paymentId: payment.id,
      };
    }

    // Handle Mobile Banking
    if (['BKASH', 'NAGAD', 'ROCKET'].includes(paymentMethod)) {
      const payment = await this.prisma.payment.create({
        data: {
          userId,
          courseId,
          amount,
          currency: 'BDT',
          paymentMethod,
          status: 'PENDING',
          mobileProvider: paymentMethod,
          mobileNumber: createPaymentIntentDto.mobileNumber,
        },
      });

      return {
        message: 'Payment created. Please complete payment via mobile banking.',
        paymentId: payment.id,
        amount,
        currency: 'BDT',
        instructions: this.getMobileBankingInstructions(paymentMethod),
      };
    }

    throw new BadRequestException('Invalid payment method');
  }

  /**
   * Confirm Stripe payment
   */
  async confirmPayment(confirmPaymentDto: ConfirmPaymentDto) {
    const { paymentIntentId } = confirmPaymentDto;

    if (!this.stripe) {
      throw new BadRequestException('Stripe not configured');
    }

    // Verify payment intent with Stripe
    const paymentIntent = await this.stripe.paymentIntents.retrieve(
      paymentIntentId,
    );

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException('Payment not completed');
    }

    // Find payment record
    const payment = await this.prisma.payment.findUnique({
      where: { stripePaymentId: paymentIntentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    // Update payment status
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
      },
    });

    // Create enrollment
    if (payment.courseId) {
      await this.prisma.enrollment.create({
        data: {
          userId: payment.userId,
          courseId: payment.courseId,
          status: 'ACTIVE',
        },
      });
    }

    return {
      message: 'Payment confirmed and enrollment successful',
      paymentId: payment.id,
    };
  }

  /**
   * Confirm mobile banking payment (Manual verification)
   */
  async confirmMobilePayment(mobilePaymentDto: MobilePaymentDto) {
    const { paymentId, provider, mobileNumber, transactionId } = mobilePaymentDto;

    // Find payment
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'COMPLETED') {
      throw new BadRequestException('Payment already completed');
    }

    // TODO: Verify transaction with mobile banking API
    // For now, mark as pending and notify admin for manual verification

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        mobileProvider: provider,
        mobileNumber,
        mobileTransactionId: transactionId,
        mobileReference: `${provider}-${transactionId}`,
      },
    });

    return {
      message: 'Payment submitted. Our team will verify and activate your enrollment shortly.',
    };
  }

  /**
   * Get user payment history
   */
  async getMyPayments(userId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { payments };
  }

  /**
   * Get all payments (Admin)
   */
  async getAllPayments(
    page: number = 1,
    limit: number = 20,
    status?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Process Stripe webhook
   */
  async handleWebhook(event: any) {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;

      const payment = await this.prisma.payment.findUnique({
        where: { stripePaymentId: paymentIntent.id },
      });

      if (payment && payment.status === 'PENDING') {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'COMPLETED',
            paidAt: new Date(),
          },
        });

        // Create enrollment
        if (payment.courseId) {
          await this.prisma.enrollment.create({
            data: {
              userId: payment.userId,
              courseId: payment.courseId,
              status: 'ACTIVE',
            },
          });

          // Get course and user details for email
          const paymentWithDetails = await this.prisma.payment.findUnique({
            where: { id: payment.id },
            include: {
              user: {
                select: { firstName: true, email: true },
              },
            },
          });

          // Get course details
          const course = await this.prisma.course.findUnique({
            where: { id: payment.courseId },
            select: { title: true },
          });

          // Send payment confirmation email (async, non-blocking)
          if (paymentWithDetails && course) {
            this.emailService.sendPaymentConfirmation(
              paymentWithDetails.user.email,
              paymentWithDetails.user.firstName,
              course.title,
              payment.amount,
              payment.currency,
            ).catch(err => console.error('Failed to send payment confirmation email:', err));
          }
        }
      }
    }

    return { received: true };
  }

  /**
   * Get mobile banking instructions
   */
  private getMobileBankingInstructions(provider: string): string {
    const instructions = {
      BKASH: 'Dial *247# and send money to LB2D merchant account. Use the payment ID as reference.',
      NAGAD: 'Open Nagad app, send money to LB2D merchant. Use payment ID as reference.',
      ROCKET: 'Dial *322# and send money to LB2D merchant. Use payment ID as reference.',
    };

    return instructions[provider] || '';
  }
}
