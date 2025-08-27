import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestion {
  questionText: string;
  questionType: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay' | 'audio';
  options?: string[]; // For multiple choice
  correctAnswer?: string | string[]; // For multiple choice, true/false, or short answer
  points: number;
  audioUrl?: string; // For audio questions
  imageUrl?: string; // Optional image for questions
}

export interface IQuiz extends Document {
  courseId: mongoose.Types.ObjectId;
  supervisorId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: 'quiz' | 'exam' | 'practice';
  questions: IQuestion[];
  totalPoints: number;
  timeLimit?: number; // in minutes
  attemptLimit?: number; // how many times student can take it
  isActive: boolean;
  dueDate?: Date;
  sequenceNumber: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema: Schema = new Schema({
  questionText: {
    type: String,
    required: true
  },
  questionType: {
    type: String,
    enum: ['multiple-choice', 'true-false', 'short-answer', 'essay', 'audio'],
    required: true
  },
  options: [{
    type: String
  }],
  correctAnswer: Schema.Types.Mixed, // Can be string or array
  points: {
    type: Number,
    required: true,
    min: 0
  },
  audioUrl: String,
  imageUrl: String
});

const quizSchema: Schema = new Schema({
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  supervisorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  type: {
    type: String,
    enum: ['quiz', 'exam', 'practice'],
    default: 'quiz'
  },
  questions: [questionSchema],
  totalPoints: {
    type: Number,
    default: 0
  },
  timeLimit: {
    type: Number, // in minutes
    min: 1
  },
  attemptLimit: {
    type: Number,
    default: 1,
    min: 1
  },
  isActive: {
    type: Boolean,
    default: false
  },
  dueDate: Date,
  sequenceNumber: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected'],
    default: 'draft'
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxLength: [200, 'Rejection reason cannot exceed 200 characters']
  }
}, {
  timestamps: true
});

// Calculate total points before saving
quizSchema.pre('save', function(next) {
  if (this.questions && this.questions.length > 0) {
    this.totalPoints = this.questions.reduce((sum, question) => sum + question.points, 0);
  }
  next();
});

// Index for better performance
quizSchema.index({ courseId: 1, supervisorId: 1 });
quizSchema.index({ courseId: 1, isActive: 1 });
quizSchema.index({ courseId: 1, status: 1 });
// Ensure unique sequence number per course
quizSchema.index({ courseId: 1, sequenceNumber: 1 }, { unique: true });

export default mongoose.model<IQuiz>('Quiz', quizSchema);