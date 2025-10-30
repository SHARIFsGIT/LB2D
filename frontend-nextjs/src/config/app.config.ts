/**
 * Application Configuration
 * Centralized configuration management for the application
 */

export const appConfig = {
  // Application Info
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Learn Bangla to Deutsch',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '2.0.0',
    description: 'Professional German language learning platform for Bengali speakers',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    supportEmail: 'support@lb2d.com',
    contactEmail: 'contact@lb2d.com',
  },

  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },

  // WebSocket Configuration
  ws: {
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000',
    reconnectInterval: 5000, // 5 seconds
    maxReconnectAttempts: 5,
  },

  // Authentication Configuration
  auth: {
    tokenKey: 'lb2d_access_token',
    refreshTokenKey: 'lb2d_refresh_token',
    userKey: 'lb2d_user',
    sessionTimeout: parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT || '3600000'), // 1 hour
    refreshTokenInterval: parseInt(process.env.NEXT_PUBLIC_REFRESH_TOKEN_INTERVAL || '300000'), // 5 minutes
  },

  // Stripe Configuration
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  },

  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760'), // 10MB
    allowedFileTypes: (process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES || 'image/*,video/*,application/pdf').split(','),
    acceptedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'],
    acceptedVideoTypes: ['video/mp4', 'video/webm', 'video/ogg'],
    acceptedDocumentTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },

  // Pagination Configuration
  pagination: {
    defaultPageSize: parseInt(process.env.NEXT_PUBLIC_DEFAULT_PAGE_SIZE || '10'),
    maxPageSize: parseInt(process.env.NEXT_PUBLIC_MAX_PAGE_SIZE || '100'),
    pageSizeOptions: [10, 20, 30, 50, 100],
  },

  // Feature Flags
  features: {
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    enableErrorReporting: process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING === 'true',
    enableCSP: process.env.NEXT_PUBLIC_ENABLE_CSP === 'true',
    enableRateLimiting: process.env.NEXT_PUBLIC_ENABLE_RATE_LIMITING === 'true',
  },

  // SEO Configuration
  seo: {
    defaultTitle: 'Learn Bangla to Deutsch - Professional German Language Learning',
    titleTemplate: '%s | Learn Bangla to Deutsch',
    defaultDescription: 'Master German language from Bengali with expert-led courses, interactive assessments, and comprehensive learning materials. CEFR-aligned curriculum from A1 to C2 levels.',
    defaultKeywords: [
      'German language learning',
      'Learn German',
      'Bangla to Deutsch',
      'German courses',
      'CEFR German',
      'German certification',
      'Online German learning',
      'German for Bengali speakers',
    ],
    twitterHandle: '@lb2d',
    fbAppId: '',
  },

  // Social Media Links
  social: {
    facebook: 'https://facebook.com/lb2d',
    twitter: 'https://twitter.com/lb2d',
    linkedin: 'https://linkedin.com/company/lb2d',
    instagram: 'https://instagram.com/lb2d',
    youtube: 'https://youtube.com/@lb2d',
  },

  // CEFR Levels
  cefrLevels: {
    A1: { name: 'Beginner', description: 'Can understand and use familiar everyday expressions' },
    A2: { name: 'Elementary', description: 'Can communicate in simple and routine tasks' },
    B1: { name: 'Intermediate', description: 'Can deal with most situations in German-speaking areas' },
    B2: { name: 'Upper Intermediate', description: 'Can interact with fluency and spontaneity' },
    C1: { name: 'Advanced', description: 'Can express ideas fluently and spontaneously' },
    C2: { name: 'Proficiency', description: 'Can understand virtually everything heard or read' },
  },

  // Currency
  currency: {
    code: 'EUR',
    symbol: '€',
    locale: 'de-DE',
  },

  // Date & Time Format
  dateTime: {
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'dd/MM/yyyy HH:mm',
    locale: 'en-US',
  },

  // Video Player Configuration
  videoPlayer: {
    defaultVolume: 0.7,
    seekInterval: 10, // seconds
    qualityOptions: ['auto', '1080p', '720p', '480p', '360p'],
    defaultQuality: 'auto',
  },

  // Assessment Configuration
  assessment: {
    warningBeforeExam: true,
    allowBackNavigation: false,
    showAnswersAfterCompletion: true,
    passingPercentage: 60,
  },
} as const;

export type AppConfig = typeof appConfig;
