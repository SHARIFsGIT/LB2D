import axios from 'axios';

// API URL from environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const authApi = axios.create({
  baseURL: `${API_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface LoginCredentials {
  email: string;
  password: string;
  deviceFingerprint: string;
  deviceName: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    phone?: string;
    isEmailVerified?: boolean;
    isActive?: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  user: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

// Auth API functions
export const login = async (credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> => {
  const response = await authApi.post<ApiResponse<LoginResponse>>('/login', credentials);
  return response.data;
};

export const register = async (data: RegisterData): Promise<ApiResponse<RegisterResponse>> => {
  const response = await authApi.post<ApiResponse<RegisterResponse>>('/register', data);
  return response.data;
};

export const forgotPassword = async (email: string): Promise<ApiResponse<any>> => {
  const response = await authApi.post<ApiResponse<any>>('/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token: string, password: string, phoneDigits?: string): Promise<ApiResponse<any>> => {
  const requestBody: any = { password };
  if (phoneDigits) {
    requestBody.phoneDigits = phoneDigits;
  }
  const response = await authApi.post<ApiResponse<any>>(`/reset-password?token=${token}`, requestBody);
  return response.data;
};

export const verifyEmail = async (token: string): Promise<ApiResponse<any>> => {
  const response = await authApi.get<ApiResponse<any>>(`/verify-email?token=${token}`);
  return response.data;
};

export const verifyPhoneDigits = async (token: string, phoneDigits: string): Promise<ApiResponse<any>> => {
  const response = await authApi.post<ApiResponse<any>>('/verify-phone-digits', { token, phoneDigits });
  return response.data;
};

export const getMaskedPhone = async (token: string): Promise<ApiResponse<{ maskedPhone?: string }>> => {
  const response = await authApi.get<ApiResponse<{ maskedPhone?: string }>>(`/get-masked-phone?token=${token}`);
  return response.data;
};

export const logout = async (): Promise<ApiResponse<any>> => {
  const response = await authApi.post<ApiResponse<any>>('/logout');
  return response.data;
};
