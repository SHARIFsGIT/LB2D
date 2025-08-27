import { Request, Response } from 'express';
import Course, { ICourse } from '../models/Course.model';
import Enrollment from '../models/Enrollment.model';
import Payment from '../models/Payment.model';
import User from '../models/User.model';
import Video from '../models/Video.model';
import emailService from '../services/email.service';
import { notifyAdmins, notifySupervisors, notifyStudents, notifyUser, notifyRoleHierarchy } from '../services/websocket.service';

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
    
    console.log('getAllCourses - Found courses count:', courses.length);
    if (courses.length > 0) {
      console.log('getAllCourses - Sample course IDs:', courses.slice(0, 3).map(c => c._id));
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
    console.log('getCourse - Requested course ID:', req.params.id);
    
    // Find course that is not deleted
    const course = await Course.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true }
    });
    
    if (!course) {
      console.log('getCourse - Course not found for ID:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    console.log('getCourse - Found course:', course.title);
    
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
    console.log('Creating course with data:', courseData);
    
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
          console.log(`Course assignment notification sent to ${supervisor.email} for course: ${course.title}`);
          
          // Send WebSocket notification to supervisor
          await notifyUser(courseData.supervisor, {
            id: `course_assign_${course._id}_${Date.now()}`,
            type: 'course',
            title: 'Admin',
            message: `You have been assigned to supervise ${course.title}`,
            targetRole: 'Supervisor',
            fromRole: 'Admin',
            urgent: true,
            timestamp: new Date(),
            data: {
              courseId: (course._id as any).toString(),
              courseTitle: course.title,
              courseLevel: course.level,
              startDate: course.startDate.toISOString(),
              endDate: course.endDate.toISOString(),
              userRole: 'Admin',
              actionType: 'assign'
            }
          });
          
          // Notify other admins about the assignment
          await notifyAdmins({
            type: 'course',
            title: 'Admin',
            message: `${supervisor.firstName} ${supervisor.lastName} assigned to supervise ${course.title}`,
            targetRole: 'Admin',
            data: {
              courseId: (course._id as any).toString(),
              courseTitle: course.title,
              supervisorId: courseData.supervisor,
              supervisorName: `${supervisor.firstName} ${supervisor.lastName}`,
              assignedBy: req.userId || 'unknown',
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
    
    // Notify all students about new course availability
    try {
      await notifyStudents({
        type: 'course',
        title: 'Admin',
        message: `New ${course.level} course ${course.title} available for enrollment`,
        targetRole: 'Student',
        fromRole: 'Admin',
        urgent: false,
        data: {
          courseId: (course._id as any).toString(),
          courseTitle: course.title,
          courseLevel: course.level,
          startDate: course.startDate.toISOString(),
          endDate: course.endDate.toISOString(),
          maxStudents: course.maxStudents,
          instructor: course.instructor,
          timestamp: new Date(),
          userRole: 'Admin',
          actionType: 'create'
        }
      });
      console.log(`Notified all students about new course: ${course.title}`);
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
          console.log(`Course assignment notification sent to ${supervisor.email} for updated course: ${course!.title}`);
          
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
    
    // Enhanced enrollments with actual lesson counts based on approved videos
    const enhancedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        if (enrollment.courseId) {
          // Count approved videos for this course
          const approvedVideoCount = await Video.countDocuments({
            courseId: enrollment.courseId._id,
            status: 'approved'
          });
          
          // Update progress with actual lesson count
          const enrollmentObj = enrollment.toObject();
          enrollmentObj.progress = {
            ...enrollmentObj.progress,
            totalLessons: approvedVideoCount,
            // Recalculate percentage based on actual lessons
            percentage: approvedVideoCount > 0 
              ? Math.round((enrollmentObj.progress.lessonsCompleted / approvedVideoCount) * 100)
              : 0
          };
          
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
    
    console.log('getSupervisorCourses - Found courses count:', courses.length, 'for supervisor:', supervisorId);
    
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