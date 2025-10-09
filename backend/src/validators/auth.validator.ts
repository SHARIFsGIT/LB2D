import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../middleware/errorHandler.middleware';

interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'email' | 'password' | 'phone';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

class Validator {
  private static validateField(value: any, rule: ValidationRule): string | null {
    const { field, required, type, minLength, maxLength, pattern, custom } = rule;

    // Check if field is required
    if (required && (value === undefined || value === null || value === '')) {
      return `${field} is required`;
    }

    // If field is not required and empty, skip other validations
    if (!required && (value === undefined || value === null || value === '')) {
      return null;
    }

    // Type validation
    if (type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return `${field} must be a valid email address`;
      }
    }

    if (type === 'password') {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
      if (!passwordRegex.test(value)) {
        return `${field} must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&). Example: MyPass123!`;
      }
    }

    if (type === 'phone') {
      const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(value)) {
        return `${field} must be a valid phone number`;
      }
    }

    // String type validation
    if (type === 'string' && typeof value !== 'string') {
      return `${field} must be a string`;
    }

    // Length validation
    if (minLength && value.length < minLength) {
      return `${field} must be at least ${minLength} characters long`;
    }

    if (maxLength && value.length > maxLength) {
      return `${field} must not exceed ${maxLength} characters`;
    }

    // Pattern validation
    if (pattern && !pattern.test(value)) {
      return `${field} format is invalid`;
    }

    // Custom validation
    if (custom) {
      const customResult = custom(value);
      if (customResult !== true) {
        return typeof customResult === 'string' ? customResult : `${field} is invalid`;
      }
    }

    return null;
  }

  public static validate(rules: ValidationRule[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const errors: { [key: string]: string } = {};

      for (const rule of rules) {
        const value = req.body[rule.field];
        const error = this.validateField(value, rule);
        
        if (error) {
          errors[rule.field] = error;
        }
      }

      if (Object.keys(errors).length > 0) {
        // Create detailed error message
        const errorMessages = Object.entries(errors).map(([field, message]) => `${field}: ${message}`);
        const detailedMessage = `Validation failed - ${errorMessages.join(', ')}`;
        
        const error = new CustomError(detailedMessage, 422);
        // Also include the errors object for frontend to parse
        (error as any).validationErrors = errors;
        throw error;
      }

      next();
    };
  }
}

// Auth validation schemas
export const registerValidator = Validator.validate([
  { field: 'firstName', required: true, type: 'string', minLength: 2, maxLength: 50 },
  { field: 'lastName', required: true, type: 'string', minLength: 2, maxLength: 50 },
  { field: 'email', required: true, type: 'email' },
  { field: 'password', required: true, type: 'password', minLength: 8, maxLength: 128 },
  { field: 'phone', required: false, type: 'phone' },
  { 
    field: 'role', 
    required: false, 
    custom: (value) => !value || ['Student', 'Supervisor', 'Admin'].includes(value) || 'Role must be Student, Supervisor, or Admin'
  }
]);

export const loginValidator = Validator.validate([
  { field: 'email', required: true, type: 'email' },
  { field: 'password', required: true, type: 'string', minLength: 1 }
]);

export const forgotPasswordValidator = Validator.validate([
  { field: 'email', required: true, type: 'email' }
]);

export const resetPasswordValidator = Validator.validate([
  { field: 'password', required: true, type: 'password', minLength: 8, maxLength: 128 },
  {
    field: 'phoneDigits',
    required: true,
    type: 'string',
    minLength: 6,
    maxLength: 6,
    custom: (value) => /^\d{6}$/.test(value) || 'Phone digits must be exactly 6 numbers'
  }
]);

export const otpValidator = Validator.validate([
  { field: 'email', required: true, type: 'email' },
  { 
    field: 'otp', 
    required: true, 
    type: 'string',
    custom: (value) => /^\d{6}$/.test(value) || 'OTP must be a 6-digit number'
  }
]);

export const refreshTokenValidator = Validator.validate([
  { field: 'refreshToken', required: true, type: 'string', minLength: 1 }
]);

export default Validator;