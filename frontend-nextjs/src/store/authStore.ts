import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  role: string;
  requestedRole?: string;
  previousRole?: string;
  rejectionReason?: string;
  rejectionDate?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  profilePhoto?: string;
  isEmailVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setCredentials: (user: User, token: string, refreshToken?: string) => void;
  updateUser: (userData: Partial<User>) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => void;
}

// Helper to get token from sessionStorage
const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('accessToken');
};

// Helper to get user from sessionStorage
const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;

  const userStr = sessionStorage.getItem('user');
  if (!userStr || userStr === 'undefined' || userStr === 'null') return null;

  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing stored user:', error);
    sessionStorage.removeItem('user');
    return null;
  }
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,

      setCredentials: (user, token, refreshToken) => {
        // Store in sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('accessToken', token);
          sessionStorage.setItem('user', JSON.stringify(user));
          if (refreshToken) {
            sessionStorage.setItem('refreshToken', refreshToken);
          }
        }

        set({
          user,
          token,
          refreshToken: refreshToken || null,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });
      },

      updateUser: (userData) => {
        const currentUser = get().user;
        if (!currentUser) return;

        const updatedUser = { ...currentUser, ...userData };

        // Update sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
        }

        set({ user: updatedUser });
      },

      logout: () => {
        // Clear sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('accessToken');
          sessionStorage.removeItem('refreshToken');
        }

        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),

      initializeAuth: () => {
        if (typeof window === 'undefined') {
          set({ isInitialized: true });
          return;
        }

        const token = getStoredToken();
        const user = getStoredUser();

        if (token && user) {
          set({
            user,
            token,
            refreshToken: sessionStorage.getItem('refreshToken'),
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });
        } else {
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      // Don't persist anything - we use sessionStorage directly
      partialize: () => ({}),
    }
  )
);
