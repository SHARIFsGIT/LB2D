import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  const [phoneDigits, setPhoneDigits] = useState(['', '', '', '', '', '']);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: 'Weak',
    color: 'red'
  });

  // Validate token and fetch masked phone on mount
  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    } else {
      // Fetch masked phone number for display
      fetchMaskedPhone();
    }
  }, [token]);

  // Auto-verify phone digits when all 6 digits are entered
  useEffect(() => {
    const digits = phoneDigits.join('');
    if (digits.length === 6) {
      // Auto-verify phone digits
      verifyPhoneDigits(digits);
    }
  }, [phoneDigits]);

  const verifyPhoneDigits = async (digits: string) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/verify-phone-digits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          phoneDigits: digits
        })
      });

      const data = await response.json();

      if (data.success) {
        setPhoneVerified(true);
        setError('');
      } else {
        setError(data.message || 'Invalid phone digits. Please try again.');
        setPhoneVerified(false);
      }
    } catch (err) {
      setError('Failed to verify phone digits. Please try again.');
      setPhoneVerified(false);
    }
  };

  const fetchMaskedPhone = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/get-masked-phone?token=${token}`);
      const data = await response.json();
      if (data.success && data.maskedPhone) {
        setMaskedPhone(data.maskedPhone);
      }
    } catch (err) {
      // Silent fail - phone display is not critical
    }
  };

  // Calculate password strength
  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    
    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Character variety checks
    if (/[a-z]/.test(password)) score++; // lowercase
    if (/[A-Z]/.test(password)) score++; // uppercase
    if (/[0-9]/.test(password)) score++; // numbers
    if (/[^A-Za-z0-9]/.test(password)) score++; // special characters
    
    // Pattern checks
    if (!/(.)\1{2,}/.test(password)) score++; // no repeated characters
    if (!/^[0-9]+$/.test(password) && !/^[a-zA-Z]+$/.test(password)) score++; // not all letters or numbers
    
    const strengthLevels = [
      { min: 0, label: 'Very Weak', color: 'red' },
      { min: 3, label: 'Weak', color: 'orange' },
      { min: 5, label: 'Fair', color: 'yellow' },
      { min: 7, label: 'Strong', color: 'lightgreen' },
      { min: 8, label: 'Very Strong', color: 'green' }
    ];
    
    const strength = strengthLevels.reverse().find(level => score >= level.min) || strengthLevels[0];
    
    return {
      score: Math.min(score / 8, 1), // normalize to 0-1
      label: strength.label,
      color: strength.color
    };
  };

  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, password });
    setPasswordStrength(calculatePasswordStrength(password));
  };

  const handleDigitChange = (index: number, value: string) => {
    // Only allow single digits
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...phoneDigits];
    newDigits[index] = value;
    setPhoneDigits(newDigits);

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`phone-digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace to move to previous input
    if (e.key === 'Backspace' && !phoneDigits[index] && index > 0) {
      const prevInput = document.getElementById(`phone-digit-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();

    // Only accept 6-digit numbers
    if (/^\d{6}$/.test(pastedData)) {
      const newDigits = pastedData.split('');
      setPhoneDigits(newDigits);
      // Focus last input
      const lastInput = document.getElementById(`phone-digit-5`);
      lastInput?.focus();
    }
  };

  const validateForm = (): boolean => {
    if (!token) {
      setError('Invalid reset token');
      return false;
    }

    if (!phoneVerified) {
      setError('Please verify your phone number by entering the 6 hidden digits');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    // Check for common weak passwords
    const weakPasswords = ['password', '123456', 'password123', 'admin', 'qwerty'];
    if (weakPasswords.includes(formData.password.toLowerCase())) {
      setError('This password is too common. Please choose a stronger password.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/reset-password?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: formData.password,
          phoneDigits: phoneDigits.join('')
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-white bg-opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white bg-opacity-10 rounded-full translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-white bg-opacity-5 rounded-full"></div>
        
        <div className="bg-white bg-opacity-60 backdrop-blur-md px-10 py-6 rounded-3xl shadow-2xl w-full max-w-lg border border-white border-opacity-50 relative z-10 text-center">
          <div className="mb-4">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Password Reset Successful!</h2>
          <p className="text-gray-600 mb-4">
            Your password has been reset successfully. You will be redirected to the login page in a few seconds.
          </p>
          <Link to="/login" className="text-red-600 hover:underline font-semibold">
            Go to Login Now
          </Link>
        </div>
      </div>
    );
  }

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
            Reset Your Password
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
        
        {!token ? (
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Invalid or expired reset link. Please request a new password reset.
            </p>
            <Link to="/forgot-password" className="text-purple-500 hover:underline font-semibold">
              Request New Reset Link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Show masked phone number */}
            {maskedPhone && (
              <div className="text-center mb-4 p-4 bg-blue-50 bg-opacity-80 backdrop-blur-sm rounded-xl border border-blue-200">
                <p className="text-sm text-gray-700 mb-1">Your Phone Number:</p>
                <p className="text-xl font-bold text-gray-900 tracking-wider">{maskedPhone}</p>
              </div>
            )}

            <div className="text-center">
              <label className="block text-gray-700 text-sm font-semibold mb-2">
                Enter the 6 Hidden Digits
              </label>
              <div className="flex gap-2 justify-center items-center mb-3">
                {phoneDigits.map((digit, index) => (
                  <div key={index} className="relative">
                    <input
                      id={`phone-digit-${index}`}
                      type="text"
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(index, e)}
                      onPaste={handleDigitPaste}
                      disabled={phoneVerified}
                      className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl focus:outline-none focus:ring-2 bg-white bg-opacity-90 backdrop-blur-sm shadow-md transition-all duration-200 ${
                        phoneVerified
                          ? 'border-green-400 bg-green-50 text-green-700'
                          : 'border-gray-300 focus:ring-blue-400 focus:border-blue-500 hover:border-gray-400'
                      }`}
                      maxLength={1}
                      pattern="\d"
                      required
                    />
                  </div>
                ))}
              </div>

              {/* Verification Status Messages with Smooth Transition */}
              <div className="relative h-8 overflow-hidden">
                {phoneVerified && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 text-green-600 text-sm font-semibold animate-fadeIn">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Phone Verified Successfully!
                  </div>
                )}
              </div>
            </div>

            {phoneVerified && (
              <div className="space-y-4 mt-6 animate-slideDown"
>

            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-3">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-0 focus:ring-gray-200 focus:border-transparent bg-gray-100 bg-opacity-80 backdrop-blur-sm"
                  placeholder="Enter your new password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600">Password Strength:</span>
                    <span className="text-xs font-semibold" style={{ color: passwordStrength.color }}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${passwordStrength.score * 100}%`,
                        backgroundColor: passwordStrength.color 
                      }}
                    />
                  </div>
                  
                  {/* Enhanced Password Requirements */}
                  <div className="mt-3 p-3 bg-gray-50 bg-opacity-80 backdrop-blur-sm rounded-lg border border-gray-200">
                    <p className="font-semibold mb-2 text-xs text-gray-700">Password Requirements:</p>
                    <div className="grid grid-cols-1 gap-1">
                      <div className={`flex items-center text-xs transition-colors duration-200 ${
                        formData.password.length >= 8 ? 'text-green-800' : 'text-gray-500'
                      }`}>
                        <span className="mr-2">•</span>
                        At least 8 characters
                      </div>
                      <div className={`flex items-center text-xs transition-colors duration-200 ${
                        /[A-Z]/.test(formData.password) ? 'text-green-800' : 'text-gray-500'
                      }`}>
                        <span className="mr-2">•</span>
                        One uppercase letter (A-Z)
                      </div>
                      <div className={`flex items-center text-xs transition-colors duration-200 ${
                        /[a-z]/.test(formData.password) ? 'text-green-800' : 'text-gray-500'
                      }`}>
                        <span className="mr-2">•</span>
                        One lowercase letter (a-z)
                      </div>
                      <div className={`flex items-center text-xs transition-colors duration-200 ${
                        /[0-9]/.test(formData.password) ? 'text-green-800' : 'text-gray-500'
                      }`}>
                        <span className="mr-2">•</span>
                        One number (0-9)
                      </div>
                      <div className={`flex items-center text-xs transition-colors duration-200 ${
                        /[^A-Za-z0-9]/.test(formData.password) ? 'text-green-800' : 'text-gray-500'
                      }`}>
                        <span className="mr-2">•</span>
                        One special character (@, #, $, !, etc.)
                      </div>
                      <div className={`flex items-center text-xs transition-colors duration-200 ${
                        !/(.)\1{2,}/.test(formData.password) && formData.password.length > 0 ? 'text-green-800' : 'text-gray-500'
                      }`}>
                        <span className="mr-2">•</span>
                        No repeated characters (aaa, 111)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-3">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-0 focus:ring-gray-200 focus:border-transparent bg-gray-100 bg-opacity-80 backdrop-blur-sm"
                  placeholder="Confirm your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <p className="text-green-500 text-xs mt-1">Passwords match ✓</p>
              )}
            </div>
            </div>
            )}

            <button
              type="submit"
              disabled={loading || !formData.password || !formData.confirmPassword}
              className="group relative w-full py-3 px-6 bg-gradient-to-r from-gray-600 to-green-600 font-semibold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed mt-12"
            >
              {/* Star 1 - Black */}
              <div className="fixed w-5 h-5 top-[10%] left-[5%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 784.11 815.53"
                  className="w-full h-full fill-black drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]"
                >
                  <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                </svg>
              </div>

              {/* Star 2 - Blue */}
              <div className="fixed w-3 h-3 top-[25%] left-[80%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[900ms] ease-[cubic-bezier(0.23,1,0.32,1)] pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 784.11 815.53"
                  className="w-full h-full fill-blue-800 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                >
                  <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                </svg>
              </div>

              {/* Star 3 - White */}
              <div className="fixed w-4 h-4 top-[5%] left-[50%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[1400ms] ease-[cubic-bezier(0.23,1,0.32,1)] pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 784.11 815.53"
                  className="w-full h-full fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                >
                  <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                </svg>
              </div>

              {/* Star 4 - Orange */}
              <div className="fixed w-2 h-2 top-[40%] right-[10%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[1000ms] ease-[cubic-bezier(0.23,1,0.32,1)] pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 784.11 815.53"
                  className="w-full h-full fill-orange-500 drop-shadow-[0_0_7px_rgba(251,146,60,0.8)]"
                >
                  <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                </svg>
              </div>

              {/* Star 5 - Cyan */}
              <div className="fixed w-3 h-3 top-[70%] left-[15%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[1600ms] ease-[cubic-bezier(0.23,1,0.32,1)] pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 784.11 815.53"
                  className="w-full h-full fill-cyan-600 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                >
                  <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06-407.78z" />
                </svg>
              </div>

              <div className="relative flex items-center justify-center">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                    <span className="font-medium">Resetting Password...</span>
                  </>
                ) : (
                  <span className="font-semibold text-lg">Reset Password</span>
                )}
              </div>
            </button>
          </form>
        )}
        
        <div className="mt-6 text-center">
          <Link to="/login" className="text-red-600 hover:underline text-sm font-semibold">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;