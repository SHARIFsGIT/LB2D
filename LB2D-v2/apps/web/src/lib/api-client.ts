import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Create axios instance
export const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from sessionStorage
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor - Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (typeof window !== 'undefined') {
          const refreshToken = sessionStorage.getItem('refreshToken');

          if (refreshToken) {
            const response = await axios.post(
              `${API_URL}/api/v1/auth/refresh`,
              { refreshToken },
            );

            const { accessToken, refreshToken: newRefreshToken } =
              response.data.data || response.data;

            // Save new tokens
            sessionStorage.setItem('accessToken', accessToken);
            if (newRefreshToken) {
              sessionStorage.setItem('refreshToken', newRefreshToken);
            }

            // Retry original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }

            return apiClient(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        if (typeof window !== 'undefined') {
          sessionStorage.clear();
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// API client methods
export const api = {
  // Auth endpoints
  auth: {
    register: (data: any) => apiClient.post('/auth/register', data),
    login: (data: any) => apiClient.post('/auth/login', data),
    logout: (data?: any) => apiClient.post('/auth/logout', data),
    verifyEmail: (token: string) =>
      apiClient.post('/auth/verify-email', { token }),
    forgotPassword: (email: string) =>
      apiClient.post('/auth/forgot-password', { email }),
    resetPassword: (token: string, newPassword: string) =>
      apiClient.post('/auth/reset-password', { token, newPassword }),
    getMe: () => apiClient.get('/auth/me'),
    getSessions: () => apiClient.get('/auth/sessions'),
    logoutFromDevice: (deviceId: string) =>
      apiClient.delete(`/auth/sessions/${deviceId}`),
  },

  // Users endpoints
  users: {
    getProfile: () => apiClient.get('/users/profile'),
    updateProfile: (data: any) => apiClient.put('/users/profile', data),
    requestRoleChange: (requestedRole: string) =>
      apiClient.put('/users/request-role-change', { requestedRole }),
    getAllUsers: (params?: any) => apiClient.get('/users', { params }),
    getUserById: (id: string) => apiClient.get(`/users/${id}`),
    updateUser: (id: string, data: any) => apiClient.put(`/users/${id}`, data),
    deleteUser: (id: string) => apiClient.delete(`/users/${id}`),
  },

  // Courses endpoints
  courses: {
    getAll: (params?: any) => apiClient.get('/courses', { params }),
    getById: (id: string) => apiClient.get(`/courses/${id}`),
    getBySlug: (slug: string) => apiClient.get(`/courses/slug/${slug}`),
    create: (data: any) => apiClient.post('/courses', data),
    update: (id: string, data: any) => apiClient.put(`/courses/${id}`, data),
    delete: (id: string) => apiClient.delete(`/courses/${id}`),
    enroll: (courseId: string, paymentIntentId?: string) =>
      apiClient.post('/courses/enroll', { courseId, paymentIntentId }),
    getMyEnrollments: () => apiClient.get('/courses/my-enrollments'),
    getMyCourses: () => apiClient.get('/courses/my-courses'),
    getStats: (id: string) => apiClient.get(`/courses/${id}/stats`),
  },

  // Videos endpoints
  videos: {
    getByCourse: (courseId: string) =>
      apiClient.get(`/videos/course/${courseId}`),
    getById: (id: string) => apiClient.get(`/videos/${id}`),
    upload: (formData: FormData) =>
      apiClient.post('/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    updateProgress: (id: string, data: any) =>
      apiClient.post(`/videos/${id}/progress`, data),
    getComments: (id: string) => apiClient.get(`/videos/${id}/comments`),
    addComment: (id: string, content: string, parentId?: string) =>
      apiClient.post(`/videos/${id}/comments`, { content, parentId }),
    getPending: () => apiClient.get('/videos/pending'),
    approve: (id: string, approve: boolean, rejectionReason?: string) =>
      apiClient.patch(`/videos/${id}/approve`, { approve, rejectionReason }),
  },

  // Resources endpoints
  resources: {
    getByCourse: (courseId: string) =>
      apiClient.get(`/resources/course/${courseId}`),
    getById: (id: string) => apiClient.get(`/resources/${id}`),
    upload: (formData: FormData) =>
      apiClient.post('/resources/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    markProgress: (id: string, data: any) =>
      apiClient.post(`/resources/${id}/progress`, data),
    getPending: () => apiClient.get('/resources/pending'),
    approve: (id: string, approve: boolean, rejectionReason?: string) =>
      apiClient.patch(`/resources/${id}/approve`, { approve, rejectionReason }),
    reject: (id: string, rejectionReason: string) =>
      apiClient.patch(`/resources/${id}/approve`, { approve: false, rejectionReason }),
    getSupervisorResources: () => apiClient.get('/resources/supervisor'),
    submitForApproval: (id: string) =>
      apiClient.patch(`/resources/${id}/submit-for-approval`),
    delete: (id: string) => apiClient.delete(`/resources/${id}`),
  },

  // Quizzes endpoints
  quizzes: {
    create: (data: any) => apiClient.post('/quizzes', data),
    getByCourse: (courseId: string) =>
      apiClient.get(`/quizzes/course/${courseId}`),
    getById: (id: string) => apiClient.get(`/quizzes/${id}`),
    submit: (id: string, answers: any) =>
      apiClient.post(`/quizzes/${id}/submit`, { answers }),
    getMyAttempts: (id: string) => apiClient.get(`/quizzes/${id}/my-attempts`),
    getResults: (attemptId: string) =>
      apiClient.get(`/quizzes/attempts/${attemptId}/results`),
  },

  // Payments endpoints
  payments: {
    createIntent: (courseId: string, paymentMethod: string) =>
      apiClient.post('/payments/create-intent', { courseId, paymentMethod }),
    confirm: (paymentIntentId: string) =>
      apiClient.post('/payments/confirm', { paymentIntentId }),
    getMyPayments: () => apiClient.get('/payments/my-payments'),
  },

  // Certificates endpoints
  certificates: {
    generate: (courseId: string) =>
      apiClient.post(`/certificates/generate/${courseId}`),
    getMyCertificates: () => apiClient.get('/certificates/my-certificates'),
    verify: (certificateId: string) =>
      apiClient.get(`/certificates/verify/${certificateId}`),
  },

  // Notifications endpoints
  notifications: {
    getAll: (unreadOnly?: boolean) =>
      apiClient.get('/notifications', { params: { unreadOnly } }),
    markAsRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    markAllAsRead: () => apiClient.patch('/notifications/mark-all-read'),
    clearAll: () => apiClient.delete('/notifications/clear-all'),
  },

  // Analytics endpoints
  analytics: {
    getAdminDashboard: () => apiClient.get('/analytics/admin/dashboard'),
    getSupervisorDashboard: () =>
      apiClient.get('/analytics/supervisor/dashboard'),
    getStudentDashboard: () => apiClient.get('/analytics/student/dashboard'),
  },

  // Reviews endpoints
  reviews: {
    create: (data: any) => apiClient.post('/reviews', data),
    getByCourse: (courseId: string, params?: any) =>
      apiClient.get(`/reviews/course/${courseId}`, { params }),
    getById: (id: string) => apiClient.get(`/reviews/${id}`),
    update: (id: string, data: any) => apiClient.put(`/reviews/${id}`, data),
    delete: (id: string) => apiClient.delete(`/reviews/${id}`),
    moderate: (id: string, data: any) =>
      apiClient.patch(`/reviews/${id}/moderate`, data),
    getMy: () => apiClient.get('/reviews/my'),
    getPending: () => apiClient.get('/reviews/pending'),
    getStats: (courseId: string) => apiClient.get(`/reviews/course/${courseId}/stats`),
  },

  // Discussions endpoints
  discussions: {
    categories: {
      getAll: () => apiClient.get('/discussions/categories'),
      getOne: (slug: string) => apiClient.get(`/discussions/categories/${slug}`),
    },
    topics: {
      getAll: (params?: any) => apiClient.get('/discussions/topics', { params }),
      getOne: (categorySlug: string, topicSlug: string) =>
        apiClient.get(`/discussions/categories/${categorySlug}/topics/${topicSlug}`),
      create: (data: any) => apiClient.post('/discussions/topics', data),
      update: (id: string, data: any) =>
        apiClient.put(`/discussions/topics/${id}`, data),
      delete: (id: string) => apiClient.delete(`/discussions/topics/${id}`),
      pin: (id: string) => apiClient.patch(`/discussions/topics/${id}/pin`),
      lock: (id: string) => apiClient.patch(`/discussions/topics/${id}/lock`),
      vote: (id: string, voteType: 'up' | 'down') =>
        apiClient.post(`/discussions/topics/${id}/vote`, { voteType }),
    },
    posts: {
      getByTopic: (topicId: string) =>
        apiClient.get(`/discussions/topics/${topicId}/posts`),
      create: (topicId: string, data: any) =>
        apiClient.post(`/discussions/topics/${topicId}/posts`, data),
      update: (id: string, data: any) =>
        apiClient.put(`/discussions/posts/${id}`, data),
      delete: (id: string) => apiClient.delete(`/discussions/posts/${id}`),
      markSolution: (id: string) =>
        apiClient.patch(`/discussions/posts/${id}/mark-solution`),
      vote: (id: string, voteType: 'up' | 'down') =>
        apiClient.post(`/discussions/posts/${id}/vote`, { voteType }),
    },
    stats: () => apiClient.get('/discussions/stats'),
  },

  // Learning Paths endpoints
  learningPaths: {
    getAll: (params?: any) => apiClient.get('/learning-paths', { params }),
    getById: (id: string) => apiClient.get(`/learning-paths/${id}`),
    getBySlug: (slug: string) => apiClient.get(`/learning-paths/slug/${slug}`),
    create: (data: any) => apiClient.post('/learning-paths', data),
    update: (id: string, data: any) =>
      apiClient.put(`/learning-paths/${id}`, data),
    delete: (id: string) => apiClient.delete(`/learning-paths/${id}`),
    enroll: (id: string) => apiClient.post(`/learning-paths/${id}/enroll`),
    getMyPaths: () => apiClient.get('/learning-paths/my-paths'),
    getProgress: (id: string) => apiClient.get(`/learning-paths/${id}/progress`),
  },

  // Gamification endpoints
  gamification: {
    getAchievements: () => apiClient.get('/gamification/achievements'),
    getMyAchievements: () => apiClient.get('/gamification/my-achievements'),
    getLeaderboard: (params?: any) =>
      apiClient.get('/gamification/leaderboard', { params }),
    getMyStats: () => apiClient.get('/gamification/my-stats'),
  },

  // Bookmarks endpoints
  bookmarks: {
    getAll: (params?: any) => apiClient.get('/bookmarks', { params }),
    create: (data: any) => apiClient.post('/bookmarks', data),
    delete: (id: string) => apiClient.delete(`/bookmarks/${id}`),
    toggle: (data: any) => apiClient.post('/bookmarks/toggle', data),
  },

  // Social endpoints
  social: {
    follow: (userId: string) => apiClient.post(`/social/follow/${userId}`),
    unfollow: (userId: string) => apiClient.delete(`/social/follow/${userId}`),
    getFollowers: (userId: string) =>
      apiClient.get(`/social/users/${userId}/followers`),
    getFollowing: (userId: string) =>
      apiClient.get(`/social/users/${userId}/following`),
    getFeed: (params?: any) => apiClient.get('/social/feed', { params }),
    shareNote: (data: any) => apiClient.post('/social/notes', data),
    getNotes: (params?: any) => apiClient.get('/social/notes', { params }),
  },

  // Contact endpoints
  contact: {
    submit: (data: any) => apiClient.post('/contact', data),
    getAll: (params?: any) => apiClient.get('/contact', { params }),
    getById: (id: string) => apiClient.get(`/contact/${id}`),
    respond: (id: string, data: any) =>
      apiClient.post(`/contact/${id}/respond`, data),
    updateStatus: (id: string, status: string) =>
      apiClient.patch(`/contact/${id}/status`, { status }),
  },
};

// Named exports for direct imports
export const authApi = api.auth;
export const userApi = api.users;
export const courseApi = api.courses;
export const videoApi = api.videos;
export const resourceApi = api.resources;
export const quizApi = api.quizzes;
export const paymentApi = api.payments;
export const certificateApi = api.certificates;
export const notificationApi = api.notifications;
export const analyticsApi = api.analytics;
export const reviewApi = api.reviews;
export const discussionApi = api.discussions;
export const learningPathApi = api.learningPaths;
export const gamificationApi = api.gamification;
export const bookmarkApi = api.bookmarks;
export const socialApi = api.social;
export const contactApi = api.contact;
