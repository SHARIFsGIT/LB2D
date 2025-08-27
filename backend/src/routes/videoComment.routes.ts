import { Router } from 'express';
import {
  getVideoComments,
  addVideoComment,
  updateVideoComment,
  deleteVideoComment,
  markCommentResolved,
  getUserComments
} from '../controllers/videoComment.controller';
import { protect, authorize, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Public routes (students, supervisors, admins)
router.get('/video/:videoId', getVideoComments); // Get all comments for a video
router.post('/video/:videoId', addVideoComment); // Add comment to video

// User-specific routes
router.put('/:commentId', updateVideoComment); // Update own comment
router.delete('/:commentId', deleteVideoComment); // Delete comment (author, supervisor, admin)

// Supervisor/Admin routes
router.put('/:commentId/resolve', authorize('Admin', 'Supervisor'), markCommentResolved); // Mark as resolved
router.get('/user/:userId', authorize('Admin', 'Supervisor'), getUserComments); // Get user's comments

export default router;