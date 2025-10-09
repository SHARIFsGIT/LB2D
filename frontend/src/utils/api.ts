import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { store } from '../store/store';
import { logout } from '../store/slices/authSlice';

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5005/api';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: { [key: string]: string };
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  timestamp: string;
  requestId?: string;
}

interface ApiError {
  message: string;
  status: number;
  errors?: { [key: string]: string };
  requestId?: string;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const state = store.getState();
        const token = state.auth.token;
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle auth and errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 errors (token expired)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Try to refresh the token
            const refreshToken = sessionStorage.getItem('refreshToken');

            if (refreshToken) {
              const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
                refreshToken
              });

              if (response.data.success) {
                const { accessToken, user } = response.data.data;

                // Update tokens in sessionStorage
                sessionStorage.setItem('accessToken', accessToken);
                sessionStorage.setItem('user', JSON.stringify(user));

                // Update the authorization header
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                }

                // Retry the original request with new token
                return this.client(originalRequest);
              }
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
          }

          // If refresh fails, logout user
          store.dispatch(logout());

          // Redirect to login
          window.location.href = '/login';

          return Promise.reject(error);
        }

        return Promise.reject(this.formatError(error));
      }
    );
  }

  private formatError(error: AxiosError): ApiError {
    if (error.response?.data) {
      const data = error.response.data as any;
      return {
        message: data.message || 'An error occurred',
        status: error.response.status,
        errors: data.errors,
        requestId: data.requestId
      };
    }

    return {
      message: error.message || 'Network error',
      status: error.response?.status || 0
    };
  }

  // Generic request methods
  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  // File upload method
  public async upload<T = any>(
    url: string, 
    file: File, 
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress
    });

    return response.data;
  }

  // Download method
  public async download(url: string, filename?: string): Promise<void> {
    const response = await this.client.get(url, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(downloadUrl);
  }
}

// Create and export instance
export const apiClient = new ApiClient();

// Convenience methods for different API endpoints
export const authApi = {
  login: (credentials: { email: string; password: string }) => 
    apiClient.post('/auth/login', credentials),
  
  register: (userData: any) => 
    apiClient.post('/auth/register', userData),
  
  logout: () => 
    apiClient.post('/auth/logout'),
  
  refreshToken: (refreshToken: string) => 
    apiClient.post('/auth/refresh-token', { refreshToken }),
  
  forgotPassword: (email: string) => 
    apiClient.post('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, password: string) => 
    apiClient.post(`/auth/reset-password?token=${token}`, { password }),
  
  verifyEmail: (token: string) => 
    apiClient.get(`/auth/verify-email?token=${token}`),
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
    `${process.env.REACT_APP_API_URL || 'http://localhost:5005/api'}/resources/${resourceId}/view`,
  
  // Download resource
  download: (resourceId: string) => 
    `${process.env.REACT_APP_API_URL || 'http://localhost:5005/api'}/resources/${resourceId}/download`,
  
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

export default apiClient;