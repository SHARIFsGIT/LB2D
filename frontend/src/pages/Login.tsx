import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { useNotification } from '../hooks/useNotification';
import { useLoginMutation } from '../store/api/apiSlice';
import { setCredentials } from '../store/slices/authSlice';
import { getDeviceFingerprint } from '../utils/deviceFingerprint';

const Login: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const dispatch = useDispatch();
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
        deviceFingerprint: deviceInfo.fingerprint,
        deviceName: deviceInfo.deviceName
      }).unwrap();

      if (result.success) {

        dispatch(setCredentials({
          user: result.data.user,
          token: result.data.accessToken,
          refreshToken: result.data.refreshToken
        }));

        showSuccess(
          `Welcome back, ${result.data.user.firstName}!`,
          'Login Successful',
          { duration: 3000 }
        );
        
        // Role-based navigation
        if (result.data.user.role === 'Admin') {

          navigate('/admin');
        } else if (result.data.user.role === 'Supervisor') {

          navigate('/supervisor');
        } else {

          navigate('/dashboard');
        }
        
        // Double check navigation after a delay
        setTimeout(() => {

        }, 1000);
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || 'Login failed';
      setError(errorMessage);
      showError(
        errorMessage,
        'Login Failed',
        {
          duration: 6000,
          actions: [
            {
              label: 'Try Again',
              onClick: () => setError('')
            },
            {
              label: 'Reset Password',
              onClick: () => navigate('/forgot-password'),
              variant: 'secondary'
            }
          ]
        }
      );
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
              <span className="mr-2">⚠️</span>
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
            className="group relative w-full py-3 px-6 bg-gradient-to-r from-gray-600 to-green-600 font-semibold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed mt-12"
          >
            {/* Star 1 - Black */}
            <div className="fixed w-5 h-5 top-[10%] left-[5%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 784.11 815.53"
                className="w-full h-full fill-black drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]"
              >
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 2 - Blue */}
            <div className="fixed w-3 h-3 top-[25%] left-[80%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[1800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 784.11 815.53"
                className="w-full h-full fill-blue-800 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]"
              >
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 3 - White */}
            <div className="fixed w-4 h-4 top-[5%] left-[50%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 784.11 815.53"
                className="w-full h-full fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
              >
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 4 - Orange */}
            <div className="fixed w-2 h-2 top-[40%] right-[10%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 784.11 815.53"
                className="w-full h-full fill-orange-500 drop-shadow-[0_0_7px_rgba(251,146,60,0.8)]"
              >
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 5 - Cyan */}
            <div className="fixed w-3 h-3 top-[70%] left-[15%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[3200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 784.11 815.53"
                className="w-full h-full fill-cyan-600 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
              >
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 6 - White */}
            <div className="fixed w-4 h-4 bottom-[10%] right-[20%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2600ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 784.11 815.53"
                className="w-full h-full fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
              >
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 7 - Red */}
            <div className="fixed w-2 h-2 bottom-[20%] left-[25%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 784.11 815.53"
                className="w-full h-full fill-red-800 drop-shadow-[0_0_7px_rgba(248,113,113,0.8)]"
              >
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 8 - Indigo */}
            <div className="fixed w-3 h-3 top-[60%] left-[70%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 784.11 815.53"
                className="w-full h-full fill-indigo-100 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]"
              >
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 10 - Rose */}
            <div className="fixed w-2 h-2 top-[35%] left-[30%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 784.11 815.53"
                className="w-full h-full fill-rose-500 drop-shadow-[0_0_7px_rgba(251,113,133,0.8)]"
              >
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 11 - Black */}
            <div className="fixed w-3 h-3 top-[80%] right-[5%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 784.11 815.53"
                className="w-full h-full fill-black drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]"
              >
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 12 - Lime */}
            <div className="fixed w-2 h-2 top-[15%] left-[90%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 784.11 815.53"
                className="w-full h-full fill-lime-600 drop-shadow-[0_0_7px_rgba(163,230,53,0.8)]"
              >
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            <div className="relative flex items-center justify-center">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                  <span className="font-medium">Signing you in...</span>
                </>
              ) : (
                <span className="font-semibold text-lg">Sign In</span>
              )}
            </div>
          </button>

        </form>
        
        <div className="mt-6 text-center">
          <Link to="/forgot-password" className="text-red-600 text-sm font-medium">
            Forgot your password?
          </Link>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-400 text-center">
          <p className="text-gray-600">
            New to Learn Bangla to Deutsch?{' '}
            <Link to="/register" className="text-green-600 font-semibold">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;