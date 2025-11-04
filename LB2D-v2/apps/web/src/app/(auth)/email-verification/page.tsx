'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function EmailVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const hasVerified = useRef(false); // Prevent double verification

  useEffect(() => {
    const verifyEmail = async () => {
      // Prevent double verification
      if (hasVerified.current) {
        return;
      }

      if (!token) {
        setVerificationStatus('error');
        setErrorMessage('No verification token provided');
        setIsLoading(false);
        return;
      }

      hasVerified.current = true; // Mark as attempting verification

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-email?token=${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setVerificationStatus('success');
          // Clear the registration email from session storage
          sessionStorage.removeItem('registrationEmail');
        } else {
          setVerificationStatus('error');
          setErrorMessage(data.message || 'Verification failed');
        }
      } catch (error) {
        setVerificationStatus('error');
        setErrorMessage('Network error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 relative overflow-hidden px-4">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-white bg-opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white bg-opacity-10 rounded-full translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-white bg-opacity-5 rounded-full"></div>

      <div className="bg-white bg-opacity-60 backdrop-blur-md px-6 sm:px-8 md:px-10 py-6 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg border border-white border-opacity-50 relative z-10 text-center">
        {verificationStatus === 'loading' && isLoading && (
          <div className="text-center">
            {/* Header */}
            <div className="text-center mb-4 sm:mb-6">
              <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-red-600 via-yellow-600 to-green-600 bg-clip-text text-transparent mb-2">
                Verifying Email...
              </div>
            </div>

            {/* Loading Spinner */}
            <div className="mb-4 sm:mb-6">
              <div className="mx-auto flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-blue-100">
                <div className="animate-spin rounded-full h-7 w-7 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
              </div>
            </div>

            <p className="text-gray-600 text-xs sm:text-sm">Please wait while we verify your email address...</p>
          </div>
        )}

        {verificationStatus === 'success' && (
          <div className="text-center">
            {/* Header */}
            <div className="text-center mb-4 sm:mb-6">
              <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-red-600 via-yellow-600 to-green-600 bg-clip-text text-transparent mb-2">
                Email Verified Successfully!
              </div>
            </div>

            {/* Success Icon */}
            <div className="mb-4 sm:mb-6">
              <div className="mx-auto flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-green-100">
                <svg className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>

            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
                Welcome to Learn Bangla to Deutsch!
              </h2>
              <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4">
                Your email has been verified successfully.
                <br />
                Please wait for admin approval. You'll be notified by email once approved..
              </p>
            </div>

            <button
              onClick={() => router.push('/login')}
              className="group relative w-full bg-gradient-to-r from-slate-800 to-gray-700 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl hover:from-slate-800 hover:to-gray-800 transition-all duration-3500 ease-smooth overflow-hidden mb-3 sm:mb-4 text-sm sm:text-base min-h-[44px]"
            >
              {/* Go to Login Button Stars - Success */}
              <div className="fixed w-4 h-4 top-[10%] left-[15%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3000 ease-smooth pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]">
                  <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                </svg>
              </div>
              <div className="fixed w-2 h-2 top-[35%] right-[20%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2600 ease-smooth pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-slate-200 drop-shadow-[0_0_8px_rgba(226,232,240,0.8)]">
                  <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                </svg>
              </div>
              <div className="fixed w-3 h-3 bottom-[25%] left-[65%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3400 ease-smooth pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-gray-300 drop-shadow-[0_0_10px_rgba(209,213,219,0.8)]">
                  <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                </svg>
              </div>
              <div className="fixed w-2 h-2 top-[60%] left-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2200 ease-smooth pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-slate-300 drop-shadow-[0_0_9px_rgba(203,213,225,0.8)]">
                  <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                </svg>
              </div>
              <div className="fixed w-3 h-3 bottom-[8%] right-[30%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2800 ease-smooth pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-gray-200 drop-shadow-[0_0_8px_rgba(229,231,235,0.8)]">
                  <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                </svg>
              </div>
              <div className="fixed w-2 h-2 top-[20%] right-[45%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3200 ease-smooth pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-slate-100 drop-shadow-[0_0_7px_rgba(241,245,249,0.8)]">
                  <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                </svg>
              </div>
              <span className="relative z-10">Go to Login</span>
            </button>

            <div className="text-center">
              <Link href="/" className="text-red-600 hover:underline text-sm font-semibold">
                Back to Home
              </Link>
            </div>
          </div>
        )}

        {verificationStatus === 'error' && (
          <div className="text-center">
            {/* Header */}
            <div className="text-center mb-4 sm:mb-6">
              <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-red-600 via-yellow-600 to-green-600 bg-clip-text text-transparent mb-2">
                Verification Failed
              </div>
            </div>

            {/* Error Icon */}
            <div className="mb-4 sm:mb-6">
              <div className="mx-auto flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-red-100">
                <svg className="h-7 w-7 sm:h-8 sm:w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
            </div>

            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
                Unable to Verify Email
              </h2>
              <div className="bg-red-50 bg-opacity-80 backdrop-blur-sm p-3 rounded-lg sm:rounded-xl border border-red-200 mb-3 sm:mb-4">
                <p className="text-red-800 text-xs sm:text-sm">
                  {errorMessage || 'The verification link is invalid or has expired.'}
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <button
                onClick={() => router.push('/login')}
                className="group relative w-full bg-gradient-to-r from-slate-600 to-gray-600 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl hover:from-slate-800 hover:to-gray-800 transition-all duration-3500 ease-smooth overflow-hidden text-sm sm:text-base min-h-[44px]"
              >
                {/* Go to Login Button Stars - Error */}
                <div className="fixed w-4 h-4 top-[10%] left-[15%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3000 ease-smooth pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-2 h-2 top-[35%] right-[20%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2600 ease-smooth pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-slate-200 drop-shadow-[0_0_8px_rgba(226,232,240,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-3 h-3 bottom-[25%] left-[65%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3400 ease-smooth pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-gray-300 drop-shadow-[0_0_10px_rgba(209,213,219,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-2 h-2 top-[60%] left-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2200 ease-smooth pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-slate-300 drop-shadow-[0_0_9px_rgba(203,213,225,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-3 h-3 bottom-[8%] right-[30%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2800 ease-smooth pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-gray-200 drop-shadow-[0_0_8px_rgba(229,231,235,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-2 h-2 top-[20%] right-[45%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3200 ease-smooth pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-slate-100 drop-shadow-[0_0_7px_rgba(241,245,249,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <span className="relative z-10">Go to Login</span>
              </button>
              <button
                onClick={() => router.push('/register')}
                className="group relative w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl hover:from-emerald-800 hover:to-teal-800 transition-all duration-3500 ease-smooth overflow-hidden text-sm sm:text-base min-h-[44px]"
              >
                {/* Register Again Button Stars */}
                <div className="fixed w-4 h-4 top-[12%] left-[18%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3200 ease-smooth pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-white drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-3 h-3 top-[28%] right-[12%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2800 ease-smooth pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-emerald-200 drop-shadow-[0_0_10px_rgba(167,243,208,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-2 h-2 bottom-[22%] left-[68%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2400 ease-smooth pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-teal-200 drop-shadow-[0_0_8px_rgba(153,246,228,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-3 h-3 top-[50%] left-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3000 ease-smooth pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-cyan-300 drop-shadow-[0_0_12px_rgba(165,243,252,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-2 h-2 bottom-[10%] right-[25%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2600 ease-smooth pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-green-300 drop-shadow-[0_0_9px_rgba(134,239,172,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <span className="relative z-10">Register Again</span>
              </button>
            </div>

            <div className="text-center">
              <Link href="/contact" className="text-red-600 hover:underline text-sm font-semibold">
                Contact Support
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmailVerification() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-red-800 via-purple-800 to-blue-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    }>
      <EmailVerificationContent />
    </Suspense>
  );
}
