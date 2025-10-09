import mongoose, { Document, Schema } from 'mongoose';

export interface IVideoProgress extends Document {
  userId: mongoose.Types.ObjectId;
  videoId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  progress: number; // Percentage watched (0-100)
  watchTime: number; // Actual time watched in seconds
  completed: boolean;
  lastWatchedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VideoProgressSchema = new Schema<IVideoProgress>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  progress: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  },
  watchTime: {
    type: Number,
    required: true,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  lastWatchedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Ensure unique progress record per user-video combination
VideoProgressSchema.index({ userId: 1, videoId: 1 }, { unique: true });

// Index for efficient queries
VideoProgressSchema.index({ userId: 1, courseId: 1 });
VideoProgressSchema.index({ courseId: 1 });

export default mongoose.model<IVideoProgress>('VideoProgress', VideoProgressSchema);