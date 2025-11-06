'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/hooks/useNotification';
import { useAuthStore } from '@/store/authStore';
import { api, authApi } from '@/lib/api-client';
import ConfirmModal from '@/components/common/ConfirmModal';

const ProfilePage = () => {
  const router = useRouter();
  const { showSuccess, showError } = useNotification();

  // Use Zustand for auth
  const { user, token, isInitialized, updateUser: updateUserStore, initializeAuth } = useAuthStore();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    profilePhoto: '',
  });

  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [lastPasswordResetTime, setLastPasswordResetTime] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lastPasswordResetTime');
      return stored ? parseInt(stored, 10) : 0;
    }
    return 0;
  });

  // Device sessions state
  const [deviceSessions, setDeviceSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Initialize auth and handle redirects with proper timing
  useEffect(() => {
    // Ensure auth is initialized
    initializeAuth();

    // Add a small delay to ensure Zustand state is fully loaded from sessionStorage
    const timer = setTimeout(() => {
      setIsMounted(true);
      setIsCheckingAuth(false);

      // Only redirect if we're certain there's no auth data after initialization
      if (!user && !token) {
        router.push('/login');
      }
    }, 150); // Slightly longer delay for Zustand hydration

    return () => clearTimeout(timer);
  }, []); // Run only once on mount

  // Confirm modal state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deviceToLogout, setDeviceToLogout] = useState<{ id: string; isCurrent: boolean } | null>(
    null
  );

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        profilePhoto: user.profilePhoto || '',
      });
      setProfilePhotoPreview(user.profilePhoto || null);
      loadDeviceSessions();
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
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
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const reader = new FileReader();
              reader.onloadend = () => {
                resolve(reader.result as string);
              };
              reader.readAsDataURL(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          0.85
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const supportedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/tiff',
        'image/svg+xml',
      ];

      if (!supportedTypes.includes(file.type.toLowerCase())) {
        showError(
          'Please select a valid image file (JPEG, PNG, GIF, WebP, BMP, TIFF, SVG)'
        );
        return;
      }

      try {
        if (file.type === 'image/svg+xml') {
          const text = await file.text();
          const dataUrl = `data:image/svg+xml;base64,${btoa(text)}`;
          setProfilePhotoPreview(dataUrl);
          setFormData((prev) => ({
            ...prev,
            profilePhoto: dataUrl,
          }));
        } else {
          const compressedImage = await compressImage(file);
          setProfilePhotoPreview(compressedImage);
          setFormData((prev) => ({
            ...prev,
            profilePhoto: compressedImage,
          }));
        }
      } catch (error) {
        showError('Failed to process image. Please try a different image.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!token) {
        showError('Authentication required. Please log in again.');
        router.push('/login');
        return;
      }

      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
      };

      if (formData.profilePhoto && formData.profilePhoto !== user?.profilePhoto) {
        payload.profilePhoto = formData.profilePhoto;
      }

      // Use the API client instead of fetch
      const response = await api.users.updateProfile(payload);

      if (response.data?.success || response.data?.data) {
        const userData = response.data?.data?.user || response.data?.user;
        if (userData) {
          updateUserStore(userData);
        }
        showSuccess('Profile updated successfully!');
        setTimeout(() => {
          router.back();
        }, 1500);
      } else {
        showError('Failed to update profile');
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update profile';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      showError('Email not found');
      return;
    }

    const now = Date.now();
    const cooldownPeriod = 5 * 60 * 1000;

    if (lastPasswordResetTime && now - lastPasswordResetTime < cooldownPeriod) {
      const remainingTime = Math.ceil((cooldownPeriod - (now - lastPasswordResetTime)) / 1000);
      showError(
        `Please wait ${Math.floor(remainingTime / 60)} minutes and ${
          remainingTime % 60
        } seconds before requesting another password reset.`
      );
      return;
    }

    setChangePasswordLoading(true);

    try {
      console.log('Sending password reset request for:', user.email);
      const response = await api.auth.forgotPassword(user.email);
      console.log('Password reset response:', response);

      if (response.data?.success || response.status === 200) {
        setLastPasswordResetTime(now);
        if (typeof window !== 'undefined') {
          localStorage.setItem('lastPasswordResetTime', now.toString());
        }
        showSuccess(
          `Password reset link has been sent to ${user.email}. Please check your email (and spam folder) for the reset link.`
        );
      } else {
        showError(response.data?.message || 'Failed to send password reset email');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      if (error.response?.status === 429) {
        showError(
          'Too many password reset requests. Please wait 5 minutes before trying again.'
        );
        if (typeof window !== 'undefined') {
          localStorage.removeItem('lastPasswordResetTime');
        }
        setLastPasswordResetTime(0);
      } else {
        const errorMsg = error.response?.data?.message || error.message || 'Network error. Please try again.';
        showError(errorMsg);
      }
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const loadDeviceSessions = async () => {
    if (!user) return;

    setSessionsLoading(true);
    try {
      const response = await authApi.getSessions();
      console.log('Device sessions response:', response);

      let sessions = [];
      if (response.data?.success && response.data?.data?.sessions) {
        sessions = response.data.data.sessions;
      } else if (response.data?.data?.deviceSessions) {
        sessions = response.data.data.deviceSessions;
      } else if (response.data?.sessions) {
        sessions = response.data.sessions;
      } else if (response.data?.deviceSessions) {
        sessions = response.data.deviceSessions;
      }

      console.log('Loaded device sessions:', sessions);
      setDeviceSessions(sessions);
    } catch (error: any) {
      console.error('Error loading device sessions:', error);
      setDeviceSessions([]);
      if (error.response?.status === 401) {
        router.push('/login');
      }
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleLogoutFromDevice = (deviceId: string, isCurrent: boolean) => {
    setDeviceToLogout({ id: deviceId, isCurrent });
    setShowLogoutConfirm(true);
  };

  const confirmLogoutFromDevice = async () => {
    if (!deviceToLogout) return;

    try {
      await authApi.logoutFromDevice(deviceToLogout.id);
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
        localStorage.clear();
      }
      router.push('/login');
    } catch (error) {
      showError('Failed to logout from device');
    } finally {
      setShowLogoutConfirm(false);
      setDeviceToLogout(null);
    }
  };

  // Show loading while checking auth or mounting
  if (isCheckingAuth || !isMounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Helper function to shorten device ID
  const shortenDeviceId = (deviceId: string) => {
    if (deviceId.length <= 12) return deviceId;
    return `${deviceId.substring(0, 8)}...${deviceId.substring(deviceId.length - 4)}`;
  };

  // Count active devices - all sessions returned are considered active
  const activeDeviceCount = deviceSessions.length;
  const totalDeviceSlots = 2;

  // Debug logging
  console.log('Device sessions:', deviceSessions);
  console.log('Active device count:', activeDeviceCount);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-2">Profile Settings</h1>
          <p className="text-purple-100 text-lg">Manage your account and preferences</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 pb-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Information Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
                <p className="text-sm text-gray-500">Update your personal details</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Profile Photo Section */}
                <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden ring-4 ring-purple-100">
                      {profilePhotoPreview ? (
                        <img
                          src={profilePhotoPreview}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        `${user.firstName?.charAt(0)?.toUpperCase()}${user.lastName
                          ?.charAt(0)
                          ?.toUpperCase()}`
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl cursor-pointer shadow-lg border-2 border-gray-200 hover:border-purple-500 transition-all">
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{user.firstName} {user.lastName}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-400 mt-1">Click the camera icon to change photo</p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter phone number"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 focus:ring-4 focus:ring-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                  >
                    {loading ? 'Updating...' : 'Update Profile'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>

            {/* Active Devices Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Active Devices</h2>
                  <p className="text-sm text-gray-500">
                    {activeDeviceCount} of {totalDeviceSlots} devices active
                  </p>
                </div>
              </div>

              {sessionsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-3"></div>
                  <p className="text-gray-600">Loading devices...</p>
                </div>
              ) : deviceSessions.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <p className="text-gray-600 font-medium text-lg">No active devices found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deviceSessions.map((session) => (
                    <div
                      key={session.deviceId}
                      className={`border-2 rounded-xl p-5 transition-all ${
                        session.isCurrent
                          ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="font-bold text-gray-900 text-lg">
                              {session.deviceName || 'Unknown Device'}
                            </h4>
                            {session.isCurrent && (
                              <span className="bg-green-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
                                Current Device
                              </span>
                            )}
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="text-gray-600">
                              <span className="font-semibold">Device ID: </span>
                              <span className="font-mono text-xs">{shortenDeviceId(session.deviceId)}</span>
                            </div>
                            <div className="text-gray-600">
                              <span className="font-semibold">Last Active: </span>
                              <span>
                                {new Date(session.lastActivityAt || session.loginTime).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <div className="text-gray-600">
                              <span className="font-semibold">IP Address: </span>
                              <span>{session.ipAddress || 'Unknown IP'}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLogoutFromDevice(session.deviceId, session.isCurrent)}
                          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            session.isCurrent
                              ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl'
                              : 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl'
                          }`}
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Security & Info */}
          <div className="space-y-6">
            {/* Change Password Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="mb-4">
                <h3 className="font-bold text-gray-900 text-xl">Security</h3>
                <p className="text-xs text-gray-500">Update your password</p>
              </div>
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={changePasswordLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3 rounded-xl font-semibold hover:from-amber-600 hover:to-orange-700 focus:ring-4 focus:ring-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {changePasswordLoading ? 'Sending...' : 'Change Password'}
              </button>
              <p className="text-xs text-gray-500 mt-3 text-center">
                We'll send a reset link to your email
              </p>
            </div>

            {/* Account Info Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="mb-4">
                <h3 className="font-bold text-gray-900 text-xl">Account Details</h3>
                <p className="text-xs text-gray-500">Your account information</p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Email</span>
                  <span className="text-sm font-semibold text-gray-900">{user.email}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Role</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                    user.role === 'SUPERVISOR' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role?.charAt(0) + user.role?.slice(1).toLowerCase()}
                  </span>
                </div>
                {user.isEmailVerified !== undefined && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Email Status</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      user.isEmailVerified ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {user.isEmailVerified ? 'Verified' : 'Not Verified'}
                    </span>
                  </div>
                )}
                {user.isActive !== undefined && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Account Status</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogoutFromDevice}
        title={deviceToLogout?.isCurrent ? 'Logout from Current Device?' : 'Logout from Device?'}
        message={
          deviceToLogout?.isCurrent
            ? 'You will be logged out from this device and redirected to the login page. Continue?'
            : 'This will logout the selected device. The user will need to log in again on that device.'
        }
        confirmText="Yes, Logout"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
};

export default ProfilePage;
