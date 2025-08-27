import mongoose, { Document, Schema } from 'mongoose';

export interface IEnrollment extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  paymentId: mongoose.Types.ObjectId;
  enrollmentDate: Date;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  certificateGenerated: boolean;
  certificateUrl?: string;
  progress: {
    lessonsCompleted: number;
    totalLessons: number;
    percentage: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema: Schema = new Schema({
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
  paymentId: {
    type: Schema.Types.ObjectId,
    ref: 'Payment',
    required: true
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },
  certificateGenerated: {
    type: Boolean,
    default: false
  },
  certificateUrl: {
    type: String
  },
  progress: {
    lessonsCompleted: {
      type: Number,
      default: 0
    },
    totalLessons: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Ensure one enrollment per user per course
enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

// Index for better query performance
enrollmentSchema.index({ status: 1, enrollmentDate: 1 });

export default mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);