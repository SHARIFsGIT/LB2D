import { Router } from 'express';
import {
  getPaymentMethods,
  initializePayment,
  verifyPayment,
  completePayment,
  getPaymentStatus,
  cancelPayment,
  getPaymentHistory,
  getAllPayments,
  getPaymentStats,
  clearAllPayments
} from '../controllers/payment.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/methods', getPaymentMethods);

// Protected routes (require authentication)
router.use(protect);

// Student routes
router.post('/initialize', initializePayment);
router.post('/verify', verifyPayment);
router.post('/complete', completePayment);
router.get('/status/:transactionId', getPaymentStatus);
router.post('/cancel/:transactionId', cancelPayment);
router.get('/history', getPaymentHistory);

// Admin routes
router.get('/admin/all', adminOnly, getAllPayments);
router.get('/admin/stats', adminOnly, getPaymentStats);
router.delete('/admin/clear', adminOnly, clearAllPayments);

export default router;