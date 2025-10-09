import { Router } from 'express';
import {
  createQuiz,
  getCourseQuizzes,
  updateQuiz,
  submitQuizForApproval,
  resubmitQuiz,
  getQuizAttempts,
  gradeQuizAttempt,
  deleteQuiz,
  getQuizStatistics,
  approveQuiz,
  rejectQuiz,
  getPendingQuizzes,
  getRejectedQuizzes,
  getApprovedQuizzes,
  getQuizzesForAdminReview,
  getQuizById,
  submitQuizAttempt,
  getMyQuizAttempts,
  getAllQuizAttemptsForSupervisor,
  getAllQuizAttemptsForAdmin,
  getQuizzesPendingDeletion,
  approveDeletion,
  rejectDeletion
} from '../controllers/quiz.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Admin only routes for quiz approval (must come before /:quizId routes)
router.get('/admin-review', authorize('Admin'), getQuizzesForAdminReview);
router.get('/admin/all-attempts', authorize('Admin'), getAllQuizAttemptsForAdmin);
router.get('/pending', authorize('Admin'), getPendingQuizzes);
router.get('/rejected', authorize('Admin'), getRejectedQuizzes);
router.get('/approved', authorize('Admin'), getApprovedQuizzes);
router.get('/pending-deletion', authorize('Admin'), getQuizzesPendingDeletion);
router.get('/statistics', authorize('Supervisor', 'Admin'), getQuizStatistics);

// Supervisor routes
router.post('/', authorize('Supervisor', 'Admin'), createQuiz);
router.get('/course/:courseId', authorize('Supervisor', 'Admin', 'Student'), getCourseQuizzes);
router.get('/supervisor/all-attempts', authorize('Supervisor', 'Admin'), getAllQuizAttemptsForSupervisor);
router.get('/:quizId', authorize('Supervisor', 'Admin', 'Student'), getQuizById);
router.put('/:quizId', authorize('Supervisor', 'Admin'), updateQuiz);
router.patch('/:quizId/submit-approval', authorize('Supervisor', 'Admin'), submitQuizForApproval);
router.patch('/:quizId/resubmit', authorize('Supervisor', 'Admin'), resubmitQuiz);
router.delete('/:quizId', authorize('Supervisor', 'Admin'), deleteQuiz);

// Student quiz routes
router.post('/submit', authorize('Student', 'Supervisor', 'Admin'), submitQuizAttempt);
router.get('/my-attempts/:quizId', authorize('Student', 'Supervisor', 'Admin'), getMyQuizAttempts);

// Grading routes
router.get('/:quizId/attempts', authorize('Supervisor', 'Admin'), getQuizAttempts);
router.put('/attempts/:attemptId/grade', authorize('Supervisor', 'Admin'), gradeQuizAttempt);

// Admin approval actions
router.put('/:quizId/approve', authorize('Admin'), approveQuiz);
router.put('/:quizId/reject', authorize('Admin'), rejectQuiz);
router.put('/:quizId/approve-deletion', authorize('Admin'), approveDeletion);
router.put('/:quizId/reject-deletion', authorize('Admin'), rejectDeletion);

export default router;