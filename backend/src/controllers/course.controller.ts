import { Request, Response } from 'express';
import Course, { ICourse } from '../models/Course.model';
import Enrollment from '../models/Enrollment.model';
import Payment from '../models/Payment.model';
import User from '../models/User.model';
import Video from '../models/Video.model';
import VideoProgress from '../models/VideoProgress.model';
import Quiz from '../models/Quiz.model';
import QuizAttempt from '../models/QuizAttempt.model';
import CourseResource from '../models/CourseResource.model';
import ResourceProgress from '../models/ResourceProgress.model';
import emailService from '../services/email.service';
import notificationService from '../services/notification.service';
import { notifyUser, notifyAdmins } from '../services/websocket.service';

interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

// Get all courses (public)
export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const { level, status, includeDeleted } = req.query;
    
    const filter: any = {};
    if (level) filter.level = level;
    if (status) filter.status = status;
    
    // Handle soft delete filtering
    if (includeDeleted === 'true') {
      // Show only deleted courses
      filter.isDeleted = true;
    } else {
      // Only include non-deleted courses (default behavior)
      filter.isDeleted = { $ne: true };
    }
    
    const courses = await Course.find(filter)
      .sort({ startDate: 1 })
      .select('-__v');
    if (courses.length > 0) {
    }
    
    // Calculate dynamic current students for each course
    const coursesWithDynamicStudents = await Promise.all(
      courses.map(async (course) => {
        const enrollmentCount = await Enrollment.countDocuments({
          courseId: course._id,
          status: { $in: ['confirmed', 'active'] } // Only count confirmed/active enrollments
        });
        
        const courseObj = course.toObject();
        courseObj.currentStudents = enrollmentCount;
        return courseObj;
      })
    );
    
    return res.status(200).json({
      success: true,
      count: coursesWithDynamicStudents.length,
      data: coursesWithDynamicStudents
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch courses',
      error: error.message
    });
  }
};

// Get single course (public)
export const getCourse = async (req: Request, res: Response) => {
  try {
    // Find course that is not deleted
    const course = await Course.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true }
    });
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    // Calculate dynamic current students for this course
    const enrollmentCount = await Enrollment.countDocuments({
      courseId: course._id,
      status: { $in: ['confirmed', 'active'] }
    });
    
    const courseObj = course.toObject();
    courseObj.currentStudents = enrollmentCount;
    
    return res.status(200).json({
      success: true,
      data: courseObj
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch course',
      error: error.message
    });
  }
};

// Create course (Admin only)
export const createCourse = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courseData = req.body;
    // Validate required fields
    if (!courseData.title || !courseData.level || !courseData.instructor) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, level, and instructor are required'
      });
    }

    // Validate end date is after start date
    if (new Date(courseData.endDate) <= new Date(courseData.startDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Ensure schedule has proper structure
    if (!courseData.schedule || !courseData.schedule.days || !Array.isArray(courseData.schedule.days)) {
      courseData.schedule = {
        days: ['Monday', 'Wednesday', 'Friday'],
        time: courseData.schedule?.time || ''
      };
    }

    // Ensure features and requirements are arrays
    if (!Array.isArray(courseData.features)) {
      courseData.features = [];
    }
    if (!Array.isArray(courseData.requirements)) {
      courseData.requirements = [];
    }
    
    const course = await Course.create(courseData);
    
    // Send email notification to supervisor if assigned
    if (courseData.supervisor) {
      try {
        const supervisor = await User.findById(courseData.supervisor);
        if (supervisor) {
          await emailService.sendCourseAssignmentNotification(
            supervisor.email,
            supervisor.firstName,
            supervisor.lastName,
            {
              courseTitle: course.title,
              courseLevel: course.level,
              startDate: course.startDate.toISOString(),
              endDate: course.endDate.toISOString(),
              courseId: (course._id as any).toString()
            }
          );

          // Notify supervisor about course assignment (PERSISTED)
          await notificationService.createNotification(courseData.supervisor, {
            type: 'course',
            title: 'Course Assigned',
            message: `You have been assigned to supervise ${course.title} (${course.level})`,
            fromRole: 'Admin',
            urgent: true,
            data: {
              fromUserId: req.userId,
              courseId: (course._id as any).toString(),
              courseTitle: course.title,
              courseLevel: course.level,
              startDate: course.startDate.toISOString(),
              endDate: course.endDate.toISOString(),
              actionUrl: `/courses/${course._id}`
            }
          });
        }
      } catch (error) {
        console.error('Failed to send course assignment notifications:', error);
        // Don't fail the entire operation if notifications fail
      }
    }
    
    // Notify all students about new course availability (PERSISTED)
    try {
      await notificationService.notifyRole('Student', {
        type: 'course',
        title: 'New Course Available',
        message: `${course.level} course "${course.title}" is now available for enrollment`,
        fromRole: 'Admin',
        urgent: false,
        data: {
          fromUserId: req.userId,
          courseId: (course._id as any).toString(),
          courseTitle: course.title,
          courseLevel: course.level,
          startDate: course.startDate.toISOString(),
          endDate: course.endDate.toISOString(),
          maxStudents: course.maxStudents,
          instructor: course.instructor,
          actionUrl: `/courses/${course._id}`
        }
      });
    } catch (error) {
      console.error('Failed to send student course notifications:', error);
    }
    
    return res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error: any) {
    console.error('Course creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create course',
      error: error.message
    });
  }
};

// Update course (Admin only)
export const updateCourse = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // First check if course exists and is not deleted
    const existingCourse = await Course.findById(req.params.id);
    
    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (existingCourse.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update deleted course'
      });
    }

    // Validate end date is after start date if both are provided
    if (req.body.endDate && req.body.startDate) {
      if (new Date(req.body.endDate) <= new Date(req.body.startDate)) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
    }
    
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    // Check if supervisor was changed and send notification to new supervisor
    if (req.body.supervisor && req.body.supervisor !== existingCourse.supervisor?.toString()) {
      try {
        const supervisor = await User.findById(req.body.supervisor);
        if (supervisor) {
          await emailService.sendCourseAssignmentNotification(
            supervisor.email,
            supervisor.firstName,
            supervisor.lastName,
            {
              courseTitle: course!.title,
              courseLevel: course!.level,
              startDate: course!.startDate.toISOString(),
              endDate: course!.endDate.toISOString(),
              courseId: (course!._id as any).toString()
            }
          );
          // Send WebSocket notification to new supervisor
          await notifyUser(req.body.supervisor, {
            id: `course_update_${course!._id}_${Date.now()}`,
            type: 'course',
            title: 'Admin',
            message: `You have been assigned to supervise ${course!.title}`,
            targetRole: 'Supervisor',
            fromRole: 'Admin',
            urgent: true,
            timestamp: new Date(),
            data: {
              courseId: (course!._id as any).toString(),
              courseTitle: course!.title,
              courseLevel: course!.level,
              startDate: course!.startDate.toISOString(),
              endDate: course!.endDate.toISOString(),
              previousSupervisorId: existingCourse.supervisor?.toString(),
              userRole: 'Admin',
              actionType: 'assign'
            }
          });
          
          // Notify previous supervisor if exists
          if (existingCourse.supervisor && existingCourse.supervisor.toString() !== req.body.supervisor) {
            await notifyUser(existingCourse.supervisor.toString(), {
              id: `course_remove_${course!._id}_${Date.now()}`,
              type: 'course',
              title: 'Admin',
              message: `You are no longer supervising ${course!.title}`,
              targetRole: 'Supervisor',
              fromRole: 'Admin',
              timestamp: new Date(),
              data: {
                courseId: (course!._id as any).toString(),
                courseTitle: course!.title,
                newSupervisorId: req.body.supervisor,
                userRole: 'Admin',
                actionType: 'remove'
              }
            });
          }
          
          // Notify all admins about the supervisor change
          await notifyAdmins({
            type: 'course',
            title: 'Admin',
            message: `${supervisor.firstName} ${supervisor.lastName} assigned to supervise ${course!.title}`,
            targetRole: 'Admin',
            data: {
              courseId: (course!._id as any).toString(),
              courseTitle: course!.title,
              newSupervisorId: req.body.supervisor,
              newSupervisorName: `${supervisor.firstName} ${supervisor.lastName}`,
              previousSupervisorId: existingCourse.supervisor?.toString(),
              updatedBy: req.userId || 'unknown',
              timestamp: new Date(),
              userRole: 'Admin',
              actionType: 'assign'
            }
          });
        }
      } catch (error) {
        console.error('Failed to send course assignment notifications:', error);
        // Don't fail the entire operation if notifications fail
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });
  } catch (error: any) {
    console.error('Course update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update course',
      error: error.message
    });
  }
};

// Delete course (Admin only) - Soft delete
export const deleteCourse = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Course is already deleted'
      });
    }
    
    // Soft delete: mark as deleted instead of removing
    await Course.findByIdAndUpdate(req.params.id, { isDeleted: true });
    
    return res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete course',
      error: error.message
    });
  }
};

// Get user's enrollments
export const getUserEnrollments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.userId })
      .populate({
        path: 'courseId',
        populate: {
          path: 'supervisor',
          select: 'firstName lastName email profilePhoto'
        }
      })
      .populate('paymentId')
      .sort({ createdAt: -1 });
    
    // Enhanced enrollments with actual lesson counts (videos + quizzes + resources)
    const enhancedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        if (enrollment.courseId) {
          const courseId = enrollment.courseId._id;
          const userId = enrollment.userId;

          // Count total approved videos in the course
          const totalVideos = await Video.countDocuments({
            courseId,
            status: 'approved'
          });

          // Count total approved and active quizzes in the course
          const totalQuizzes = await Quiz.countDocuments({
            courseId,
            status: 'approved',
            isActive: true
          });

          // Count total approved resources in the course
          const totalResources = await CourseResource.countDocuments({
            courseId,
            status: 'approved',
            isActive: true
          });

          // Count completed videos by this student
          const completedVideos = await VideoProgress.countDocuments({
            userId,
            courseId,
            completed: true
          });

          // Count completed resources by this student
          const completedResources = await ResourceProgress.countDocuments({
            userId,
            courseId,
            completed: true
          });

          // Count completed quizzes by this student
          const completedQuizAttempts = await QuizAttempt.find({
            studentId: userId,
            status: { $in: ['submitted', 'graded'] }
          }).populate({
            path: 'quizId',
            match: { courseId },
            select: '_id'
          });

          const completedQuizzes = completedQuizAttempts.filter(attempt => attempt.quizId).length;

          // Calculate totals
          const totalLessons = totalVideos + totalQuizzes + totalResources;
          const completedLessons = completedVideos + completedQuizzes + completedResources;

          // Update progress with comprehensive lesson count
          const enrollmentObj = enrollment.toObject();
          
          // For completed courses, ensure progress shows as complete
          if (enrollmentObj.status === 'completed') {
            enrollmentObj.progress = {
              ...enrollmentObj.progress,
              totalLessons: Math.max(totalLessons, 1), // At least 1 lesson for completed courses
              lessonsCompleted: Math.max(totalLessons, 1), // All lessons completed
              percentage: 100
            };
          } else {
            enrollmentObj.progress = {
              ...enrollmentObj.progress,
              totalLessons,
              lessonsCompleted: completedLessons,
              percentage: totalLessons > 0 
                ? Math.round((completedLessons / totalLessons) * 100)
                : 0
            };
          }
          
          return enrollmentObj;
        }
        return enrollment.toObject();
      })
    );
    
    return res.status(200).json({
      success: true,
      count: enhancedEnrollments.length,
      data: enhancedEnrollments
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch enrollments',
      error: error.message
    });
  }
};

// Check if user is enrolled in a course
export const checkEnrollment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const enrollment = await Enrollment.findOne({
      userId: req.userId,
      courseId: req.params.courseId
    }).populate('paymentId');
    
    return res.status(200).json({
      success: true,
      enrolled: !!enrollment,
      data: enrollment
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to check enrollment',
      error: error.message
    });
  }
};

// Get course statistics (Admin only)
export const getCourseStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const totalCourses = await Course.countDocuments();
    const activeCourses = await Course.countDocuments({ status: 'ongoing' });
    const upcomingCourses = await Course.countDocuments({ status: 'upcoming' });
    const totalEnrollments = await Enrollment.countDocuments();
    const activeEnrollments = await Enrollment.countDocuments({ status: 'active' });
    
    // Revenue calculation
    const completedPayments = await Payment.find({ status: 'completed' });
    const totalRevenue = completedPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Enrollments by level
    const enrollmentsByLevel = await Enrollment.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'courseId',
          foreignField: '_id',
          as: 'course'
        }
      },
      { $unwind: '$course' },
      {
        $group: {
          _id: '$course.level',
          count: { $sum: 1 }
        }
      }
    ]);
    
    return res.status(200).json({
      success: true,
      data: {
        totalCourses,
        activeCourses,
        upcomingCourses,
        totalEnrollments,
        activeEnrollments,
        totalRevenue,
        enrollmentsByLevel
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch course statistics',
      error: error.message
    });
  }
};

// Restore course (Admin only) - Undo soft delete
export const restoreCourse = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (!course.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Course is not deleted'
      });
    }
    
    // Restore course: mark as not deleted
    await Course.findByIdAndUpdate(req.params.id, { isDeleted: false });
    
    return res.status(200).json({
      success: true,
      message: 'Course restored successfully'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to restore course',
      error: error.message
    });
  }
};

// Get supervisor's assigned courses
export const getSupervisorCourses = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supervisorId = req.userId;
    
    if (!supervisorId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No user ID found'
      });
    }

    // Find courses assigned to this supervisor that are not deleted
    const courses = await Course.find({
      supervisor: supervisorId,
      isDeleted: { $ne: true }
    })
      .populate('supervisor', 'firstName lastName email profilePhoto')
      .sort({ startDate: 1 })
      .select('-__v');
    // Calculate dynamic current students for each course
    const coursesWithDynamicStudents = await Promise.all(
      courses.map(async (course) => {
        const enrollmentCount = await Enrollment.countDocuments({
          courseId: course._id,
          status: { $in: ['confirmed', 'active'] }
        });
        
        const courseObj = course.toObject();
        courseObj.currentStudents = enrollmentCount;
        return courseObj;
      })
    );
    
    return res.status(200).json({
      success: true,
      count: coursesWithDynamicStudents.length,
      data: coursesWithDynamicStudents
    });
  } catch (error: any) {
    console.error('getSupervisorCourses error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch supervisor courses',
      error: error.message
    });
  }
};

// Permanently delete course (Admin only) - Actual database deletion
export const permanentDeleteCourse = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (!course.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Course must be soft-deleted before permanent deletion'
      });
    }
    
    // Permanently delete course from database
    await Course.findByIdAndDelete(req.params.id);
    
    return res.status(200).json({
      success: true,
      message: 'Course permanently deleted successfully'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to permanently delete course',
      error: error.message
    });
  }
};