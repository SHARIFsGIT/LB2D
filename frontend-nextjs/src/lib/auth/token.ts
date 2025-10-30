/**
 * Token Management
 * Secure token storage and retrieval with encryption
 */

import Cookies from 'js-cookie';
import CryptoJS from 'crypto-js';
import { appConfig } from '@/config/app.config';
import { User } from '@/types';

// Encryption key (in production, this should be from env variable)
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'lb2d-secret-key-2024';

/**
 * Encrypt data
 */
function encrypt(data: string): string {
  return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
}

/**
 * Decrypt data
 */
function decrypt(encryptedData: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Get auth token from cookies
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  const encryptedToken = Cookies.get(appConfig.auth.tokenKey);
  if (!encryptedToken) return null;

  try {
    return decrypt(encryptedToken);
  } catch (error) {
    console.error('Error decrypting token:', error);
    return null;
  }
}

/**
 * Get refresh token from cookies
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;

  const encryptedToken = Cookies.get(appConfig.auth.refreshTokenKey);
  if (!encryptedToken) return null;

  try {
    return decrypt(encryptedToken);
  } catch (error) {
    console.error('Error decrypting refresh token:', error);
    return null;
  }
}

/**
 * Get user from localStorage
 */
export function getUser(): User | null {
  if (typeof window === 'undefined') return null;

  const encryptedUser = localStorage.getItem(appConfig.auth.userKey);
  if (!encryptedUser) return null;

  try {
    const decryptedUser = decrypt(encryptedUser);
    return JSON.parse(decryptedUser);
  } catch (error) {
    console.error('Error decrypting user:', error);
    return null;
  }
}

/**
 * Set auth token in cookies
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;

  const encryptedToken = encrypt(token);
  Cookies.set(appConfig.auth.tokenKey, encryptedToken, {
    expires: 7, // 7 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
}

/**
 * Set refresh token in cookies
 */
export function setRefreshToken(token: string): void {
  if (typeof window === 'undefined') return;

  const encryptedToken = encrypt(token);
  Cookies.set(appConfig.auth.refreshTokenKey, encryptedToken, {
    expires: 30, // 30 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
}

/**
 * Set user in localStorage
 */
export function setUser(user: User): void {
  if (typeof window === 'undefined') return;

  const encryptedUser = encrypt(JSON.stringify(user));
  localStorage.setItem(appConfig.auth.userKey, encryptedUser);
}

/**
 * Set auth data (token, refresh token, and user)
 */
export function setAuthData(accessToken: string, refreshToken: string, user: User): void {
  setAuthToken(accessToken);
  setRefreshToken(refreshToken);
  setUser(user);
}

/**
 * Clear all auth data
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return;

  Cookies.remove(appConfig.auth.tokenKey);
  Cookies.remove(appConfig.auth.refreshTokenKey);
  localStorage.removeItem(appConfig.auth.userKey);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = getAuthToken();
  return !!token;
}

/**
 * Check if user has a specific role
 */
export function hasRole(role: string | string[]): boolean {
  const user = getUser();
  if (!user) return false;

  if (Array.isArray(role)) {
    return role.includes(user.role);
  }

  return user.role === role;
}

/**
 * Check if user is admin
 */
export function isAdmin(): boolean {
  return hasRole('admin');
}

/**
 * Check if user is supervisor
 */
export function isSupervisor(): boolean {
  return hasRole('supervisor');
}

/**
 * Check if user is student
 */
export function isStudent(): boolean {
  return hasRole('student');
}

/**
 * Get device info for session management
 */
export function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return {
      deviceName: 'Server',
      deviceType: 'server',
    };
  }

  const ua = navigator.userAgent;
  let deviceType = 'desktop';

  if (/mobile/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/tablet/i.test(ua)) {
    deviceType = 'tablet';
  }

  // Get device name from user agent
  let deviceName = 'Unknown Device';
  if (/Windows/i.test(ua)) {
    deviceName = 'Windows PC';
  } else if (/Macintosh/i.test(ua)) {
    deviceName = 'Mac';
  } else if (/Linux/i.test(ua)) {
    deviceName = 'Linux PC';
  } else if (/Android/i.test(ua)) {
    deviceName = 'Android Device';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    deviceName = 'iOS Device';
  }

  return {
    deviceName,
    deviceType,
  };
}
