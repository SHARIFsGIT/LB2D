import { Router } from 'express';
import {
  getCompetencyAnalytics,
  getTestAnalytics,
  getUserProgressAnalytics,
  getStudentPaymentAnalytics,
  getStudentResultsAnalytics,
  getStudentCertificatesAnalytics,
  getStudentProgressAnalytics,
  getIndividualStudentAnalytics,
  getRecentStudentsAnalytics,
  getSupervisorSalaryAnalytics,
  getSupervisorStudentAnalytics,
  getSupervisorVideoAnalytics,
  clearPaymentAnalyticsData,
  clearTestAnalyticsData,
  clearSupervisorSalaryData,
  clearVideoAnalyticsData,
  clearUserManagementData,
  clearVideoManagementData,
  clearQuizManagementData,
  clearResourceManagementData,
  updateSupervisorSalary,
  markSupervisorPayment,
  toggleSupervisorSalaryPayment,
  initializeSupervisorSalaries,
  getMySalaryData
} from '../controllers/analytics.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

// Authentication to all routes
router.use(protect);

// Admin only routes
router.get('/tests', authorize('Admin'), getTestAnalytics);
router.get('/users/:userId', authorize('Admin'), getUserProgressAnalytics);
router.get('/competencies', authorize('Admin'), getCompetencyAnalytics);
router.get('/student-payments', authorize('Admin'), getStudentPaymentAnalytics);
router.get('/student-results', authorize('Admin'), getStudentResultsAnalytics);
router.get('/student-certificates', authorize('Admin'), getStudentCertificatesAnalytics);
router.get('/student-progress', authorize('Admin'), getStudentProgressAnalytics);
router.get('/recent-students', authorize('Admin'), getRecentStudentsAnalytics);
router.get('/student/:studentId', authorize('Admin'), getIndividualStudentAnalytics);
router.get('/supervisor-salary', authorize('Admin'), getSupervisorSalaryAnalytics);
router.get('/supervisor-videos', authorize('Admin'), getSupervisorVideoAnalytics);

// Supervisor accessible routes
router.get('/supervisor-students/:supervisorId', authorize('Admin', 'Supervisor'), getSupervisorStudentAnalytics);
router.get('/my-salary', authorize('Supervisor'), getMySalaryData);

// Supervisor salary management routes (Admin only)
router.put('/supervisor-salary', authorize('Admin'), updateSupervisorSalary);
router.post('/supervisor-payment', authorize('Admin'), markSupervisorPayment);
router.patch('/supervisor-salary-payment', authorize('Admin'), toggleSupervisorSalaryPayment);
router.post('/initialize-supervisor-salaries', authorize('Admin'), initializeSupervisorSalaries);

// Data clearing routes (Admin only)
router.delete('/clear-payment-data', authorize('Admin'), clearPaymentAnalyticsData);
router.delete('/clear-test-data', authorize('Admin'), clearTestAnalyticsData);
router.delete('/clear-supervisor-salary', authorize('Admin'), clearSupervisorSalaryData);
router.delete('/clear-video-analytics', authorize('Admin'), clearVideoAnalyticsData);
router.delete('/clear-user-management', authorize('Admin'), clearUserManagementData);
router.delete('/clear-video-management', authorize('Admin'), clearVideoManagementData);
router.delete('/clear-quiz-management', authorize('Admin'), clearQuizManagementData);
router.delete('/clear-resource-management', authorize('Admin'), clearResourceManagementData);

export default router;