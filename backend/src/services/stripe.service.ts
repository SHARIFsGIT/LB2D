import Stripe from 'stripe';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

class StripeService {
  private stripe: Stripe | null = null;
  private isConfigured: boolean = false;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      logger.warn('⚠️  STRIPE_SECRET_KEY is not configured. Payment functionality will be limited.');
      logger.warn('   Please add STRIPE_SECRET_KEY to your .env file to enable payments.');
      logger.warn('   Get your key from: https://dashboard.stripe.com/test/apikeys');
      this.isConfigured = false;
      return;
    }

    try {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-07-30.basil',
      });
      this.isConfigured = true;
      logger.info('✅ Stripe service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Stripe:', error);
      this.isConfigured = false;
    }
  }

  // Create Payment Intent for course enrollment
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    courseId: string;
    userId: string;
    userEmail: string;
    userName: string;
    courseName: string;
    paymentMethod?: string;
  }) {
    // Check if Stripe is configured
    if (!this.isConfigured || !this.stripe) {
      logger.error('❌ Stripe is not configured. Please set STRIPE_SECRET_KEY in your .env file.');
      return {
        success: false,
        error: 'Payment system is not configured. Please contact the administrator to set up payment processing.'
      };
    }

    try {
      const { amount, currency, courseId, userId, userEmail, userName, courseName, paymentMethod } = params;

      // Convert amount to cents (Stripe uses smallest currency unit)
      const amountInCents = Math.round(amount * 100);

      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: amountInCents,
        currency: currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          courseId,
          userId,
          userEmail,
          userName,
          courseName,
        },
        description: `Course Enrollment: ${courseName} for ${userName}`,
        receipt_email: userEmail,
      };

      // Add specific payment method if provided
      if (paymentMethod) {
        const paymentMethodTypes: string[] = [];
        
        switch (paymentMethod) {
          case 'card':
          case 'mastercard':
          case 'visa':
            paymentMethodTypes.push('card');
            break;
          case 'sepa_debit':
            paymentMethodTypes.push('sepa_debit');
            break;
          case 'sofort':
            paymentMethodTypes.push('sofort');
            break;
          case 'giropay':
            paymentMethodTypes.push('giropay');
            break;
          case 'ideal':
            paymentMethodTypes.push('ideal');
            break;
          case 'bancontact':
            paymentMethodTypes.push('bancontact');
            break;
          case 'eps':
            paymentMethodTypes.push('eps');
            break;
          case 'p24':
            paymentMethodTypes.push('p24');
            break;
          default:
            paymentMethodTypes.push('card');
        }

        if (paymentMethodTypes.length > 0) {
          delete paymentIntentParams.automatic_payment_methods;
          paymentIntentParams.payment_method_types = paymentMethodTypes;
        }
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);

      return {
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
        }
      };
    } catch (error: any) {
      logger.error('Stripe Payment Intent creation failed:', error);
      return {
        success: false,
        error: error.message || 'Payment intent creation failed'
      };
    }
  }

  // Confirm payment intent (for server-side confirmation)
  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string) {
    if (!this.isConfigured || !this.stripe) {
      return {
        success: false,
        error: 'Payment system is not configured'
      };
    }

    try {
      const params: Stripe.PaymentIntentConfirmParams = {};
      
      if (paymentMethodId) {
        params.payment_method = paymentMethodId;
      }

      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, params);

      return {
        success: true,
        data: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata,
        }
      };
    } catch (error: any) {
      logger.error('Stripe Payment Intent confirmation failed:', error);
      return {
        success: false,
        error: error.message || 'Payment confirmation failed'
      };
    }
  }

  // Retrieve payment intent details
  async getPaymentIntent(paymentIntentId: string) {
    if (!this.isConfigured || !this.stripe) {
      return {
        success: false,
        error: 'Payment system is not configured'
      };
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        success: true,
        data: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata,
          payment_method: paymentIntent.payment_method,
          charges: (paymentIntent as any).charges?.data || [],
        }
      };
    } catch (error: any) {
      logger.error('Stripe Payment Intent retrieval failed:', error);
      return {
        success: false,
        error: error.message || 'Payment retrieval failed'
      };
    }
  }

  // Create Setup Intent for saving payment methods
  async createSetupIntent(customerId: string) {
    if (!this.isConfigured || !this.stripe) {
      return {
        success: false,
        error: 'Payment system is not configured'
      };
    }

    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card', 'sepa_debit'],
      });

      return {
        success: true,
        data: {
          clientSecret: setupIntent.client_secret,
          setupIntentId: setupIntent.id,
        }
      };
    } catch (error: any) {
      logger.error('Stripe Setup Intent creation failed:', error);
      return {
        success: false,
        error: error.message || 'Setup intent creation failed'
      };
    }
  }

  // Create or retrieve customer
  async createOrGetCustomer(params: {
    email: string;
    name: string;
    userId: string;
  }) {
    if (!this.isConfigured || !this.stripe) {
      return {
        success: false,
        error: 'Payment system is not configured'
      };
    }

    try {
      const { email, name, userId } = params;

      // Try to find existing customer by email
      const existingCustomers = await this.stripe.customers.list({
        email: email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        return {
          success: true,
          data: existingCustomers.data[0]
        };
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          userId,
        },
      });

      return {
        success: true,
        data: customer
      };
    } catch (error: any) {
      logger.error('Stripe Customer creation/retrieval failed:', error);
      return {
        success: false,
        error: error.message || 'Customer creation failed'
      };
    }
  }

  // Process refund
  async createRefund(paymentIntentId: string, amount?: number) {
    if (!this.isConfigured || !this.stripe) {
      return {
        success: false,
        error: 'Payment system is not configured'
      };
    }

    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      };

      if (amount) {
        refundParams.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await this.stripe.refunds.create(refundParams);

      return {
        success: true,
        data: {
          id: refund.id,
          status: refund.status,
          amount: refund.amount,
          currency: refund.currency,
        }
      };
    } catch (error: any) {
      logger.error('Stripe Refund creation failed:', error);
      return {
        success: false,
        error: error.message || 'Refund creation failed'
      };
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event | null {
    if (!this.isConfigured || !this.stripe) {
      logger.error('❌ Cannot verify webhook - Stripe is not configured');
      return null;
    }

    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );

      return event;
    } catch (error: any) {
      logger.error('Webhook signature verification failed:', error);
      return null;
    }
  }

  // Get supported payment methods by country
  getPaymentMethodsByCountry(countryCode: string): string[] {
    const paymentMethods: { [key: string]: string[] } = {
      DE: ['card', 'sepa_debit', 'sofort', 'giropay', 'eps'],
      BD: ['card'], // Limited options for Bangladesh
      IN: ['card'],
      US: ['card'],
      FR: ['card', 'sepa_debit'],
      NL: ['card', 'sepa_debit', 'ideal'],
      BE: ['card', 'sepa_debit', 'bancontact'],
      AT: ['card', 'sepa_debit', 'eps'],
      PL: ['card', 'sepa_debit', 'p24'],
      IT: ['card', 'sepa_debit'],
      ES: ['card', 'sepa_debit'],
      GB: ['card'],
      // Default EU countries
      EU: ['card', 'sepa_debit'],
    };

    return paymentMethods[countryCode] || ['card'];
  }
}

export default new StripeService();