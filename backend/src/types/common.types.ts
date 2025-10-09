import { Request } from 'express';

// User Roles
export const USER_ROLES = {
  ADMIN: 'Admin',
  SUPERVISOR: 'Supervisor',
  STUDENT: 'Student',
  PENDING: 'Pending',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
  user?: any;
  body: any;
  params: any;
  query: any;
}

export interface NotificationData {
  id?: string;
  type: 'payment' | 'enrollment' | 'course' | 'test' | 'video' | 'video_comment' | 'admin' | 'general' | 'user_registration' | 'role_change' | 'supervisor_action' | 'student_action' | 'document' | 'assessment' | 'certificate' | 'ranking' | 'document_approval' | 'quiz' | 'resource';
  title: string;
  message: string;
  userId?: string;
  targetRole?: 'Admin' | 'Student' | 'Supervisor' | 'all';
  data?: any;
  timestamp?: Date;
  urgent?: boolean;
  fromRole?: 'Admin' | 'Student' | 'Supervisor' | 'System';
  toRole?: 'Admin' | 'Student' | 'Supervisor' | 'all';
  read?: boolean;
}