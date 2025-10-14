import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegisterMutation } from '../store/api/apiSlice';
import '../styles/AnimatedButton.css';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'Student'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const [register, { isLoading }] = useRegisterMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return;
    }

    if (formData.phone.length < 10) {
      setError('Phone number must be at least 10 digits');
      return;
    }

    try {
      const { confirmPassword, ...registerData } = formData;
      const result = await register(registerData).unwrap();
      if (result.success) {
        // Don't set credentials yet - wait for email verification
        // Store the email temporarily for the success page
        sessionStorage.setItem('registrationEmail', result.data.user.email);
        // Redirect to success page without setting auth credentials
        navigate('/registration-success');
      }
    } catch (err: any) {

      // Check for detailed validation errors
      if (err.data?.errors) {
        // Check if there's a password error to show requirements
        const hasPasswordError = err.data.errors.password;
        
        if (hasPasswordError) {
          setError('PASSWORD_REQUIREMENTS');
        } else {
          // Format other validation errors nicely
          const errorMessages = Object.entries(err.data.errors).map(([field, message]) => 
            `${field}: ${message}`
          ).join('\n');
          setError(errorMessages);
        }
      } else if (err.data?.message) {
        setError(err.data.message);
      } else {
        setError('Registration failed');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-white bg-opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white bg-opacity-10 rounded-full translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-white bg-opacity-5 rounded-full"></div>
      
      <div className="bg-white bg-opacity-60 backdrop-blur-md px-10 py-6 rounded-3xl shadow-2xl w-full max-w-xl border border-white border-opacity-50 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-3xl font-extrabold bg-gradient-to-r from-red-600 via-yellow-600 to-green-600 bg-clip-text text-transparent mb-2 whitespace-nowrap">
            Create your account
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl mb-6 backdrop-blur-sm">
            {error === 'PASSWORD_REQUIREMENTS' ? (
              <div className="px-4 py-3">
                <h3 className="text-sm font-semibold text-red-900 mb-2">Password Requirements Not Met</h3>
                <p className="text-xs text-red-800 mb-3">Your password must include all of the following:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center px-2 py-1.5 bg-red-100 rounded text-xs font-medium text-red-800">
                    At least 8 characters
                  </div>
                  <div className="flex items-center px-2 py-1.5 bg-red-100 rounded text-xs font-medium text-red-800">
                    One uppercase letter (A-Z)
                  </div>
                  <div className="flex items-center px-2 py-1.5 bg-red-100 rounded text-xs font-medium text-red-800">
                    One lowercase letter (a-z)
                  </div>
                  <div className="flex items-center px-2 py-1.5 bg-red-100 rounded text-xs font-medium text-red-800">
                    One number (0-9)
                  </div>
                  <div className="col-span-2 flex items-center justify-center px-2 py-1.5 bg-red-100 rounded text-xs font-medium text-red-800">
                    One special character (@$!%*?&)
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start px-5 py-4">
                <span className="mr-2 mt-1">⚠️</span>
                <div className="flex-1">
                  {error.split('\n').map((line, index) => (
                    <div key={index} className={index > 0 ? 'mt-2' : ''}>
                      <span className="text-red-800">{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-3">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-100 bg-opacity-80 backdrop-blur-sm"
                placeholder="Enter first name"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-3">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-100 bg-opacity-80 backdrop-blur-sm"
                placeholder="Enter last name"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-3">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-100 bg-opacity-80 backdrop-blur-sm"
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-3">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-100 bg-opacity-80 backdrop-blur-sm"
                  placeholder="Enter your password"
                  required
                  minLength={6}
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
            
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-3">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-100 bg-opacity-80 backdrop-blur-sm"
                  placeholder="Confirm your password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
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
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-3">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-100 bg-opacity-80 backdrop-blur-sm"
              placeholder="+1234567890"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-3">
              Role
            </label>
            <div className="relative">
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-100 bg-opacity-80 backdrop-blur-sm appearance-none cursor-pointer"
              >
                <option value="Student">Student</option>
                <option value="Supervisor">Supervisor</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              </div>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="animated-btn group relative w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:!bg-transparent disabled:opacity-50 disabled:cursor-not-allowed mt-12 overflow-hidden min-h-[3.5rem]"
          >
            {/* Stars across the entire viewport - only on hover, hide on click */}
            <div className="fixed w-5 h-5 top-[8%] left-[18%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-[3200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-white drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-3 h-3 top-[28%] right-[12%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-[2800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-emerald-200 drop-shadow-[0_0_10px_rgba(167,243,208,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-2 h-2 bottom-[25%] left-[65%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-[2400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-teal-200 drop-shadow-[0_0_8px_rgba(153,246,228,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-4 h-4 top-[50%] left-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-[3000ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-cyan-300 drop-shadow-[0_0_12px_rgba(165,243,252,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-2 h-2 bottom-[10%] right-[25%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-[2600ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-green-300 drop-shadow-[0_0_9px_rgba(134,239,172,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-3 h-3 top-[15%] right-[40%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-[3400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-emerald-100 drop-shadow-[0_0_8px_rgba(209,250,229,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-2 h-2 top-[42%] right-[70%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-[2200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-teal-300 drop-shadow-[0_0_7px_rgba(94,234,212,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-3 h-3 bottom-[35%] left-[25%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-[3600ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-green-200 drop-shadow-[0_0_10px_rgba(187,247,208,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-3.5 h-3.5 top-[70%] right-[35%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-[2700ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-emerald-300 drop-shadow-[0_0_11px_rgba(110,231,183,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-2.5 h-2.5 bottom-[45%] right-[15%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-[3100ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-teal-400 drop-shadow-[0_0_9px_rgba(45,212,191,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-2 h-2 top-[35%] left-[45%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-0 group-active:scale-50 z-50 transition-all duration-[2500ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            <div className="relative flex items-center justify-center z-10">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                  <span className="font-semibold text-lg">Creating account...</span>
                </>
              ) : (
                <span className="font-semibold text-lg">Create Account</span>
              )}
            </div>
          </button>
        </form>
        
        <div className="mt-6 pt-6 border-t border-gray-400 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-green-600 font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;