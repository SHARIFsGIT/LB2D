/**
 * Content Security Policy (CSP) Configuration
 * Enterprise-grade security headers for production deployment
 * Protects against XSS, injection attacks, and unauthorized resource loading
 */

export interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'media-src'?: string[];
  'object-src'?: string[];
  'frame-src'?: string[];
  'base-uri'?: string[];
  'form-action'?: string[];
  'frame-ancestors'?: string[];
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
}

/**
 * Generate CSP header string from directives
 */
export function generateCSP(directives: CSPDirectives): string {
  const policies: string[] = [];

  Object.entries(directives).forEach(([key, value]) => {
    if (typeof value === 'boolean') {
      if (value) {
        policies.push(key);
      }
    } else if (Array.isArray(value) && value.length > 0) {
      policies.push(`${key} ${value.join(' ')}`);
    }
  });

  return policies.join('; ');
}

/**
 * Production CSP Configuration
 * Strict security policy for production environment
 */
export const productionCSP: CSPDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-eval'", // Required for Next.js
    "'unsafe-inline'", // Required for inline scripts (use nonce in production)
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://vercel.live',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for CSS-in-JS
    'https://fonts.googleapis.com',
  ],
  'img-src': [
    "'self'",
    'data:',
    'https:',
    'blob:',
    'https://www.google-analytics.com',
  ],
  'font-src': [
    "'self'",
    'data:',
    'https://fonts.gstatic.com',
  ],
  'connect-src': [
    "'self'",
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
    'https://www.google-analytics.com',
    'https://vitals.vercel-insights.com',
  ],
  'media-src': ["'self'", 'https:', 'data:'],
  'object-src': ["'none'"],
  'frame-src': [
    "'self'",
    'https://www.youtube.com',
    'https://player.vimeo.com',
  ],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': true,
  'block-all-mixed-content': true,
};

/**
 * Development CSP Configuration
 * More permissive for local development
 */
export const developmentCSP: CSPDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-eval'",
    "'unsafe-inline'",
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'",
    'https://fonts.googleapis.com',
  ],
  'img-src': [
    "'self'",
    'data:',
    'https:',
    'http:',
    'blob:',
  ],
  'font-src': [
    "'self'",
    'data:',
    'https://fonts.gstatic.com',
  ],
  'connect-src': [
    "'self'",
    'http://localhost:*',
    'ws://localhost:*',
    'https://vitals.vercel-insights.com',
  ],
  'media-src': ["'self'", 'https:', 'http:', 'data:'],
  'object-src': ["'none'"],
  'frame-src': ["'self'", 'https:', 'http:'],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

/**
 * Get appropriate CSP based on environment
 */
export function getCSP(): string {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const directives = isDevelopment ? developmentCSP : productionCSP;
  return generateCSP(directives);
}

/**
 * Security Headers Configuration
 * Complete set of security headers for Next.js
 */
export const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: getCSP(),
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

/**
 * Generate nonce for inline scripts (CSP Level 3)
 * Use this for more secure inline script execution
 */
export function generateNonce(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return Math.random().toString(36).substring(2, 15);
}

export default getCSP;
