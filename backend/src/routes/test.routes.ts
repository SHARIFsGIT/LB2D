import { Router } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import {
    downloadCertificate,
    getTestResults,
    getTestHistory,
    getUserRankings,
    startTest,
    submitTest,
    getTestReports,
    getTestDetails
} from '../controllers/test.controller';
import { notifyUser } from '../services/websocket.service';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(protect);

router.post('/start', startTest);
router.post('/submit', submitTest);
router.get('/results', getTestResults);
router.get('/history', getTestHistory);
router.get('/rankings', getUserRankings);

// Test notification endpoint
router.post('/test-notification', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID not found'
      });
    }
    
    await notifyUser(userId, {
      type: 'general',
      title: 'Test Notification',
      message: 'This is a test notification to check if WebSocket is working properly.',
      urgent: false
    });
    
    res.status(200).json({
      success: true,
      message: 'Test notification sent successfully'
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
router.get('/certificate/:testId', downloadCertificate);

// Admin-only routes for analytics
router.get('/admin/reports', adminOnly, getTestReports);
router.get('/admin/details/:testId', adminOnly, getTestDetails);

export default router;