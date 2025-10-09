import { Request, Response, NextFunction } from 'express';
import { CustomError } from './errorHandler.middleware';
import config from '../config/app.config';
import logger from '../utils/logger';

// Rate limiting storage
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Rate limiting middleware
export const rateLimit = (options: RateLimitOptions) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = options.windowMs;
    const maxRequests = options.maxRequests;
    
    // Clean up expired entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k);
      }
    }
    
    let entry = rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + windowMs
      };
      rateLimitStore.set(key, entry);
    } else {
      entry.count++;
    }
    
    if (entry.count > maxRequests) {
      logger.warn(`Rate limit exceeded for IP: ${key}`, {
        ip: key,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method
      });
      
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(entry.resetTime).toISOString()
      });
      
      throw new CustomError(
        options.message || 'Too many requests, please try again later',
        429
      );
    }
    
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': (maxRequests - entry.count).toString(),
      'X-RateLimit-Reset': new Date(entry.resetTime).toISOString()
    });
    
    next();
  };
};

// Common rate limits
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10000, // Essentially unlimited for development
  message: 'Too many authentication attempts, please try again later'
});

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 50000, // Essentially unlimited for development
  message: 'Too many API requests, please try again later'
});

export const strictRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 1000, // Much more lenient for development
  message: 'Too many requests to sensitive endpoint'
});

export const registerRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 50000, // Essentially unlimited for development
  message: 'Too many registration attempts, please try again later'
});

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Skip security headers for WebSocket upgrade requests
  const isWebSocketUpgrade = req.headers.upgrade?.toLowerCase() === 'websocket' ||
                              req.headers.connection?.toLowerCase().includes('upgrade');

  if (isWebSocketUpgrade) {
    return next();
  }

  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');

  // Set security headers
  res.set({
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Enable XSS protection
    'X-XSS-Protection': '1; mode=block',

    // Enforce HTTPS (only in production)
    ...(config.isProduction() && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    }),

    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Content Security Policy (basic)
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' ws: wss:",

    // Feature policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
  });

  next();
};

// Request sanitization middleware
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): void => {
  // Skip sanitization for WebSocket upgrade requests
  const isWebSocketUpgrade = req.headers.upgrade?.toLowerCase() === 'websocket' ||
                              req.headers.connection?.toLowerCase().includes('upgrade');

  if (isWebSocketUpgrade) {
    return next();
  }

  // Remove potential XSS characters from query strings and body
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>?/g, '') // Remove HTML tags
        .trim();
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = Array.isArray(obj) ? [] : {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitize(obj[key]);
        }
      }
      return sanitized;
    }

    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }

  if (req.query) {
    req.query = sanitize(req.query);
  }

  next();
};

// IP whitelist middleware
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.socket.remoteAddress;
    
    if (!clientIP || !allowedIPs.includes(clientIP)) {
      logger.warn(`Blocked request from unauthorized IP: ${clientIP}`, {
        ip: clientIP,
        url: req.url,
        userAgent: req.get('User-Agent')
      });
      
      throw new CustomError('Access denied', 403);
    }
    
    next();
  };
};

// Request size limiter
export const requestSizeLimit = (maxSizeBytes: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    
    if (contentLength > maxSizeBytes) {
      throw new CustomError('Request entity too large', 413);
    }
    
    next();
  };
};

// Brute force protection
const bruteForceStore = new Map<string, { attempts: number; lastAttempt: number; blocked: boolean }>();

export const bruteForceProtection = (options: {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip}-${req.route?.path || req.url}`;
    const now = Date.now();
    
    let entry = bruteForceStore.get(key);
    
    if (!entry) {
      entry = { attempts: 0, lastAttempt: now, blocked: false };
      bruteForceStore.set(key, entry);
    }
    
    // Reset if window has expired
    if (now - entry.lastAttempt > options.windowMs) {
      entry.attempts = 0;
      entry.blocked = false;
    }
    
    // Check if still blocked
    if (entry.blocked && now - entry.lastAttempt < options.blockDurationMs) {
      throw new CustomError('Too many failed attempts. Please try again later.', 429);
    }
    
    // If not blocked, continue
    if (!entry.blocked) {
      next();
      return;
    }
    
    // Unblock if block duration has expired
    if (now - entry.lastAttempt >= options.blockDurationMs) {
      entry.blocked = false;
      entry.attempts = 0;
    }
    
    next();
  };
};

// Function to record failed attempt
export const recordFailedAttempt = (req: Request): void => {
  const key = `${req.ip}-${req.route?.path || req.url}`;
  const entry = bruteForceStore.get(key);
  
  if (entry) {
    entry.attempts++;
    entry.lastAttempt = Date.now();
    
    if (entry.attempts >= 5) { // Default max attempts
      entry.blocked = true;
      logger.warn(`IP blocked due to brute force attempts: ${req.ip}`, {
        ip: req.ip,
        attempts: entry.attempts,
        url: req.url
      });
    }
  }
};

// Clear successful login attempts
export const clearFailedAttempts = (req: Request): void => {
  const key = `${req.ip}-${req.route?.path || req.url}`;
  bruteForceStore.delete(key);
};

// Development utility functions to clear rate limits
export const clearAllRateLimits = (): void => {
  rateLimitStore.clear();
  bruteForceStore.clear();
};

export const clearRateLimitForIP = (ip: string): void => {
  // Clear rate limits for specific IP
  for (const [key, _] of rateLimitStore.entries()) {
    if (key.startsWith(ip)) {
      rateLimitStore.delete(key);
    }
  }
  // Clear brute force limits for specific IP  
  for (const [key, _] of bruteForceStore.entries()) {
    if (key.startsWith(ip)) {
      bruteForceStore.delete(key);
    }
  }
};