import { Router } from 'express';
import {
  upload,
  uploadResource,
  submitResourceForApproval,
  getCourseResources,
  updateResource,
  deleteResource,
  viewResource,
  downloadResource,
  markResourceCompleted,
  getResourceProgress,
  getSupervisorResources,
  getResourceStatistics,
  approveResource,
  rejectResource,
  getPendingResources,
  getResourcesPendingDeletion,
  approveDeletion,
  rejectDeletion
} from '../controllers/resource.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Admin only routes (must come before /:resourceId routes)
router.get('/pending', authorize('Admin'), getPendingResources);
router.get('/pending-deletion', authorize('Admin'), getResourcesPendingDeletion);
router.get('/supervisor', authorize('Supervisor', 'Admin'), getSupervisorResources);
router.get('/statistics', authorize('Supervisor', 'Admin'), getResourceStatistics);

// Get course resources
router.get('/course/:courseId', getCourseResources);

// Upload resource
router.post('/upload', authorize('Supervisor', 'Admin'), upload.single('file'), uploadResource);

// Submit resource for approval
router.patch('/:resourceId/submit-approval', authorize('Supervisor', 'Admin'), submitResourceForApproval);

// Update resource
router.put('/:resourceId', authorize('Supervisor', 'Admin'), updateResource);

// Delete resource
router.delete('/:resourceId', authorize('Supervisor', 'Admin'), deleteResource);

// View resource inline
router.get('/:resourceId/view', viewResource);

// Download resource
router.get('/:resourceId/download', downloadResource);

// Mark resource as completed (students only)
router.post('/:resourceId/complete', authorize('Student'), markResourceCompleted);

// Get resource progress
router.get('/:resourceId/progress', getResourceProgress);

// Admin approval actions
router.put('/:resourceId/approve', authorize('Admin'), approveResource);
router.put('/:resourceId/reject', authorize('Admin'), rejectResource);
router.put('/:resourceId/approve-deletion', authorize('Admin'), approveDeletion);
router.put('/:resourceId/reject-deletion', authorize('Admin'), rejectDeletion);

export default router;