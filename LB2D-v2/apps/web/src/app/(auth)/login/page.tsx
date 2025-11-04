'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useNotification } from '@/hooks/useNotification';
import { useLoginMutation } from '@/store/api/apiSlice';
import { getDeviceFingerprint } from '@/lib/utils/deviceFingerprint';
import { useAuthStore } from '@/store/authStore';

const LoginPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const { setCredentials } = useAuthStore();
  const [login, { isLoading }] = useLoginMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Clear any previous errors

    try {
      // Get device fingerprint
      const deviceInfo = getDeviceFingerprint();

      const result = await login({
        email,
        password,
        fingerprint: deviceInfo.fingerprint,
        deviceName: deviceInfo.deviceName
      }).then((res: any) => res.unwrap());

      if (result.success) {

        setCredentials(
          result.data.user,
          result.data.accessToken,
          result.data.refreshToken
        );

        showSuccess(
          `Welcome back, ${result.data.user.firstName}!`
        );

        // Role-based navigation
        if (result.data.user.role === 'ADMIN') {
          router.push('/admin');
        } else if (result.data.user.role === 'SUPERVISOR') {
          router.push('/supervisor');
        } else {
          router.push('/dashboard');
        }

      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.data?.message || 'Login failed';
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-white bg-opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white bg-opacity-10 rounded-full translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-white bg-opacity-5 rounded-full"></div>

      <div className="bg-white bg-opacity-60 backdrop-blur-md px-10 py-6 rounded-3xl shadow-2xl w-full max-w-lg border border-white border-opacity-50 relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-3xl font-extrabold bg-gradient-to-r from-red-600 via-yellow-600 to-green-600 bg-clip-text text-transparent mb-2 whitespace-nowrap">
            Welcome Back
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 backdrop-blur-sm">
            <div className="flex items-center">
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-3">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-100 bg-opacity-80 backdrop-blur-sm"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-3">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-100 bg-opacity-80 backdrop-blur-sm"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 11-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.639 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.639 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="animated-btn group relative w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:!bg-transparent disabled:opacity-50 disabled:cursor-not-allowed mt-12 overflow-hidden min-h-[3.5rem]"
          >
            {/* Stars across the entire viewport - only on hover, hide on click */}
            <div className="fixed w-5 h-5 top-[8%] left-[18%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-3200 ease-smooth pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-white drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-3 h-3 top-[28%] right-[12%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-2800 ease-smooth pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-emerald-200 drop-shadow-[0_0_10px_rgba(167,243,208,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-2 h-2 bottom-[25%] left-[65%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-2400 ease-smooth pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-teal-200 drop-shadow-[0_0_8px_rgba(153,246,228,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-4 h-4 top-[50%] left-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-3000 ease-smooth pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-cyan-300 drop-shadow-[0_0_12px_rgba(165,243,252,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-2 h-2 bottom-[10%] right-[25%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-2600 ease-smooth pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-green-300 drop-shadow-[0_0_9px_rgba(134,239,172,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-3 h-3 top-[15%] right-[40%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-3400 ease-smooth pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-emerald-100 drop-shadow-[0_0_8px_rgba(209,250,229,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-2 h-2 top-[42%] right-[70%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-2200 ease-smooth pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-teal-300 drop-shadow-[0_0_7px_rgba(94,234,212,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-3 h-3 bottom-[35%] left-[25%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-3600 ease-smooth pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-green-200 drop-shadow-[0_0_10px_rgba(187,247,208,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-3.5 h-3.5 top-[70%] right-[35%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-2700 ease-smooth pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-emerald-300 drop-shadow-[0_0_11px_rgba(110,231,183,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-2.5 h-2.5 bottom-[45%] right-[15%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-3100 ease-smooth pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-teal-400 drop-shadow-[0_0_9px_rgba(45,212,191,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-2 h-2 top-[35%] left-[45%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-2500 ease-smooth pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            <div className="relative flex items-center justify-center z-10">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                  <span className="font-semibold text-lg">Signing you in...</span>
                </>
              ) : (
                <span className="font-semibold text-lg">Sign In</span>
              )}
            </div>
          </button>

        </form>

        <div className="mt-6 text-center">
          <Link href="/forgot-password" className="text-red-600 text-sm font-medium">
            Forgot your password?
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-400 text-center">
          <p className="text-gray-600">
            New to Learn Bangla to Deutsch?{' '}
            <Link href="/register" className="text-green-600 font-semibold">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
