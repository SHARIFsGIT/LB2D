import bcrypt from 'bcryptjs';
import mongoose, { Document, Schema } from 'mongoose';

export interface DeviceSession {
  deviceId: string;
  fingerprint?: string; // Device fingerprint for identifying same device
  deviceName?: string; // Human-readable device name
  refreshToken: string;
  loginTime: Date;
  userAgent?: string;
}

export interface IUser extends Document {
  email: string;
  password: string;
  role: 'Admin' | 'Student' | 'Supervisor' | 'Pending';
  requestedRole?: 'Admin' | 'Student' | 'Supervisor';
  previousRole?: 'Admin' | 'Student' | 'Supervisor' | 'Pending';
  rejectionReason?: string;
  rejectionDate?: Date;
  firstName: string;
  lastName: string;
  phone?: string;
  profilePhoto?: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  refreshToken?: string;
  deviceSessions: DeviceSession[];
  otpCode?: string;
  otpExpires?: Date;
  lastLogin?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  createEmailVerificationToken(): string;
  createPasswordResetToken(): string;
  createOTP(): string;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['Admin', 'Student', 'Supervisor', 'Pending'],
    required: [true, 'User role is required']
  },
  requestedRole: {
    type: String,
    enum: ['Admin', 'Student', 'Supervisor'],
    required: false
  },
  previousRole: {
    type: String,
    enum: ['Admin', 'Student', 'Supervisor', 'Pending'],
    required: false
  },
  rejectionReason: {
    type: String,
    required: false
  },
  rejectionDate: {
    type: Date,
    required: false
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  profilePhoto: {
    type: String,
    trim: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  refreshToken: String,
  deviceSessions: {
    type: [{
      deviceId: { type: String, required: true },
      fingerprint: { type: String },
      deviceName: { type: String },
      refreshToken: { type: String, required: true },
      loginTime: { type: Date, required: true },
      userAgent: { type: String }
    }],
    default: []
  },
  otpCode: String,
  otpExpires: Date,
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash method
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Email verification token
userSchema.methods.createEmailVerificationToken = function(): string {
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  this.emailVerificationToken = token;
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return token;
};

// Password reset token
userSchema.methods.createPasswordResetToken = function(): string {
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  this.passwordResetToken = token;
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  return token;
};

// Create OTP
userSchema.methods.createOTP = function(): string {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  this.otpCode = otp;
  this.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return otp;
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;