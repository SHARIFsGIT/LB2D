import { Response } from 'express';
import { AuthenticatedRequest } from '../types/common.types';
import Quiz from '../models/Quiz.model';
import QuizAttempt from '../models/QuizAttempt.model';
import Course from '../models/Course.model';

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

    if (quiz.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Quiz was rejected. Please edit and resubmit or create a new quiz'
      });
    }

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

// Delete quiz
export const deleteQuiz = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const supervisorId = req.userId;

    // Check if quiz has attempts
    const attemptCount = await QuizAttempt.countDocuments({ quizId });
    if (attemptCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete quiz that has student attempts'
      });
    }

    const quiz = await Quiz.findOneAndDelete({ _id: quizId, supervisorId });
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or you do not have permission to delete it'
      });
    }

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