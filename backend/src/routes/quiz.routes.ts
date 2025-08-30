import { Router } from 'express';
import {
  createQuiz,
  getCourseQuizzes,
  updateQuiz,
  submitQuizForApproval,
  getQuizAttempts,
  gradeQuizAttempt,
  deleteQuiz,
  getQuizStatistics,
  approveQuiz,
  rejectQuiz,
  getPendingQuizzes
} from '../controllers/quiz.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Supervisor routes
router.post('/', authorize('Supervisor', 'Admin'), createQuiz);
router.get('/course/:courseId', authorize('Supervisor', 'Admin', 'Student'), getCourseQuizzes);
router.put('/:quizId', authorize('Supervisor', 'Admin'), updateQuiz);
router.patch('/:quizId/submit-approval', authorize('Supervisor', 'Admin'), submitQuizForApproval);
router.delete('/:quizId', authorize('Supervisor', 'Admin'), deleteQuiz);

// Grading routes
router.get('/:quizId/attempts', authorize('Supervisor', 'Admin'), getQuizAttempts);
router.put('/attempts/:attemptId/grade', authorize('Supervisor', 'Admin'), gradeQuizAttempt);

// Statistics
router.get('/statistics', authorize('Supervisor', 'Admin'), getQuizStatistics);

// Admin only routes for quiz approval
router.get('/pending', authorize('Admin'), getPendingQuizzes);
router.put('/:quizId/approve', authorize('Admin'), approveQuiz);
router.put('/:quizId/reject', authorize('Admin'), rejectQuiz);

export default router;