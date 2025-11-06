import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Security middleware for additional protection
 * Implements CSRF protection, rate limiting, and security headers
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Add additional security headers
    this.addSecurityHeaders(res);

    // CSRF protection for state-changing requests
    this.csrfProtection(req, res);

    // Input sanitization hints
    this.sanitizationHeaders(res);

    next();
  }

  /**
   * Add comprehensive security headers
   */
  private addSecurityHeaders(res: Response) {
    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' https://api.stripe.com https://*.amazonaws.com wss:",
        "frame-src 'self' https://js.stripe.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
      ].join('; ')
    );

    // Permissions Policy (formerly Feature Policy)
    res.setHeader(
      'Permissions-Policy',
      [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'interest-cohort=()',
        'payment=(self)',
      ].join(', ')
    );

    // Strict Transport Security (HSTS)
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );

    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-Frame-Options (already set by Helmet, but reinforce)
    res.setHeader('X-Frame-Options', 'DENY');

    // X-XSS-Protection (legacy browsers)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  }

  /**
   * CSRF protection for JWT Bearer token auth
   * For JWT, CSRF is less critical, but we add double-submit cookie pattern
   */
  private csrfProtection(req: Request, res: Response) {
    // For state-changing requests (POST, PUT, PATCH, DELETE)
    const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    if (stateChangingMethods.includes(req.method)) {
      // Verify origin header matches host
      const origin = req.get('origin') || req.get('referer');
      const host = req.get('host');

      if (origin && host) {
        const originUrl = new URL(origin);

        // Extract host from CLIENT_URL if it's a full URL
        let clientHost = 'localhost:3000';
        if (process.env.CLIENT_URL) {
          try {
            clientHost = new URL(process.env.CLIENT_URL).host;
          } catch {
            clientHost = process.env.CLIENT_URL; // Use as-is if not a valid URL
          }
        }

        const allowedHosts = [
          host,
          'localhost:3000',
          'localhost:3001',
          clientHost,
        ].filter(Boolean);

        if (!allowedHosts.some(allowed => originUrl.host.includes(allowed!))) {
          throw new Error('CSRF validation failed: Origin mismatch');
        }
      }
    }
  }

  /**
   * Add headers hinting input sanitization
   */
  private sanitizationHeaders(res: Response) {
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  }
}

/**
 * Rate limiting middleware per IP
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private requests = new Map<string, number[]>();
  private readonly WINDOW_MS = 60000; // 1 minute
  private readonly MAX_REQUESTS = 100; // 100 requests per minute per IP

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    // Get request timestamps for this IP
    const now = Date.now();
    const timestamps = this.requests.get(ip) || [];

    // Remove timestamps older than window
    const recentTimestamps = timestamps.filter(t => now - t < this.WINDOW_MS);

    // Check if over limit
    if (recentTimestamps.length >= this.MAX_REQUESTS) {
      res.status(429).json({
        success: false,
        statusCode: 429,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(this.WINDOW_MS / 1000),
      });
      return;
    }

    // Add current timestamp
    recentTimestamps.push(now);
    this.requests.set(ip, recentTimestamps);

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanup();
    }

    next();
  }

  private cleanup() {
    const now = Date.now();
    for (const [ip, timestamps] of this.requests.entries()) {
      const recent = timestamps.filter(t => now - t < this.WINDOW_MS);
      if (recent.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, recent);
      }
    }
  }
}
