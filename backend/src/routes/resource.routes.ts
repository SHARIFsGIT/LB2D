import { Router } from 'express';
import {
  upload,
  uploadResource,
  submitResourceForApproval,
  getCourseResources,
  updateResource,
  deleteResource,
  downloadResource,
  getResourceStatistics,
  approveResource,
  rejectResource,
  getPendingResources
} from '../controllers/resource.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Upload resource
router.post('/upload', restrictTo('Supervisor', 'Admin'), upload.single('file'), uploadResource);

// Submit resource for approval
router.patch('/:resourceId/submit-approval', restrictTo('Supervisor', 'Admin'), submitResourceForApproval);

// Get course resources
router.get('/course/:courseId', getCourseResources);

// Update resource
router.put('/:resourceId', restrictTo('Supervisor', 'Admin'), updateResource);

// Delete resource
router.delete('/:resourceId', restrictTo('Supervisor', 'Admin'), deleteResource);

// Download resource
router.get('/:resourceId/download', downloadResource);

// Statistics
router.get('/statistics', restrictTo('Supervisor', 'Admin'), getResourceStatistics);

// Admin only routes for resource approval
router.get('/pending', restrictTo('Admin'), getPendingResources);
router.put('/:resourceId/approve', restrictTo('Admin'), approveResource);
router.put('/:resourceId/reject', restrictTo('Admin'), rejectResource);

export default router;