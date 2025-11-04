// Store exports for compatibility with old code
import { useAuthStore as useAuthStoreOriginal } from './authStore';

export { useAuthStore } from './authStore';

// Re-export apiSlice for compatibility
export * from './api/apiSlice';

// Type definitions
export type RootState = {
  auth: {
    user: any;
    isAuthenticated: boolean;
    accessToken: string | null;
  };
};

// Hooks for compatibility
export const useSelector = (selector: (state: RootState) => any) => {
  const authState = useAuthStoreOriginal();
  const rootState: RootState = {
    auth: {
      user: authState.user,
      isAuthenticated: authState.isAuthenticated,
      accessToken: authState.token,
    },
  };
  return selector(rootState);
};

export const useDispatch = () => {
  return () => {}; // No-op dispatch for compatibility
};
