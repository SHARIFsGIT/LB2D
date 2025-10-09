import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import User from '../models/User.model';
import { CustomError } from './errorHandler.middleware';
import { ResponseUtil } from '../utils/response.util';
import { USER_ROLES } from '../types/common.types';

// Extend Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: any;
      userRole?: string;
    }
  }
}

// Main authentication middleware
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return ResponseUtil.unauthorized(res, 'Access token is required');
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    
    if (!token) {
      return ResponseUtil.unauthorized(res, 'Access token is required');
    }

    // Verify the token
    const decoded = verifyAccessToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password -refreshToken');
    
    if (!user) {
      return ResponseUtil.unauthorized(res, 'User not found');
    }

    // Check if user is active
    if (!user.isActive) {
      return ResponseUtil.forbidden(res, 'Account is deactivated');
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return ResponseUtil.forbidden(res, 'Email not verified');
    }

    // Add user data to request
    req.userId = user._id?.toString();
    req.user = user;
    req.userRole = user.role;
    
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return ResponseUtil.unauthorized(res, 'Invalid token');
    } else if (error.name === 'TokenExpiredError') {
      return ResponseUtil.unauthorized(res, 'Token expired');
    } else {
      return ResponseUtil.error(res, 'Authentication failed', 401);
    }
  }
};

// Role-based authorization middleware
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userRole) {
      return ResponseUtil.unauthorized(res, 'Authentication required');
    }

    if (!roles.includes(req.userRole)) {
      return ResponseUtil.forbidden(res, 'Insufficient permissions');
    }

    next();
  };
};

// Admin only middleware
export const adminOnly = authorize(USER_ROLES.ADMIN);

// Admin and Supervisor middleware
export const adminOrSupervisor = authorize(USER_ROLES.ADMIN, USER_ROLES.SUPERVISOR);

// Authenticated users only (any role except Pending)
export const authenticatedOnly = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.userRole) {
    return ResponseUtil.unauthorized(res, 'Authentication required');
  }

  if (req.userRole === USER_ROLES.PENDING) {
    return ResponseUtil.forbidden(res, 'Account approval pending');
  }

  next();
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    
    if (!token) {
      return next();
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select('-password -refreshToken');
    
    if (user && user.isActive && user.isEmailVerified) {
      req.userId = user._id?.toString();
      req.user = user;
      req.userRole = user.role;
    }
    
    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

// Owner or admin authorization (for resource access)
export const ownerOrAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const resourceUserId = req.params.userId || req.body.userId;
    
    // Admin can access anything
    if (req.userRole === USER_ROLES.ADMIN) {
      return next();
    }

    // Users can only access their own resources
    if (req.userId === resourceUserId) {
      return next();
    }

    return ResponseUtil.forbidden(res, 'Access denied');
  } catch (error) {
    return ResponseUtil.error(res, 'Authorization failed', 500);
  }
};

// Check if user owns the resource or is admin/supervisor
export const resourceOwnershipCheck = (getUserIdFromResource: (req: Request) => string | Promise<string>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Admin and Supervisor have full access
      if (req.userRole === USER_ROLES.ADMIN || req.userRole === USER_ROLES.SUPERVISOR) {
        return next();
      }

      const resourceUserId = await getUserIdFromResource(req);
      
      // Users can only access their own resources
      if (req.userId === resourceUserId) {
        return next();
      }

      return ResponseUtil.forbidden(res, 'Access denied to this resource');
    } catch (error) {
      return ResponseUtil.error(res, 'Resource ownership check failed', 500);
    }
  };
};

// Rate limiting per user
export const userRateLimit = (maxRequests: number, windowMs: number) => {
  const userLimits = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.userId;
    
    if (!userId) {
      return ResponseUtil.unauthorized(res, 'Authentication required');
    }

    const now = Date.now();
    let userLimit = userLimits.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      userLimit = {
        count: 1,
        resetTime: now + windowMs
      };
      userLimits.set(userId, userLimit);
    } else {
      userLimit.count++;
    }

    if (userLimit.count > maxRequests) {
      return ResponseUtil.tooManyRequests(res, 'User rate limit exceeded');
    }

    // Clean up expired entries
    for (const [key, value] of userLimits.entries()) {
      if (now > value.resetTime) {
        userLimits.delete(key);
      }
    }

    next();
  };
};

// Legacy middleware name for backward compatibility
export const protect = authMiddleware;