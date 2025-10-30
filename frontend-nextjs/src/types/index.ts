// ============================================================================
// Core Type Definitions
// ============================================================================

export type UserRole = 'student' | 'supervisor' | 'admin';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type EnrollmentStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export type AssessmentStatus = 'not_started' | 'in_progress' | 'completed' | 'graded';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

// ============================================================================
// User Types
// ============================================================================

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
  isActive: boolean;
  profilePicture?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  deviceInfo?: {
    deviceName: string;
    deviceType: string;
  };
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
}

export interface ResetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

// ============================================================================
// Course Types
// ============================================================================

export interface Course {
  _id: string;
  title: string;
  description: string;
  level: CEFRLevel;
  duration: number; // in weeks
  price: number;
  currency: string;
  thumbnail?: string;
  instructor?: {
    _id: string;
    name: string;
    profilePicture?: string;
  };
  totalVideos: number;
  totalResources: number;
  totalEnrollments: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  maxStudents?: number;
  tags?: string[];
  objectives?: string[];
  requirements?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  _id: string;
  student: string | User;
  course: string | Course;
  status: EnrollmentStatus;
  enrollmentDate: string;
  completionDate?: string;
  progress: number; // 0-100
  lastAccessedAt?: string;
  payment?: string | Payment;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Video & Resource Types
// ============================================================================

export interface Video {
  _id: string;
  title: string;
  description?: string;
  url: string;
  thumbnail?: string;
  duration: number; // in seconds
  course: string | Course;
  uploadedBy: string | User;
  order: number;
  isPublished: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface VideoProgress {
  _id: string;
  user: string | User;
  video: string | Video;
  course: string | Course;
  watchedDuration: number; // in seconds
  isCompleted: boolean;
  lastWatchedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoComment {
  _id: string;
  user: User;
  video: string | Video;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseResource {
  _id: string;
  title: string;
  description?: string;
  type: 'pdf' | 'document' | 'presentation' | 'other';
  url: string;
  fileSize: number;
  course: string | Course;
  uploadedBy: string | User;
  order: number;
  isApproved: boolean;
  approvedBy?: string | User;
  approvalDate?: string;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceProgress {
  _id: string;
  user: string | User;
  resource: string | CourseResource;
  course: string | Course;
  isCompleted: boolean;
  accessedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Assessment Types
// ============================================================================

export interface Test {
  _id: string;
  title: string;
  description?: string;
  level: CEFRLevel;
  duration: number; // in minutes
  totalMarks: number;
  passingMarks: number;
  questions: Question[];
  isActive: boolean;
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  _id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  options?: string[];
  correctAnswer: string | number | boolean;
  marks: number;
  explanation?: string;
}

export interface QuizAttempt {
  _id: string;
  user: string | User;
  test: string | Test;
  status: AssessmentStatus;
  answers: {
    questionId: string;
    answer: string | number | boolean;
  }[];
  score?: number;
  percentage?: number;
  isPassed?: boolean;
  startedAt: string;
  completedAt?: string;
  timeSpent?: number; // in seconds
  feedback?: string;
  gradedBy?: string | User;
  gradedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Certificate {
  _id: string;
  user: string | User;
  test: string | Test;
  quizAttempt: string | QuizAttempt;
  certificateNumber: string;
  issuedAt: string;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Payment Types
// ============================================================================

export interface Payment {
  _id: string;
  user: string | User;
  course: string | Course;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: 'stripe' | 'mobile_banking';
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  transactionId?: string;
  paidAt?: string;
  refundedAt?: string;
  refundReason?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentIntent {
  clientSecret: string;
  amount: number;
  currency: string;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface Notification {
  _id: string;
  user: string | User;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface StudentAnalytics {
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  totalVideoWatchTime: number; // in minutes
  totalAssessmentsTaken: number;
  averageScore: number;
  certificatesEarned: number;
  progressByLevel: Record<CEFRLevel, number>;
  recentActivity: {
    date: string;
    activity: string;
    details: string;
  }[];
}

export interface SupervisorAnalytics {
  totalStudents: number;
  activeStudents: number;
  totalVideos: number;
  totalResources: number;
  averageCompletionRate: number;
  averageEngagement: number;
  topPerformingStudents: {
    student: User;
    completionRate: number;
    averageScore: number;
  }[];
  recentUploads: {
    date: string;
    type: 'video' | 'resource';
    title: string;
  }[];
}

export interface AdminAnalytics {
  totalUsers: number;
  usersByRole: Record<UserRole, number>;
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  revenueByMonth: {
    month: string;
    revenue: number;
  }[];
  topCourses: {
    course: Course;
    enrollments: number;
    revenue: number;
  }[];
  userGrowth: {
    month: string;
    newUsers: number;
  }[];
  systemHealth: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: number;
  };
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// ============================================================================
// Form Types
// ============================================================================

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ProfileUpdateData {
  name?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  profilePicture?: File;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

// ============================================================================
// SEO Types
// ============================================================================

export interface SEOProps {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  noindex?: boolean;
  nofollow?: boolean;
  jsonLd?: Record<string, any>;
}

// ============================================================================
// WebSocket Types
// ============================================================================

export interface WebSocketMessage {
  type: 'notification' | 'update' | 'message';
  payload: any;
  timestamp: string;
}

export interface WebSocketState {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  error: string | null;
}

// ============================================================================
// Utility Types
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type AsyncState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
};
