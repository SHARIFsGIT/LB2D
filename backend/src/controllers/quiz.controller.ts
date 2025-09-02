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

// Utility function to update course progress
const updateCourseProgress = async (userId: string, courseId: string) => {
  try {
    // Find the student's enrollment for this course
    const enrollment = await Enrollment.findOne({
      userId,
      courseId
    });

    if (!enrollment) {
      console.log(`No enrollment found for user ${userId} in course ${courseId}`);
      return;
    }

    // Get course details
    const course = await Course.findById(courseId);
    if (!course) {
      console.log(`Course ${courseId} not found`);
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

    console.log(`📊 Course progress updated for user ${userId}:`, {
      courseId,
      totalVideos,
      completedVideos,
      totalQuizzes,
      completedQuizzes,
      totalResources,
      completedResources,
      totalLessons,
      completedLessons,
      progressPercentage: `${progressPercentage}%`
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

    // Notify admin about pending quiz approval
    const io = req.app.get('io');
    if (io) {
      const supervisorInfo = quiz.supervisorId as any;
      const courseInfo = quiz.courseId as any;
      
      io.emit('admin_notification', {
        type: 'quiz_approval',
        message: `New ${quiz.type} pending approval`,
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
    const supervisorId = req.userId;

    const quiz = await Quiz.findOne({ _id: quizId, supervisorId });
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or you do not have permission to delete it'
      });
    }

    // Check if quiz has attempts
    const attemptCount = await QuizAttempt.countDocuments({ quizId });
    
    // If quiz is approved and has attempts, require admin approval for deletion
    if (quiz.status === 'approved' && attemptCount > 0) {
      // Update quiz to request deletion approval
      quiz.deletionStatus = 'pending';
      quiz.deletionRequestedBy = supervisorId as any;
      quiz.deletionRequestedAt = new Date();
      await quiz.save();

      return res.status(200).json({
        success: true,
        message: 'Deletion request submitted to admin for approval',
        data: { requiresApproval: true, quiz }
      });
    }

    // If quiz has no attempts or is not approved, delete directly
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

    // Send notifications to supervisor and students
    const io = req.app.get('io');
    if (io) {
      const supervisorInfo = quiz.supervisorId as any;
      const courseInfo = quiz.courseId as any;

      // Notify supervisor
      io.emit(`supervisor_${quiz.supervisorId}_notification`, {
        type: 'quiz_approved',
        message: `Your ${quiz.type} "${quiz.title}" has been approved`,
        data: {
          quizId: quiz._id,
          quizTitle: quiz.title,
          quizType: quiz.type,
          courseTitle: courseInfo?.title,
          courseId: quiz.courseId
        },
        timestamp: new Date()
      });

      // Notify all students in the course about new quiz
      io.emit('student_course_notification', {
        type: 'new_quiz',
        message: `New ${quiz.type} available: ${quiz.title}`,
        data: {
          quizId: quiz._id,
          quizTitle: quiz.title,
          quizType: quiz.type,
          courseTitle: courseInfo?.title,
          courseId: quiz.courseId,
          supervisorName: `${supervisorInfo?.firstName} ${supervisorInfo?.lastName}`
        },
        courseId: quiz.courseId,
        timestamp: new Date()
      });
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

    // Send notification to supervisor about rejection
    const io = req.app.get('io');
    if (io) {
      const supervisorInfo = quiz.supervisorId as any;
      
      io.emit(`supervisor_${quiz.supervisorId}_notification`, {
        type: 'quiz_rejected',
        message: `Your ${quiz.type} "${quiz.title}" was rejected`,
        data: {
          quizId: quiz._id,
          quizTitle: quiz.title,
          quizType: quiz.type,
          rejectionReason: rejectionReason,
          courseId: quiz.courseId
        },
        timestamp: new Date()
      });
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
    const quizzes = await Quiz.find({ status: 'pending' })
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
    const quizzes = await Quiz.find({ status: 'rejected' })
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
    const quizzes = await Quiz.find({ 
      status: { $in: ['pending', 'rejected', 'approved'] } 
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
    const quizzes = await Quiz.find({ status: 'approved' })
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
      console.log(`✅ Updated course progress for student ${studentId} after quiz submission`);
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

    // Delete the quiz
    await Quiz.findByIdAndDelete(quizId);
    
    // Also delete all related quiz attempts
    await QuizAttempt.deleteMany({ quizId });

    return res.status(200).json({
      success: true,
      message: 'Quiz deletion approved and quiz deleted successfully'
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