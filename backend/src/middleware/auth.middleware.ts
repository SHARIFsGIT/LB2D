import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = verifyAccessToken(token);
    (req as any).userId = decoded.userId;
    (req as any).userRole = decoded.role;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Alias for protect
export const authenticate = protect;

export const adminOnly = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  if ((req as any).userRole !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  return next();
};

// Authorize middleware for role-based access
export const authorize = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const userId = (req as any).userId;
    const tokenRole = (req as any).userRole;
    
    if (!userId || !tokenRole) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    try {
      // Check current role in database to handle role changes
      const User = require('../models/User.model').default;
      const user = await User.findById(userId).select('role isActive');
      
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User not found or inactive'
        });
      }
      
      // Use database role instead of token role for authorization
      const currentRole = user.role;
      
      if (!roles.includes(currentRole)) {
        return res.status(403).json({
          success: false,
          message: `Access restricted to: ${roles.join(', ')}`
        });
      }
      
      // Update req with current role from database
      (req as any).userRole = currentRole;
      
      return next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  };
};

export const restrictTo = authorize;