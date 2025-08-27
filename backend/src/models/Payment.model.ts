import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  paymentMethod: 'card' | 'mastercard' | 'visa' | 'paypal' | 'sofort' | 'sepa_debit' | 'giropay' | 'ideal' | 'bancontact' | 'eps' | 'p24' | 'deutsche_bank' | 'commerzbank' | 'sparkasse' | 'dkb' | 'ing' | 'postbank' | 'hypovereinsbank' | 'bkash' | 'nagad' | 'rocket' | 'upay' | 'paytm' | 'razorpay' | 'phonepe' | 'gpay' | 'upi' | 'bank_transfer';
  transactionId: string;
  paymentGatewayId?: string;
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'requires_action' | 'canceled';
  paymentDate: Date;
  paymentDetails: {
    cardLast4?: string;
    cardBrand?: string;
    email?: string;
    phone?: string;
    bankAccount?: string;
    country?: string;
  };
  receiptGenerated: boolean;
  receiptUrl?: string;
  refundId?: string;
  refundDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'EUR'
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['card', 'mastercard', 'visa', 'paypal', 'sofort', 'sepa_debit', 'giropay', 'ideal', 'bancontact', 'eps', 'p24', 'deutsche_bank', 'commerzbank', 'sparkasse', 'dkb', 'ing', 'postbank', 'hypovereinsbank', 'bkash', 'nagad', 'rocket', 'upay', 'paytm', 'razorpay', 'phonepe', 'gpay', 'upi', 'bank_transfer']
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  paymentGatewayId: {
    type: String
  },
  stripePaymentIntentId: {
    type: String,
    index: true
  },
  stripeCustomerId: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'requires_action', 'canceled'],
    default: 'pending'
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  paymentDetails: {
    cardLast4: String,
    cardBrand: String,
    email: String,
    phone: String,
    bankAccount: String,
    country: String
  },
  receiptGenerated: {
    type: Boolean,
    default: false
  },
  receiptUrl: {
    type: String
  },
  refundId: {
    type: String
  },
  refundDate: {
    type: Date
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Index for better query performance
paymentSchema.index({ userId: 1, status: 1, paymentDate: -1 });
paymentSchema.index({ paymentGatewayId: 1 });

export default mongoose.model<IPayment>('Payment', paymentSchema);