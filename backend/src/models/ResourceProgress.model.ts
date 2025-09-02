import mongoose, { Document, Schema } from 'mongoose';

export interface IResourceProgress extends Document {
  userId: mongoose.Types.ObjectId;
  resourceId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  completed: boolean;
  accessedAt: Date;
  completedAt?: Date;
  downloadCount: number;
  timeSpent?: number; // Time spent viewing/reading in seconds
  createdAt: Date;
  updatedAt: Date;
}

const ResourceProgressSchema = new Schema<IResourceProgress>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseResource',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  accessedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Ensure unique progress record per user-resource combination
ResourceProgressSchema.index({ userId: 1, resourceId: 1 }, { unique: true });

// Index for efficient queries
ResourceProgressSchema.index({ userId: 1, courseId: 1 });
ResourceProgressSchema.index({ courseId: 1 });

export default mongoose.model<IResourceProgress>('ResourceProgress', ResourceProgressSchema);