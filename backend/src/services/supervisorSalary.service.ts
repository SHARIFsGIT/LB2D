import mongoose from 'mongoose';
import SupervisorSalary from '../models/SupervisorSalary.model';
import User from '../models/User.model';
import Course from '../models/Course.model';

/**
 * Create supervisor salary record when supervisor is assigned to a course
 */
export const createSupervisorSalaryRecord = async (supervisorId: string, courseIds: string[] = []) => {
  try {
    // Check if supervisor exists and has the correct role
    const supervisor = await User.findById(supervisorId);
    if (!supervisor || supervisor.role !== 'Supervisor') {
      throw new Error('Invalid supervisor ID or user is not a supervisor');
    }

    // Check if salary record already exists
    let salaryRecord = await SupervisorSalary.findOne({ supervisorId });

    if (salaryRecord) {
      // Update assigned courses if new courses are provided
      if (courseIds.length > 0) {
        // Add new courses to existing ones (avoid duplicates)
        const existingCourseIds = salaryRecord.assignedCourses.map(id => id.toString());
        const newCourseIds = courseIds.filter(id => !existingCourseIds.includes(id));
        
        if (newCourseIds.length > 0) {
          const objectIdCourses = newCourseIds.map(id => new mongoose.Types.ObjectId(id));
          salaryRecord.assignedCourses.push(...objectIdCourses);
          await salaryRecord.save();
        }
      }
      return salaryRecord;
    }

    // Create new salary record with default values
    salaryRecord = await SupervisorSalary.create({
      supervisorId,
      monthlySalary: 3000, // Default salary
      assignedCourses: courseIds.map(id => new mongoose.Types.ObjectId(id)),
      isActive: true
    });

    return salaryRecord;
  } catch (error) {
    console.error('Error creating supervisor salary record:', error);
    throw error;
  }
};

/**
 * Update supervisor course assignments
 */
export const updateSupervisorCourseAssignments = async (supervisorId: string, courseIds: string[]) => {
  try {
    const salaryRecord = await SupervisorSalary.findOne({ supervisorId });
    
    if (!salaryRecord) {
      // Create new record if it doesn't exist
      return await createSupervisorSalaryRecord(supervisorId, courseIds);
    }

    // Update assigned courses
    salaryRecord.assignedCourses = courseIds.map(id => new mongoose.Types.ObjectId(id));
    await salaryRecord.save();

    return salaryRecord;
  } catch (error) {
    console.error('Error updating supervisor course assignments:', error);
    throw error;
  }
};

/**
 * Initialize salary records for existing supervisors without salary records
 */
export const initializeExistingSupervisors = async () => {
  try {
    // Find all supervisors
    const supervisors = await User.find({ role: 'Supervisor' });
    
    const results = [];
    for (const supervisor of supervisors) {
      // Check if salary record exists
      const existingSalaryRecord = await SupervisorSalary.findOne({ supervisorId: supervisor._id });
      
      if (!existingSalaryRecord) {
        // Create new salary record
        const salaryRecord = await SupervisorSalary.create({
          supervisorId: supervisor._id,
          monthlySalary: 3000, // Default salary
          assignedCourses: [], // Will be updated when courses are assigned
          isActive: supervisor.isActive
        });
        
        results.push({
          supervisorId: supervisor._id,
          supervisorName: `${supervisor.firstName} ${supervisor.lastName}`,
          created: true,
          salaryRecord
        });
      } else {
        results.push({
          supervisorId: supervisor._id,
          supervisorName: `${supervisor.firstName} ${supervisor.lastName}`,
          created: false,
          salaryRecord: existingSalaryRecord
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error initializing existing supervisors:', error);
    throw error;
  }
};