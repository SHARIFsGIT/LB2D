import { Router } from 'express';
import {
  register,
  login,
  logout,
  verifyEmail,
  requestOTP,
  verifyOTP,
  forgotPassword,
  resetPassword,
  refreshToken,
  validateToken,
  resendOTP,
  getMaskedPhone,
  verifyPhoneDigits,
  getDeviceSessions,
  logoutFromDevice
} from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  authRateLimit,
  strictRateLimit,
  bruteForceProtection,
  registerRateLimit,
  clearAllRateLimits,
  clearRateLimitForIP
} from '../middleware/security.middleware';
import {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  otpValidator,
  refreshTokenValidator
} from '../validators/auth.validator';

const router = Router();

// Public routes with rate limiting
router.post('/register', registerRateLimit, registerValidator, register);
router.post('/login', authRateLimit, bruteForceProtection({
  maxAttempts: 10000,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 10 * 1000 // 10 seconds (very short for development)
}), loginValidator, login);

// Email verification
router.get('/verify-email', verifyEmail);

// Password reset flow
router.post('/forgot-password', strictRateLimit, forgotPasswordValidator, forgotPassword);
router.get('/get-masked-phone', getMaskedPhone);
router.post('/verify-phone-digits', authRateLimit, verifyPhoneDigits);
router.post('/reset-password', strictRateLimit, resetPasswordValidator, resetPassword);

// OTP flow
router.post('/request-otp', authRateLimit, forgotPasswordValidator, requestOTP);
router.post('/verify-otp', authRateLimit, otpValidator, verifyOTP);
router.post('/resend-otp', strictRateLimit, forgotPasswordValidator, resendOTP);

// Token management
router.post('/refresh-token', authRateLimit, refreshTokenValidator, refreshToken);
router.get('/validate-token', authMiddleware, validateToken);

// Protected routes
router.post('/logout', authMiddleware, logout);
router.get('/sessions', authMiddleware, getDeviceSessions);
router.delete('/sessions/:deviceId', authMiddleware, logoutFromDevice);

// Development only - Clear rate limits
if (process.env.NODE_ENV === 'development') {
  router.post('/dev/clear-rate-limits', (req, res) => {
    const { ip } = req.body;
    
    if (ip) {
      clearRateLimitForIP(ip);
      res.json({ success: true, message: `Rate limits cleared for IP: ${ip}` });
    } else {
      clearAllRateLimits();
      res.json({ success: true, message: 'All rate limits cleared' });
    }
  });
}

export default router;