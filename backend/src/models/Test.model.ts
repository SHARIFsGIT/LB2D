import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITest extends Document {
  userId: Types.ObjectId;
  step: number;
  questions: Array<{
    questionId: string;
    answer: number;
    timeSpent: number;
    isCorrect?: boolean;
    questionText?: string;
    selectedOption?: string;
    correctOption?: string;
  }>;
  score: number;
  certificationLevel: string;
  completedAt?: Date;
  totalCompletionTime?: number; // in seconds
  status: 'in-progress' | 'completed' | 'failed';
  createdAt?: Date;
  updatedAt?: Date;
}

const testSchema = new Schema<ITest>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  step: { 
    type: Number, 
    required: true,
    min: 1,
    max: 3
  },
  questions: [{
    questionId: {
      type: String,
      required: true
    },
    answer: {
      type: Number,
      required: true
    },
    timeSpent: {
      type: Number,
      required: true,
      default: 0
    },
    isCorrect: {
      type: Boolean,
      default: false
    },
    questionText: {
      type: String
    },
    selectedOption: {
      type: String
    },
    correctOption: {
      type: String
    }
  }],
  score: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 100
  },
  certificationLevel: {
    type: String,
    enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Failed', 'In Progress'],
    default: 'In Progress'
  },
  completedAt: {
    type: Date
  },
  totalCompletionTime: {
    type: Number,
    default: 0
  },
  status: { 
    type: String, 
    enum: ['in-progress', 'completed', 'failed'],
    default: 'in-progress'
  }
}, { 
  timestamps: true 
});

testSchema.index({ userId: 1, status: 1 });
testSchema.index({ userId: 1, createdAt: -1 });

// Calculate score
testSchema.methods.calculateCertification = function(score: number, step: number): string {
  if (step === 1) {
    if (score < 25) return 'Failed';
    if (score >= 75) return 'In Progress';
    if (score >= 50) return 'A2';
    return 'A1';
  } else if (step === 2) {
    if (score < 25) return 'A2';
    if (score >= 75) return 'In Progress';
    if (score >= 50) return 'B2';
    return 'B1';
  } else if (step === 3) {
    if (score < 25) return 'B2';
    if (score >= 50) return 'C2';
    return 'C1';
  }
  return 'In Progress';
};

const Test = mongoose.model<ITest>('Test', testSchema);

export default Test;