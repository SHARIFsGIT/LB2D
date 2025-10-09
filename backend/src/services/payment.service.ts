import Payment, { IPayment } from '../models/Payment.model';

// Payment gateway configurations
interface PaymentGatewayConfig {
  name: string;
  enabled: boolean;
  sandbox: boolean;
  config: any;
}

// Mock payment processing for different gateways
export class PaymentService {
  private gateways: { [key: string]: PaymentGatewayConfig } = {
    mastercard: {
      name: 'Mastercard',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        publicKey: process.env.STRIPE_PUBLIC_KEY,
        secretKey: process.env.STRIPE_SECRET_KEY
      }
    },
    visa: {
      name: 'Visa',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        publicKey: process.env.STRIPE_PUBLIC_KEY,
        secretKey: process.env.STRIPE_SECRET_KEY
      }
    },
    paypal: {
      name: 'PayPal',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET
      }
    },
    sofort: {
      name: 'Sofort Banking',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        configKey: process.env.SOFORT_CONFIG_KEY
      }
    },
    sepa: {
      name: 'SEPA Direct Debit',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        creditorId: process.env.SEPA_CREDITOR_ID
      }
    },
    deutsche_bank: {
      name: 'Deutsche Bank Online Banking',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        bankCode: '70070010'
      }
    },
    commerzbank: {
      name: 'Commerzbank Online Banking',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        bankCode: '76040061'
      }
    },
    sparkasse: {
      name: 'Sparkasse Online Banking',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        bankCode: '10050000'
      }
    },
    dkb: {
      name: 'DKB (Deutsche Kreditbank)',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        bankCode: '12030000'
      }
    },
    ing: {
      name: 'ING-DiBa',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        bankCode: '50010517'
      }
    },
    postbank: {
      name: 'Postbank',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        bankCode: '10010010'
      }
    },
    hypovereinsbank: {
      name: 'HypoVereinsbank',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        bankCode: '70020270'
      }
    },
    bank_transfer: {
      name: 'Wire Transfer / Bank Transfer',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {}
    },
    bkash: {
      name: 'bKash (Bangladesh)',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        appKey: process.env.BKASH_APP_KEY,
        appSecret: process.env.BKASH_APP_SECRET,
        username: process.env.BKASH_USERNAME,
        password: process.env.BKASH_PASSWORD
      }
    },
    nagad: {
      name: 'Nagad (Bangladesh)',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        merchantId: process.env.NAGAD_MERCHANT_ID,
        merchantPrivateKey: process.env.NAGAD_MERCHANT_PRIVATE_KEY
      }
    },
    rocket: {
      name: 'Rocket (Bangladesh)',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        merchantNumber: process.env.ROCKET_MERCHANT_NUMBER,
        password: process.env.ROCKET_PASSWORD
      }
    },
    upay: {
      name: 'Upay (Bangladesh)',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        merchantId: process.env.UPAY_MERCHANT_ID,
        apiKey: process.env.UPAY_API_KEY
      }
    },
    paytm: {
      name: 'Paytm (India)',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        merchantId: process.env.PAYTM_MERCHANT_ID,
        merchantKey: process.env.PAYTM_MERCHANT_KEY
      }
    },
    razorpay: {
      name: 'Razorpay (India)',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET
      }
    },
    phonepe: {
      name: 'PhonePe (India)',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        merchantId: process.env.PHONEPE_MERCHANT_ID,
        saltKey: process.env.PHONEPE_SALT_KEY
      }
    },
    gpay: {
      name: 'Google Pay (India)',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        merchantId: process.env.GPAY_MERCHANT_ID
      }
    },
    upi: {
      name: 'UPI (India)',
      enabled: true,
      sandbox: process.env.NODE_ENV !== 'production',
      config: {
        vpa: process.env.UPI_VPA
      }
    }
  };

  // Initialize payment for different methods
  async initializePayment(paymentData: {
    userId: string;
    courseId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    userInfo: any;
  }) {
    const { userId, courseId, amount, currency, paymentMethod, userInfo } = paymentData;
    
    // Generate transaction ID
    const transactionId = `TXN_${Date.now()}_${userId}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create payment record
    const payment = await Payment.create({
      userId,
      courseId,
      amount,
      currency,
      paymentMethod,
      transactionId,
      status: 'pending',
      paymentDetails: {
        email: userInfo.email,
        phone: userInfo.phone
      }
    });

    // Process based on payment method
    let paymentResponse;
    
    switch (paymentMethod.toLowerCase()) {
      case 'mastercard':
      case 'visa':
        paymentResponse = await this.processCardPayment(payment, userInfo);
        break;
      case 'paypal':
        paymentResponse = await this.processPayPalPayment(payment, userInfo);
        break;
      case 'sofort':
        paymentResponse = await this.processSofortPayment(payment, userInfo);
        break;
      case 'sepa':
        paymentResponse = await this.processSepaPayment(payment, userInfo);
        break;
      case 'deutsche_bank':
      case 'commerzbank':
      case 'sparkasse':
      case 'dkb':
      case 'ing':
      case 'postbank':
      case 'hypovereinsbank':
        paymentResponse = await this.processGermanBankPayment(payment, userInfo, paymentMethod);
        break;
      case 'bkash':
        paymentResponse = await this.processBkashPayment(payment, userInfo);
        break;
      case 'nagad':
        paymentResponse = await this.processNagadPayment(payment, userInfo);
        break;
      case 'rocket':
        paymentResponse = await this.processRocketPayment(payment, userInfo);
        break;
      case 'upay':
        paymentResponse = await this.processUpayPayment(payment, userInfo);
        break;
      case 'paytm':
        paymentResponse = await this.processPaytmPayment(payment, userInfo);
        break;
      case 'razorpay':
        paymentResponse = await this.processRazorpayPayment(payment, userInfo);
        break;
      case 'phonepe':
        paymentResponse = await this.processPhonePePayment(payment, userInfo);
        break;
      case 'gpay':
        paymentResponse = await this.processGooglePayPayment(payment, userInfo);
        break;
      case 'upi':
        paymentResponse = await this.processUpiPayment(payment, userInfo);
        break;
      case 'bank_transfer':
        paymentResponse = await this.processBankTransfer(payment, userInfo);
        break;
      default:
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }

    return {
      payment,
      paymentResponse
    };
  }

  // Mock card payment processing (Stripe)
  private async processCardPayment(payment: IPayment, userInfo: any) {
    // In production, integrate with Stripe API
    const mockStripeResponse = {
      id: `pi_${Math.random().toString(36).substr(2, 24)}`,
      client_secret: `pi_${Math.random().toString(36).substr(2, 24)}_secret_${Math.random().toString(36).substr(2, 24)}`,
      status: 'requires_payment_method',
      amount: payment.amount * 100, // Stripe uses cents
      currency: payment.currency.toLowerCase(),
      payment_method_types: ['card'],
      setup_future_usage: null
    };

    // Update payment with gateway ID
    payment.paymentGatewayId = mockStripeResponse.id;
    payment.status = 'processing';
    await payment.save();

    return {
      gateway: 'stripe',
      clientSecret: mockStripeResponse.client_secret,
      paymentIntentId: mockStripeResponse.id,
      publishableKey: this.gateways.mastercard.config.publicKey || process.env.STRIPE_PUBLISHABLE_KEY,
      amount: payment.amount,
      currency: payment.currency
    };
  }

  // Mock PayPal payment processing
  private async processPayPalPayment(payment: IPayment, userInfo: any) {
    // In production, integrate with PayPal API
    const mockPayPalResponse = {
      id: `PAYID-${Math.random().toString(36).substr(2, 20).toUpperCase()}`,
      intent: 'CAPTURE',
      status: 'CREATED',
      links: [
        {
          href: `https://api.sandbox.paypal.com/v2/checkout/orders/PAYID-${Math.random().toString(36).substr(2, 20).toUpperCase()}`,
          rel: 'self',
          method: 'GET'
        },
        {
          href: `https://www.sandbox.paypal.com/checkoutnow?token=PAYID-${Math.random().toString(36).substr(2, 20).toUpperCase()}`,
          rel: 'approve',
          method: 'GET'
        }
      ]
    };

    payment.paymentGatewayId = mockPayPalResponse.id;
    payment.status = 'processing';
    await payment.save();

    return {
      gateway: 'paypal',
      orderId: mockPayPalResponse.id,
      approvalUrl: mockPayPalResponse.links[1].href,
      amount: payment.amount,
      currency: payment.currency
    };
  }

  // Mock Sofort payment processing
  private async processSofortPayment(payment: IPayment, userInfo: any) {
    const mockSofortResponse = {
      transactionId: `SOFORT-${Math.random().toString().substr(2, 12)}`,
      redirectUrl: `https://www.sofort.com/payment/go/${Math.random().toString(36).substr(2, 20)}`,
      status: 'pending'
    };

    payment.paymentGatewayId = mockSofortResponse.transactionId;
    payment.status = 'processing';
    await payment.save();

    return {
      gateway: 'sofort',
      transactionId: mockSofortResponse.transactionId,
      redirectUrl: mockSofortResponse.redirectUrl,
      amount: payment.amount,
      currency: payment.currency
    };
  }

  // Mock SEPA payment processing
  private async processSepaPayment(payment: IPayment, userInfo: any) {
    const mockSepaResponse = {
      mandateId: `SEPA-${Math.random().toString().substr(2, 12)}`,
      status: 'pending_mandate_confirmation'
    };

    payment.paymentGatewayId = mockSepaResponse.mandateId;
    payment.status = 'processing';
    await payment.save();

    return {
      gateway: 'sepa',
      mandateId: mockSepaResponse.mandateId,
      amount: payment.amount,
      currency: payment.currency,
      instructions: {
        creditorName: 'Learn Bangla to Deutsch GmbH',
        creditorId: 'DE98ZZZ09999999999',
        mandateReference: mockSepaResponse.mandateId,
        description: `Course enrollment - ${payment.transactionId}`
      }
    };
  }

  // Mock German bank online banking
  private async processGermanBankPayment(payment: IPayment, userInfo: any, bankName: string) {
    const bankConfigs = {
      deutsche_bank: { name: 'Deutsche Bank', code: '70070010', color: '#0018a8' },
      commerzbank: { name: 'Commerzbank', code: '76040061', color: '#ffcd00' },
      sparkasse: { name: 'Sparkasse', code: '10050000', color: '#ff0000' },
      dkb: { name: 'DKB', code: '12030000', color: '#005ca9' },
      ing: { name: 'ING-DiBa', code: '50010517', color: '#ff6200' },
      postbank: { name: 'Postbank', code: '10010010', color: '#ffcc00' },
      hypovereinsbank: { name: 'HypoVereinsbank', code: '70020270', color: '#red' }
    };

    const bank = bankConfigs[bankName as keyof typeof bankConfigs] || bankConfigs.deutsche_bank;
    const mockBankResponse = {
      sessionId: `${bank.code}-${Math.random().toString().substr(2, 12)}`,
      redirectUrl: `https://banking.${bankName.replace('_', '-')}.de/portal?sessionId=${Math.random().toString(36).substr(2, 20)}`,
      status: 'redirect_required'
    };

    payment.paymentGatewayId = mockBankResponse.sessionId;
    payment.status = 'processing';
    await payment.save();

    return {
      gateway: bankName,
      bankName: bank.name,
      bankCode: bank.code,
      sessionId: mockBankResponse.sessionId,
      redirectUrl: mockBankResponse.redirectUrl,
      amount: payment.amount,
      currency: payment.currency
    };
  }

  // Mock bKash payment processing
  private async processBkashPayment(payment: IPayment, userInfo: any) {
    const mockBkashResponse = {
      paymentID: `TR00${Math.random().toString().substr(2, 10)}`,
      bkashURL: `https://sandbox.checkout.pay.bka.sh/v1.2.0-beta/checkout?paymentID=TR00${Math.random().toString().substr(2, 10)}`,
      successCallbackURL: `${process.env.CLIENT_URL}/payment/success`,
      failureCallbackURL: `${process.env.CLIENT_URL}/payment/failed`,
      cancelledCallbackURL: `${process.env.CLIENT_URL}/payment/cancelled`
    };

    payment.paymentGatewayId = mockBkashResponse.paymentID;
    payment.status = 'processing';
    await payment.save();

    return {
      gateway: 'bkash',
      paymentId: mockBkashResponse.paymentID,
      redirectUrl: mockBkashResponse.bkashURL,
      amount: payment.amount,
      currency: 'BDT'
    };
  }

  // Mock Nagad payment processing
  private async processNagadPayment(payment: IPayment, userInfo: any) {
    const mockNagadResponse = {
      payment_ref_id: `NAG${Math.random().toString().substr(2, 12)}`,
      redirect_url: `https://sandbox.mynagad.com:10543/remote-payment-gateway-1.0/payment/NAG${Math.random().toString().substr(2, 12)}`,
      status: 'Initiated'
    };

    payment.paymentGatewayId = mockNagadResponse.payment_ref_id;
    payment.status = 'processing';
    await payment.save();

    return {
      gateway: 'nagad',
      paymentRefId: mockNagadResponse.payment_ref_id,
      redirectUrl: mockNagadResponse.redirect_url,
      amount: payment.amount,
      currency: 'BDT'
    };
  }

  // Mock Rocket payment processing
  private async processRocketPayment(payment: IPayment, userInfo: any) {
    const mockRocketResponse = {
      transactionId: `RKT${Math.random().toString().substr(2, 12)}`,
      merchantInvoiceNumber: `INV-${Date.now()}`,
      status: 'Pending'
    };

    payment.paymentGatewayId = mockRocketResponse.transactionId;
    payment.status = 'processing';
    await payment.save();

    return {
      gateway: 'rocket',
      transactionId: mockRocketResponse.transactionId,
      merchantInvoiceNumber: mockRocketResponse.merchantInvoiceNumber,
      amount: payment.amount,
      currency: 'BDT',
      instructions: {
        method: 'Dial *322# from your mobile',
        steps: [
          'Dial *322# from your Rocket account',
          'Select "Payment"',
          'Enter merchant number: 01XXXXXXXXX',
          `Enter amount: ${payment.amount} BDT`,
          `Enter reference: ${mockRocketResponse.transactionId}`,
          'Enter your PIN to confirm'
        ]
      }
    };
  }

  // Mock Upay payment processing
  private async processUpayPayment(payment: IPayment, userInfo: any) {
    const mockUpayResponse = {
      transactionId: `UPAY${Math.random().toString().substr(2, 12)}`,
      redirectUrl: `https://sandbox.upay.com.bd/payment/${Math.random().toString(36).substr(2, 20)}`,
      status: 'initiated'
    };

    payment.paymentGatewayId = mockUpayResponse.transactionId;
    payment.status = 'processing';
    await payment.save();

    return {
      gateway: 'upay',
      transactionId: mockUpayResponse.transactionId,
      redirectUrl: mockUpayResponse.redirectUrl,
      amount: payment.amount,
      currency: 'BDT'
    };
  }

  // Mock Paytm payment processing
  private async processPaytmPayment(payment: IPayment, userInfo: any) {
    const mockPaytmResponse = {
      orderId: `PAYTM${Math.random().toString().substr(2, 12)}`,
      txnToken: `TOKEN${Math.random().toString(36).substr(2, 20)}`,
      redirectUrl: `https://securegw-stage.paytm.in/theia/api/v1/showPaymentPage?mid=MERCHANT&orderId=PAYTM${Math.random().toString().substr(2, 12)}`
    };

    payment.paymentGatewayId = mockPaytmResponse.orderId;
    payment.status = 'processing';
    await payment.save();

    return {
      gateway: 'paytm',
      orderId: mockPaytmResponse.orderId,
      txnToken: mockPaytmResponse.txnToken,
      redirectUrl: mockPaytmResponse.redirectUrl,
      amount: payment.amount,
      currency: 'INR'
    };
  }

  // Mock Razorpay payment processing
  private async processRazorpayPayment(payment: IPayment, userInfo: any) {
    const mockRazorpayResponse = {
      id: `order_${Math.random().toString(36).substr(2, 14)}`,
      entity: 'order',
      amount: payment.amount * 100, // Razorpay uses paise
      amount_paid: 0,
      amount_due: payment.amount * 100,
      currency: 'INR',
      status: 'created'
    };

    payment.paymentGatewayId = mockRazorpayResponse.id;
    payment.status = 'processing';
    await payment.save();

    return {
      gateway: 'razorpay',
      orderId: mockRazorpayResponse.id,
      amount: payment.amount,
      currency: 'INR',
      keyId: this.gateways.razorpay.config.keyId
    };
  }

  // Mock PhonePe payment processing
  private async processPhonePePayment(payment: IPayment, userInfo: any) {
    const mockPhonePeResponse = {
      merchantTransactionId: `PHONEPE${Math.random().toString().substr(2, 12)}`,
      transactionId: `T${Math.random().toString().substr(2, 15)}`,
      redirectUrl: `https://api-preprod.phonepe.com/apis/hermes/pg/v1/pay/${Math.random().toString(36).substr(2, 20)}`
    };

    payment.paymentGatewayId = mockPhonePeResponse.merchantTransactionId;
    payment.status = 'processing';
    await payment.save();

    return {
      gateway: 'phonepe',
      merchantTransactionId: mockPhonePeResponse.merchantTransactionId,
      transactionId: mockPhonePeResponse.transactionId,
      redirectUrl: mockPhonePeResponse.redirectUrl,
      amount: payment.amount,
      currency: 'INR'
    };
  }

  // Mock Google Pay payment processing
  private async processGooglePayPayment(payment: IPayment, userInfo: any) {
    const mockGPayResponse = {
      paymentMethodToken: `gPay_${Math.random().toString(36).substr(2, 20)}`,
      status: 'PENDING'
    };

    payment.paymentGatewayId = mockGPayResponse.paymentMethodToken;
    payment.status = 'processing';
    await payment.save();

    return {
      gateway: 'gpay',
      paymentMethodToken: mockGPayResponse.paymentMethodToken,
      amount: payment.amount,
      currency: 'INR',
      instructions: {
        method: 'Open Google Pay app and scan QR code',
        upiId: 'merchant@googlepay'
      }
    };
  }

  // Mock UPI payment processing
  private async processUpiPayment(payment: IPayment, userInfo: any) {
    const mockUpiResponse = {
      transactionId: `UPI${Math.random().toString().substr(2, 12)}`,
      vpa: 'merchant@paytm',
      qrCode: `upi://pay?pa=merchant@paytm&pn=LearnBangla2Deutsch&am=${payment.amount}&cu=INR&tn=Course Payment`
    };

    payment.paymentGatewayId = mockUpiResponse.transactionId;
    payment.status = 'processing';
    await payment.save();

    return {
      gateway: 'upi',
      transactionId: mockUpiResponse.transactionId,
      vpa: mockUpiResponse.vpa,
      qrCode: mockUpiResponse.qrCode,
      amount: payment.amount,
      currency: 'INR',
      instructions: {
        method: 'Pay using any UPI app',
        steps: [
          'Open your UPI app (PhonePe, Google Pay, Paytm, etc.)',
          'Scan the QR code or enter VPA',
          `Pay ₹${payment.amount}`,
          'Enter your UPI PIN to complete payment'
        ]
      }
    };
  }

  // Mock bank transfer processing
  private async processBankTransfer(payment: IPayment, userInfo: any) {
    payment.status = 'pending';
    await payment.save();

    return {
      gateway: 'bank_transfer',
      instructions: {
        bankName: 'Deutsche Bank AG',
        accountName: 'Learn Bangla to Deutsch GmbH',
        iban: 'DE89 3704 0044 0532 0130 00',
        bic: 'COBADEFFXXX',
        reference: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        note: 'Please include the reference number in your transfer description'
      }
    };
  }

  // Verify and complete payment
  async verifyPayment(transactionId: string, gatewayData: any) {
    const payment = await Payment.findOne({ transactionId });
    
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Mock verification - in production, verify with actual gateway
    const isValid = this.mockVerifyPayment(payment.paymentMethod, gatewayData);
    
    if (isValid) {
      payment.status = 'completed';
      payment.paymentDate = new Date();
      
      if (gatewayData.paymentGatewayId) {
        payment.paymentGatewayId = gatewayData.paymentGatewayId;
      }
      
      await payment.save();
      return { success: true, payment };
    } else {
      payment.status = 'failed';
      await payment.save();
      return { success: false, message: 'Payment verification failed' };
    }
  }

  // Mock payment verification
  private mockVerifyPayment(paymentMethod: string, gatewayData: any): boolean {
    // In development, always return true for testing
    // In production, implement actual gateway verification
    return process.env.NODE_ENV === 'development' || gatewayData.verified === true;
  }

  // Get available payment methods
  getAvailablePaymentMethods() {
    return Object.entries(this.gateways)
      .filter(([key, config]) => config.enabled)
      .map(([key, config]) => ({
        id: key,
        name: config.name,
        type: this.getPaymentType(key)
      }));
  }

  private getPaymentType(method: string): string {
    switch (method) {
      case 'mastercard':
      case 'visa': return 'card';
      case 'paypal': return 'digital_wallet';
      case 'sofort': return 'instant_bank_transfer';
      case 'sepa': return 'direct_debit';
      case 'deutsche_bank':
      case 'commerzbank':
      case 'sparkasse':
      case 'dkb':
      case 'ing':
      case 'postbank':
      case 'hypovereinsbank': return 'online_banking';
      case 'bkash':
      case 'nagad':
      case 'rocket':
      case 'upay': return 'mobile_banking';
      case 'paytm':
      case 'razorpay':
      case 'phonepe':
      case 'gpay':
      case 'upi': return 'digital_wallet';
      default: return 'bank_transfer';
    }
  }
}

export default new PaymentService();