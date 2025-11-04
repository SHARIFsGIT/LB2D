import { useState } from 'react';
import { useAuthStore } from '../authStore';
import { apiClient } from '@/lib/api-client';

export const useLogoutMutation = () => {
  const logout = useAuthStore((state) => state.logout);
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async () => {
    setIsLoading(true);
    try {
      // Send empty body or deviceId (backend will use current device from JWT)
      await apiClient.post('/auth/logout', {});
      logout();
      return { data: null };
    } catch (error) {
      // Always logout on frontend even if backend call fails
      logout();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return [mutate, { isLoading }] as const;
};

export const useLoginMutation = () => {
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (credentials: any) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const { user, accessToken, refreshToken } = response.data.data;
      setCredentials(user, accessToken, refreshToken);
      return {
        unwrap: async () => response.data
      };
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return [mutate, { isLoading }] as const;
};

export const useRegisterMutation = () => {
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (userData: any) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/register', userData);
      return {
        unwrap: async () => response.data
      };
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return [mutate, { isLoading }] as const;
};
