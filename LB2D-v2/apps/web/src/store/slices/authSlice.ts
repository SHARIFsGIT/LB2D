// Re-export from authStore for compatibility
import { useAuthStore, type User } from '../authStore';

export { useAuthStore, type User };

// For backwards compatibility with Redux code
export const selectAuth = (state: any) => state.auth;
export const selectUser = (state: any) => state.auth?.user;
export const selectIsAuthenticated = (state: any) => state.auth?.isAuthenticated;
export const selectAccessToken = (state: any) => state.auth?.accessToken;

// Export updateUser action for compatibility
export const updateUser = (userData: Partial<User>) => {
  const { updateUser: update } = useAuthStore.getState();
  update(userData);
};
