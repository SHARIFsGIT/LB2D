import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'payment' | 'enrollment' | 'course' | 'test' | 'video' | 'video_comment' | 'admin' | 'general' | 'user_registration' | 'role_change' | 'supervisor_action' | 'student_action' | 'document' | 'assessment' | 'certificate' | 'ranking' | 'quiz' | 'resource';
  title: string;
  message: string;
  read: boolean;
  urgent: boolean;
  targetRole?: 'Admin' | 'Student' | 'Supervisor' | 'all';
  fromRole?: 'Admin' | 'Student' | 'Supervisor';
  fromUserId?: mongoose.Types.ObjectId;
  data?: any; // Additional data (e.g., courseId, testId, etc.)
  actionUrl?: string; // Optional URL to navigate to when clicked
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'payment', 'enrollment', 'course', 'test', 'video', 'video_comment',
      'admin', 'general', 'user_registration', 'role_change',
      'supervisor_action', 'student_action', 'document', 'assessment',
      'certificate', 'ranking', 'quiz', 'resource'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxLength: [500, 'Message cannot exceed 500 characters']
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  urgent: {
    type: Boolean,
    default: false
  },
  targetRole: {
    type: String,
    enum: ['Admin', 'Student', 'Supervisor', 'all']
  },
  fromRole: {
    type: String,
    enum: ['Admin', 'Student', 'Supervisor']
  },
  fromUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  data: {
    type: Schema.Types.Mixed,
    default: {}
  },
  actionUrl: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ createdAt: 1 }); // For cleanup of old notifications

// Auto-delete old read notifications after 30 days
notificationSchema.index({ createdAt: 1, read: 1 }, {
  expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
  partialFilterExpression: { read: true }
});

export default mongoose.model<INotification>('Notification', notificationSchema);
