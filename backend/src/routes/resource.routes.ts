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
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Upload resource
router.post('/upload', authorize('Supervisor', 'Admin'), upload.single('file'), uploadResource);

// Submit resource for approval
router.patch('/:resourceId/submit-approval', authorize('Supervisor', 'Admin'), submitResourceForApproval);

// Get course resources
router.get('/course/:courseId', getCourseResources);

// Update resource
router.put('/:resourceId', authorize('Supervisor', 'Admin'), updateResource);

// Delete resource
router.delete('/:resourceId', authorize('Supervisor', 'Admin'), deleteResource);

// Download resource
router.get('/:resourceId/download', downloadResource);

// Statistics
router.get('/statistics', authorize('Supervisor', 'Admin'), getResourceStatistics);

// Admin only routes for resource approval
router.get('/pending', authorize('Admin'), getPendingResources);
router.put('/:resourceId/approve', authorize('Admin'), approveResource);
router.put('/:resourceId/reject', authorize('Admin'), rejectResource);

export default router;