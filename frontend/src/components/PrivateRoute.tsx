import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthState } from '../store/slices/authSlice';
import { RootState } from '../store/store';

interface PrivateRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  supervisorOnly?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, adminOnly = false, supervisorOnly = false }) => {
  const location = useLocation();
  const authState = useSelector((state: RootState) => state.auth) as AuthState;
  const { isAuthenticated, user, isLoading } = authState;
  
  // Debug logging

  // Show loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to dashboard if not admin but admin access is required
  if (adminOnly && user?.role !== 'Admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect to dashboard if not supervisor but supervisor access is required
  if (supervisorOnly && user?.role !== 'Supervisor') {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Redirect admin users trying to access student-only routes to admin panel
  if (!adminOnly && !supervisorOnly && user?.role === 'Admin' && location.pathname === '/dashboard') {
    return <Navigate to="/admin" replace />;
  }

  // Redirect supervisor users trying to access student-only routes to supervisor dashboard
  if (!adminOnly && !supervisorOnly && user?.role === 'Supervisor' && location.pathname === '/dashboard') {
    return <Navigate to="/supervisor" replace />;
  }

  // Show different messages for rejected vs pending users
  if (user?.role === 'Pending') {
    // Check if user was rejected - show rejection screen with login page styling
    if (user.rejectionReason) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute top-0 left-0 w-72 h-72 bg-white bg-opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white bg-opacity-10 rounded-full translate-x-1/2 translate-y-1/2"></div>
          <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-white bg-opacity-5 rounded-full"></div>

          <div className="bg-white bg-opacity-60 backdrop-blur-md px-10 py-6 rounded-3xl shadow-2xl w-full max-w-lg border border-white border-opacity-50 relative z-10 text-center">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="text-3xl font-extrabold bg-gradient-to-r from-red-600 via-yellow-600 to-green-600 bg-clip-text text-transparent mb-2">
                  Request Update
                </div>
                <p className="text-gray-600">Your role request has been reviewed</p>
              </div>

              {/* Rejection Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.764 0L3.052 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  </svg>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-4 mb-6">
                <div className="bg-red-50/80 backdrop-blur-sm rounded-xl p-4 border border-red-200/60">
                  <p className="text-gray-700 text-sm mb-2">
                    Your request for <strong className="text-red-700">{user.requestedRole}</strong> privileges was not approved.
                  </p>
                  <div className="mt-3">
                    <p className="text-xs font-medium text-red-600 mb-1">Reason:</p>
                    <p className="text-sm text-red-700 bg-white/50 rounded-lg p-2">{user.rejectionReason}</p>
                  </div>
                  {user.rejectionDate && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">
                        Decision made on: {new Date(user.rejectionDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-gray-600 text-sm text-center">
                  You can continue using your account or contact support for assistance.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full bg-gradient-to-r from-slate-600 to-gray-700 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:from-slate-700 hover:to-gray-800 transition-all duration-300 backdrop-blur-sm"
                >
                  Return to Home
                </button>
                <button
                  onClick={() => window.location.href = '/contact'}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 backdrop-blur-sm"
                >
                  Contact Support
                </button>
              </div>
          </div>
        </div>
      );
    }
    
    // Show pending approval for users who are actually waiting for approval
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-white bg-opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white bg-opacity-10 rounded-full translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-white bg-opacity-5 rounded-full"></div>
        
        <div className="bg-white bg-opacity-60 backdrop-blur-md px-10 py-6 rounded-3xl shadow-2xl w-full max-w-lg border border-white border-opacity-50 relative z-10 text-center">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-3xl font-extrabold bg-gradient-to-r from-red-600 via-yellow-600 to-green-600 bg-clip-text text-transparent mb-2">
              Account Pending Approval
            </div>
          </div>

          {/* Pending Icon */}
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100">
              <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Review in Progress
            </h2>
            <div className="bg-yellow-50 bg-opacity-80 backdrop-blur-sm p-4 rounded-xl border border-yellow-200 mb-4">
              <p className="text-gray-600 text-sm mb-2">
                Your account is currently pending admin approval.
              </p>
              <p className="text-gray-600 text-sm">
                You requested <strong className="text-yellow-800">{user.requestedRole}</strong> privileges.
              </p>
            </div>
            <p className="text-gray-600 text-sm">
              Please wait for an administrator to review and approve your request. You will receive an email notification once your account is approved.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="group relative w-full bg-gradient-to-r from-slate-800 to-gray-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl hover:from-slate-800 hover:to-gray-800 transition-all duration-[3500ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] overflow-hidden"
            >
              {/* Refresh Status Button Stars */}
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
              <span className="relative z-10">Refresh Status</span>
            </button>
            <button
              onClick={() => window.location.href = '/contact'}
              className="group relative w-full bg-gradient-to-r from-emerald-800 to-teal-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl hover:from-emerald-800 hover:to-teal-800 transition-all duration-[3500ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] overflow-hidden"
            >
              {/* Contact Support Button Stars */}
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
              <span className="relative z-10">Contact Support</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PrivateRoute;