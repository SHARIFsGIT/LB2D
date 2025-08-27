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
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Supervisor routes
router.post('/', restrictTo('Supervisor', 'Admin'), createQuiz);
router.get('/course/:courseId', restrictTo('Supervisor', 'Admin', 'Student'), getCourseQuizzes);
router.put('/:quizId', restrictTo('Supervisor', 'Admin'), updateQuiz);
router.patch('/:quizId/submit-approval', restrictTo('Supervisor', 'Admin'), submitQuizForApproval);
router.delete('/:quizId', restrictTo('Supervisor', 'Admin'), deleteQuiz);

// Grading routes
router.get('/:quizId/attempts', restrictTo('Supervisor', 'Admin'), getQuizAttempts);
router.put('/attempts/:attemptId/grade', restrictTo('Supervisor', 'Admin'), gradeQuizAttempt);

// Statistics
router.get('/statistics', restrictTo('Supervisor', 'Admin'), getQuizStatistics);

// Admin only routes for quiz approval
router.get('/pending', restrictTo('Admin'), getPendingQuizzes);
router.put('/:quizId/approve', restrictTo('Admin'), approveQuiz);
router.put('/:quizId/reject', restrictTo('Admin'), rejectQuiz);

export default router;