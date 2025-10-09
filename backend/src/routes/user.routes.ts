import express from 'express';
import { updateProfile, getProfile, clearRejectionNotification } from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

// Get user profile (requires authentication)
router.get('/profile', protect, getProfile);

// Update user profile (requires authentication)
router.put('/profile', protect, updateProfile);

// Clear rejection notification (requires authentication)
router.delete('/rejection-notification', protect, clearRejectionNotification);

export default router;