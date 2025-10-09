import { Response } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import Quiz from '../models/Quiz.model';
import QuizAttempt from '../models/QuizAttempt.model';
import Course from '../models/Course.model';
import Enrollment from '../models/Enrollment.model';
import Video from '../models/Video.model';
import VideoProgress from '../models/VideoProgress.model';
import CourseResource from '../models/CourseResource.model';
import ResourceProgress from '../models/ResourceProgress.model';
import User from '../models/User.model';
import notificationService from '../services/notification.service';

// Utility function to update course progress
const updateCourseProgress = async (userId: string, courseId: string) => {
  try {
    // Find the student's enrollment for this course
    const enrollment = await Enrollment.findOne({
      userId,
      courseId
    });

    if (!enrollment) {
      return;
    }

    // Get course details
    const course = await Course.findById(courseId);
    if (!course) {
      return;
    }

    // Count total approved and active quizzes in the course
    const totalQuizzes = await Quiz.countDocuments({
      courseId,
      status: 'approved',
      isActive: true
    });

    // Count total approved videos in the course
    const totalVideos = await Video.countDocuments({
      courseId,
      status: 'approved'
    });

    // Count total approved resources in the course
    const totalResources = await CourseResource.countDocuments({
      courseId,
      status: 'approved',
      isActive: true
    });

    // Count completed videos by this student for this course
    const completedVideos = await VideoProgress.countDocuments({
      userId,
      courseId,
      completed: true
    });

    // Count completed resources by this student for this course
    const completedResources = await ResourceProgress.countDocuments({
      userId,
      courseId,
      completed: true
    });

    // Count completed quizzes by this student for this course
    const completedQuizAttempts = await QuizAttempt.find({
      studentId: userId,
      status: { $in: ['submitted', 'graded'] }
    }).populate({
      path: 'quizId',
      match: { courseId },
      select: '_id'
    });

    const completedQuizzes = completedQuizAttempts.filter(attempt => attempt.quizId).length;

    // Calculate total lessons and completed lessons
    const totalLessons = totalVideos + totalQuizzes + totalResources;
    const completedLessons = completedVideos + completedQuizzes + completedResources;

    // Calculate progress percentage
    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Update enrollment with new progress
    await Enrollment.findByIdAndUpdate(enrollment._id, {
      $set: {
        'progress.lessonsCompleted': completedLessons,
        'progress.totalLessons': totalLessons,
        'progress.percentage': progressPercentage,
        status: progressPercentage >= 100 ? 'completed' : 'active'
      }
    });
    return {
      totalLessons,
      completedLessons,
      progressPercentage
    };

  } catch (error) {
    console.error('Error in updateCourseProgress:', error);
    throw error;
  }
};

// Create a new quiz/exam
export const createQuiz = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId, title, description, type, questions, timeLimit, attemptLimit, dueDate } = req.body;
    const supervisorId = req.userId;

    // Verify supervisor has access to this course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Create quiz - will be draft by default from the model
    const quiz = await Quiz.create({
      courseId,
      supervisorId,
      title,
      description,
      type,
      questions,
      timeLimit,
      attemptLimit,
      dueDate,
      sequenceNumber: req.body.sequenceNumber || 1,
      isActive: false, // Always set to false initially, only admin can approve and make it available
      status: 'draft' // Explicitly set to draft status
    });

    await quiz.populate('courseId', 'title level');

    // Notify admins about pending quiz approval (PERSISTED)
    try {
      const supervisor = await User.findById(supervisorId);
      if (supervisor) {
        await notificationService.notifyRole('Admin', {
          type: 'quiz',
          title: 'New Quiz Awaiting Approval',
          message: `${supervisor.firstName} ${supervisor.lastName} created quiz "${title}" for ${course.title}`,
          fromRole: 'Supervisor',
          urgent: false,
          data: {
            fromUserId: supervisorId,
            quizId: quiz._id.toString(),
            quizTitle: title,
            courseId: course._id.toString(),
            courseTitle: course.title,
            actionUrl: '/admin/content-management'
          }
        });
      }
    } catch (notificationError) {
      console.error('Failed to notify admins about pending quiz:', notificationError);
    }

    return res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      data: quiz
    });
  } catch (error: any) {
    console.error('Error creating quiz:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create quiz',
      error: error.message
    });
  }
};

// Get all quizzes for a course
export const getCourseQuizzes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const { type, isActive } = req.query;
    const userRole = req.userRole;

    const filter: any = { courseId };

    // Students can only see approved and active quizzes
    if (userRole === 'Student') {
      filter.status = 'approved';
      filter.isActive = true;
    } else {
      // Supervisors and Admins can see all quizzes they have access to
      if (type) filter.type = type;
      if (isActive !== undefined) filter.isActive = isActive === 'true';
    }

    // Supervisors don't see approved deletions
    if (userRole === 'Supervisor') {
      filter.$or = [
        { deletionStatus: { $exists: false } },
        { deletionStatus: { $in: ['none', 'rejected'] } }
      ];
    }

    const quizzes = await Quiz.find(filter)
      .populate('courseId', 'title level')
      .populate('supervisorId', 'firstName lastName')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: quizzes
    });
  } catch (error: any) {
    console.error('Error fetching course quizzes:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch quizzes',
      error: error.message
    });
  }
};

// Update quiz
export const updateQuiz = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const supervisorId = req.userId;
    const updates = req.body;

    // Find quiz and verify ownership
    const quiz = await Quiz.findOne({ _id: quizId, supervisorId });
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or you do not have permission to edit it'
      });
    }

    // Update quiz
    const updatedQuiz = await Quiz.findByIdAndUpdate(
      quizId,
      updates,
      { new: true, runValidators: true }
    ).populate('courseId', 'title level');

    return res.status(200).json({
      success: true,
      message: 'Quiz updated successfully',
      data: updatedQuiz
    });
  } catch (error: any) {
    console.error('Error updating quiz:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update quiz',
      error: error.message
    });
  }
};

// Submit quiz for approval
export const submitQuizForApproval = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const supervisorId = req.userId;

    const quiz = await Quiz.findOne({ _id: quizId, supervisorId })
      .populate('supervisorId', 'firstName lastName')
      .populate('courseId', 'title level');
      
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or you do not have permission'
      });
    }

    if (quiz.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Quiz is already pending approval'
      });
    }

    if (quiz.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Quiz is already approved and active'
      });
    }

    // Allow resubmission of rejected quizzes
    // Removed the rejected status check to allow resubmission

    quiz.status = 'pending';
    await quiz.save();

    // Notify admins about pending quiz approval (PERSISTED)
    try {
      const supervisorInfo = quiz.supervisorId as any;
      const courseInfo = quiz.courseId as any;

      await notificationService.notifyRole('Admin', {
        type: 'quiz',
        title: 'New Quiz Pending Approval',
        message: `${supervisorInfo?.firstName} ${supervisorInfo?.lastName} submitted ${quiz.type} "${quiz.title}" for approval`,
        fromRole: 'Supervisor',
        urgent: false,
        data: {
          fromUserId: supervisorId,
          quizId: quiz._id.toString(),
          quizTitle: quiz.title,
          quizType: quiz.type,
          supervisorName: `${supervisorInfo?.firstName} ${supervisorInfo?.lastName}`,
          courseId: quiz.courseId.toString(),
          courseTitle: courseInfo?.title,
          actionUrl: '/admin/content-management'
        }
      });
    } catch (notificationError) {
      console.error('Failed to notify admins about pending quiz:', notificationError);
    }

    return res.status(200).json({
      success: true,
      message: 'Quiz submitted for approval successfully',
      data: { status: quiz.status }
    });
  } catch (error: any) {
    console.error('Error submitting quiz for approval:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit quiz for approval',
      error: error.message
    });
  }
};

// Resubmit rejected quiz for approval
export const resubmitQuiz = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const supervisorId = req.userId;

    const quiz = await Quiz.findOne({ _id: quizId, supervisorId })
      .populate('supervisorId', 'firstName lastName')
      .populate('courseId', 'title level');
      
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or you do not have permission'
      });
    }

    if (quiz.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Only rejected quizzes can be resubmitted'
      });
    }

    // Clear previous rejection data and set to pending
    quiz.status = 'pending';
    quiz.rejectionReason = undefined;
    await quiz.save();

    // Notify admin about resubmitted quiz
    const io = req.app.get('io');
    if (io) {
      const supervisorInfo = quiz.supervisorId as any;
      const courseInfo = quiz.courseId as any;
      
      io.emit('admin_notification', {
        type: 'quiz_resubmitted',
        message: `${quiz.type} resubmitted for approval`,
        data: {
          quizId: quiz._id,
          quizTitle: quiz.title,
          quizType: quiz.type,
          supervisorName: `${supervisorInfo?.firstName} ${supervisorInfo?.lastName}`,
          courseTitle: courseInfo?.title,
          courseLevel: courseInfo?.level,
          courseId: quiz.courseId
        },
        timestamp: new Date()
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Quiz resubmitted for approval successfully',
      data: { status: quiz.status }
    });
  } catch (error: any) {
    console.error('Error resubmitting quiz:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resubmit quiz',
      error: error.message
    });
  }
};

// Get quiz attempts for grading
export const getQuizAttempts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const { status } = req.query;

    const filter: any = { quizId };
    if (status) filter.status = status;

    const attempts = await QuizAttempt.find(filter)
      .populate('studentId', 'firstName lastName email')
      .populate('quizId', 'title type totalPoints')
      .sort({ submittedAt: -1 });

    return res.status(200).json({
      success: true,
      data: attempts
    });
  } catch (error: any) {
    console.error('Error fetching quiz attempts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz attempts',
      error: error.message
    });
  }
};

// Grade a quiz attempt
export const gradeQuizAttempt = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { answers, supervisorFeedback } = req.body;
    const supervisorId = req.userId;

    const attempt = await QuizAttempt.findById(attemptId)
      .populate('quizId');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found'
      });
    }

    // Update answers with grading
    let totalScore = 0;
    attempt.answers = attempt.answers.map((answer, index) => {
      const gradedAnswer = answers.find((a: any) => a.questionId === answer.questionId);
      if (gradedAnswer) {
        answer.isCorrect = gradedAnswer.isCorrect;
        answer.pointsEarned = gradedAnswer.pointsEarned || 0;
        answer.feedback = gradedAnswer.feedback;
        totalScore += answer.pointsEarned || 0;
      }
      return answer;
    });

    // Update attempt
    attempt.score = totalScore;
    attempt.isGraded = true;
    attempt.gradedBy = supervisorId as any;
    attempt.gradedAt = new Date();
    attempt.supervisorFeedback = supervisorFeedback;
    attempt.status = 'graded';

    await attempt.save();

    await attempt.populate('studentId', 'firstName lastName email');

    return res.status(200).json({
      success: true,
      message: 'Quiz attempt graded successfully',
      data: attempt
    });
  } catch (error: any) {
    console.error('Error grading quiz attempt:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to grade quiz attempt',
      error: error.message
    });
  }
};

// Delete quiz or request deletion approval
export const deleteQuiz = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const userId = req.userId;
    const userRole = req.userRole;

    // Admin can delete any quiz directly
    if (userRole === 'Admin') {
      const quiz = await Quiz.findById(quizId);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }

      // Delete the quiz and related attempts
      await Quiz.findByIdAndDelete(quizId);
      await QuizAttempt.deleteMany({ quizId });

      return res.status(200).json({
        success: true,
        message: 'Quiz deleted successfully'
      });
    }

    // Supervisor flow - check ownership
    const quiz = await Quiz.findOne({ _id: quizId, supervisorId: userId });
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or you do not have permission to delete it'
      });
    }

    // If quiz is approved, require admin approval for deletion
    if (quiz.status === 'approved') {
      quiz.deletionStatus = 'pending';
      quiz.deletionRequestedBy = userId as any;
      quiz.deletionRequestedAt = new Date();
      await quiz.save();

      return res.status(200).json({
        success: true,
        message: 'Deletion request submitted to admin for approval',
        data: { requiresApproval: true, quiz }
      });
    }

    // If quiz is not approved (pending or rejected), delete directly
    await Quiz.findByIdAndDelete(quizId);

    return res.status(200).json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting quiz:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete quiz',
      error: error.message
    });
  }
};

// Get supervisor's quiz statistics
export const getQuizStatistics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supervisorId = req.userId;

    // Get quiz counts by type
    const quizStats = await Quiz.aggregate([
      { $match: { supervisorId: supervisorId as any } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      }
    ]);

    // Get attempt statistics
    const attemptStats = await QuizAttempt.aggregate([
      {
        $lookup: {
          from: 'quizzes',
          localField: 'quizId',
          foreignField: '_id',
          as: 'quiz'
        }
      },
      { $unwind: '$quiz' },
      { $match: { 'quiz.supervisorId': supervisorId as any } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          averageScore: { $avg: '$percentage' }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        quizStats,
        attemptStats
      }
    });
  } catch (error: any) {
    console.error('Error fetching quiz statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz statistics',
      error: error.message
    });
  }
};

// Approve quiz (Admin only)
export const approveQuiz = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const adminId = req.userId;

    const quiz = await Quiz.findById(quizId).populate('courseId', 'title').populate('supervisorId', 'firstName lastName');
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    if (quiz.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Quiz is not pending approval'
      });
    }

    quiz.status = 'approved';
    quiz.approvedBy = adminId as any;
    quiz.approvedAt = new Date();
    quiz.isActive = true; // Make quiz active when approved
    await quiz.save();

    const supervisorInfo = quiz.supervisorId as any;
    const courseInfo = quiz.courseId as any;

    // Notify supervisor about quiz approval (PERSISTED)
    try {
      await notificationService.createNotification(quiz.supervisorId.toString(), {
        type: 'quiz',
        title: 'Quiz Approved',
        message: `Your ${quiz.type} "${quiz.title}" for ${courseInfo.title} has been approved and is now available to students.`,
        fromRole: 'Admin',
        urgent: false,
        data: {
          fromUserId: adminId,
          quizId: quiz._id,
          quizTitle: quiz.title,
          quizType: quiz.type,
          courseId: quiz.courseId,
          courseTitle: courseInfo.title,
          actionUrl: `/quizzes/${quiz._id}`
        }
      });
    } catch (notificationError) {
      console.error('Failed to send quiz approval notification to supervisor:', notificationError);
    }

    // Notify enrolled students about the new quiz (PERSISTED)
    try {
      const enrollments = await Enrollment.find({
        courseId: quiz.courseId,
        status: 'active'
      }).select('studentId');

      if (enrollments.length > 0) {
        const studentIds = enrollments.map(e => e.studentId.toString());
        await notificationService.createBulkNotifications(studentIds, {
          type: 'quiz',
          title: 'New Quiz Available',
          message: `A new ${quiz.type} "${quiz.title}" is now available in ${courseInfo.title}`,
          fromRole: 'Admin',
          urgent: false,
          data: {
            fromUserId: adminId,
            quizId: quiz._id,
            quizTitle: quiz.title,
            quizType: quiz.type,
            courseId: quiz.courseId,
            courseTitle: courseInfo.title,
            actionUrl: `/courses/${quiz.courseId}/quizzes/${quiz._id}`
          }
        });
      }
    } catch (notificationError) {
      console.error('Failed to notify students about approved quiz:', notificationError);
    }

    return res.status(200).json({
      success: true,
      message: 'Quiz approved successfully',
      data: quiz
    });
  } catch (error: any) {
    console.error('Error approving quiz:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve quiz',
      error: error.message
    });
  }
};

// Reject quiz (Admin only)
export const rejectQuiz = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const { rejectionReason } = req.body;

    const quiz = await Quiz.findById(quizId).populate('supervisorId', 'firstName lastName');
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    if (quiz.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Quiz is not pending approval'
      });
    }

    quiz.status = 'rejected';
    quiz.rejectionReason = rejectionReason;
    await quiz.save();

    // Notify supervisor about quiz rejection (PERSISTED)
    try {
      const adminId = req.userId;
      const supervisorId = quiz.supervisorId.toString();

      await notificationService.createNotification(supervisorId, {
        type: 'quiz',
        title: 'Quiz Rejected',
        message: `Your ${quiz.type} "${quiz.title}" was rejected. Reason: ${rejectionReason}`,
        fromRole: 'Admin',
        urgent: true,
        data: {
          fromUserId: adminId,
          quizId: quiz._id,
          quizTitle: quiz.title,
          quizType: quiz.type,
          rejectionReason: rejectionReason,
          courseId: quiz.courseId,
          actionUrl: `/quizzes/${quiz._id}/edit`
        }
      });
    } catch (notificationError) {
      console.error('Failed to send quiz rejection notification:', notificationError);
    }

    return res.status(200).json({
      success: true,
      message: 'Quiz rejected successfully',
      data: quiz
    });
  } catch (error: any) {
    console.error('Error rejecting quiz:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject quiz',
      error: error.message
    });
  }
};

// Get pending quizzes for approval (Admin only)
export const getPendingQuizzes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Exclude quizzes with deletionStatus 'pending' (they appear in pending-deletion endpoint)
    // Include 'approved' deletions so admin can still see them
    const quizzes = await Quiz.find({
      status: 'pending',
      $or: [
        { deletionStatus: { $exists: false } },
        { deletionStatus: { $in: ['none', 'rejected', 'approved'] } }
      ]
    })
      .populate('supervisorId', 'firstName lastName')
      .populate('courseId', 'title level')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: quizzes.length,
      data: quizzes
    });
  } catch (error: any) {
    console.error('Error fetching pending quizzes:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch pending quizzes',
      error: error.message
    });
  }
};

// Get rejected quizzes for approval (Admin only)
export const getRejectedQuizzes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Exclude quizzes with deletionStatus 'pending' (they appear in pending-deletion endpoint)
    // Include 'approved' deletions so admin can still see them
    const quizzes = await Quiz.find({
      status: 'rejected',
      $or: [
        { deletionStatus: { $exists: false } },
        { deletionStatus: { $in: ['none', 'rejected', 'approved'] } }
      ]
    })
      .populate('supervisorId', 'firstName lastName')
      .populate('courseId', 'title level')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: quizzes.length,
      data: quizzes
    });
  } catch (error: any) {
    console.error('Error fetching rejected quizzes:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch rejected quizzes',
      error: error.message
    });
  }
};

// Get all quizzes for admin review (pending, rejected, and approved)
export const getQuizzesForAdminReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Return quizzes that need admin review - pending, approved, and rejected
    // Exclude quizzes with deletionStatus 'pending' (they appear in pending-deletion endpoint)
    // Include 'approved' deletions so admin can still see them
    const quizzes = await Quiz.find({
      status: { $in: ['pending', 'rejected', 'approved'] },
      $or: [
        { deletionStatus: { $exists: false } },
        { deletionStatus: { $in: ['none', 'rejected', 'approved'] } }
      ]
    })
      .populate('supervisorId', 'firstName lastName')
      .populate('courseId', 'title level')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: quizzes.length,
      data: quizzes
    });
  } catch (error: any) {
    console.error('Error fetching quizzes for admin review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch quizzes for admin review',
      error: error.message
    });
  }
};

// Get approved quizzes for approval (Admin only)
export const getApprovedQuizzes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Exclude quizzes with deletionStatus 'pending' (they appear in pending-deletion endpoint)
    // Include 'approved' deletions so admin can still see them
    const quizzes = await Quiz.find({
      status: 'approved',
      $or: [
        { deletionStatus: { $exists: false } },
        { deletionStatus: { $in: ['none', 'rejected', 'approved'] } }
      ]
    })
      .populate('supervisorId', 'firstName lastName')
      .populate('courseId', 'title level')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: quizzes.length,
      data: quizzes
    });
  } catch (error: any) {
    console.error('Error fetching approved quizzes:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch approved quizzes',
      error: error.message
    });
  }
};

// Get a single quiz by ID (for students taking the quiz)
export const getQuizById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const userRole = req.userRole;

    const filter: any = { _id: quizId };
    
    // Students can only access approved and active quizzes
    if (userRole === 'Student') {
      filter.status = 'approved';
      filter.isActive = true;
    }

    const quiz = await Quiz.findOne(filter)
      .populate('courseId', 'title level')
      .populate('supervisorId', 'firstName lastName');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or you do not have permission to access it'
      });
    }

    return res.status(200).json({
      success: true,
      data: quiz
    });
  } catch (error: any) {
    console.error('Error fetching quiz:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz',
      error: error.message
    });
  }
};

// Get all quiz attempts for admin analytics
export const getAllQuizAttemptsForAdmin = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { timeRange } = req.query;
    
    // Build date filter based on timeRange
    const dateFilter: any = {};
    if (timeRange) {
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          startDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), 0, 1); // Default to year
      }
      
      dateFilter.submittedAt = { $gte: startDate };
    }

    // Get quiz attempts with date filtering
    const attempts = await QuizAttempt.find({
      status: { $in: ['submitted', 'graded'] },
      ...dateFilter
    })
    .populate('studentId', 'firstName lastName email')
    .populate('quizId', 'title type courseId supervisorId')
    .populate({
      path: 'quizId',
      populate: [
        {
          path: 'courseId',
          select: 'title level'
        },
        {
          path: 'supervisorId',
          select: 'firstName lastName'
        }
      ]
    })
    .sort({ submittedAt: -1 });

    return res.status(200).json({
      success: true,
      data: attempts
    });

  } catch (error: any) {
    console.error('Error fetching admin quiz attempts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz attempts',
      error: error.message
    });
  }
};

// Get all quiz attempts for supervisor's courses
export const getAllQuizAttemptsForSupervisor = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supervisorId = req.userId;

    // Get quizzes created by this supervisor
    const supervisorQuizzes = await Quiz.find({ supervisorId });
    const quizIds = supervisorQuizzes.map(quiz => quiz._id);

    // Get all attempts for these quizzes
    const attempts = await QuizAttempt.find({
      quizId: { $in: quizIds }
    })
    .populate('studentId', 'firstName lastName email')
    .populate('quizId', 'title type courseId')
    .populate({
      path: 'quizId',
      populate: {
        path: 'courseId',
        select: 'title level'
      }
    })
    .sort({ submittedAt: -1 });

    return res.status(200).json({
      success: true,
      data: attempts
    });

  } catch (error: any) {
    console.error('Error fetching supervisor quiz attempts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz attempts',
      error: error.message
    });
  }
};

// Get student's own quiz attempts
export const getMyQuizAttempts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const studentId = req.userId;

    const attempts = await QuizAttempt.find({
      quizId,
      studentId
    }).sort({ attemptNumber: -1 });

    return res.status(200).json({
      success: true,
      data: attempts
    });

  } catch (error: any) {
    console.error('Error fetching student quiz attempts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz attempts',
      error: error.message
    });
  }
};

// Submit quiz attempt (for students)
export const submitQuizAttempt = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quizId, answers, completionTime, timeLimit } = req.body;
    const studentId = req.userId;

    // Fetch the quiz to validate and get questions
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Verify quiz is approved and active
    if (quiz.status !== 'approved' || !quiz.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Quiz is not available for submission'
      });
    }

    // Check if student has already reached attempt limit
    const existingAttempts = await QuizAttempt.countDocuments({
      quizId,
      studentId,
      status: { $in: ['submitted', 'graded'] }
    });

    if (quiz.attemptLimit && existingAttempts >= quiz.attemptLimit) {
      return res.status(400).json({
        success: false,
        message: 'You have reached the maximum number of attempts for this quiz'
      });
    }

    // Calculate score
    let correctAnswers = 0;
    const processedAnswers = answers.map((answer: any, index: number) => {
      const question = quiz.questions[index];
      const isCorrect = question && answer.answer === question.correctAnswer;
      if (isCorrect) correctAnswers++;

      return {
        questionId: question?._id || `question_${index}`,
        answer: answer.answer,
        isCorrect,
        pointsEarned: isCorrect ? (question?.points || 1) : 0
      };
    });

    const maxScore = quiz.questions.reduce((total, q) => total + (q.points || 1), 0);
    const score = processedAnswers.reduce((total, answer) => total + answer.pointsEarned, 0);
    const percentage = Math.round((score / maxScore) * 100);

    // Get next attempt number
    const nextAttemptNumber = existingAttempts + 1;

    // Create quiz attempt
    const quizAttempt = await QuizAttempt.create({
      quizId,
      studentId,
      answers: processedAnswers,
      score,
      maxScore,
      percentage,
      submittedAt: new Date(),
      timeSpent: completionTime,
      status: 'submitted',
      attemptNumber: nextAttemptNumber
    });

    // Update course progress after successful quiz submission
    try {
      await updateCourseProgress(studentId, quiz.courseId.toString());
    } catch (progressError) {
      console.error('Error updating course progress after quiz submission:', progressError);
      // Don't fail the quiz submission if progress update fails
    }

    return res.status(201).json({
      success: true,
      data: {
        attemptId: quizAttempt._id,
        score,
        maxScore,
        percentage,
        correctAnswers,
        totalQuestions: quiz.questions.length,
        attemptNumber: nextAttemptNumber
      },
      message: 'Quiz submitted successfully'
    });

  } catch (error: any) {
    console.error('Error submitting quiz attempt:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit quiz attempt',
      error: error.message
    });
  }
};

// Admin: Get quizzes pending deletion approval
export const getQuizzesPendingDeletion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const quizzes = await Quiz.find({ 
      deletionStatus: 'pending' 
    })
    .populate('supervisorId', 'firstName lastName email')
    .populate('courseId', 'title level')
    .populate('deletionRequestedBy', 'firstName lastName email')
    .sort({ deletionRequestedAt: -1 });

    return res.status(200).json({
      success: true,
      data: quizzes
    });
  } catch (error: any) {
    console.error('Error fetching quizzes pending deletion:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch quizzes pending deletion',
      error: error.message
    });
  }
};

// Admin: Approve quiz deletion
export const approveDeletion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const adminId = req.userId;

    const quiz = await Quiz.findOne({
      _id: quizId,
      deletionStatus: 'pending'
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or not pending deletion'
      });
    }

    // Mark quiz as deleted (hide from supervisor) instead of actually deleting it
    quiz.deletionStatus = 'approved';
    quiz.deletionApprovedBy = adminId as any;
    quiz.deletionApprovedAt = new Date();
    await quiz.save();

    return res.status(200).json({
      success: true,
      message: 'Quiz deletion approved - quiz hidden from supervisor',
      data: quiz
    });
  } catch (error: any) {
    console.error('Error approving quiz deletion:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve quiz deletion',
      error: error.message
    });
  }
};

// Admin: Reject quiz deletion
export const rejectDeletion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const { reason } = req.body;
    const adminId = req.userId;

    const quiz = await Quiz.findOne({ 
      _id: quizId, 
      deletionStatus: 'pending' 
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or not pending deletion'
      });
    }

    // Update deletion status to rejected
    quiz.deletionStatus = 'rejected';
    quiz.deletionApprovedBy = adminId as any;
    quiz.deletionApprovedAt = new Date();
    quiz.deletionRejectionReason = reason || 'Deletion request rejected by admin';

    await quiz.save();

    await quiz.populate('supervisorId', 'firstName lastName email');
    await quiz.populate('courseId', 'title level');

    return res.status(200).json({
      success: true,
      message: 'Quiz deletion rejected successfully',
      data: quiz
    });
  } catch (error: any) {
    console.error('Error rejecting quiz deletion:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject quiz deletion',
      error: error.message
    });
  }
};