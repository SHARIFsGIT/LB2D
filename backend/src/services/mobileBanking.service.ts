import axios from 'axios';
import config from '../config/app.config';
import logger from '../utils/logger';

export interface MobileBankingPayment {
  provider: 'bkash' | 'nagad' | 'rocket' | 'surecash' | 'upay';
  amount: number;
  currency: string;
  orderId: string;
  customerPhone: string;
  customerEmail?: string;
  description?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  error?: string;
  providerResponse?: any;
}

class MobileBankingService {
  
  // bKash Integration
  // COMMENTED OUT - No API keys available yet
  // Uncomment and configure when bKash API keys are obtained
  /*
  async processBkashPayment(payment: MobileBankingPayment): Promise<PaymentResponse> {
    try {
      // Get bKash token first
      const token = await this.getBkashToken();
      
      const paymentRequest = {
        mode: '0011', // Checkout mode
        payerReference: payment.customerPhone,
        callbackURL: `${config.get('CLIENT_URL')}/payment/callback/bkash`,
        amount: payment.amount.toString(),
        currency: payment.currency || 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: payment.orderId
      };

      const response = await axios.post(
        `${config.get('BKASH_BASE_URL')}/checkout/payment/create`,
        paymentRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
            'X-APP-Key': config.get('BKASH_APP_KEY')
          }
        }
      );

      if (response.data && response.data.statusCode === '0000') {
        return {
          success: true,
          transactionId: response.data.paymentID,
          paymentUrl: response.data.bkashURL,
          providerResponse: response.data
        };
      }

      return {
        success: false,
        error: response.data?.statusMessage || 'bKash payment failed',
        providerResponse: response.data
      };

    } catch (error) {
      logger.error('bKash payment error:', error);
      return {
        success: false,
        error: 'bKash payment processing failed'
      };
    }
  }
  */

  // Temporary placeholder for bKash until keys are available
  async processBkashPayment(payment: MobileBankingPayment): Promise<PaymentResponse> {
    return {
      success: false,
      error: 'bKash integration not configured yet. Please obtain API keys from https://merchant.bka.sh/'
    };
  }

  // Nagad Integration
  // COMMENTED OUT - No API keys available yet
  // Uncomment and configure when Nagad API keys are obtained
  /*
  async processNagadPayment(payment: MobileBankingPayment): Promise<PaymentResponse> {
    try {
      const paymentRequest = {
        merchantId: config.get('NAGAD_MERCHANT_ID'),
        orderId: payment.orderId,
        amount: payment.amount.toString(),
        currencyCode: '050', // BDT
        challenge: this.generateNagadChallenge()
      };

      // Add signature
      const signature = this.generateNagadSignature(paymentRequest);
      
      const response = await axios.post(
        `${config.get('NAGAD_BASE_URL')}/remote-payment-gateway-1.0/api/dfs/check-out/initialize/${config.get('NAGAD_MERCHANT_ID')}/${payment.orderId}`,
        paymentRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-KM-Api-Version': 'v-0.2.0',
            'X-KM-IP-V4': '192.168.1.1',
            'X-KM-Client-Type': 'PC_WEB'
          }
        }
      );

      return {
        success: response.data?.status === 'Success',
        transactionId: response.data?.paymentReferenceId,
        paymentUrl: response.data?.callBackUrl,
        providerResponse: response.data
      };

    } catch (error) {
      logger.error('Nagad payment error:', error);
      return {
        success: false,
        error: 'Nagad payment processing failed'
      };
    }
  }
  */

  // Temporary placeholder for Nagad until keys are available
  async processNagadPayment(payment: MobileBankingPayment): Promise<PaymentResponse> {
    return {
      success: false,
      error: 'Nagad integration not configured yet. Please obtain API keys from https://nagad.com.bd/merchant/'
    };
  }

  // SSLCOMMERZ Integration (Multiple providers)
  // COMMENTED OUT - No API keys available yet
  // Uncomment and configure when SSLCOMMERZ keys are obtained
  /*
  async processSSLCommerzPayment(payment: MobileBankingPayment): Promise<PaymentResponse> {
    try {
      const paymentRequest = {
        store_id: config.get('SSLCOMMERZ_STORE_ID'),
        store_passwd: config.get('SSLCOMMERZ_STORE_PASSWORD'),
        total_amount: payment.amount,
        currency: payment.currency || 'BDT',
        tran_id: payment.orderId,
        success_url: `${config.get('CLIENT_URL')}/payment/success`,
        fail_url: `${config.get('CLIENT_URL')}/payment/fail`,
        cancel_url: `${config.get('CLIENT_URL')}/payment/cancel`,
        ipn_url: `${config.get('API_BASE_URL')}/webhooks/sslcommerz`,
        product_name: 'Course Payment',
        product_category: 'Education',
        product_profile: 'general',
        cus_name: 'Customer',
        cus_email: payment.customerEmail || 'customer@email.com',
        cus_add1: 'Dhaka',
        cus_city: 'Dhaka',
        cus_country: 'Bangladesh',
        cus_phone: payment.customerPhone,
        shipping_method: 'NO',
        multi_card_name: payment.provider, // Specify payment method
        value_a: payment.orderId,
        value_b: payment.provider
      };

      const response = await axios.post(
        `${config.get('SSLCOMMERZ_BASE_URL')}/gwprocess/v4/api.php`,
        new URLSearchParams(paymentRequest).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (response.data?.status === 'SUCCESS') {
        return {
          success: true,
          transactionId: response.data.sessionkey,
          paymentUrl: response.data.GatewayPageURL,
          providerResponse: response.data
        };
      }

      return {
        success: false,
        error: response.data?.failedreason || 'Payment initialization failed',
        providerResponse: response.data
      };

    } catch (error) {
      logger.error('SSLCOMMERZ payment error:', error);
      return {
        success: false,
        error: 'Payment processing failed'
      };
    }
  }
  */

  // Temporary placeholder for SSLCOMMERZ until keys are available
  async processSSLCommerzPayment(payment: MobileBankingPayment): Promise<PaymentResponse> {
    return {
      success: false,
      error: 'SSLCOMMERZ integration not configured yet. Please obtain API keys from https://sslcommerz.com/'
    };
  }

  // Main payment processor
  async processPayment(payment: MobileBankingPayment): Promise<PaymentResponse> {
    logger.info('Processing mobile banking payment:', { 
      provider: payment.provider, 
      amount: payment.amount,
      orderId: payment.orderId 
    });

    switch (payment.provider) {
      case 'bkash':
        return this.processBkashPayment(payment);
      case 'nagad':
        return this.processNagadPayment(payment);
      case 'rocket':
      case 'surecash':
      case 'upay':
        return this.processSSLCommerzPayment(payment);
      default:
        return {
          success: false,
          error: 'Unsupported payment provider'
        };
    }
  }

  // Helper methods
  // COMMENTED OUT - No API keys available yet
  /*
  private async getBkashToken(): Promise<string> {
    const response = await axios.post(
      `${config.get('BKASH_BASE_URL')}/checkout/token/grant`,
      {
        app_key: config.get('BKASH_APP_KEY'),
        app_secret: config.get('BKASH_APP_SECRET')
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'username': config.get('BKASH_USERNAME'),
          'password': config.get('BKASH_PASSWORD')
        }
      }
    );

    return response.data.id_token;
  }

  private generateNagadChallenge(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private generateNagadSignature(data: any): string {
    // Implement Nagad signature generation logic
    // This requires their specific signing algorithm
    return 'signature_placeholder';
  }
  */
}

export default new MobileBankingService();