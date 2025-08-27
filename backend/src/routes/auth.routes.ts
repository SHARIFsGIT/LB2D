import { Router } from 'express';
import {
    forgotPassword,
    login,
    logout,
    refreshToken,
    register,
    requestOTP,
    resendOTP,
    resetPassword,
    validateToken,
    verifyEmail,
    verifyOTP
} from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/request-otp', requestOTP);
router.post('/verify-otp', verifyOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);
router.post('/resend-otp', resendOTP);


// Protected routes
router.post('/logout', protect, logout);
router.get('/validate', protect, validateToken);

export default router;