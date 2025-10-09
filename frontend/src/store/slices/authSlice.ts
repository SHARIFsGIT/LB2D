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

// Safely parse stored user data
let parsedUser: User | null = null;
if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
  try {
    parsedUser = JSON.parse(storedUser);
  } catch (error) {
    console.error('Error parsing stored user data:', error);
    // Clear corrupted data
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('accessToken');
  }
}

const initialState: AuthState = {
  user: parsedUser,
  token: storedToken && storedToken !== 'undefined' && storedToken !== 'null' ? storedToken : null,
  isAuthenticated: !!(storedToken && parsedUser),
  isLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; token: string; refreshToken?: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isLoading = false;

      // Store in sessionStorage with standard keys
      sessionStorage.setItem('accessToken', action.payload.token);
      sessionStorage.setItem('user', JSON.stringify(action.payload.user));

      // Store refresh token if provided
      if (action.payload.refreshToken) {
        sessionStorage.setItem('refreshToken', action.payload.refreshToken);
      }
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