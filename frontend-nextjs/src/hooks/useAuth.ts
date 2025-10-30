'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * Custom hook to use auth store with auto-initialization
 * Ensures auth state is loaded from cookies/sessionStorage on mount
 */
export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    // Initialize auth from cookies/sessionStorage on mount
    store.initializeAuth();
  }, []);

  return store;
}

export default useAuth;
