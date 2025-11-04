'use client';

import { useEffect } from 'react';
import { useAuthStore, type User } from '@/store/authStore';

/**
 * Custom hook to use auth store with auto-initialization
 */
export function useAuth(): {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  setCredentials: (user: User, token: string, refreshToken?: string) => void;
  updateUser: (userData: Partial<User>) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => void;
} {
  const store = useAuthStore();

  useEffect(() => {
    // Initialize auth from sessionStorage on mount
    store.initializeAuth();
  }, []);

  return store;
}

export default useAuth;
