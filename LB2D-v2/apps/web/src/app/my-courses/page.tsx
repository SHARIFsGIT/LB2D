'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useNotification } from '@/hooks/useNotification';

interface EnrolledCourse {
  _id: string;
  courseId: {
    _id: string;
    title: string;
    level: string;
    instructor: string;
    supervisor?: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
      profilePhoto?: string;
    };
    startDate: string;
    endDate: string;
    schedule: {
      days: string[];
      time: string;
    };
    duration: number;
  };
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  progress: {
    lessonsCompleted: number;
    totalLessons: number;
    percentage: number;
  };
  enrollmentDate: string;
  certificateGenerated: boolean;
  certificateUrl?: string;
  paymentId: {
    transactionId: string;
    amount: number;
    currency: string;
    status: string;
  };
}

export default function MyCoursesPage() {
  const router = useRouter();
  const { showError } = useNotification();
  const { token } = useAuthStore();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');

  const levelGradients = {
    A1: 'from-emerald-500 to-green-500',
    A2: 'from-blue-500 to-cyan-500',
    B1: 'from-amber-500 to-yellow-500',
    B2: 'from-orange-500 to-red-500',
    C1: 'from-red-500 to-pink-500',
    C2: 'from-purple-500 to-indigo-500',
  };

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  const fetchEnrolledCourses = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/user/enrollments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        // Filter out enrollments where the course has been deleted or doesn't exist
        const validEnrollments = data.data.filter((enrollment: any) => {
          const isValid =
            enrollment.courseId && enrollment.courseId._id && enrollment.courseId.title && enrollment.courseId.status !== 'deleted';

          if (!isValid) {
            console.warn('Invalid course data filtered out:', enrollment);
          }

          return isValid;
        });
        setEnrolledCourses(validEnrollments);
      } else {
        console.error('Failed to fetch enrolled courses:', data.message);
      }
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
    }
    setLoading(false);
  };

  const filteredCourses = enrolledCourses.filter((course) => {
    // Additional safety check: ensure course data is valid
    if (!course.courseId || !course.courseId._id || !course.courseId.title) {
      console.warn('Invalid course data found, filtering out:', course);
      return false;
    }

    const isIncluded = (() => {
      switch (activeTab) {
        case 'active':
          return ['confirmed', 'active'].includes(course.status);
        case 'completed':
          return course.status === 'completed';
        default:
          return true;
      }
    })();
    return isIncluded;
  });

  const handleDownloadCertificate = async (courseId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/certificates/download/${courseId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate-${courseId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download certificate:', error);
      showError('Failed to download certificate. Please try again.', 'Download Error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Meine Kurse (My Courses)</h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600">Track your German learning progress and access your course materials</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 sm:mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 sm:space-x-6 md:space-x-8">
              {[
                {
                  key: 'active',
                  label: 'Active Courses',
                  count: enrolledCourses.filter((c) => c.courseId && c.courseId._id && ['confirmed', 'active'].includes(c.status)).length,
                },
                {
                  key: 'completed',
                  label: 'Completed',
                  count: enrolledCourses.filter((c) => c.courseId && c.courseId._id && c.status === 'completed').length,
                },
                {
                  key: 'all',
                  label: 'All Courses',
                  count: enrolledCourses.filter((c) => c.courseId && c.courseId._id).length,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center space-x-1 sm:space-x-2 py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm ${
                    activeTab === tab.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="whitespace-nowrap">{tab.label}</span>
                  <span className="bg-gray-100 text-gray-600 rounded-full px-2 py-1 text-xs">{tab.count}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Courses Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            {filteredCourses.map((enrollment) => (
              <div key={enrollment._id} className="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
                {/* Course Header with Matching Gradient */}
                <div
                  className={`bg-gradient-to-r ${levelGradients[enrollment.courseId.level as keyof typeof levelGradients]} p-4 sm:p-5 md:p-6 text-white relative overflow-hidden`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                      <div className="flex items-center flex-wrap gap-2">
                        <div className="inline-flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm font-bold rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                          <span className="mr-1 sm:mr-2">🌱</span>
                          {enrollment.courseId.level}
                        </div>
                        {enrollment.status !== 'active' && enrollment.status !== 'confirmed' && enrollment.status !== 'completed' && (
                          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30`}>
                            {enrollment.status.toUpperCase()}
                          </span>
                        )}
                      </div>
                      {/* Completed Badge - Top Right */}
                      {enrollment.status === 'completed' && (
                        <div className="flex items-center space-x-2">
                          <div className="px-2 sm:px-3 md:px-4 py-1 sm:py-2 rounded text-xs sm:text-sm font-bold bg-gradient-to-r from-green-400 to-emerald-400 text-white shadow-lg border-2 border-white/30">
                            COMPLETED
                          </div>
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2">{enrollment.courseId.title}</h3>
                    <p className="text-blue-100 opacity-90 flex items-center text-sm sm:text-base">
                      <span className="mr-2">Instructor:</span>
                      {enrollment.courseId.instructor}
                    </p>
                  </div>
                </div>

                <div className="p-4 sm:p-5 md:p-6">
                  {/* Progress Section */}
                  <div className="mb-4 sm:mb-5 md:mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">
                        {enrollment.status === 'completed' ? 'Course Completed' : 'Learning Progress'}
                      </span>
                      <span
                        className={`text-xs sm:text-sm font-bold ${enrollment.status === 'completed' ? 'text-green-600' : 'text-blue-600'}`}
                      >
                        {enrollment.status === 'completed' ? '100' : Math.min(enrollment.progress.percentage || 0, 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                      <div
                        className={`h-2 sm:h-3 rounded-full transition-all duration-500 ${
                          enrollment.status === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-blue-500 to-green-500'
                        }`}
                        style={{
                          width: `${enrollment.status === 'completed' ? '100' : Math.min(enrollment.progress.percentage || 0, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between text-xs text-gray-500 mt-1 gap-1 sm:gap-0">
                      <span>
                        {enrollment.status === 'completed'
                          ? `${enrollment.progress.totalLessons || 0}/${enrollment.progress.totalLessons || 0} lessons completed`
                          : `${Math.min(enrollment.progress.lessonsCompleted || 0, enrollment.progress.totalLessons || 0)}/${
                              enrollment.progress.totalLessons || 0
                            } lessons completed`}
                      </span>
                      <span>{enrollment.courseId.duration} weeks duration</span>
                    </div>
                  </div>

                  {/* Course Information */}
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-5 md:mb-6">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div>
                        <div className="font-medium text-gray-900 mb-1">Start Date</div>
                        <div className="text-gray-600">{new Date(enrollment.courseId.startDate).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 mb-1">End Date</div>
                        <div className="text-gray-600">{new Date(enrollment.courseId.endDate).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 mb-1">Schedule</div>
                        <div className="text-gray-600">{enrollment.courseId.schedule.days.join(', ')}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 mb-1">Enrolled</div>
                        <div className="text-gray-600">{new Date(enrollment.enrollmentDate).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 sm:space-y-3">
                    {enrollment.status === 'active' || enrollment.status === 'confirmed' ? (
                      <button
                        onClick={() => router.push(`/course/${enrollment.courseId._id}/videos`)}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-800 text-white py-2.5 sm:py-3 px-4 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 shadow-md hover:shadow-lg min-h-[44px]"
                      >
                        Continue Learning
                      </button>
                    ) : enrollment.status === 'completed' ? (
                      <div className="space-y-2 sm:space-y-3">
                        <button
                          onClick={() => router.push(`/course/${enrollment.courseId._id}/videos`)}
                          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-2.5 sm:py-3 px-4 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 shadow-md hover:shadow-lg min-h-[44px]"
                        >
                          View Course
                        </button>
                        {enrollment.certificateGenerated && (
                          <button
                            onClick={() => handleDownloadCertificate(enrollment.courseId._id)}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-2.5 sm:py-3 px-4 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 shadow-md hover:shadow-lg min-h-[44px]"
                          >
                            Download Certificate
                          </button>
                        )}
                      </div>
                    ) : null}

                    {/* Certificate button for non-completed courses */}
                    {enrollment.status !== 'completed' && enrollment.certificateGenerated && (
                      <button
                        onClick={() => handleDownloadCertificate(enrollment.courseId._id)}
                        className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white py-2.5 sm:py-3 px-4 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 shadow-md hover:shadow-lg min-h-[44px]"
                      >
                        Download Certificate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 text-center py-8 sm:py-10 md:py-12 px-4 sm:px-6 md:px-8">
            <div className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4 font-bold text-gray-400">
              {activeTab === 'active' ? 'ACTIVE' : activeTab === 'completed' ? 'DONE' : 'ALL'}
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              {activeTab === 'active' ? 'No Active Courses' : activeTab === 'completed' ? 'No Completed Courses' : 'No Courses Found'}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              {activeTab === 'active'
                ? 'Start your German learning journey today!'
                : activeTab === 'completed'
                ? 'Complete a course to see it here!'
                : 'Enroll in a course to get started!'}
            </p>
            <button
              onClick={() => router.push('/courses')}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Browse Courses
            </button>
          </div>
        )}

        {/* Bottom spacing */}
        <div className="h-8"></div>
      </div>
    </div>
  );
}
