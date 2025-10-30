'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import { useCurrency } from '@/hooks/useCurrency';
import { useNotification } from '@/hooks/useNotification';
import { appConfig } from '@/config/app.config';

interface Course {
  _id: string;
  title: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  description: string;
  duration: number;
  price: number;
  currency: string;
  instructor: string;
  supervisor?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  maxStudents: number;
  currentStudents: number;
  startDate: string;
  endDate: string;
  schedule: {
    days: string[];
    time: string;
  };
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  features: string[];
  requirements: string[];
  isDeleted?: boolean;
}

const CourseManagementPage = () => {
  const router = useRouter();
  const { showSuccess, showError } = useNotification();
  const { convertEuroToTaka, formatCurrency } = useCurrency();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [supervisors, setSupervisors] = useState<
    Array<{ id: string; firstName: string; lastName: string; email: string }>
  >([]);

  const [formData, setFormData] = useState({
    title: '',
    level: 'A1' as Course['level'],
    description: '',
    duration: '',
    price: '',
    currency: 'EUR',
    instructor: '',
    maxStudents: '',
    startDate: '',
    endDate: '',
    scheduleDays: ['Monday', 'Wednesday', 'Friday'] as string[],
    features: [] as string[],
    requirements: [] as string[],
    newFeature: '',
    newRequirement: '',
  });

  useEffect(() => {
    fetchCourses();
    fetchSupervisors();
  }, [currentPage, includeDeleted]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (includeDeleted) queryParams.append('includeDeleted', 'true');

      const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
      const response = await fetch(
        `${appConfig.api.baseUrl}/courses?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();

      if (data.success) {
        setCourses(data.data);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      showError('Failed to load courses');
    }
    setLoading(false);
  };

  const fetchSupervisors = async () => {
    try {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
      const response = await fetch(`${appConfig.api.baseUrl}/admin/users?role=Supervisor`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.success && data.data && data.data.users && Array.isArray(data.data.users)) {
        setSupervisors(data.data.users);
      } else {
        console.error('Invalid supervisors data structure:', data);
        setSupervisors([]);
      }
    } catch (error) {
      console.error('Failed to fetch supervisors:', error);
      setSupervisors([]);
    }
  };

  const handleCreateCourse = () => {
    setEditingCourse(null);
    setFormData({
      title: '',
      level: 'A1',
      description: '',
      duration: '',
      price: '',
      currency: 'EUR',
      instructor: '',
      maxStudents: '',
      startDate: '',
      endDate: '',
      scheduleDays: ['Monday', 'Wednesday', 'Friday'],
      newFeature: '',
      newRequirement: '',
      features: [],
      requirements: [],
    });
    setShowModal(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      level: course.level,
      description: course.description,
      duration: course.duration.toString(),
      price: course.price.toString(),
      currency: course.currency,
      instructor: course.supervisor?._id || course.instructor,
      maxStudents: course.maxStudents.toString(),
      startDate: course.startDate.split('T')[0],
      endDate: course.endDate.split('T')[0],
      scheduleDays: course.schedule.days,
      newFeature: '',
      newRequirement: '',
      features: course.features,
      requirements: course.requirements,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.title || !formData.instructor || !formData.startDate || !formData.endDate) {
        showError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      if (isNaN(parseInt(formData.duration)) || parseInt(formData.duration) <= 0) {
        showError('Duration must be a positive number');
        setLoading(false);
        return;
      }

      if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0) {
        showError('Price must be a valid number');
        setLoading(false);
        return;
      }

      if (new Date(formData.endDate) <= new Date(formData.startDate)) {
        showError('End date must be after start date');
        setLoading(false);
        return;
      }

      if (!formData.scheduleDays || formData.scheduleDays.length === 0) {
        showError('Please select at least one schedule day');
        setLoading(false);
        return;
      }

      const selectedSupervisor = supervisors.find((s) => s.id === formData.instructor);

      const courseData = {
        title: formData.title.trim(),
        level: formData.level,
        description: formData.description.trim(),
        duration: parseInt(formData.duration),
        price: parseFloat(formData.price),
        currency: formData.currency,
        instructor: selectedSupervisor
          ? `${selectedSupervisor.firstName} ${selectedSupervisor.lastName}`
          : formData.instructor,
        supervisor: formData.instructor || undefined,
        maxStudents: parseInt(formData.maxStudents),
        startDate: formData.startDate,
        endDate: formData.endDate,
        schedule: {
          days: formData.scheduleDays,
          time: '',
        },
        features: formData.features.filter((f) => f.trim()),
        requirements: formData.requirements.filter((r) => r.trim()),
      };

      const url = editingCourse
        ? `${appConfig.api.baseUrl}/courses/${editingCourse._id}`
        : `${appConfig.api.baseUrl}/courses`;
      const method = editingCourse ? 'PUT' : 'POST';

      const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(courseData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShowModal(false);
        fetchCourses();
        showSuccess(
          editingCourse ? 'Course updated successfully!' : 'Course created successfully!'
        );
      } else {
        console.error('Course save error:', { status: response.status, data });
        showError(
          data.message || data.error || `Failed to save course (${response.status})`
        );
      }
    } catch (error) {
      console.error('Failed to save course:', error);
      showError('Failed to save course');
    }
    setLoading(false);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (confirm('Are you sure you want to delete this course?')) {
      try {
        const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
        const response = await fetch(`${appConfig.api.baseUrl}/courses/${courseId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.success) {
          fetchCourses();
          showSuccess('Course deleted successfully!');
        } else {
          showError(data.message || 'Failed to delete course');
        }
      } catch (error) {
        console.error('Failed to delete course:', error);
        showError('Failed to delete course');
      }
    }
  };

  const handleRestoreCourse = async (courseId: string) => {
    if (confirm('Are you sure you want to restore this course?')) {
      try {
        const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
        const response = await fetch(`${appConfig.api.baseUrl}/courses/${courseId}/restore`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.ok && data.success) {
          fetchCourses();
          showSuccess('Course restored successfully!');
        } else {
          console.error('Restore failed:', { status: response.status, data });
          showError(
            data.message || data.error || `Failed to restore course (${response.status})`
          );
        }
      } catch (error) {
        console.error('Failed to restore course:', error);
        showError('Network error: Failed to restore course');
      }
    }
  };

  const handlePermanentDeleteCourse = async (courseId: string) => {
    if (
      confirm(
        'This will permanently delete the course and cannot be undone. Are you sure?'
      )
    ) {
      try {
        const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
        const response = await fetch(
          `${appConfig.api.baseUrl}/courses/${courseId}/permanent`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (response.ok && data.success) {
          fetchCourses();
          showSuccess('Course permanently deleted!');
        } else {
          showError(data.message || 'Failed to permanently delete course');
        }
      } catch (error) {
        console.error('Failed to permanently delete course:', error);
        showError('Failed to permanently delete course');
      }
    }
  };

  const levelGradients = {
    A1: 'from-emerald-500 to-green-500',
    A2: 'from-blue-500 to-cyan-500',
    B1: 'from-amber-500 to-yellow-500',
    B2: 'from-orange-500 to-red-500',
    C1: 'from-red-500 to-pink-500',
    C2: 'from-purple-500 to-indigo-500',
  };

  const levelIcons = {
    A1: '🌱',
    A2: '🌿',
    B1: '🌳',
    B2: '🎯',
    C1: '🚀',
    C2: '💎',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 text-white py-8 sm:py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            Course Management
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        {/* Quick Stats & Create Button */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-5 md:p-6 mb-6 sm:mb-8 border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-3">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-700">
                  {courses.length} Total Courses
                </h3>
                <p className="text-xs sm:text-sm text-gray-500">Active courses</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleCreateCourse}
                className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 sm:px-6 py-3 rounded-lg sm:rounded-xl font-bold shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-1200 ease-out text-sm sm:text-base min-h-[44px]"
              >
                Create New Course
              </button>
              <button
                onClick={() => setIncludeDeleted(!includeDeleted)}
                className={`px-4 sm:px-6 py-3 rounded-lg sm:rounded-xl font-bold shadow-lg transition-all duration-1200 ease-out text-sm sm:text-base min-h-[44px] ${
                  includeDeleted
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-xl hover:from-blue-600 hover:to-indigo-700'
                    : 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-xl hover:from-orange-600 hover:to-red-700'
                }`}
              >
                <span className="hidden sm:inline">
                  {includeDeleted ? 'Show Active Courses' : 'Show Deleted Courses'}
                </span>
                <span className="sm:hidden">{includeDeleted ? 'Active' : 'Deleted'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12 sm:py-16 md:py-20 px-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-8 sm:p-10 md:p-12">
              <div className="animate-spin rounded-full h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 font-medium text-center">
                Loading courses...
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {courses.map((course) => (
              <div
                key={course._id}
                className={`bg-white rounded-3xl shadow-xl border overflow-hidden group ${
                  course.isDeleted ? 'border-red-300 opacity-75' : 'border-gray-100'
                }`}
              >
                {/* Course Header */}
                <div
                  className={`bg-gradient-to-r ${
                    levelGradients[course.level]
                  } p-6 text-white relative`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white bg-opacity-10 rounded-full -ml-12 -mb-12"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-white bg-opacity-20 backdrop-blur-sm px-3 py-2 rounded-full border border-white border-opacity-30">
                        <span className="text-lg">{levelIcons[course.level]}</span>
                        <span className="font-bold ml-2">{course.level}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">
                          {formatCurrency(course.price, 'EUR')}
                        </div>
                        <div className="text-sm font-semibold opacity-90 flex items-center justify-end">
                          <span className="mr-1">⇄</span>
                          {formatCurrency(convertEuroToTaka(course.price), 'BDT')}
                        </div>
                        <div className="text-xs opacity-80">per course</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold">{course.title}</h3>
                      {course.isDeleted && (
                        <span className="bg-red-500 bg-opacity-80 text-white px-3 py-1 rounded-full text-xs font-bold">
                          DELETED
                        </span>
                      )}
                    </div>
                    <p className="text-white text-opacity-90 text-sm">{course.instructor}</p>
                  </div>
                </div>

                {/* Course Body */}
                <div className="p-6">
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center">Duration</span>
                      <span className="font-semibold">{course.duration} weeks</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center">Start Date</span>
                      <span className="font-semibold">
                        {new Date(course.startDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center">End Date</span>
                      <span className="font-semibold">
                        {new Date(course.endDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center">Schedule Days</span>
                      <span className="font-semibold">
                        {course.schedule?.days?.join(', ') || 'Not set'}
                      </span>
                    </div>
                  </div>

                  {/* Available Spots */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-900">Available Spots</span>
                      <span className="text-sm text-gray-600">
                        {course.maxStudents - course.currentStudents} of {course.maxStudents}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(course.currentStudents / course.maxStudents) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Features */}
                  {course.features && course.features.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-900 mb-3">What you'll learn:</h4>
                      <ul className="space-y-2">
                        {course.features.slice(0, 3).map((feature, index) => (
                          <li key={index} className="flex items-start text-sm text-gray-700">
                            <span className="text-green-500 mr-2 mt-0.5 flex-shrink-0">✓</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                        {course.features.length > 3 && (
                          <li className="text-sm text-blue-600 font-medium ml-4">
                            + {course.features.length - 3} more features...
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    {course.isDeleted ? (
                      <>
                        <button
                          onClick={() => handleRestoreCourse(course._id)}
                          className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg sm:rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-sm sm:text-base min-h-[44px]"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDeleteCourse(course._id)}
                          className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-3 rounded-lg sm:rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition-all duration-300 text-sm sm:text-base min-h-[44px]"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditCourse(course)}
                          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 sm:px-4 py-3 rounded-lg sm:rounded-xl font-bold shadow-lg hover:shadow-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-1200 ease-out text-sm sm:text-base min-h-[44px]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course._id)}
                          className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white px-3 sm:px-4 py-3 rounded-lg sm:rounded-xl font-bold shadow-lg hover:shadow-xl hover:from-red-600 hover:to-rose-700 transition-all duration-1200 ease-out text-sm sm:text-base min-h-[44px]"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {courses.length === 0 && !loading && (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-8 sm:p-10 md:p-12 border border-gray-100">
              {includeDeleted ? (
                <>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                    No deleted courses found
                  </h3>
                  <p className="text-gray-600 text-sm sm:text-base md:text-lg max-w-md mx-auto">
                    Great! You don't have any deleted courses at the moment. All your courses are
                    active and available for students.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                    No courses found
                  </h3>
                  <p className="text-gray-600 text-sm sm:text-base md:text-lg max-w-md mx-auto">
                    Start creating amazing German courses for your students!
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Course Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCourse ? 'Edit Course' : 'Create New Course'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Course Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select
                value={formData.level}
                onChange={(e) =>
                  setFormData({ ...formData, level: e.target.value as Course['level'] })
                }
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="A1">A1 - Beginner</option>
                <option value="A2">A2 - Elementary</option>
                <option value="B1">B1 - Intermediate</option>
                <option value="B2">B2 - Upper Intermediate</option>
                <option value="C1">C1 - Advanced</option>
                <option value="C2">C2 - Proficiency</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Duration (weeks)"
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              required
            />

            <Input
              label="Price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />

            <Input
              label="Max Students"
              type="number"
              value={formData.maxStudents}
              onChange={(e) => setFormData({ ...formData, maxStudents: e.target.value })}
              required
            />
          </div>

          {/* Instructor Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="flex items-center">Select Instructor</span>
            </label>
            <select
              value={formData.instructor}
              onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-4 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:border-gray-400"
              required
            >
              <option value="" className="text-gray-500">
                Choose an instructor for this course...
              </option>
              {supervisors &&
                Array.isArray(supervisors) &&
                supervisors.map((supervisor) => (
                  <option key={supervisor.id} value={supervisor.id} className="py-2">
                    {supervisor.firstName} {supervisor.lastName} | {supervisor.email}
                  </option>
                ))}
            </select>
            {supervisors.length === 0 && (
              <p className="text-sm text-gray-500 mt-2 italic">
                No registered supervisors available.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Days</label>
            <div className="grid grid-cols-3 gap-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                (day) => (
                  <label key={day} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.scheduleDays.includes(day)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            scheduleDays: [...formData.scheduleDays, day],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            scheduleDays: formData.scheduleDays.filter((d) => d !== day),
                          });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{day.slice(0, 3)}</span>
                  </label>
                )
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />

            <Input
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              required
            />
          </div>

          {/* Features Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Features
            </label>
            <div className="space-y-2">
              {formData.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => {
                      const newFeatures = [...formData.features];
                      newFeatures[index] = e.target.value;
                      setFormData({ ...formData, features: newFeatures });
                    }}
                    className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2 text-sm"
                    placeholder="Enter feature"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newFeatures = formData.features.filter((_, i) => i !== index);
                      setFormData({ ...formData, features: newFeatures });
                    }}
                    className="px-3 py-2 bg-red-500 text-white rounded-xl text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={formData.newFeature}
                  onChange={(e) => setFormData({ ...formData, newFeature: e.target.value })}
                  className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2 text-sm"
                  placeholder="Add new feature"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (formData.newFeature.trim()) {
                      setFormData({
                        ...formData,
                        features: [...formData.features, formData.newFeature.trim()],
                        newFeature: '',
                      });
                    }
                  }}
                  className="px-3 py-2 bg-green-500 text-white rounded-xl text-sm"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Requirements Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Requirements
            </label>
            <div className="space-y-2">
              {formData.requirements.map((requirement, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={requirement}
                    onChange={(e) => {
                      const newRequirements = [...formData.requirements];
                      newRequirements[index] = e.target.value;
                      setFormData({ ...formData, requirements: newRequirements });
                    }}
                    className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2 text-sm"
                    placeholder="Enter requirement"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newRequirements = formData.requirements.filter((_, i) => i !== index);
                      setFormData({ ...formData, requirements: newRequirements });
                    }}
                    className="px-3 py-2 bg-red-500 text-white rounded-xl text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={formData.newRequirement}
                  onChange={(e) =>
                    setFormData({ ...formData, newRequirement: e.target.value })
                  }
                  className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2 text-sm"
                  placeholder="Add new requirement"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (formData.newRequirement.trim()) {
                      setFormData({
                        ...formData,
                        requirements: [...formData.requirements, formData.newRequirement.trim()],
                        newRequirement: '',
                      });
                    }
                  }}
                  className="px-3 py-2 bg-green-500 text-white rounded-xl text-sm"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 sm:px-6 py-3 bg-gray-200 text-gray-800 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base min-h-[44px] order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 sm:px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg sm:rounded-xl font-bold shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-1200 ease-out disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-h-[44px] order-1 sm:order-2"
            >
              {loading ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Course'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bottom Spacing for Scrolling */}
      <div className="h-20"></div>
    </div>
  );
};

export default CourseManagementPage;
