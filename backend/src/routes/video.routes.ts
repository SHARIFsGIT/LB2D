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
  resubmitVideo,
  getAllVideos,
  videoUpload,
  getCourseVideoProgress,
  updateVideoProgress,
  getStudentProgressBySupervisor,
  getVideosPendingDeletion,
  approveDeletion,
  rejectDeletion
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
router.get('/course/:courseId/progress', getCourseVideoProgress); // Get video progress for a course
router.put('/:videoId/progress', updateVideoProgress); // Update video watch progress

// Admin/Supervisor routes
router.get('/my-videos', authorize('Admin', 'Supervisor'), getMyVideos); // Get videos uploaded by current user
router.post('/upload', authorize('Admin', 'Supervisor'), videoUpload.single('video'), handleMulterError, uploadVideo); // Upload new video (supports both file and URL)
router.put('/:videoId', authorize('Admin', 'Supervisor'), updateVideo); // Update video (only pending ones for Supervisor)
router.patch('/:videoId/resubmit', authorize('Admin', 'Supervisor'), resubmitVideo); // Resubmit rejected video for approval

// Admin-only routes
router.get('/all', adminOnly, getAllVideos); // Get all videos for management
router.get('/pending', adminOnly, getPendingVideos); // Get all pending videos
router.put('/:videoId/approve', adminOnly, approveVideo); // Approve video
router.put('/:videoId/reject', adminOnly, rejectVideo); // Reject video

// Deletion approval routes (Admin only)
router.get('/pending-deletion', adminOnly, getVideosPendingDeletion); // Get videos pending deletion approval
router.put('/:videoId/approve-deletion', adminOnly, approveDeletion); // Approve video deletion
router.put('/:videoId/reject-deletion', adminOnly, rejectDeletion); // Reject video deletion

// Admin can delete any video, Supervisor can delete own videos (may require approval)
router.delete('/:videoId', authorize('Admin', 'Supervisor'), deleteVideo);

// Supervisor routes for student progress
router.get('/student-progress', authorize('Supervisor', 'Admin'), getStudentProgressBySupervisor); // Get student progress for supervisor

export default router;