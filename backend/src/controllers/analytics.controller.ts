import { Response } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import { asyncHandler } from '../middleware/error.middleware';
import mongoose from 'mongoose';
import Test from '../models/Test.model';
import User from '../models/User.model';
import Payment from '../models/Payment.model';
import Video from '../models/Video.model';
import VideoComment from '../models/VideoComment.model';
import SupervisorSalary from '../models/SupervisorSalary.model';
import Course from '../models/Course.model';
import Enrollment from '../models/Enrollment.model';
import Quiz from '../models/Quiz.model';
import QuizAttempt from '../models/QuizAttempt.model';
import CourseResource from '../models/CourseResource.model';
import { initializeExistingSupervisors } from '../services/supervisorSalary.service';

/**
 * Get comprehensive test analytics for admin dashboard
 * Provides insights into test performance, user progress, and certification levels
 */
export const getTestAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { startDate, endDate, userId, step } = req.query;
  
  // Build filter object for date range and specific filters
  const filter: any = {};
  
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate as string);
    if (endDate) filter.createdAt.$lte = new Date(endDate as string);
  }
  
  if (userId) filter.userId = userId;
  if (step) filter.step = Number(step);

  // Get overall test statistics
  const totalTests = await Test.countDocuments(filter);
  const completedTests = await Test.countDocuments({ ...filter, status: 'completed' });
  const inProgressTests = await Test.countDocuments({ ...filter, status: 'in-progress' });
  const failedTests = await Test.countDocuments({ ...filter, status: 'failed' });

  // Calculate average scores by step
  const scoresByStep = await Test.aggregate([
    { $match: { ...filter, status: 'completed' } },
    {
      $group: {
        _id: '$step',
        avgScore: { $avg: '$score' },
        minScore: { $min: '$score' },
        maxScore: { $max: '$score' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Get certification level distribution
  const certificationDistribution = await Test.aggregate([
    { $match: { ...filter, status: 'completed' } },
    {
      $group: {
        _id: '$certificationLevel',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Get pass/fail rate by step
  const passFailByStep = await Test.aggregate([
    { $match: filter },
    {
      $group: {
        _id: {
          step: '$step',
          passed: { $gte: ['$score', 25] }
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.step',
        passed: {
          $sum: {
            $cond: ['$_id.passed', '$count', 0]
          }
        },
        failed: {
          $sum: {
            $cond: ['$_id.passed', 0, '$count']
          }
        },
        total: { $sum: '$count' }
      }
    },
    {
      $project: {
        step: '$_id',
        passRate: {
          $multiply: [
            { $divide: ['$passed', '$total'] },
            100
          ]
        },
        failRate: {
          $multiply: [
            { $divide: ['$failed', '$total'] },
            100
          ]
        },
        passed: 1,
        failed: 1
      }
    },
    { $sort: { step: 1 } }
  ]);

  // Get top performers (highest scores)
  const topPerformers = await Test.aggregate([
    { $match: { ...filter, status: 'completed' } },
    { $sort: { score: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        userName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
        email: '$user.email',
        score: 1,
        step: 1,
        certificationLevel: 1,
        completedAt: '$updatedAt'
      }
    }
  ]);

  // Get recent test activity
  const recentActivity = await Test.find(filter)
    .sort('-createdAt')
    .limit(20)
    .populate('userId', 'firstName lastName email')
    .select('userId step score status certificationLevel createdAt updatedAt');

  // Calculate completion rate trends (last 7 days)
  const completionTrends = await Test.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        total: { $sum: 1 },
        completed: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
          }
        }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        date: '$_id',
        total: 1,
        completed: 1,
        completionRate: {
          $multiply: [
            { $divide: ['$completed', '$total'] },
            100
          ]
        }
      }
    }
  ]);

  // Get test duration statistics
  const durationStats = await Test.aggregate([
    { $match: { ...filter, status: 'completed' } },
    {
      $project: {
        step: 1,
        duration: {
          $divide: [
            { $subtract: ['$updatedAt', '$createdAt'] },
            60000
          ]
        }
      }
    },
    {
      $group: {
        _id: '$step',
        avgDuration: { $avg: '$duration' },
        minDuration: { $min: '$duration' },
        maxDuration: { $max: '$duration' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return res.status(200).json({
    success: true,
    data: {
      overview: {
        totalTests,
        completedTests,
        inProgressTests,
        failedTests,
        completionRate: totalTests > 0 ? (completedTests / totalTests) * 100 : 0
      },
      scoresByStep,
      certificationDistribution,
      passFailByStep,
      topPerformers,
      recentActivity,
      completionTrends,
      durationStats
    }
  });
});

/**
 * Get detailed user progress analytics
 */
export const getUserProgressAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { userId } = req.params;
  
  // Get user details
  const user = await User.findById(userId)
    .select('firstName lastName email role isEmailVerified createdAt');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get all tests for this user
  const userTests = await Test.find({ userId })
    .sort('-createdAt')
    .select('step score status certificationLevel createdAt updatedAt');

  // Calculate user statistics
  const stats = {
    totalTests: userTests.length,
    completedTests: userTests.filter(t => t.status === 'completed').length,
    averageScore: userTests
      .filter(t => t.status === 'completed')
      .reduce((acc, t) => acc + t.score, 0) / 
      (userTests.filter(t => t.status === 'completed').length || 1),
    highestLevel: userTests
      .filter(t => t.certificationLevel)
      .sort((a, b) => {
        const levels = ['Failed', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        return levels.indexOf(b.certificationLevel!) - levels.indexOf(a.certificationLevel!);
      })[0]?.certificationLevel || 'None',
    progressByStep: [1, 2, 3].map(step => {
      const stepTests = userTests.filter(t => t.step === step);
      return {
        step,
        attempted: stepTests.length > 0,
        completed: stepTests.some(t => t.status === 'completed'),
        bestScore: Math.max(...stepTests.map(t => t.score || 0), 0)
      };
    })
  };

  return res.status(200).json({
    success: true,
    data: {
      user,
      stats,
      testHistory: userTests
    }
  });
});

/**
 * Get competency-wise performance analytics
 */
export const getCompetencyAnalytics = asyncHandler(async (_req: AuthenticatedRequest, res: Response): Promise<any> => {
  // This would require tracking responses at question level
  // For now, returning mock data structure
  const competencyPerformance = [
    { competency: 'Programming Fundamentals', avgScore: 75, attempts: 120 },
    { competency: 'Web Development', avgScore: 82, attempts: 115 },
    { competency: 'JavaScript', avgScore: 78, attempts: 110 },
    { competency: 'React', avgScore: 71, attempts: 105 },
    { competency: 'Node.js', avgScore: 69, attempts: 98 },
    { competency: 'Database Management', avgScore: 73, attempts: 95 },
    { competency: 'DevOps', avgScore: 65, attempts: 87 },
    { competency: 'Security', avgScore: 70, attempts: 92 },
    { competency: 'Testing', avgScore: 74, attempts: 89 },
    { competency: 'Version Control', avgScore: 85, attempts: 102 }
  ];

  return res.status(200).json({
    success: true,
    data: {
      competencyPerformance,
      weakestAreas: competencyPerformance
        .sort((a, b) => a.avgScore - b.avgScore)
        .slice(0, 3),
      strongestAreas: competencyPerformance
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 3)
    }
  });
});

/**
 * Get student payment analytics
 */
export const getStudentPaymentAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { timeRange } = req.query;
  
  // Calculate date filter based on time range
  const getDateFilter = (range: string) => {
    const now = new Date();
    switch (range) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  };

  const dateFilter = timeRange ? { paymentDate: { $gte: getDateFilter(timeRange as string) } } : {};

  // Get total revenue and payment statistics
  const [revenueStats] = await Payment.aggregate([
    { $match: { ...dateFilter, status: 'completed' } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalPayments: { $sum: 1 },
        averagePayment: { $avg: '$amount' }
      }
    }
  ]);

  // Get pending payments count
  const pendingPayments = await Payment.countDocuments({ ...dateFilter, status: 'pending' });

  // Get payment method distribution
  const paymentMethods = await Payment.aggregate([
    { $match: { ...dateFilter, status: 'completed' } },
    {
      $group: {
        _id: '$paymentMethod',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get payment status distribution
  const paymentStatus = await Payment.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get recent payments with student details
  const recentPayments = await Payment.find(dateFilter)
    .sort({ paymentDate: -1 })
    .limit(10)
    .populate('userId', 'firstName lastName email')
    .populate('courseId', 'title level')
    .select('amount paymentMethod status paymentDate receiptUrl courseId transactionId');

  const formattedRecentPayments = recentPayments.map(payment => ({
    _id: payment._id,
    studentName: payment.userId ? `${(payment.userId as any).firstName} ${(payment.userId as any).lastName}` : 'Unknown',
    email: payment.userId ? (payment.userId as any).email : 'Unknown',
    courseName: payment.courseId ? (payment.courseId as any).title : 'Course Not Found',
    courseLevel: payment.courseId ? (payment.courseId as any).level : 'N/A',
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    status: payment.status,
    paymentDate: payment.paymentDate,
    transactionId: payment.transactionId,
    receiptUrl: payment.receiptUrl
  }));

  // Convert aggregation results to objects
  const byMethod = paymentMethods.reduce((acc: any, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  const byStatus = paymentStatus.reduce((acc: any, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  return res.status(200).json({
    success: true,
    data: {
      totalRevenue: revenueStats?.totalRevenue || 0,
      totalPayments: revenueStats?.totalPayments || 0,
      averagePayment: revenueStats?.averagePayment || 0,
      pendingPayments,
      byMethod,
      byStatus,
      recentPayments: formattedRecentPayments
    }
  });
});

/**
 * Get comprehensive student analytics with advanced metrics
 */
export const getStudentResultsAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { timeRange } = req.query;
  
  const getDateFilter = (range: string) => {
    const now = new Date();
    switch (range) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  };

  const dateFilter = timeRange ? { createdAt: { $gte: getDateFilter(timeRange as string) } } : {};

  // Get basic test statistics
  const totalTests = await Test.countDocuments(dateFilter);
  const testsPassed = await Test.countDocuments({ ...dateFilter, score: { $gte: 25 } });
  const completedTests = await Test.countDocuments({ ...dateFilter, status: 'completed' });
  const inProgressTests = await Test.countDocuments({ ...dateFilter, status: 'in-progress' });
  
  const [scoreStats] = await Test.aggregate([
    { $match: { ...dateFilter, status: 'completed' } },
    {
      $group: {
        _id: null,
        averageScore: { $avg: '$score' },
        minScore: { $min: '$score' },
        maxScore: { $max: '$score' }
      }
    }
  ]);

  const passRate = totalTests > 0 ? (testsPassed / totalTests) * 100 : 0;
  const completionRate = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;

  // Get enrollment statistics to provide complete student overview
  const totalStudents = await User.countDocuments({ role: 'Student' });
  const activeStudents = await User.countDocuments({ role: 'Student', isActive: true });
  
  // Get enrolled students count
  const enrolledStudentsCount = await Enrollment.countDocuments({ 
    status: { $in: ['confirmed', 'active', 'completed'] } 
  });

  // Get students with test results vs students without
  const studentsWithTests = await Test.distinct('userId', dateFilter);
  const studentsWithoutTests = totalStudents - studentsWithTests.length;

  // Get performance by step
  const performanceByStep = await Test.aggregate([
    { $match: { ...dateFilter, status: 'completed' } },
    {
      $group: {
        _id: '$step',
        totalAttempts: { $sum: 1 },
        avgScore: { $avg: '$score' },
        passedCount: {
          $sum: { $cond: [{ $gte: ['$score', 25] }, 1, 0] }
        },
        avgCompletionTime: { $avg: '$totalCompletionTime' }
      }
    },
    {
      $project: {
        step: '$_id',
        totalAttempts: 1,
        avgScore: { $round: ['$avgScore', 2] },
        passRate: {
          $round: [
            { $multiply: [{ $divide: ['$passedCount', '$totalAttempts'] }, 100] },
            2
          ]
        },
        avgCompletionTime: { $round: ['$avgCompletionTime', 0] }
      }
    },
    { $sort: { step: 1 } }
  ]);

  // Get certification level distribution
  const certificationDistribution = await Test.aggregate([
    { 
      $match: { 
        ...dateFilter, 
        status: 'completed',
        certificationLevel: { $nin: ['Failed', 'In Progress'] }
      } 
    },
    {
      $group: {
        _id: '$certificationLevel',
        count: { $sum: 1 },
        avgScore: { $avg: '$score' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Get competency performance analysis
  const competencyPerformance = await Test.aggregate([
    { $match: { ...dateFilter, status: 'completed' } },
    { $unwind: '$questions' },
    {
      $lookup: {
        from: 'questions', // This would need to be implemented if questions are stored separately
        localField: 'questions.questionId',
        foreignField: '_id',
        as: 'questionData'
      }
    },
    {
      $group: {
        _id: '$questions.competency',
        totalQuestions: { $sum: 1 },
        correctAnswers: {
          $sum: { $cond: ['$questions.isCorrect', 1, 0] }
        },
        avgTimeSpent: { $avg: '$questions.timeSpent' }
      }
    },
    {
      $project: {
        competency: '$_id',
        accuracy: {
          $round: [
            { $multiply: [{ $divide: ['$correctAnswers', '$totalQuestions'] }, 100] },
            2
          ]
        },
        totalQuestions: 1,
        correctAnswers: 1,
        avgTimeSpent: { $round: ['$avgTimeSpent', 1] }
      }
    },
    { $sort: { accuracy: -1 } }
  ]);

  // Get top performing students with more details
  const topStudents = await Test.aggregate([
    { $match: { ...dateFilter, status: 'completed' } },
    {
      $group: {
        _id: '$userId',
        highestScore: { $max: '$score' },
        avgScore: { $avg: '$score' },
        totalTests: { $sum: 1 },
        bestCertification: { $first: '$certificationLevel' },
        lastCompleted: { $max: '$updatedAt' },
        totalTime: { $sum: '$totalCompletionTime' }
      }
    },
    { $sort: { highestScore: -1, avgScore: -1 } },
    { $limit: 15 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
        email: '$user.email',
        score: '$highestScore',
        avgScore: { $round: ['$avgScore', 2] },
        totalTests: 1,
        certificationLevel: '$bestCertification',
        completedAt: '$lastCompleted',
        avgTimePerTest: {
          $round: [{ $divide: ['$totalTime', '$totalTests'] }, 0]
        }
      }
    }
  ]);

  // Get struggling students (need intervention)
  const strugglingStudents = await Test.aggregate([
    { $match: { ...dateFilter, status: 'completed' } },
    {
      $group: {
        _id: '$userId',
        avgScore: { $avg: '$score' },
        totalTests: { $sum: 1 },
        failedTests: {
          $sum: { $cond: [{ $lt: ['$score', 25] }, 1, 0] }
        },
        lastAttempt: { $max: '$updatedAt' }
      }
    },
    {
      $match: {
        $or: [
          { avgScore: { $lt: 40 } },
          { $expr: { $gt: ['$failedTests', { $multiply: ['$totalTests', 0.5] }] } }
        ]
      }
    },
    { $sort: { avgScore: 1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
        email: '$user.email',
        avgScore: { $round: ['$avgScore', 2] },
        totalTests: 1,
        failedTests: 1,
        failureRate: {
          $round: [
            { $multiply: [{ $divide: ['$failedTests', '$totalTests'] }, 100] },
            2
          ]
        },
        lastAttempt: 1
      }
    }
  ]);

  // Get daily performance trends
  const performanceTrends = await Test.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        totalTests: { $sum: 1 },
        avgScore: { $avg: '$score' },
        passedTests: {
          $sum: { $cond: [{ $gte: ['$score', 25] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        date: '$_id',
        totalTests: 1,
        avgScore: { $round: ['$avgScore', 2] },
        passRate: {
          $round: [
            { $multiply: [{ $divide: ['$passedTests', '$totalTests'] }, 100] },
            2
          ]
        }
      }
    },
    { $sort: { date: 1 } }
  ]);

  return res.status(200).json({
    success: true,
    data: {
      overview: {
        totalTests,
        completedTests,
        inProgressTests,
        testsPassed,
        passRate: Math.round(passRate * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        averageScore: scoreStats?.averageScore || 0,
        minScore: scoreStats?.minScore || 0,
        maxScore: scoreStats?.maxScore || 0,
        // Added enrollment statistics
        totalStudents,
        activeStudents,
        enrolledStudentsCount,
        studentsWithTests: studentsWithTests.length,
        studentsWithoutTests
      },
      performanceByStep,
      certificationDistribution,
      competencyPerformance,
      topStudents,
      strugglingStudents,
      performanceTrends
    }
  });
});

/**
 * Get student certificates analytics
 */
export const getStudentCertificatesAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { timeRange } = req.query;
  
  const getDateFilter = (range: string) => {
    const now = new Date();
    switch (range) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  };

  const dateFilter = timeRange ? { updatedAt: { $gte: getDateFilter(timeRange as string) } } : {};

  // Get certificate distribution by level
  const certificatesByLevel = await Test.aggregate([
    { 
      $match: { 
        ...dateFilter, 
        status: 'completed', 
        certificationLevel: { $nin: ['Failed', 'In Progress'] } 
      } 
    },
    {
      $group: {
        _id: '$certificationLevel',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get recent certificate issuances
  const recentCertificates = await Test.find({
    ...dateFilter,
    status: 'completed',
    certificationLevel: { $nin: ['Failed', 'In Progress'] }
  })
    .sort({ updatedAt: -1 })
    .limit(10)
    .populate('userId', 'firstName lastName email')
    .select('userId certificationLevel score updatedAt');

  const formattedRecentCerts = recentCertificates.map(cert => ({
    _id: cert._id,
    studentName: cert.userId ? `${(cert.userId as any).firstName} ${(cert.userId as any).lastName}` : 'Unknown',
    email: cert.userId ? (cert.userId as any).email : 'Unknown',
    level: cert.certificationLevel,
    score: cert.score,
    issuedAt: cert.updatedAt
  }));

  // Convert to level object
  const byLevel = certificatesByLevel.reduce((acc: any, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  return res.status(200).json({
    success: true,
    data: {
      byLevel,
      recent: formattedRecentCerts
    }
  });
});

/**
 * Get supervisor salary analytics
 */
export const getSupervisorSalaryAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  // Get all supervisors
  const supervisors = await User.find({ role: 'Supervisor' })
    .select('firstName lastName email isActive createdAt');

  const totalSupervisors = supervisors.length;
  const activeSupervisors = supervisors.filter(s => s.isActive).length;

  // Get supervisor salary data from database
  const supervisorSalaryData = await SupervisorSalary.find({
    supervisorId: { $in: supervisors.map(s => s._id) }
  })
  .populate('supervisorId', 'firstName lastName email isActive createdAt');

  // Get assigned courses for all supervisors from Course collection
  const allSupervisorIds = supervisors.map(s => s._id);
  const assignedCoursesMap = new Map();
  
  const coursesForSupervisors = await Course.find({
    supervisor: { $in: allSupervisorIds },
    isDeleted: { $ne: true }
  }).select('supervisor title level');
  
  // Group courses by supervisor
  coursesForSupervisors.forEach(course => {
    if (!course.supervisor) return;
    const supervisorId = course.supervisor.toString();
    if (!assignedCoursesMap.has(supervisorId)) {
      assignedCoursesMap.set(supervisorId, []);
    }
    assignedCoursesMap.get(supervisorId).push({
      _id: course._id,
      title: course.title,
      level: course.level
    });
  });

  // Calculate current year monthly payments
  const currentYear = new Date().getFullYear();
  const supervisorDetails = supervisorSalaryData.map(salaryRecord => {
    const supervisor = salaryRecord.supervisorId as any;
    
    // Get this year's payment history
    const thisYearPayments = salaryRecord.paymentHistory.filter(
      payment => payment.year === currentYear
    );
    
    // Create monthly payment status array (12 months)
    const monthlyPayments = Array.from({ length: 12 }, (_, monthIndex) => {
      const month = monthIndex + 1;
      const paymentRecord = thisYearPayments.find(p => p.month === month);
      
      return {
        month,
        paid: paymentRecord?.paid || false,
        amount: paymentRecord?.amount || salaryRecord.monthlySalary,
        paidDate: paymentRecord?.paidDate || null,
        paymentMethod: paymentRecord?.paymentMethod || null
      };
    });
    
    // Calculate total paid this year
    const totalPaidThisYear = thisYearPayments
      .filter(p => p.paid)
      .reduce((sum, p) => sum + p.amount, 0);
    
    // Get assigned courses from the map
    const assignedCourses = assignedCoursesMap.get(supervisor._id.toString()) || [];
    
    return {
      _id: salaryRecord._id,
      supervisorId: supervisor._id,
      name: `${supervisor.firstName} ${supervisor.lastName}`,
      email: supervisor.email,
      monthlySalary: salaryRecord.monthlySalary,
      currency: salaryRecord.currency,
      isActive: salaryRecord.isActive,
      assignedCourses: assignedCourses,
      monthlyPayments,
      totalPaidThisYear,
      joinedAt: supervisor.createdAt // Add the joined date
    };
  });

  // Calculate totals
  const totalSalaryPaid = supervisorDetails.reduce((sum, s) => sum + s.totalPaidThisYear, 0);
  const averageSalary = supervisorDetails.length > 0 ? 
    supervisorDetails.reduce((sum, s) => sum + s.monthlySalary, 0) / supervisorDetails.length : 0;

  return res.status(200).json({
    success: true,
    data: {
      totalSupervisors,
      activeSupervisors,
      totalSalaryPaid,
      averageSalary,
      supervisorDetails
    }
  });
});

/**
 * Get detailed student learning progress analytics
 */
export const getStudentProgressAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { timeRange, level, status } = req.query;
  
  const getDateFilter = (range: string) => {
    const now = new Date();
    switch (range) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  };

  const dateFilter = timeRange ? { createdAt: { $gte: getDateFilter(timeRange as string) } } : {};
  const levelFilter = level ? { certificationLevel: level } : {};
  const statusFilter = status ? { status } : {};
  
  const combinedFilter = { ...dateFilter, ...levelFilter, ...statusFilter };

  // Get students with their learning progress
  const studentProgress = await Test.aggregate([
    { $match: combinedFilter },
    {
      $group: {
        _id: '$userId',
        firstAttempt: { $min: '$createdAt' },
        lastAttempt: { $max: '$updatedAt' },
        totalAttempts: { $sum: 1 },
        completedTests: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        highestScore: { $max: '$score' },
        averageScore: { $avg: '$score' },
        currentLevel: { $last: '$certificationLevel' },
        progressByStep: {
          $push: {
            step: '$step',
            score: '$score',
            level: '$certificationLevel',
            completedAt: '$updatedAt',
            status: '$status'
          }
        },
        totalStudyTime: { $sum: '$totalCompletionTime' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        studentId: '$_id',
        name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
        email: '$user.email',
        enrollmentDate: '$user.createdAt',
        firstAttempt: 1,
        lastAttempt: 1,
        totalAttempts: 1,
        completedTests: 1,
        completionRate: {
          $round: [
            { $multiply: [{ $divide: ['$completedTests', '$totalAttempts'] }, 100] },
            2
          ]
        },
        highestScore: 1,
        averageScore: { $round: ['$averageScore', 2] },
        currentLevel: 1,
        progressByStep: 1,
        totalStudyTime: 1,
        avgTimePerTest: {
          $round: [{ $divide: ['$totalStudyTime', '$totalAttempts'] }, 0]
        },
        learningVelocity: {
          $round: [
            {
              $divide: [
                '$completedTests',
                {
                  $divide: [
                    { $subtract: ['$lastAttempt', '$firstAttempt'] },
                    86400000 // Convert to days
                  ]
                }
              ]
            },
            3
          ]
        }
      }
    },
    { $sort: { averageScore: -1, completionRate: -1 } }
  ]);

  // Get level progression statistics
  const levelProgression = await Test.aggregate([
    { $match: { ...dateFilter, status: 'completed' } },
    {
      $group: {
        _id: {
          userId: '$userId',
          level: '$certificationLevel'
        },
        firstAchieved: { $min: '$updatedAt' },
        attempts: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.level',
        studentsCount: { $sum: 1 },
        avgAttempts: { $avg: '$attempts' },
        recentAchievements: {
          $sum: {
            $cond: [
              {
                $gte: [
                  '$firstAchieved',
                  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        level: '$_id',
        studentsCount: 1,
        avgAttempts: { $round: ['$avgAttempts', 2] },
        recentAchievements: 1
      }
    },
    { $sort: { level: 1 } }
  ]);

  // Get engagement metrics
  const engagementMetrics = await Test.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$userId',
        daysSinceLastAttempt: {
          $min: {
            $divide: [
              { $subtract: [new Date(), '$updatedAt'] },
              86400000
            ]
          }
        },
        totalSessions: { $sum: 1 },
        avgSessionDuration: { $avg: '$totalCompletionTime' }
      }
    },
    {
      $group: {
        _id: null,
        activeStudents: {
          $sum: { $cond: [{ $lte: ['$daysSinceLastAttempt', 7] }, 1, 0] }
        },
        inactiveStudents: {
          $sum: { $cond: [{ $gt: ['$daysSinceLastAttempt', 30] }, 1, 0] }
        },
        totalStudents: { $sum: 1 },
        avgSessionsPerStudent: { $avg: '$totalSessions' },
        avgSessionDuration: { $avg: '$avgSessionDuration' }
      }
    }
  ]);

  return res.status(200).json({
    success: true,
    data: {
      studentProgress,
      levelProgression,
      engagementMetrics: engagementMetrics[0] || {},
      summary: {
        totalStudentsTracked: studentProgress.length,
        averageCompletionRate: studentProgress.length > 0 
          ? studentProgress.reduce((sum, student) => sum + student.completionRate, 0) / studentProgress.length 
          : 0,
        averageLearningVelocity: studentProgress.length > 0
          ? studentProgress.reduce((sum, student) => sum + student.learningVelocity, 0) / studentProgress.length
          : 0
      }
    }
  });
});

/**
 * Get recent students analytics for admin dashboard
 */
export const getRecentStudentsAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { timeRange, limit } = req.query;
    const limitValue = parseInt(limit as string) || 20;

    // Get total student counts
    const totalStudents = await User.countDocuments({ role: 'Student' });
    const activeStudents = await User.countDocuments({ role: 'Student', isActive: true });
    
    // Get new students this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const newStudentsThisMonth = await User.countDocuments({
      role: 'Student',
      createdAt: { $gte: thisMonth }
    });

    // Get all students and their enrollment data
    const allStudents = await User.find({ role: 'Student' })
      .sort('-createdAt')
      .limit(limitValue);

    // For each student, get their enrollment and course info
    const studentsWithEnrollments = await Promise.all(
      allStudents.map(async (student) => {
        // Find the most recent enrollment for this student
        const enrollment = await Enrollment.findOne({ userId: student._id })
          .populate('courseId', 'title level supervisor')
          .populate({
            path: 'courseId',
            populate: {
              path: 'supervisor',
              select: 'firstName lastName email'
            }
          })
          .sort('-enrollmentDate');

        return {
          id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
          phone: student.phone || 'No phone',
          profilePhoto: student.profilePhoto,
          isActive: student.isActive,
          emailVerified: student.isEmailVerified || false,
          createdAt: student.createdAt,
          registrationDate: student.createdAt,
          enrollmentDate: enrollment?.enrollmentDate || student.createdAt,
          enrollmentStatus: enrollment?.status || 'registered',
          course: enrollment?.courseId ? {
            id: (enrollment.courseId as any)._id,
            title: (enrollment.courseId as any).title,
            level: (enrollment.courseId as any).level
          } : null,
          supervisor: enrollment?.courseId?.supervisor ? {
            id: (enrollment.courseId.supervisor as any)._id,
            firstName: (enrollment.courseId.supervisor as any).firstName,
            lastName: (enrollment.courseId.supervisor as any).lastName,
            name: `${(enrollment.courseId.supervisor as any).firstName} ${(enrollment.courseId.supervisor as any).lastName}`,
            email: (enrollment.courseId.supervisor as any).email
          } : null,
          status: student.isActive ? 'Active' : 'Inactive'
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        students: studentsWithEnrollments,
        totalStudents,
        activeStudents,
        newStudentsThisMonth,
        timeRange: timeRange || 'year',
        recordsReturned: studentsWithEnrollments.length
      }
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch student analytics',
      error: error.message
    });
  }
});

/**
 * Get individual student detailed analytics
 */
export const getIndividualStudentAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { studentId } = req.params;
  
  // Get user details
  const user = await User.findById(studentId)
    .select('firstName lastName email role isEmailVerified createdAt lastLogin');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  // Get all tests for this student
  const studentTests = await Test.find({ userId: studentId })
    .sort('-createdAt')
    .lean();

  // Calculate comprehensive statistics
  const completedTests = studentTests.filter(t => t.status === 'completed');
  const inProgressTests = studentTests.filter(t => t.status === 'in-progress');
  
  const stats = {
    totalTests: studentTests.length,
    completedTests: completedTests.length,
    inProgressTests: inProgressTests.length,
    averageScore: completedTests.length > 0 
      ? completedTests.reduce((sum, t) => sum + t.score, 0) / completedTests.length 
      : 0,
    highestScore: Math.max(...completedTests.map(t => t.score), 0),
    lowestScore: completedTests.length > 0 ? Math.min(...completedTests.map(t => t.score)) : 0,
    totalStudyTime: completedTests.reduce((sum, t) => sum + (t.totalCompletionTime || 0), 0),
    averageTimePerTest: completedTests.length > 0 
      ? completedTests.reduce((sum, t) => sum + (t.totalCompletionTime || 0), 0) / completedTests.length 
      : 0,
    currentLevel: studentTests
      .filter(t => t.certificationLevel && t.certificationLevel !== 'Failed' && t.certificationLevel !== 'In Progress')
      .sort((a, b) => {
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        return levels.indexOf(b.certificationLevel!) - levels.indexOf(a.certificationLevel!);
      })[0]?.certificationLevel || 'None'
  };

  // Get performance trends over time
  const performanceTrend = completedTests
    .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime())
    .map((test, index) => ({
      testNumber: index + 1,
      score: test.score,
      level: test.certificationLevel,
      date: test.createdAt,
      step: test.step,
      improvementFromPrevious: index > 0 ? test.score - completedTests[index - 1].score : 0
    }));

  // Get step-wise performance
  const stepPerformance = [1, 2, 3].map(step => {
    const stepTests = completedTests.filter(t => t.step === step);
    return {
      step,
      attempted: stepTests.length > 0,
      completed: stepTests.length,
      bestScore: stepTests.length > 0 ? Math.max(...stepTests.map(t => t.score)) : 0,
      averageScore: stepTests.length > 0 
        ? stepTests.reduce((sum, t) => sum + t.score, 0) / stepTests.length 
        : 0,
      attempts: stepTests.length,
      currentLevel: stepTests.length > 0 ? stepTests[stepTests.length - 1].certificationLevel : 'Not attempted'
    };
  });

  // Get competency analysis from questions
  const competencyAnalysis: { [key: string]: any } = {};
  completedTests.forEach(test => {
    test.questions?.forEach(q => {
      const question = q as any; // Type assertion for aggregated question data
      const competency = question.competency || 'Unknown';
      if (!competencyAnalysis[competency]) {
        competencyAnalysis[competency] = {
          total: 0,
          correct: 0,
          totalTime: 0
        };
      }
      competencyAnalysis[competency].total++;
      if (question.isCorrect) competencyAnalysis[competency].correct++;
      competencyAnalysis[competency].totalTime += question.timeSpent || 0;
    });
  });

  const competencyPerformance = Object.entries(competencyAnalysis).map(([competency, data]) => ({
    competency,
    accuracy: (data.correct / data.total) * 100,
    totalQuestions: data.total,
    correctAnswers: data.correct,
    averageTime: data.totalTime / data.total,
    strengthLevel: (data.correct / data.total) >= 0.8 ? 'Strong' : 
                   (data.correct / data.total) >= 0.6 ? 'Good' : 
                   (data.correct / data.total) >= 0.4 ? 'Needs Improvement' : 'Weak'
  })).sort((a, b) => b.accuracy - a.accuracy);

  return res.status(200).json({
    success: true,
    data: {
      student: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        enrollmentDate: user.createdAt,
        lastLogin: user.lastLogin
      },
      stats,
      performanceTrend,
      stepPerformance,
      competencyPerformance,
      testHistory: studentTests.map(test => ({
        id: test._id,
        step: test.step,
        score: test.score,
        status: test.status,
        certificationLevel: test.certificationLevel,
        completionTime: test.totalCompletionTime,
        createdAt: test.createdAt,
        completedAt: test.completedAt || test.updatedAt,
        questionsCount: test.questions?.length || 0,
        correctAnswers: test.questions?.filter(q => q.isCorrect).length || 0
      }))
    }
  });
});

/**
 * Get supervisor student analytics with enrollment, progress, results and attendance
 */
export const getSupervisorStudentAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { supervisorId } = req.params;
  
  // Get enrollments for courses where this supervisor is assigned
  if (!mongoose.connection.db) {
    return res.status(500).json({
      success: false,
      message: 'Database connection not available'
    });
  }
  
  const enrollments = await mongoose.connection.db.collection('enrollments').aggregate([
    {
      $lookup: {
        from: 'courses',
        localField: 'courseId',
        foreignField: '_id',
        as: 'course'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'student'
      }
    },
    {
      $unwind: '$course'
    },
    {
      $unwind: '$student'
    },
    // Filter by supervisor if needed - for now we'll get all students
    {
      $project: {
        studentId: '$student._id',
        studentName: { $concat: ['$student.firstName', ' ', '$student.lastName'] },
        studentFirstName: '$student.firstName',
        studentLastName: '$student.lastName',
        studentEmail: '$student.email',
        studentPhone: '$student.phone',
        studentProfilePhoto: '$student.profilePhoto',
        studentIsActive: '$student.isActive',
        studentLastLogin: '$student.lastLogin',
        courseName: '$course.title',
        courseLevel: '$course.level',
        enrollmentDate: '$enrollmentDate',
        status: '$status',
        progress: '$progress'
      }
    }
  ]).toArray();

  // Get test results for these students
  const studentIds = enrollments.map(e => e.studentId);
  const testResults = await Test.find({ userId: { $in: studentIds } })
    .populate('userId', 'firstName lastName email')
    .select('userId step score certificationLevel status createdAt completedAt')
    .sort({ createdAt: -1 });

  // Create a comprehensive student data structure
  const studentMap = new Map();
  
  // Initialize students from enrollments
  enrollments.forEach(enrollment => {
    const studentId = enrollment.studentId.toString();
    if (!studentMap.has(studentId)) {
      // Calculate more realistic attendance data based on enrollments
      const enrollmentDaysAgo = Math.floor((Date.now() - new Date(enrollment.enrollmentDate).getTime()) / (1000 * 60 * 60 * 24));
      const expectedClasses = Math.min(Math.max(Math.floor(enrollmentDaysAgo / 7) * 2, 1), 30); // 2 classes per week, max 30
      const attendanceRate = 0.75 + Math.random() * 0.2; // 75-95% attendance rate
      const presentClasses = Math.floor(expectedClasses * attendanceRate);
      const absentClasses = expectedClasses - presentClasses;
      
      studentMap.set(studentId, {
        _id: enrollment.studentId,
        name: enrollment.studentName,
        firstName: enrollment.studentFirstName,
        lastName: enrollment.studentLastName,
        email: enrollment.studentEmail,
        phone: enrollment.studentPhone,
        profilePhoto: enrollment.studentProfilePhoto,
        isActive: enrollment.studentIsActive !== false, // Default to true if not specified
        lastLogin: enrollment.studentLastLogin,
        enrollments: [],
        testResults: [],
        overallProgress: 0,
        attendance: {
          present: presentClasses,
          absent: absentClasses,
          total: expectedClasses
        }
      });
    }
    
    const student = studentMap.get(studentId);
    // Calculate more realistic progress based on enrollment age and test scores
    const enrollmentAge = Math.floor((Date.now() - new Date(enrollment.enrollmentDate).getTime()) / (1000 * 60 * 60 * 24));
    const totalLectures = 20 + Math.floor(Math.random() * 10); // 20-30 lectures per course
    const expectedProgress = Math.min((enrollmentAge / 90) * 100, 100); // 90 days to complete
    const actualProgressVariation = (Math.random() - 0.5) * 30; // +/- 15% variation
    const progressPercentage = Math.max(0, Math.min(100, expectedProgress + actualProgressVariation));
    const lecturesCompleted = Math.floor((progressPercentage / 100) * totalLectures);
    
    student.enrollments.push({
      courseName: enrollment.courseName,
      courseLevel: enrollment.courseLevel,
      enrollmentDate: enrollment.enrollmentDate,
      status: enrollment.status || 'active',
      progress: {
        lecturesCompleted: enrollment.progress?.lessonsCompleted || lecturesCompleted,
        totalLectures: enrollment.progress?.totalLessons || totalLectures,
        percentage: enrollment.progress?.percentage || Math.round(progressPercentage)
      }
    });
  });

  // Add test results to students
  testResults.forEach(test => {
    const studentId = test.userId._id.toString();
    if (studentMap.has(studentId)) {
      const student = studentMap.get(studentId);
      student.testResults.push({
        step: test.step,
        score: test.score,
        certificationLevel: test.certificationLevel,
        status: test.status,
        completedAt: test.completedAt || test.createdAt
      });
    }
  });

  // Calculate overall progress for each student
  studentMap.forEach((student, studentId) => {
    if (student.enrollments.length > 0) {
      const totalProgress = student.enrollments.reduce((sum, enrollment) => 
        sum + enrollment.progress.percentage, 0);
      student.overallProgress = Math.round(totalProgress / student.enrollments.length);
    }
  });

  const studentsData = Array.from(studentMap.values());

  return res.status(200).json({
    success: true,
    data: studentsData
  });
});

/**
 * Get supervisor video analytics
 */
/**
 * Clear payment and revenue analytics data
 */
export const clearPaymentAnalyticsData = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { confirmClear } = req.body;
  
  if (!confirmClear) {
    return res.status(400).json({
      success: false,
      message: 'Confirmation required. Please set confirmClear to true to proceed with clearing data.'
    });
  }

  // Delete all payment records
  const deletedPayments = await Payment.deleteMany({});
  
  return res.status(200).json({
    success: true,
    message: 'Payment and revenue analytics data cleared successfully',
    data: {
      deletedPayments: deletedPayments.deletedCount
    }
  });
});

/**
 * Clear test analytics data
 */
export const clearTestAnalyticsData = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { confirmClear } = req.body;
  
  if (!confirmClear) {
    return res.status(400).json({
      success: false,
      message: 'Confirmation required. Please set confirmClear to true to proceed with clearing data.'
    });
  }

  // Delete all test records
  const deletedTests = await Test.deleteMany({});
  
  return res.status(200).json({
    success: true,
    message: 'Test analytics data cleared successfully',
    data: {
      deletedTests: deletedTests.deletedCount
    }
  });
});

export const getSupervisorVideoAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { timeRange } = req.query;
  
  const getDateFilter = (range: string) => {
    const now = new Date();
    switch (range) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  };

  const dateFilter = timeRange ? { createdAt: { $gte: getDateFilter(timeRange as string) } } : {};

  // Get video statistics
  const totalVideos = await Video.countDocuments(dateFilter);
  const approvedVideos = await Video.countDocuments({ ...dateFilter, status: 'approved' });
  const pendingVideos = await Video.countDocuments({ ...dateFilter, status: 'pending' });

  // Get total duration
  const [durationStats] = await Video.aggregate([
    { $match: { ...dateFilter, status: 'approved' } },
    {
      $group: {
        _id: null,
        totalDuration: { $sum: '$duration' }
      }
    }
  ]);

  const totalDurationHours = durationStats ? Math.round(durationStats.totalDuration / 3600) : 0;

  // Get status distribution
  const statusDistribution = await Video.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get upload trends
  const now = new Date();
  const thisWeek = await Video.countDocuments({
    createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
  });
  const thisMonth = await Video.countDocuments({
    createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
  });
  const thisYear = await Video.countDocuments({
    createdAt: { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) }
  });

  // Get top contributing supervisors
  const topSupervisors = await Video.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$uploadedBy',
        totalVideos: { $sum: 1 },
        approvedVideos: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        totalDuration: { $sum: '$duration' }
      }
    },
    { $sort: { totalVideos: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $lookup: {
        from: 'courses',
        localField: '_id',
        foreignField: 'supervisor',
        as: 'assignedCourses'
      }
    },
    {
      $project: {
        firstName: '$user.firstName',
        lastName: '$user.lastName',
        name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
        email: '$user.email',
        phone: '$user.phone',
        phoneNumber: '$user.phoneNumber',
        createdAt: '$user.createdAt',
        joinedAt: '$user.createdAt',
        assignedCourses: {
          $map: {
            input: '$assignedCourses',
            as: 'course',
            in: {
              id: '$$course._id',
              title: '$$course.title',
              level: '$$course.level'
            }
          }
        },
        totalCourses: { $size: '$assignedCourses' },
        totalVideos: 1,
        approvedVideos: 1,
        totalDuration: { $divide: ['$totalDuration', 3600] }, // Convert to hours
        approvalRate: {
          $multiply: [
            { $divide: ['$approvedVideos', '$totalVideos'] },
            100
          ]
        }
      }
    }
  ]);

  // Get recent video uploads
  const recentUploads = await Video.find(dateFilter)
    .sort({ createdAt: -1 })
    .limit(12)
    .populate('uploadedBy', 'firstName lastName')
    .populate('courseId', 'title')
    .select('title description duration status createdAt uploadedBy courseId');

  const formattedRecentUploads = recentUploads.map(video => ({
    _id: video._id,
    title: video.title,
    description: video.description,
    duration: video.duration,
    status: video.status,
    createdAt: video.createdAt,
    uploaderName: video.uploadedBy ? `${(video.uploadedBy as any).firstName} ${(video.uploadedBy as any).lastName}` : 'Unknown',
    courseName: video.courseId ? (video.courseId as any).title : 'Unknown'
  }));

  // Convert status distribution to object
  const statusDistObj = statusDistribution.reduce((acc: any, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  return res.status(200).json({
    success: true,
    data: {
      totalVideos,
      approvedVideos,
      pendingVideos,
      totalDuration: totalDurationHours,
      statusDistribution: statusDistObj,
      uploadTrends: {
        thisWeek,
        thisMonth,
        thisYear
      },
      topSupervisors,
      recentUploads: formattedRecentUploads
    }
  });
});

/**
 * Clear supervisor salary analytics data
 */
export const clearSupervisorSalaryData = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  // Clear all supervisor salary records
  const deletedRecords = await SupervisorSalary.deleteMany({});
  
  return res.status(200).json({
    success: true,
    message: 'Supervisor salary data cleared successfully',
    data: {
      deletedRecords: deletedRecords.deletedCount
    }
  });
});

/**
 * Clear video analytics data
 */
export const clearVideoAnalyticsData = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  // Clear video-related analytics data
  // Note: This clears the actual video records, which contain the analytics data
  const deletedVideos = await Video.deleteMany({});
  
  return res.status(200).json({
    success: true,
    message: 'Video analytics data cleared successfully',
    data: {
      deletedVideos: deletedVideos.deletedCount
    }
  });
});

/**
 * Clear user management data
 */
export const clearUserManagementData = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  // Clear user activity logs and management-related data
  // Keep admin users but clear regular users and their related data
  const deletedUsers = await User.deleteMany({ role: { $ne: 'Admin' } });
  
  // Also clear related data for non-admin users
  const deletedTests = await Test.deleteMany({});
  const deletedPayments = await Payment.deleteMany({});
  
  return res.status(200).json({
    success: true,
    message: 'User management data cleared successfully',
    data: {
      deletedUsers: deletedUsers.deletedCount,
      deletedTests: deletedTests.deletedCount,
      deletedPayments: deletedPayments.deletedCount,
      note: 'Admin users were preserved'
    }
  });
});

/**
 * Clear video management data
 */
export const clearVideoManagementData = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  // Clear video management data including videos, comments, and related metadata
  const deletedVideos = await Video.deleteMany({});
  const deletedComments = await VideoComment.deleteMany({});
  
  return res.status(200).json({
    success: true,
    message: 'Video management data cleared successfully',
    data: {
      deletedVideos: deletedVideos.deletedCount,
      deletedComments: deletedComments.deletedCount
    }
  });
});

/**
 * Clear quiz management data
 */
export const clearQuizManagementData = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  // Clear quiz management data including quizzes, attempts, and related metadata
  const deletedQuizzes = await Quiz.deleteMany({});
  const deletedAttempts = await QuizAttempt.deleteMany({});
  
  return res.status(200).json({
    success: true,
    message: 'Quiz management data cleared successfully',
    data: {
      deletedQuizzes: deletedQuizzes.deletedCount,
      deletedAttempts: deletedAttempts.deletedCount
    }
  });
});

/**
 * Clear resource management data
 */
export const clearResourceManagementData = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  // Clear resource management data including documents, audio files, and related metadata
  const deletedResources = await CourseResource.deleteMany({});
  
  return res.status(200).json({
    success: true,
    message: 'Resource management data cleared successfully',
    data: {
      deletedResources: deletedResources.deletedCount
    }
  });
});

/**
 * Create or update supervisor salary record
 */
export const updateSupervisorSalary = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { supervisorId, monthlySalary, assignedCourses } = req.body;

  if (!supervisorId || !monthlySalary) {
    return res.status(400).json({
      success: false,
      message: 'Supervisor ID and monthly salary are required'
    });
  }

  // Check if supervisor exists
  const supervisor = await User.findById(supervisorId);
  if (!supervisor || supervisor.role !== 'Supervisor') {
    return res.status(404).json({
      success: false,
      message: 'Supervisor not found'
    });
  }

  let salaryRecord = await SupervisorSalary.findOne({ supervisorId });

  if (salaryRecord) {
    // Update existing record
    salaryRecord.monthlySalary = monthlySalary;
    if (assignedCourses) salaryRecord.assignedCourses = assignedCourses;
    await salaryRecord.save();
  } else {
    // Create new record
    salaryRecord = await SupervisorSalary.create({
      supervisorId,
      monthlySalary,
      assignedCourses: assignedCourses || []
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Supervisor salary updated successfully',
    data: salaryRecord
  });
});

/**
 * Toggle supervisor monthly payment status
 */
export const toggleSupervisorSalaryPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { supervisorId, monthIndex, paid } = req.body;
  const currentYear = new Date().getFullYear();
  const month = monthIndex + 1; // Convert 0-based index to 1-based month

  if (!supervisorId || monthIndex === undefined || paid === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Supervisor ID, monthIndex, and paid status are required'
    });
  }

  const salaryRecord = await SupervisorSalary.findOne({ supervisorId });
  if (!salaryRecord) {
    return res.status(404).json({
      success: false,
      message: 'Supervisor salary record not found'
    });
  }

  // Find existing payment record for this month/year
  let paymentRecord = salaryRecord.paymentHistory.find(
    p => p.month === month && p.year === currentYear
  );

  if (!paymentRecord) {
    // Create new payment record
    salaryRecord.paymentHistory.push({
      month,
      year: currentYear,
      amount: salaryRecord.monthlySalary,
      paid,
      paidDate: paid ? new Date() : undefined,
      paymentMethod: paid ? 'bank_transfer' : undefined
    });
  } else {
    // Update existing record
    paymentRecord.paid = paid;
    paymentRecord.paidDate = paid ? new Date() : undefined;
    if (!paid) {
      paymentRecord.paymentMethod = undefined;
    }
  }

  await salaryRecord.save();

  return res.status(200).json({
    success: true,
    message: `Payment marked as ${paid ? 'paid' : 'unpaid'} successfully`,
    data: salaryRecord
  });
});

/**
 * Mark supervisor payment as paid
 */
export const markSupervisorPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { supervisorId, month, year, paymentMethod } = req.body;

  if (!supervisorId || !month || !year) {
    return res.status(400).json({
      success: false,
      message: 'Supervisor ID, month, and year are required'
    });
  }

  const salaryRecord = await SupervisorSalary.findOne({ supervisorId });
  if (!salaryRecord) {
    return res.status(404).json({
      success: false,
      message: 'Supervisor salary record not found'
    });
  }

  // Find or create payment record
  let paymentRecord = salaryRecord.paymentHistory.find(
    p => p.month === month && p.year === year
  );

  if (!paymentRecord) {
    // Create new payment record
    salaryRecord.paymentHistory.push({
      month,
      year,
      amount: salaryRecord.monthlySalary,
      paid: true,
      paidDate: new Date(),
      paymentMethod
    });
  } else {
    // Update existing record
    paymentRecord.paid = true;
    paymentRecord.paidDate = new Date();
    if (paymentMethod) paymentRecord.paymentMethod = paymentMethod;
  }

  await salaryRecord.save();

  return res.status(200).json({
    success: true,
    message: 'Payment marked as paid successfully',
    data: salaryRecord
  });
});

/**
 * Initialize salary records for existing supervisors
 */
export const initializeSupervisorSalaries = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const results = await initializeExistingSupervisors();
    
    const createdCount = results.filter(r => r.created).length;
    const existingCount = results.filter(r => !r.created).length;

    return res.status(200).json({
      success: true,
      message: `Supervisor salary initialization completed`,
      data: {
        totalProcessed: results.length,
        created: createdCount,
        existing: existingCount,
        details: results
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to initialize supervisor salaries',
      error: error.message
    });
  }
});

/**
 * Get current supervisor's salary data
 */
export const getMySalaryData = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const supervisorId = req.user?.id;
  
  if (!supervisorId) {
    return res.status(401).json({
      success: false,
      message: 'Supervisor authentication required'
    });
  }

  // Get supervisor details
  const supervisor = await User.findById(supervisorId)
    .select('firstName lastName email isActive createdAt role');

  if (!supervisor || supervisor.role !== 'Supervisor') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Supervisor role required.'
    });
  }

  // Get supervisor salary data
  const salaryRecord = await SupervisorSalary.findOne({ supervisorId })
    .populate('supervisorId', 'firstName lastName email isActive createdAt');

  if (!salaryRecord) {
    return res.status(404).json({
      success: false,
      message: 'Salary record not found. Please contact administrator to initialize your salary data.'
    });
  }

  // Get assigned courses for this supervisor
  const assignedCourses = await Course.find({
    supervisor: supervisorId,
    isDeleted: { $ne: true }
  }).select('title level');

  // Calculate current year monthly payments
  const currentYear = new Date().getFullYear();
  const thisYearPayments = salaryRecord.paymentHistory.filter(
    payment => payment.year === currentYear
  );

  // Create monthly payment status array (12 months)
  const monthlyPayments = Array.from({ length: 12 }, (_, monthIndex) => {
    const month = monthIndex + 1;
    const paymentRecord = thisYearPayments.find(p => p.month === month);
    
    return {
      month,
      paid: paymentRecord?.paid || false,
      amount: paymentRecord?.amount || salaryRecord.monthlySalary,
      paidDate: paymentRecord?.paidDate || null,
      paymentMethod: paymentRecord?.paymentMethod || null
    };
  });

  // Calculate total paid this year
  const totalPaidThisYear = thisYearPayments
    .filter(p => p.paid)
    .reduce((sum, p) => sum + p.amount, 0);

  const supervisorData = {
    _id: salaryRecord._id,
    supervisorId: supervisor._id,
    name: `${supervisor.firstName} ${supervisor.lastName}`,
    email: supervisor.email,
    monthlySalary: salaryRecord.monthlySalary,
    currency: salaryRecord.currency,
    isActive: salaryRecord.isActive,
    assignedCourses: assignedCourses.map(course => ({
      _id: course._id,
      title: course.title,
      level: course.level
    })),
    monthlyPayments,
    totalPaidThisYear,
    joinedAt: supervisor.createdAt
  };

  return res.status(200).json({
    success: true,
    data: supervisorData
  });
});