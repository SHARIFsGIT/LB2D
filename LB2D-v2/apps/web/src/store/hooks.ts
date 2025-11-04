// Store hooks for compatibility
import { useAuthStore } from './authStore';

// Re-export useAuthStore as a named export
export { useAuthStore };

// Type definitions for compatibility
export type RootState = {
  auth: {
    user: any;
    isAuthenticated: boolean;
    accessToken: string | null;
  };
};

// Selector hook for compatibility with old Redux code
export const useSelector = (selector: (state: RootState) => any) => {
  const authState = useAuthStore();
  const rootState: RootState = {
    auth: {
      user: authState.user,
      isAuthenticated: authState.isAuthenticated,
      accessToken: authState.token,
    },
  };
  return selector(rootState);
};

// Dispatch hook for compatibility (no-op since we're using Zustand)
export const useDispatch = () => {
  return () => {}; // No-op dispatch for compatibility
};

// For backwards compatibility
export const useAppSelector = useSelector;
export const useAppDispatch = useDispatch;
