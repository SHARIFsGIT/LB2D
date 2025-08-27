import mongoose, { Document, Schema } from 'mongoose';

export interface IVideoComment extends Document {
  videoId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userRole: 'Student' | 'Supervisor' | 'Admin' | 'Pending';
  comment: string;
  parentCommentId?: mongoose.Types.ObjectId; // For replies
  isResolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const videoCommentSchema: Schema = new Schema({
  videoId: {
    type: Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userRole: {
    type: String,
    enum: ['Student', 'Supervisor', 'Admin', 'Pending'],
    required: true
  },
  comment: {
    type: String,
    required: [true, 'Comment text is required'],
    trim: true,
    maxLength: [1000, 'Comment cannot exceed 1000 characters']
  },
  parentCommentId: {
    type: Schema.Types.ObjectId,
    ref: 'VideoComment'
  },
  isResolved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better query performance
videoCommentSchema.index({ videoId: 1, createdAt: -1 });
videoCommentSchema.index({ userId: 1 });
videoCommentSchema.index({ courseId: 1 });

export default mongoose.model<IVideoComment>('VideoComment', videoCommentSchema);