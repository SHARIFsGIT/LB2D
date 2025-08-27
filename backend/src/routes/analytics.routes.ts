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
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

// Authentication to all routes
router.use(protect);

// Admin only routes
router.get('/tests', restrictTo('Admin'), getTestAnalytics);
router.get('/users/:userId', restrictTo('Admin'), getUserProgressAnalytics);
router.get('/competencies', restrictTo('Admin'), getCompetencyAnalytics);
router.get('/student-payments', restrictTo('Admin'), getStudentPaymentAnalytics);
router.get('/student-results', restrictTo('Admin'), getStudentResultsAnalytics);
router.get('/student-certificates', restrictTo('Admin'), getStudentCertificatesAnalytics);
router.get('/student-progress', restrictTo('Admin'), getStudentProgressAnalytics);
router.get('/recent-students', restrictTo('Admin'), getRecentStudentsAnalytics);
router.get('/student/:studentId', restrictTo('Admin'), getIndividualStudentAnalytics);
router.get('/supervisor-salary', restrictTo('Admin'), getSupervisorSalaryAnalytics);
router.get('/supervisor-videos', restrictTo('Admin'), getSupervisorVideoAnalytics);

// Supervisor accessible routes
router.get('/supervisor-students/:supervisorId', restrictTo('Admin', 'Supervisor'), getSupervisorStudentAnalytics);
router.get('/my-salary', restrictTo('Supervisor'), getMySalaryData);

// Supervisor salary management routes (Admin only)
router.put('/supervisor-salary', restrictTo('Admin'), updateSupervisorSalary);
router.post('/supervisor-payment', restrictTo('Admin'), markSupervisorPayment);
router.patch('/supervisor-salary-payment', restrictTo('Admin'), toggleSupervisorSalaryPayment);
router.post('/initialize-supervisor-salaries', restrictTo('Admin'), initializeSupervisorSalaries);

// Data clearing routes (Admin only)
router.delete('/clear-payment-data', restrictTo('Admin'), clearPaymentAnalyticsData);
router.delete('/clear-test-data', restrictTo('Admin'), clearTestAnalyticsData);
router.delete('/clear-supervisor-salary', restrictTo('Admin'), clearSupervisorSalaryData);
router.delete('/clear-video-analytics', restrictTo('Admin'), clearVideoAnalyticsData);
router.delete('/clear-user-management', restrictTo('Admin'), clearUserManagementData);
router.delete('/clear-video-management', restrictTo('Admin'), clearVideoManagementData);
router.delete('/clear-quiz-management', restrictTo('Admin'), clearQuizManagementData);
router.delete('/clear-resource-management', restrictTo('Admin'), clearResourceManagementData);

export default router;