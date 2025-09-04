import mongoose, { Document, Schema } from 'mongoose';

export interface ICourseResource extends Document {
  courseId: mongoose.Types.ObjectId;
  supervisorId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: 'document' | 'audio' | 'image' | 'video' | 'link';
  fileUrl: string;
  fileName: string;
  fileSize?: number; // in bytes
  mimeType?: string;
  fileExtension?: string;
  isViewableInline: boolean;
  category: 'lesson' | 'homework' | 'reference' | 'exercise' | 'other';
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  isActive: boolean;
  downloadCount: number;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const courseResourceSchema: Schema = new Schema({
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
    enum: ['document', 'audio', 'image', 'video', 'link'],
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: Number, // in bytes
  mimeType: String,
  fileExtension: String,
  isViewableInline: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    enum: ['lesson', 'homework', 'reference', 'exercise', 'other'],
    default: 'lesson'
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
  },
  isActive: {
    type: Boolean,
    default: true
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
courseResourceSchema.index({ courseId: 1, type: 1 });
courseResourceSchema.index({ courseId: 1, category: 1 });
courseResourceSchema.index({ supervisorId: 1, uploadedAt: -1 });

export default mongoose.model<ICourseResource>('CourseResource', courseResourceSchema);