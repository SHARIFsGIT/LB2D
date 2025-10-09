import { Response } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import { calculateScore, getQuestionsForStep, shuffleQuestions, questionPool } from '../data/questionPool';
import { asyncHandler } from '../middleware/error.middleware';
import Test from '../models/Test.model';
import User from '../models/User.model';
import Enrollment from '../models/Enrollment.model';
import { generateCertificate } from '../utils/certificate.generator';
import { notifyUser, notifyAdmins, notifySupervisors } from '../services/websocket.service';

// Start a new test or get current test
export const startTest = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.userId; // From auth middleware
  const { step = 1 } = req.body;

  // Check if user has an incomplete test at this step
  let test = await Test.findOne({
    userId,
    step,
    status: 'in-progress'
  });

  if (!test) {
    // Create new test
    test = await Test.create({
      userId,
      step,
      questions: [],
      score: 0,
      status: 'in-progress'
    });
  }

  // Get questions for this step
  const questions = shuffleQuestions(getQuestionsForStep(step));

  return res.status(200).json({
    success: true,
    data: {
      testId: test._id,
      step,
      questions: questions.map(q => ({
        id: q.id,
        text: q.text,
        options: q.options,
        competency: q.competency,
        level: q.level
      }))
    }
  });
});

// Submit test answers
export const submitTest = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { testId, answers, totalCompletionTime } = req.body;
  const userId = req.userId;

  // Validate answers is an array
  if (!Array.isArray(answers)) {
    return res.status(400).json({
      success: false,
      message: 'Answers must be an array'
    });
  }

  const test = await Test.findOne({
    _id: testId,
    userId,
    status: 'in-progress'
  });

  if (!test) {
    return res.status(404).json({
      success: false,
      message: 'Test not found or already completed'
    });
  }

  // Calculate score with new scoring system (44 questions per step)
  const score = calculateScore(answers, 44);
  
  // Determine certification level
  let certificationLevel = '';
  let proceedToNextStep = false;

  if (test.step === 1) {
    if (score < 25) {
      certificationLevel = 'Failed';
    } else if (score >= 75) {
      certificationLevel = 'A2';
      proceedToNextStep = true;
    } else if (score >= 50) {
      certificationLevel = 'A2';
    } else {
      certificationLevel = 'A1';
    }
  } else if (test.step === 2) {
    if (score < 25) {
      certificationLevel = 'A2';
    } else if (score >= 75) {
      certificationLevel = 'B2';
      proceedToNextStep = true;
    } else if (score >= 50) {
      certificationLevel = 'B2';
    } else {
      certificationLevel = 'B1';
    }
  } else if (test.step === 3) {
    if (score < 25) {
      certificationLevel = 'B2';
    } else if (score >= 50) {
      certificationLevel = 'C2';
    } else {
      certificationLevel = 'C1';
    }
  }

  // Prepare detailed question data
  const detailedQuestions = answers.map(answer => {
    const question = questionPool.find(q => q.id === answer.questionId);
    if (question) {
      return {
        questionId: answer.questionId,
        answer: answer.answer,
        timeSpent: answer.timeSpent || 30, // Default to 30 if not provided
        isCorrect: question.correctAnswer === answer.answer,
        questionText: question.text,
        selectedOption: question.options[answer.answer] || 'No answer',
        correctOption: question.options[question.correctAnswer]
      };
    }
    return {
      questionId: answer.questionId,
      answer: answer.answer,
      timeSpent: answer.timeSpent || 30,
      isCorrect: false,
      questionText: 'Question not found',
      selectedOption: 'Unknown',
      correctOption: 'Unknown'
    };
  });

  // Update test
  test.questions = detailedQuestions;
  test.score = score;
  test.certificationLevel = certificationLevel;
  test.status = proceedToNextStep ? 'in-progress' : 'completed';
  test.totalCompletionTime = totalCompletionTime || 0;
  test.completedAt = proceedToNextStep ? undefined : new Date();
  await test.save();

  // Notify student about assessment result
  try {
    const notificationTitle = proceedToNextStep ? 'Assessment Completed - Next Step Available!' : 'Assessment Completed';
    const notificationMessage = proceedToNextStep 
      ? `Congratulations! You scored ${score}% and achieved ${certificationLevel} level. Step ${test.step + 1} is now available.`
      : `Assessment completed! You scored ${score}% and achieved ${certificationLevel} level.`;

    await notifyUser(userId, {
      type: 'assessment',
      title: notificationTitle,
      message: notificationMessage,
      targetRole: 'Student',
      urgent: true,
      data: {
        testId: test._id.toString(),
        step: test.step,
        score: score,
        certificationLevel: certificationLevel,
        proceedToNextStep: proceedToNextStep,
        nextStep: proceedToNextStep ? test.step + 1 : null,
        completedAt: test.completedAt?.toISOString(),
        timestamp: new Date()
      }
    });
    // Additional notification if test is completed (certificate available)
    if (!proceedToNextStep && test.status === 'completed') {
      await notifyUser(userId, {
        type: 'certificate',
        title: 'Certificate Available',
        message: `Your ${certificationLevel} level certificate is now ready for download!`,
        targetRole: 'Student',
        urgent: false,
        data: {
          testId: test._id.toString(),
          certificationLevel: certificationLevel,
          score: score,
          step: test.step,
          completedAt: test.completedAt?.toISOString(),
          downloadAvailable: true,
          timestamp: new Date()
        }
      });
    }

    // Notify supervisors about student assessment completion
    const user = await User.findById(userId).select('firstName lastName email');
    if (user) {
      await notifySupervisors({
        type: 'assessment',
        title: 'Student Assessment Completed',
        message: `${user.firstName} ${user.lastName} completed Step ${test.step} assessment with ${score}% score (${certificationLevel} level)`,
        fromRole: 'Student',
        targetRole: 'Supervisor',
        data: {
          studentId: userId,
          studentName: `${user.firstName} ${user.lastName}`,
          studentEmail: user.email,
          testId: test._id.toString(),
          step: test.step,
          score: score,
          certificationLevel: certificationLevel,
          proceedToNextStep: proceedToNextStep,
          completedAt: test.completedAt?.toISOString(),
          timestamp: new Date()
        }
      });

      // Notify admins about high scores or test completions
      if (score >= 75 || (!proceedToNextStep && test.status === 'completed')) {
        await notifyAdmins({
          type: 'assessment',
          title: score >= 75 ? 'High Score Achievement' : 'Assessment Completion',
          message: score >= 75 
            ? `${user.firstName} ${user.lastName} achieved ${score}% in Step ${test.step} (${certificationLevel} level)`
            : `${user.firstName} ${user.lastName} completed final assessment with ${certificationLevel} certification`,
          fromRole: 'Student',
          targetRole: 'Admin',
          urgent: score >= 90,
          data: {
            studentId: userId,
            studentName: `${user.firstName} ${user.lastName}`,
            studentEmail: user.email,
            testId: test._id.toString(),
            step: test.step,
            score: score,
            certificationLevel: certificationLevel,
            isHighScore: score >= 75,
            isFinalCompletion: !proceedToNextStep && test.status === 'completed',
            completedAt: test.completedAt?.toISOString(),
            timestamp: new Date()
          }
        });
      }
    }
  } catch (notificationError) {
    console.error('Failed to send assessment result notification:', notificationError);
  }

  return res.status(200).json({
    success: true,
    data: {
      score,
      certificationLevel,
      proceedToNextStep,
      nextStep: proceedToNextStep ? test.step + 1 : null
    }
  });
});

// Get test results
export const getTestResults = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.userId;

  const tests = await Test.find({ userId, status: 'completed' })
    .sort('-completedAt')
    .limit(10);

  return res.status(200).json({
    success: true,
    data: tests
  });
});

// Get user rankings
export const getUserRankings = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.userId;

  try {
    // Get current user's best scores
    const userTests = await Test.find({ userId, status: 'completed' });
    if (userTests.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          examScore: null,
          examRank: null,
          totalUsers: 0,
          hasCompletedTests: false
        }
      });
    }

    // Calculate user's best exam score
    const userBestScore = Math.max(...userTests.map(test => test.score));
    // Get all completed tests from all users to calculate rankings
    const allTests = await Test.find({ status: 'completed' })
      .populate('userId', 'firstName lastName')
      .sort({ score: -1 });
    // Group by user and get their best scores
    const userBestScores = new Map();
    allTests.forEach(test => {
      if (test.userId && test.userId._id) {
        const userIdStr = test.userId._id.toString();
        if (!userBestScores.has(userIdStr) || userBestScores.get(userIdStr).score < test.score) {
          userBestScores.set(userIdStr, {
            userId: userIdStr,
            score: test.score,
            name: `${(test.userId as any).firstName} ${(test.userId as any).lastName}`
          });
        }
      }
    });
    
    // Convert to array and sort by score
    const rankings = Array.from(userBestScores.values())
      .sort((a, b) => b.score - a.score);
    // Find current user's rank
    const userRank = rankings.findIndex(entry => entry.userId === userId.toString()) + 1;
    return res.status(200).json({
      success: true,
      data: {
        examScore: userBestScore,
        examRank: userRank > 0 ? userRank : null,
        totalUsers: rankings.length,
        hasCompletedTests: true,
        rankings: rankings.slice(0, 10) // Top 10 for leaderboard
      }
    });
  } catch (error) {
    console.error('Error fetching user rankings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch rankings'
    });
  }
});

// Export download certificate
export const downloadCertificate = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.userId;
  const { testId } = req.params;

  const test = await Test.findOne({
    _id: testId,
    userId,
    status: 'completed'
  }).populate('userId');

  if (!test) {
    return res.status(404).json({
      success: false,
      message: 'Test not found'
    });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  generateCertificate(res, {
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    score: test.score,
    level: test.certificationLevel,
    date: test.completedAt || new Date()
  });
});

// Get test history for current user
export const getTestHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.userId;

  const tests = await Test.find({ userId, status: 'completed' })
    .sort({ completedAt: -1 })
    .limit(50);

  return res.status(200).json({
    success: true,
    data: tests
  });
});

// Get all test reports for admin analytics
export const getTestReports = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { page = 1, limit = 20, userId, step, includeEnrolledOnly } = req.query;
  
  const skip = (Number(page) - 1) * Number(limit);
  
  try {
    // If includeEnrolledOnly is true, show enrolled students without tests
    if (includeEnrolledOnly === 'true') {
      // Get enrolled students who don't have test results
      const studentsWithTests = await Test.distinct('userId');
      
      const enrolledStudents = await Enrollment.find({
        status: { $in: ['confirmed', 'active', 'completed'] },
        userId: { $nin: studentsWithTests }
      })
      .populate('userId', 'firstName lastName email')
      .populate('courseId', 'title level')
      .sort('-enrollmentDate')
      .limit(Number(limit))
      .skip(skip);
      
      const totalEnrolledWithoutTests = await Enrollment.countDocuments({
        status: { $in: ['confirmed', 'active', 'completed'] },
        userId: { $nin: studentsWithTests }
      });
      const formattedEnrollments = enrolledStudents.map(enrollment => ({
        id: `enrollment_${enrollment._id}`,
        user: {
          id: enrollment.userId._id,
          firstName: enrollment.userId.firstName,
          lastName: enrollment.userId.lastName,
          email: enrollment.userId.email
        },
        step: null,
        score: null,
        certificationLevel: 'Not Started',
        completedAt: null,
        totalCompletionTime: null,
        questionsAttempted: 0,
        correctAnswers: 0,
        status: 'enrolled_no_test',
        createdAt: enrollment.enrollmentDate,
        courseInfo: {
          title: enrollment.courseId.title,
          level: enrollment.courseId.level
        },
        enrollmentStatus: enrollment.status,
        enrollmentDate: enrollment.enrollmentDate
      }));
      
      return res.status(200).json({
        success: true,
        data: {
          tests: formattedEnrollments,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalEnrolledWithoutTests,
            pages: Math.ceil(totalEnrolledWithoutTests / Number(limit))
          }
        }
      });
    }
    
    // Original logic for test results
    const filter: any = { status: 'completed' };
    if (userId) filter.userId = userId;
    if (step) filter.step = parseInt(step as string);
    const tests = await Test.find(filter)
      .populate('userId', 'firstName lastName email')
      .sort('-completedAt')
      .limit(Number(limit))
      .skip(skip);
    const total = await Test.countDocuments(filter);
    const formattedTests = tests.map(test => {
      return {
        id: test._id,
        user: {
          id: test.userId._id,
          firstName: test.userId.firstName,
          lastName: test.userId.lastName,
          email: test.userId.email
        },
        step: test.step,
        score: test.score,
        certificationLevel: test.certificationLevel,
        completedAt: test.completedAt,
        totalCompletionTime: test.totalCompletionTime,
        questionsAttempted: test.questions.length,
        correctAnswers: test.questions.filter(q => q.isCorrect).length,
        status: test.status,
        createdAt: test.createdAt
      };
    });
    
    return res.status(200).json({
      success: true,
      data: {
        tests: formattedTests,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error in getTestReports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch test reports',
      error: error.message
    });
  }
});

// Get detailed test report for PDF generation
export const getTestDetails = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { testId } = req.params;
  
  const test = await Test.findById(testId)
    .populate('userId', 'firstName lastName email');
    
  if (!test) {
    return res.status(404).json({
      success: false,
      message: 'Test not found'
    });
  }
  
  return res.status(200).json({
    success: true,
    data: {
      id: test._id,
      user: {
        id: test.userId._id,
        firstName: test.userId.firstName,
        lastName: test.userId.lastName,
        email: test.userId.email
      },
      step: test.step,
      score: test.score,
      certificationLevel: test.certificationLevel,
      completedAt: test.completedAt,
      totalCompletionTime: test.totalCompletionTime,
      status: test.status,
      createdAt: test.createdAt,
      questions: test.questions.map((q, index) => ({
        questionNumber: index + 1,
        questionId: q.questionId,
        questionText: q.questionText,
        selectedOption: q.selectedOption,
        correctOption: q.correctOption,
        isCorrect: q.isCorrect,
        timeSpent: q.timeSpent
      }))
    }
  });
});