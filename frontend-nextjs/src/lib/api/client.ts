/**
 * API Client
 * Secure HTTP client with interceptors, retry logic, and error handling
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { appConfig } from '@/config/app.config';
import { ApiResponse } from '@/types';
import { getAuthToken, getRefreshToken, setAuthToken, clearAuth } from '@/lib/auth/token';

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: appConfig.api.baseUrl,
      timeout: appConfig.api.timeout,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 errors (token expiration)
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Queue the request while token is being refreshed
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                return this.client(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          const refreshToken = getRefreshToken();
          if (!refreshToken) {
            clearAuth();
            window.location.href = '/login?expired=true';
            return Promise.reject(error);
          }

          try {
            const response = await axios.post(
              `${appConfig.api.baseUrl}/auth/refresh`,
              { refreshToken },
              { withCredentials: true }
            );

            const { accessToken } = response.data.data;
            setAuthToken(accessToken);

            // Process failed queue
            this.failedQueue.forEach((prom) => prom.resolve(accessToken));
            this.failedQueue = [];

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            this.failedQueue.forEach((prom) => prom.reject(refreshError));
            this.failedQueue = [];
            clearAuth();
            window.location.href = '/login?expired=true';
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Handle network errors
        if (!error.response) {
          return Promise.reject({
            success: false,
            message: 'Network error. Please check your internet connection.',
            error: 'NETWORK_ERROR',
          });
        }

        // Handle other errors
        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  /**
   * Normalize error response
   */
  private normalizeError(error: AxiosError): ApiResponse {
    const response = error.response;

    if (response) {
      const data = response.data as any;
      return {
        success: false,
        message: data?.message || 'An error occurred',
        error: data?.error || 'UNKNOWN_ERROR',
        errors: data?.errors,
      };
    }

    return {
      success: false,
      message: error.message || 'An unexpected error occurred',
      error: 'UNKNOWN_ERROR',
    };
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.patch<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload file
   */
  async uploadFile<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await this.client.post<ApiResponse<T>>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Download file
   */
  async downloadFile(url: string, filename: string): Promise<void> {
    try {
      const response = await this.client.get(url, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get raw axios instance for custom requests
   */
  getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Namespaced API functions
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiClient.post('/auth/login', credentials),

  register: (userData: any) =>
    apiClient.post('/auth/register', userData),

  logout: () => {
    if (typeof window !== 'undefined') {
      const refreshToken = sessionStorage.getItem('refreshToken');
      return apiClient.post('/auth/logout', { refreshToken });
    }
    return apiClient.post('/auth/logout', {});
  },

  refreshToken: (refreshToken: string) =>
    apiClient.post('/auth/refresh-token', { refreshToken }),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    apiClient.post(`/auth/reset-password?token=${token}`, { password }),

  verifyEmail: (token: string) =>
    apiClient.get(`/auth/verify-email?token=${token}`),

  getDeviceSessions: () => {
    if (typeof window !== 'undefined') {
      const refreshToken = sessionStorage.getItem('refreshToken');
      const params = refreshToken ? { refreshToken } : {};
      return apiClient.get('/auth/sessions', { params });
    }
    return apiClient.get('/auth/sessions');
  },

  logoutFromDevice: (deviceId: string) =>
    apiClient.delete(`/auth/sessions/${deviceId}`),
};

export const userApi = {
  getProfile: () =>
    apiClient.get('/users/profile'),

  updateProfile: (data: any) =>
    apiClient.put('/users/profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.put('/users/change-password', data),
};

export const courseApi = {
  getAll: (params?: any) =>
    apiClient.get('/courses', { params }),

  getById: (id: string) =>
    apiClient.get(`/courses/${id}`),

  create: (data: any) =>
    apiClient.post('/courses', data),

  update: (id: string, data: any) =>
    apiClient.put(`/courses/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/courses/${id}`),

  enroll: (id: string) =>
    apiClient.post(`/courses/${id}/enroll`),
};

export const testApi = {
  getAll: (params?: any) =>
    apiClient.get('/tests', { params }),

  getById: (id: string) =>
    apiClient.get(`/tests/${id}`),

  submit: (id: string, answers: any) =>
    apiClient.post(`/tests/${id}/submit`, { answers }),

  getResults: (id: string) =>
    apiClient.get(`/tests/${id}/results`),
};

export const resourceApi = {
  // Upload resource
  upload: (courseId: string, formData: FormData) =>
    apiClient.post('/resources/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  // Get course resources
  getCourseResources: (courseId: string, params?: any) =>
    apiClient.get(`/resources/course/${courseId}`, { params }),

  // Submit for approval
  submitForApproval: (resourceId: string) =>
    apiClient.patch(`/resources/${resourceId}/submit-approval`),

  // Update resource
  update: (resourceId: string, data: any) =>
    apiClient.put(`/resources/${resourceId}`, data),

  // Delete resource
  delete: (resourceId: string) =>
    apiClient.delete(`/resources/${resourceId}`),

  // View resource inline
  view: (resourceId: string) =>
    `${appConfig.api.baseUrl}/resources/${resourceId}/view`,

  // Download resource
  download: (resourceId: string) =>
    `${appConfig.api.baseUrl}/resources/${resourceId}/download`,

  // Mark as completed
  markCompleted: (resourceId: string, timeSpent?: number) =>
    apiClient.post(`/resources/${resourceId}/complete`, { timeSpent }),

  // Get progress
  getProgress: (resourceId: string) =>
    apiClient.get(`/resources/${resourceId}/progress`),

  // Get supervisor's resources
  getSupervisorResources: () =>
    apiClient.get('/resources/supervisor'),

  // Get statistics (supervisor/admin)
  getStatistics: () =>
    apiClient.get('/resources/statistics'),

  // Admin approval endpoints
  getPending: () =>
    apiClient.get('/resources/pending'),

  approve: (resourceId: string) =>
    apiClient.put(`/resources/${resourceId}/approve`),

  reject: (resourceId: string, rejectionReason: string) =>
    apiClient.put(`/resources/${resourceId}/reject`, { rejectionReason }),
};

export const notificationApi = {
  // Get user's notifications
  getAll: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    apiClient.get('/notifications', { params }),

  // Get unread count
  getUnreadCount: () =>
    apiClient.get('/notifications/unread-count'),

  // Mark notification as read
  markAsRead: (notificationId: string) =>
    apiClient.patch(`/notifications/${notificationId}/read`),

  // Mark all as read
  markAllAsRead: () =>
    apiClient.patch('/notifications/read-all'),

  // Delete notification
  delete: (notificationId: string) =>
    apiClient.delete(`/notifications/${notificationId}`),

  // Delete all read notifications
  deleteAllRead: () =>
    apiClient.delete('/notifications/read/clear'),

  // Create test notification (dev only)
  createTest: (data?: { title?: string; message?: string; type?: string; urgent?: boolean }) =>
    apiClient.post('/notifications/test', data),
};

// Export types
export type { AxiosRequestConfig, AxiosResponse };
