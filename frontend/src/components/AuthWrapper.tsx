import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  const hasValidatedToken = useRef(false);
  const validationInProgress = useRef(false);

  useEffect(() => {
    // Clean up any existing localStorage tokens to force session-based auth
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Initialize auth state from sessionStorage
    dispatch(initializeAuth());
    
    setIsInitialized(true);
  }, [dispatch]);

  const validateToken = useCallback(async (token: string) => {
    // Prevent multiple simultaneous validations
    if (validationInProgress.current || hasValidatedToken.current) {
      console.log('🛑 AuthWrapper - Skipping validation (already in progress or completed)');
      return;
    }
    
    validationInProgress.current = true;
    
    try {
      console.log('🔍 AuthWrapper - Validating token...');
      // API call to validate the token
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5005/api';
      const validateResponse = await fetch(`${apiUrl}/auth/validate-token`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 AuthWrapper - Validate response status:', validateResponse.status);

      if (validateResponse.ok) {
        const validateData = await validateResponse.json();
        console.log('✅ AuthWrapper - Token validation successful:', validateData);
        
        // Token is valid, now fetch the complete user profile including profile photo
        const profileResponse = await fetch(`${apiUrl}/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          console.log('👤 AuthWrapper - Profile data:', profileData);
          if (profileData.success && profileData.data && profileData.data.user) {
            // Update user data with fresh data from server, including profile photo
            dispatch(updateUser(profileData.data.user));
          }
        } else {
          console.log('⚠️ AuthWrapper - Profile fetch failed:', profileResponse.status);
        }
        
        // Mark validation as completed
        hasValidatedToken.current = true;
      } else {
        const errorData = await validateResponse.json().catch(() => ({}));
        console.log('❌ AuthWrapper - Token validation failed:', validateResponse.status, errorData);
        // Token is invalid, clear auth state
        dispatch(logout());
        hasValidatedToken.current = true; // Mark as completed even if failed
      }
    } catch (error) {
      console.error('💥 AuthWrapper - Token validation error:', error);
      // On network error, don't logout - could be temporary
      hasValidatedToken.current = true; // Mark as completed even if error
    } finally {
      validationInProgress.current = false;
    }
  }, [dispatch]);
  
  // Separate effect for token validation to prevent infinite loops
  useEffect(() => {
    // Only validate token once when component mounts and token exists
    if (token && isInitialized && !hasValidatedToken.current) {
      console.log('🔄 AuthWrapper - Triggering one-time token validation');
      validateToken(token);
    }
  }, [token, isInitialized, validateToken]);
  
  // Reset validation flag when token changes (new login)
  useEffect(() => {
    hasValidatedToken.current = false;
    validationInProgress.current = false;
  }, [token]);

  // Periodic validation disabled to prevent automatic page refresh
  // Add periodic validation every 30 seconds to catch role changes
  // useEffect(() => {
  //   if (!token || !isInitialized) return;

  //   const interval = setInterval(() => {
  //     validateToken(token);
  //   }, 30000); // Check every 30 seconds

  //   return () => clearInterval(interval);
  // }, [token, isInitialized, validateToken]);

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