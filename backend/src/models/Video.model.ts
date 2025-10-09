import mongoose, { Document, Schema } from 'mongoose';

export interface IVideo extends Document {
  courseId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number; // in seconds
  sequenceNumber: number;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedByRole: 'Admin' | 'Supervisor';
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  deletionStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  deletionRequestedBy?: mongoose.Types.ObjectId;
  deletionRequestedAt?: Date;
  deletionApprovedBy?: mongoose.Types.ObjectId;
  deletionApprovedAt?: Date;
  deletionRejectionReason?: string;
  videoSize: number; // in bytes
  videoFormat: string;
  createdAt: Date;
  updatedAt: Date;
}

const videoSchema: Schema = new Schema({
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Video title is required'],
    trim: true,
    maxLength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Video description is required'],
    trim: true,
    maxLength: [500, 'Description cannot exceed 500 characters']
  },
  videoUrl: {
    type: String,
    required: [true, 'Video URL is required']
  },
  thumbnailUrl: {
    type: String
  },
  duration: {
    type: Number,
    required: [true, 'Video duration is required'],
    min: [0, 'Duration cannot be negative'],
    default: 0
  },
  sequenceNumber: {
    type: Number,
    required: [true, 'Sequence number is required'],
    min: [1, 'Sequence number must be at least 1']
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedByRole: {
    type: String,
    enum: ['Admin', 'Supervisor'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
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
  },
  deletionStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none'
  },
  deletionRequestedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  deletionRequestedAt: {
    type: Date
  },
  deletionApprovedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  deletionApprovedAt: {
    type: Date
  },
  deletionRejectionReason: {
    type: String,
    trim: true,
    maxLength: [200, 'Deletion rejection reason cannot exceed 200 characters']
  },
  videoSize: {
    type: Number,
    required: [true, 'Video size is required']
  },
  videoFormat: {
    type: String,
    required: [true, 'Video format is required']
  }
}, {
  timestamps: true
});

// Ensure unique sequence number per course
videoSchema.index({ courseId: 1, sequenceNumber: 1 }, { unique: true });

// Index for better query performance
videoSchema.index({ status: 1, courseId: 1 });
videoSchema.index({ uploadedBy: 1, status: 1 });

export default mongoose.model<IVideo>('Video', videoSchema);