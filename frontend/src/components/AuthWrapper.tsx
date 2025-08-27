import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { initializeAuth, logout, updateUser } from '../store/slices/authSlice';
import { RootState } from '../store/store';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const dispatch = useDispatch();
  const [isInitialized, setIsInitialized] = useState(false);
  const token = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    // Clean up any existing localStorage tokens to force session-based auth
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Initialize auth state from sessionStorage
    dispatch(initializeAuth());
    
    setIsInitialized(true);
  }, [dispatch]);
  
  // Separate effect for token validation to prevent infinite loops
  useEffect(() => {
    // Only validate token once when component mounts and token exists
    if (token && isInitialized) {
      validateToken(token);
    }
  }, [isInitialized]); // Remove token dependency to prevent re-validation on every token change

  const validateToken = async (token: string) => {
    try {
      // API call to validate the token
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const validateResponse = await fetch(`${apiUrl}/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (validateResponse.ok) {
        // Token is valid, now fetch the complete user profile including profile photo
        const profileResponse = await fetch(`${apiUrl}/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (profileData.success && profileData.data && profileData.data.user) {
            // Update user data with fresh data from server, including profile photo
            dispatch(updateUser(profileData.data.user));
          }
        }
      } else {
        // Token is invalid, clear auth state
        dispatch(logout());
      }
    } catch (error) {
      console.error('Token validation error:', error);
    }
  };

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthWrapper;