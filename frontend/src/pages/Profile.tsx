import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../hooks/useNotification';
import { updateUser } from '../store/slices/authSlice';
import { RootState } from '../store/store';
import { authApi } from '../utils/api';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showSuccess, showError } = useNotification();
  const { user, token } = useSelector((state: RootState) => state.auth);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    profilePhoto: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [lastPasswordResetTime, setLastPasswordResetTime] = useState<number>(() => {
    // Load from localStorage to persist across page refreshes
    const stored = localStorage.getItem('lastPasswordResetTime');
    return stored ? parseInt(stored, 10) : 0;
  });

  // Device sessions state
  const [deviceSessions, setDeviceSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        profilePhoto: user.profilePhoto || ''
      });
      setProfilePhotoPreview(user.profilePhoto || null);
      loadDeviceSessions(); // Load device sessions when component mounts
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (max 400x400 for smaller payload)
        const maxSize = 400;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with higher compression (0.6 quality for smaller size)
        let compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
        
        // Check if still too large (>500KB base64), compress further
        if (compressedDataUrl.length > 500000) {
          compressedDataUrl = canvas.toDataURL('image/jpeg', 0.4);
        }
        
        // If still too large, compress to 0.2 quality
        if (compressedDataUrl.length > 500000) {
          compressedDataUrl = canvas.toDataURL('image/jpeg', 0.2);
        }
        resolve(compressedDataUrl);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Reduced limit to 5MB for input files to ensure compression works well
      if (file.size > 5 * 1024 * 1024) {
        showError('Profile photo must be less than 5MB', 'File Too Large');
        return;
      }
      
      // Support more image formats
      const supportedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
        'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml'
      ];
      
      if (!supportedTypes.includes(file.type.toLowerCase())) {
        showError('Please select a valid image file (JPEG, PNG, GIF, WebP, BMP, TIFF, SVG)', 'Invalid File Type');
        return;
      }

      try {
        // For SVG files, read as text and convert to data URL
        if (file.type === 'image/svg+xml') {
          const text = await file.text();
          const dataUrl = `data:image/svg+xml;base64,${btoa(text)}`;
          setProfilePhotoPreview(dataUrl);
          setFormData(prev => ({
            ...prev,
            profilePhoto: dataUrl
          }));
        } else {
          // For other images, compress them
          const compressedImage = await compressImage(file);
          setProfilePhotoPreview(compressedImage);
          setFormData(prev => ({
            ...prev,
            profilePhoto: compressedImage
          }));
        }
      } catch (error) {
        showError('Failed to process image. Please try a different image.', 'Processing Error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if user is authenticated and token exists
      if (!token) {
        showError('Authentication required. Please log in again.', 'Error');
        navigate('/login');
        return;
      }
      
      // Prepare the payload, only include profilePhoto if it's been changed
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone
      };

      // Only include profilePhoto if it's different from the original user photo
      if (formData.profilePhoto && formData.profilePhoto !== user?.profilePhoto) {
        payload.profilePhoto = formData.profilePhoto;
      }
      const response = await fetch(`${process.env.REACT_APP_API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        // Update the user in Redux store
        dispatch(updateUser(data.data.user));
        showSuccess('Profile updated successfully!', 'Success');
        // Optionally redirect back to previous page
        setTimeout(() => {
          navigate(-1);
        }, 1500);
      } else if (response.status === 413) {
        // Handle payload too large error specifically
        if (payload.profilePhoto) {
          // Try again without the profile photo
          const { profilePhoto, ...payloadWithoutPhoto } = payload;
          const retryResponse = await fetch(`${process.env.REACT_APP_API_URL}/users/profile`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payloadWithoutPhoto)
          });

          const retryData = await retryResponse.json();
          
          if (retryResponse.ok && retryData.success) {
            dispatch(updateUser(retryData.data.user));
            showError('Profile updated, but photo was too large to save. Please try a smaller image.', 'Partial Success');
          } else {
            showError('Profile photo too large and profile update failed. Please try again.', 'Error');
          }
        } else {
          showError('Request too large. Please reduce the amount of data and try again.', 'Error');
        }
      } else {
        const errorMessage = data.message || `Failed to update profile (${response.status})`;
        showError(errorMessage, 'Error');
      }
    } catch (error) {
      showError('Network error. Please try again.', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      showError('Email not found', 'Error');
      return;
    }

    // Check if user is trying to request too frequently (5 minutes cooldown, matching backend rate limit window)
    const now = Date.now();
    const cooldownPeriod = 5 * 60 * 1000; // 5 minutes in milliseconds

    if (lastPasswordResetTime && (now - lastPasswordResetTime) < cooldownPeriod) {
      const remainingTime = Math.ceil((cooldownPeriod - (now - lastPasswordResetTime)) / 1000);
      showError(
        `Please wait ${Math.floor(remainingTime / 60)} minutes and ${remainingTime % 60} seconds before requesting another password reset.`,
        'Too Many Requests'
      );
      return;
    }

    setChangePasswordLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: user.email })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLastPasswordResetTime(now); // Record the successful request time
        localStorage.setItem('lastPasswordResetTime', now.toString()); // Persist to localStorage
        showSuccess(
          `Password reset link has been sent to ${user.email}. Please check your email and follow the instructions to reset your password.`,
          'Reset Link Sent',
          { duration: 8000 }
        );
      } else if (response.status === 429) {
        // Handle rate limit error specifically
        showError(
          'Too many password reset requests. Please wait 5 minutes before trying again. If this persists, try refreshing the page.',
          'Rate Limited'
        );
        // Clear the localStorage timestamp so user can try again after the backend cooldown
        localStorage.removeItem('lastPasswordResetTime');
        setLastPasswordResetTime(0);
      } else {
        showError(data.message || 'Failed to send password reset email', 'Error');
      }
    } catch (error) {
      showError('Network error. Please try again.', 'Error');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const loadDeviceSessions = async () => {
    if (!user) return;

    setSessionsLoading(true);
    try {
      const response = await authApi.getDeviceSessions();
      if (response.success && response.data?.sessions) {
        setDeviceSessions(response.data.sessions);
      } else {
        setDeviceSessions([]);
      }
    } catch (error: any) {
      setDeviceSessions([]);
      if (error.status === 401) {
        navigate('/login');
      }
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleLogoutFromDevice = async (deviceId: string, isCurrent: boolean) => {
    const message = isCurrent
      ? 'Are you sure you want to logout from this device? You will be redirected to the login page.'
      : 'Are you sure you want to logout from this device?';

    if (!window.confirm(message)) {
      return;
    }

    try {
      const response = await authApi.logoutFromDevice(deviceId);
      if (response.success) {
        if (isCurrent) {
          sessionStorage.clear();
          localStorage.clear();
          showSuccess('Logged out successfully', 'Success');
          setTimeout(() => {
            navigate('/login');
          }, 800);
        } else {
          showSuccess('Device logged out successfully', 'Success');
          await loadDeviceSessions();
        }
      } else {
        showError('Failed to logout from device', 'Error');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to logout from device';
      showError(errorMessage, 'Error');

      if (error.status === 401) {
        sessionStorage.clear();
        localStorage.clear();
        setTimeout(() => navigate('/login'), 1000);
      }
    }
  };

  const getDeviceName = (userAgent: string): string => {
    if (!userAgent || userAgent === 'Unknown Device') {
      return 'Unknown Device';
    }

    const ua = userAgent.toLowerCase();

    // Check for mobile devices
    if (ua.includes('mobile') || ua.includes('android')) {
      if (ua.includes('samsung')) return 'Samsung Mobile';
      if (ua.includes('huawei')) return 'Huawei Mobile';
      if (ua.includes('xiaomi')) return 'Xiaomi Mobile';
      return 'Mobile Device';
    }

    // Check for iOS devices
    if (ua.includes('iphone')) return 'iPhone';
    if (ua.includes('ipad')) return 'iPad';

    // Check for tablets
    if (ua.includes('tablet')) return 'Tablet';

    // Check for desktop browsers
    if (ua.includes('windows')) return 'Windows PC';
    if (ua.includes('macintosh') || ua.includes('mac os')) return 'Mac';
    if (ua.includes('linux')) return 'Linux PC';

    // Check for specific browsers
    if (ua.includes('chrome')) return 'Desktop (Chrome)';
    if (ua.includes('firefox')) return 'Desktop (Firefox)';
    if (ua.includes('safari')) return 'Desktop (Safari)';
    if (ua.includes('edge')) return 'Desktop (Edge)';

    return 'Desktop Computer';
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Please log in to view your profile</h2>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            My Profile
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">

        {/* Profile Form */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Photo Section */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
                  {profilePhotoPreview ? (
                    <img 
                      src={profilePhotoPreview} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    `${user.firstName?.charAt(0)?.toUpperCase()}${user.lastName?.charAt(0)?.toUpperCase()}`
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-transparent text-white p-2 rounded-xl cursor-pointer shadow-lg border-2 border-gray-300 hover:border-gray-200 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/svg+xml"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-gray-600 mt-2 text-sm">Click the camera icon to upload a new photo</p>
            </div>

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your phone number"
                />
              </div>

              {/* Non-editable fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Account Information (Read-only) */}
            <div className="bg-gray-50 rounded-xl p-6 mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
                  <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-medium inline-block">
                    {user.role}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Email Status</label>
                  <div className={`px-3 py-2 rounded-lg text-sm font-medium inline-block ${
                    user.isEmailVerified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.isEmailVerified ? 'Verified' : 'Unverified'}
                  </div>
                </div>
                {user.createdAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Member Since</label>
                    <div className="text-gray-700 py-2">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {user.isActive !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Account Status</label>
                    <div className={`px-3 py-2 rounded-lg text-sm font-medium inline-block ${
                      user.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Active Devices Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mt-8 border border-blue-100">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Active Devices</h3>
                  <p className="text-xs text-gray-600 mt-1">Manage your logged-in devices (Maximum 2)</p>
                </div>
                <button
                  onClick={loadDeviceSessions}
                  disabled={sessionsLoading}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {sessionsLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {sessionsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading devices...</p>
                </div>
              ) : deviceSessions.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <p>No active devices found</p>
                  <button
                    onClick={loadDeviceSessions}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {deviceSessions.map((session) => (
                      <div
                        key={session.deviceId}
                        className={`bg-white rounded-lg p-4 shadow-sm border-2 transition-all ${
                          session.isCurrent
                            ? 'border-green-400 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-semibold text-gray-800 truncate">
                                {getDeviceName(session.userAgent)}
                              </h4>
                              {session.isCurrent && (
                                <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {new Date(session.loginTime).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <button
                            onClick={() => handleLogoutFromDevice(session.deviceId, session.isCurrent)}
                            className={`ml-4 px-4 py-2 ${
                              session.isCurrent
                                ? 'bg-orange-500 hover:bg-orange-600'
                                : 'bg-red-500 hover:bg-red-600'
                            } text-white rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md flex-shrink-0`}
                            title={session.isCurrent ? 'Logout from this device' : 'Logout from this device'}
                          >
                            Logout
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-xs text-gray-600 flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                    <span>
                      {deviceSessions.length} of 2 devices active
                    </span>
                    {deviceSessions.length >= 2 && (
                      <span className="text-orange-600 font-medium">
                        Device limit reached
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

{/* Action Buttons */}
            <div className="flex justify-end pt-6 space-x-4">
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={changePasswordLoading}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-1200 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changePasswordLoading ? 'Sending Email...' : 'Change Password'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-1200 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Bottom spacing for scroll */}
      <div className="pb-20"></div>
    </div>
  );
};

export default Profile;