import mongoose, { Document, Schema } from 'mongoose';

export interface IAnswer {
  questionId: string;
  answer: string | string[]; // Student's answer
  isCorrect?: boolean;
  pointsEarned?: number;
  feedback?: string; // Supervisor's feedback
}

export interface IQuizAttempt extends Document {
  quizId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  answers: IAnswer[];
  score: number;
  maxScore: number;
  percentage: number;
  startedAt: Date;
  submittedAt?: Date;
  timeSpent?: number; // in seconds
  status: 'in-progress' | 'submitted' | 'graded' | 'incomplete';
  isGraded: boolean;
  gradedBy?: mongoose.Types.ObjectId; // Supervisor who graded
  gradedAt?: Date;
  supervisorFeedback?: string;
  attemptNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

const answerSchema: Schema = new Schema({
  questionId: {
    type: String,
    required: true
  },
  answer: Schema.Types.Mixed, // Can be string or array
  isCorrect: {
    type: Boolean,
    default: false
  },
  pointsEarned: {
    type: Number,
    default: 0
  },
  feedback: String // Supervisor's feedback on this answer
});

const quizAttemptSchema: Schema = new Schema({
  quizId: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  answers: [answerSchema],
  score: {
    type: Number,
    default: 0
  },
  maxScore: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: Date,
  timeSpent: Number, // in seconds
  status: {
    type: String,
    enum: ['in-progress', 'submitted', 'graded', 'incomplete'],
    default: 'in-progress'
  },
  isGraded: {
    type: Boolean,
    default: false
  },
  gradedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  gradedAt: Date,
  supervisorFeedback: String,
  attemptNumber: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Calculate percentage before saving
quizAttemptSchema.pre<IQuizAttempt>('save', function(next) {
  if (this.maxScore > 0) {
    this.percentage = Math.round((this.score / this.maxScore) * 100);
  }
  next();
});

// Compound index for student attempts
quizAttemptSchema.index({ quizId: 1, studentId: 1, attemptNumber: 1 }, { unique: true });
quizAttemptSchema.index({ quizId: 1, status: 1 });
quizAttemptSchema.index({ studentId: 1, status: 1 });

export default mongoose.model<IQuizAttempt>('QuizAttempt', quizAttemptSchema);