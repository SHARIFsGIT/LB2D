import { Router } from 'express';
import {
  deleteUser,
  getAllUsers,
  getUser,
  getUserStats,
  updateUser,
  getPendingVideos,
  approveVideo,
  rejectVideo,
  getPendingResources,
  approveResource,
  rejectResource
} from '../controllers/admin.controller';
import { authMiddleware, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);
router.use(authorize('Admin'));

// User management routes
router.get('/users', getAllUsers);
router.get('/users/stats', getUserStats);
router.get('/users/:userId', getUser);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);

// Content approval routes
router.get('/videos/pending', getPendingVideos);
router.post('/videos/:videoId/approve', approveVideo);
router.post('/videos/:videoId/reject', rejectVideo);

router.get('/resources/pending', getPendingResources);
router.post('/resources/:resourceId/approve', approveResource);
router.post('/resources/:resourceId/reject', rejectResource);

export default router;