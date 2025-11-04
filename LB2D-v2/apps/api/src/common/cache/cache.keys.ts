/**
 * Centralized Cache Keys for Redis
 * Provides consistent cache key naming and TTL management
 */

export const CacheKeys = {
  // Course caching
  courses: {
    list: (page: number, limit: number, level?: string, search?: string) =>
      `courses:list:p${page}:l${limit}:${level || 'all'}:${search || 'none'}`,
    detail: (id: string) => `course:${id}`,
    bySlug: (slug: string) => `course:slug:${slug}`,
    stats: (id: string) => `course:stats:${id}`,
    published: () => 'courses:published',
  },

  // User caching
  users: {
    profile: (id: string) => `user:profile:${id}`,
    sessions: (id: string) => `user:sessions:${id}`,
    enrollments: (id: string) => `user:enrollments:${id}`,
  },

  // Analytics caching
  analytics: {
    adminDashboard: () => 'analytics:admin:dashboard',
    supervisorDashboard: (id: string) => `analytics:supervisor:${id}`,
    studentDashboard: (id: string) => `analytics:student:${id}`,
  },

  // Gamification caching
  gamification: {
    achievements: () => 'gamification:achievements',
    leaderboard: (period: string, periodKey: string) => `leaderboard:${period}:${periodKey}`,
    userPoints: (userId: string) => `user:points:${userId}`,
  },

  // Videos caching
  videos: {
    byCourse: (courseId: string) => `videos:course:${courseId}`,
    detail: (id: string) => `video:${id}`,
    comments: (id: string) => `video:comments:${id}`,
  },

  // Resources caching
  resources: {
    byCourse: (courseId: string) => `resources:course:${courseId}`,
    detail: (id: string) => `resource:${id}`,
  },

  // Quizzes caching
  quizzes: {
    byCourse: (courseId: string) => `quizzes:course:${courseId}`,
    detail: (id: string) => `quiz:${id}`,
  },

  // Reviews caching
  reviews: {
    byCourse: (courseId: string) => `reviews:course:${courseId}`,
    stats: (courseId: string) => `reviews:stats:${courseId}`,
  },

  // Discussions caching
  discussions: {
    categories: () => 'discussions:categories',
    topics: (categoryId: string, page: number) => `discussions:topics:${categoryId}:p${page}`,
    topic: (slug: string) => `discussion:topic:${slug}`,
    posts: (topicId: string) => `discussion:posts:${topicId}`,
  },

  // Learning paths caching
  learningPaths: {
    list: (page: number) => `paths:list:p${page}`,
    detail: (slug: string) => `path:${slug}`,
  },
};

export const CacheTTL = {
  // Short-lived caches (5 minutes)
  SHORT: 300,

  // Medium-lived caches (15 minutes)
  MEDIUM: 900,

  // Long-lived caches (1 hour)
  LONG: 3600,

  // Very long-lived caches (24 hours)
  VERY_LONG: 86400,

  // Specific TTLs
  courseList: 900, // 15 minutes
  courseDetail: 1800, // 30 minutes
  userProfile: 900, // 15 minutes
  analytics: 600, // 10 minutes
  leaderboard: 300, // 5 minutes
  achievements: 3600, // 1 hour
  discussions: 600, // 10 minutes
  publicContent: 86400, // 24 hours
};

/**
 * Cache invalidation helpers
 */
export const CacheInvalidation = {
  // Invalidate all course-related caches
  courses: ['courses:*', 'course:*'],

  // Invalidate all user-related caches
  users: (userId: string) => [`user:${userId}:*`, `user:profile:${userId}`],

  // Invalidate analytics
  analytics: ['analytics:*'],

  // Invalidate specific course caches
  course: (courseId: string) => [
    `course:${courseId}`,
    `course:stats:${courseId}`,
    `videos:course:${courseId}`,
    `resources:course:${courseId}`,
    `quizzes:course:${courseId}`,
    `reviews:course:${courseId}`,
    `courses:*`, // Invalidate all course lists
  ],

  // Invalidate gamification
  gamification: ['leaderboard:*', 'gamification:*', 'user:points:*'],

  // Invalidate discussions
  discussions: (categoryId?: string) =>
    categoryId ? [`discussions:topics:${categoryId}:*`] : ['discussions:*'],
};
