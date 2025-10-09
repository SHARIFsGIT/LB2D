import mongoose, { Document, Schema } from 'mongoose';

export interface ISupervisorSalary extends Document {
  supervisorId: mongoose.Types.ObjectId;
  monthlySalary: number;
  currency: string;
  isActive: boolean;
  assignedCourses: mongoose.Types.ObjectId[];
  paymentHistory: {
    month: number;
    year: number;
    amount: number;
    paid: boolean;
    paidDate?: Date;
    paymentMethod?: string;
    notes?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const supervisorSalarySchema = new Schema<ISupervisorSalary>(
  {
    supervisorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    monthlySalary: {
      type: Number,
      required: true,
      default: 3000,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'CAD']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    assignedCourses: [{
      type: Schema.Types.ObjectId,
      ref: 'Course'
    }],
    paymentHistory: [{
      month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
      },
      year: {
        type: Number,
        required: true,
        min: 2020
      },
      amount: {
        type: Number,
        required: true,
        min: 0
      },
      paid: {
        type: Boolean,
        default: false
      },
      paidDate: {
        type: Date
      },
      paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'paypal', 'stripe', 'cash', 'check']
      },
      notes: {
        type: String,
        maxLength: 500
      }
    }]
  },
  {
    timestamps: true
  }
);

// Indexes
// Note: supervisorId index is automatically created by unique: true constraint
supervisorSalarySchema.index({ 'paymentHistory.year': 1, 'paymentHistory.month': 1 });

// Methods
supervisorSalarySchema.methods.addPaymentRecord = function(month: number, year: number, amount: number) {
  const existingRecord = this.paymentHistory.find(
    (record: any) => record.month === month && record.year === year
  );
  
  if (!existingRecord) {
    this.paymentHistory.push({
      month,
      year,
      amount,
      paid: false
    });
  }
  
  return this.save();
};

supervisorSalarySchema.methods.markPaymentPaid = function(month: number, year: number, paymentMethod?: string) {
  const record = this.paymentHistory.find(
    (record: any) => record.month === month && record.year === year
  );
  
  if (record) {
    record.paid = true;
    record.paidDate = new Date();
    if (paymentMethod) record.paymentMethod = paymentMethod;
  }
  
  return this.save();
};

const SupervisorSalary = mongoose.model<ISupervisorSalary>('SupervisorSalary', supervisorSalarySchema);
export default SupervisorSalary;