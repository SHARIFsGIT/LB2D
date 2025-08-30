import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Use standard keys for token storage (no tab isolation to fix refresh issue)
const storedToken = sessionStorage.getItem('accessToken');
const storedUser = sessionStorage.getItem('user');

const initialState: AuthState = {
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken,
  isAuthenticated: !!storedToken && !!storedUser,
  isLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      console.log('🔧 AuthSlice - Setting credentials:', {
        user: action.payload.user,
        token: action.payload.token ? 'TOKEN_PROVIDED' : 'NO_TOKEN'
      });
      
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isLoading = false;
      
      // Store in sessionStorage with standard keys
      sessionStorage.setItem('accessToken', action.payload.token);
      sessionStorage.setItem('user', JSON.stringify(action.payload.user));
      
      console.log('💾 AuthSlice - Credentials saved to sessionStorage');
    },
    
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      
      // Clear sessionStorage with standard keys
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('user');
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    // Initialize auth from sessionStorage
    initializeAuth: (state) => {
      const token = sessionStorage.getItem('accessToken');
      const userStr = sessionStorage.getItem('user');
      
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          state.user = user;
          state.token = token;
          state.isAuthenticated = true;
        } catch (error) {
          console.error('Error parsing stored user data:', error);
          state.user = null;
          state.token = null;
          state.isAuthenticated = false;
          sessionStorage.removeItem('accessToken');
          sessionStorage.removeItem('user');
        }
      } else {
        state.isAuthenticated = false;
      }
      state.isLoading = false;
    },
    
    // Update user data without changing auth status
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        sessionStorage.setItem('user', JSON.stringify(state.user));
      }
    }
  },
});

export const { setCredentials, logout, setLoading, initializeAuth, updateUser } = authSlice.actions;
export default authSlice.reducer;