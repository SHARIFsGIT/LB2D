import { Router } from 'express';
import {
  getCourseVideos,
  uploadVideo,
  approveVideo,
  rejectVideo,
  deleteVideo,
  getPendingVideos,
  getMyVideos,
  updateVideo,
  getAllVideos,
  videoUpload
} from '../controllers/video.controller';
import { protect, adminOnly, authorize } from '../middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';

// Middleware to handle multer errors
const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 500MB.'
      });
    }
    if (err.message && err.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only video files are allowed.'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error'
    });
  }
  return next();
};

const router = Router();

// All routes require authentication
router.use(protect);

// Student routes
router.get('/course/:courseId', getCourseVideos); // Get approved videos for a course

// Admin/Supervisor routes
router.get('/my-videos', authorize('Admin', 'Supervisor'), getMyVideos); // Get videos uploaded by current user
router.post('/upload', authorize('Admin', 'Supervisor'), videoUpload.single('video'), handleMulterError, uploadVideo); // Upload new video (supports both file and URL)
router.put('/:videoId', authorize('Admin', 'Supervisor'), updateVideo); // Update video (only pending ones for Supervisor)

// Admin-only routes
router.get('/all', adminOnly, getAllVideos); // Get all videos for management
router.get('/pending', adminOnly, getPendingVideos); // Get all pending videos
router.put('/:videoId/approve', adminOnly, approveVideo); // Approve video
router.put('/:videoId/reject', adminOnly, rejectVideo); // Reject video

// Admin can delete any video, Supervisor can delete own rejected videos
router.delete('/:videoId', authorize('Admin', 'Supervisor'), deleteVideo);

export default router;