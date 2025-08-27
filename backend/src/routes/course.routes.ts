import { Router } from 'express';
import {
  getAllCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  permanentDeleteCourse,
  restoreCourse,
  getUserEnrollments,
  checkEnrollment,
  getCourseStats,
  getSupervisorCourses
} from '../controllers/course.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/', getAllCourses);
router.get('/:id', getCourse); // Public access to individual courses

// Admin routes that need specific paths (before protect middleware to avoid conflicts)
router.get('/admin/stats', protect, adminOnly, getCourseStats);
router.patch('/:id/restore', protect, adminOnly, restoreCourse);
router.delete('/:id/permanent', protect, adminOnly, permanentDeleteCourse);

// Protected routes (require authentication)
router.use(protect);

// Student routes
router.get('/user/enrollments', getUserEnrollments);
router.get('/user/check-enrollment/:courseId', checkEnrollment);

// Supervisor routes
router.get('/supervisor/assigned', getSupervisorCourses);

// Admin routes
router.post('/', adminOnly, createCourse);
router.put('/:id', adminOnly, updateCourse);
router.delete('/:id', adminOnly, deleteCourse);

export default router;