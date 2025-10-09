import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  description: string;
  duration: number; // in weeks
  price: number;
  currency: string;
  instructor: string;
  supervisor?: mongoose.Types.ObjectId;
  maxStudents: number;
  currentStudents: number;
  startDate: Date;
  endDate: Date;
  schedule: {
    days: string[];
    time: string;
  };
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  features: string[];
  requirements: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  level: {
    type: String,
    required: true,
    enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'EUR'
  },
  instructor: {
    type: String,
    required: true
  },
  supervisor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  maxStudents: {
    type: Number,
    required: true,
    min: 1
  },
  currentStudents: {
    type: Number,
    default: 0,
    min: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  schedule: {
    days: [{
      type: String,
      required: true
    }],
    time: {
      type: String,
      required: false,
      default: ''
    }
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  features: [{
    type: String
  }],
  requirements: [{
    type: String
  }],
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better query performance
courseSchema.index({ level: 1, status: 1, startDate: 1 });

export default mongoose.model<ICourse>('Course', courseSchema);