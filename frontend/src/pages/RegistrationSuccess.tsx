import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const RegistrationSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    const registrationEmail = sessionStorage.getItem('registrationEmail');
    if (registrationEmail) {
      setEmail(registrationEmail);
    } else {
      // If no email found, redirect to register page
      navigate('/register');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 relative overflow-hidden px-4">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-white bg-opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white bg-opacity-10 rounded-full translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-white bg-opacity-5 rounded-full"></div>

      <div className="bg-white bg-opacity-60 backdrop-blur-md px-6 sm:px-8 md:px-10 py-6 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg border border-white border-opacity-50 relative z-10 text-center">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-red-600 via-yellow-600 to-green-600 bg-clip-text text-transparent mb-2">
            Registration Successful!
          </div>
        </div>

        {/* Success Icon */}
        <div className="mb-4 sm:mb-6">
          <div className="mx-auto flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
            Please Verify Your Email
          </h2>
          <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm">
            We've sent a verification email to:
          </p>
          <div className="bg-blue-50 bg-opacity-80 backdrop-blur-sm p-3 rounded-lg sm:rounded-xl border border-blue-200 mb-3 sm:mb-4">
            <p className="font-semibold text-blue-800 text-xs sm:text-sm break-all">
              {email}
            </p>
          </div>
          <div className="bg-yellow-50 bg-opacity-80 backdrop-blur-sm p-3 rounded-lg sm:rounded-xl border border-yellow-200 mb-3 sm:mb-4">
            <p className="text-yellow-800 text-xs">
              Note: Don't forget to check your spam folder if you don't see the email in your inbox.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mb-4 sm:mb-6">
          <button
            onClick={() => navigate('/login')}
            className="group relative w-full bg-gradient-to-r from-slate-800 to-gray-700 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl hover:from-slate-800 hover:to-gray-800 transition-all duration-[3500ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] overflow-hidden text-sm sm:text-base min-h-[44px]"
          >
            {/* Go to Login Button Stars */}
            <div className="fixed w-4 h-4 top-[10%] left-[15%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[3000ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-2 h-2 top-[35%] right-[20%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2600ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-slate-200 drop-shadow-[0_0_8px_rgba(226,232,240,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-3 h-3 bottom-[25%] left-[65%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[3400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-gray-300 drop-shadow-[0_0_10px_rgba(209,213,219,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-2 h-2 top-[60%] left-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-black drop-shadow-[0_0_9px_rgba(203,213,225,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-3 h-3 bottom-[8%] right-[30%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-black drop-shadow-[0_0_8px_rgba(229,231,235,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-2 h-2 top-[20%] right-[45%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[3200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-slate-100 drop-shadow-[0_0_7px_rgba(241,245,249,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <span className="relative z-10">Go to Login</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="group relative w-full bg-gradient-to-r from-emerald-800 to-teal-700 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl hover:from-emerald-800 hover:to-teal-800 transition-all duration-[3500ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] overflow-hidden text-sm sm:text-base min-h-[44px]"
          >
            {/* Back to Home Button Stars */}
            <div className="fixed w-4 h-4 top-[12%] left-[18%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[4000ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-white drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-3 h-3 top-[28%] right-[12%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-emerald-200 drop-shadow-[0_0_10px_rgba(167,243,208,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-2 h-2 bottom-[22%] left-[68%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-teal-200 drop-shadow-[0_0_8px_rgba(153,246,228,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-3 h-3 top-[50%] left-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[3000ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-cyan-300 drop-shadow-[0_0_12px_rgba(165,243,252,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-2 h-2 bottom-[10%] right-[25%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2600ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-green-300 drop-shadow-[0_0_9px_rgba(134,239,172,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-3 h-3 top-[15%] right-[40%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[3400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-emerald-100 drop-shadow-[0_0_8px_rgba(209,250,229,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-2 h-2 top-[42%] right-[70%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-teal-300 drop-shadow-[0_0_7px_rgba(94,234,212,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-3 h-3 bottom-[35%] left-[25%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[3600ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-green-200 drop-shadow-[0_0_10px_rgba(187,247,208,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <span className="relative z-10">Back to Home</span>
          </button>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-gray-600 text-sm">
            Need help?{' '}
            <Link to="/contact" className="text-red-600 hover:underline font-semibold">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSuccess;