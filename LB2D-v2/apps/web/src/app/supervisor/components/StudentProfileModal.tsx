'use client';

import React, { useEffect, useState } from 'react';
import Modal from '@/components/common/Modal';
import { useAuthStore } from '@/store/authStore';

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profilePhoto?: string;
  role: string;
  createdAt: string;
  lastLogin?: string;
}

interface Enrollment {
  course: {
    _id: string;
    title: string;
    level: string;
  };
  progress: {
    videosCompleted: number;
    totalVideos: number;
    percentage: number;
  };
  enrollmentDate: string;
  status: string;
}

interface TestResult {
  testType: string;
  score: number;
  maxScore: number;
  percentage: number;
  date: string;
  status: string;
  certificateLevel?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
}

export default function StudentProfileModal({ isOpen, onClose, student }: Props) {
  const { token } = useAuthStore();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && student) {
      fetchStudentData();
    }
  }, [isOpen, student]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      // Fetch enrollments
      const enrollResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/${student._id}/enrollments`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const enrollData = await enrollResponse.json();
      if (enrollData.success) {
        setEnrollments(enrollData.data || []);
      }

      // Fetch test results
      const testResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/${student._id}/test-results`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const testData = await testResponse.json();
      if (testData.success) {
        setTestResults(testData.data || []);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAttendance = (lastLogin?: string) => {
    if (!lastLogin) return 0;
    const daysSinceLogin = Math.floor(
      (new Date().getTime() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, Math.min(100, 100 - daysSinceLogin * 10));
  };

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Student Profile">
      <div className="max-h-[80vh] overflow-y-auto">
        {/* Student Header */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold shadow-lg">
              {student.firstName[0]}
              {student.lastName[0]}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">
                {student.firstName} {student.lastName}
              </h2>
              <p className="text-blue-100 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {student.email}
              </p>
              {student.phone && (
                <p className="text-blue-100 flex items-center gap-2 mt-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  {student.phone}
                </p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <p className="text-blue-200 text-xs font-medium mb-1">Last Login</p>
              <p className="font-bold text-sm">
                {student.lastLogin ? formatTimeAgo(student.lastLogin) : 'Never'}
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <p className="text-blue-200 text-xs font-medium mb-1">Attendance</p>
              <p className="font-bold text-sm">{calculateAttendance(student.lastLogin)}%</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <p className="text-blue-200 text-xs font-medium mb-1">Status</p>
              <p className="font-bold text-sm">Active</p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading student data...</p>
          </div>
        ) : (
          <>
            {/* Course Enrollments */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                Course Enrollments
              </h3>

              {enrollments.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <p className="text-gray-600">No enrollments yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {enrollments.map((enrollment, index) => (
                    <div key={index} className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-lg">{enrollment.course.title}</h4>
                          <p className="text-sm text-gray-600">Level {enrollment.course.level}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            enrollment.status === 'active' || enrollment.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : enrollment.status === 'completed'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {enrollment.status.toUpperCase()}
                        </span>
                      </div>

                      {/* Progress Section */}
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Learning Progress</span>
                          <span className="text-sm font-bold text-blue-600">
                            {enrollment.progress.videosCompleted} / {enrollment.progress.totalVideos} videos
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                          <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500 flex items-center justify-center"
                            style={{ width: `${enrollment.progress.percentage}%` }}
                          >
                            {enrollment.progress.percentage > 10 && (
                              <span className="text-white text-xs font-bold">
                                {enrollment.progress.percentage.toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>

                        {enrollment.progress.percentage <= 10 && (
                          <p className="text-right text-xs text-gray-600 mt-1">
                            {enrollment.progress.percentage.toFixed(1)}% complete
                          </p>
                        )}
                      </div>

                      {/* Enrollment Info */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          Enrolled: {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Test Results */}
            {testResults.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Test Results
                </h3>

                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-900">{result.testType}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(result.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            {result.score}/{result.maxScore}
                          </p>
                          <p
                            className={`text-sm font-medium ${
                              result.percentage >= 70 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {result.percentage}% - {result.status}
                          </p>
                        </div>
                      </div>
                      {result.certificateLevel && (
                        <p className="text-xs text-blue-600 mt-2">
                          Certificate Level: {result.certificateLevel}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overall Summary */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Overall Performance</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total Courses</p>
                  <p className="text-2xl font-bold text-blue-600">{enrollments.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Completed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {enrollments.filter((e) => e.status === 'completed').length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">In Progress</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {enrollments.filter((e) => e.status === 'active' || e.status === 'confirmed').length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Avg Score</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {testResults.length > 0
                      ? `${(
                          testResults.reduce((sum, r) => sum + r.percentage, 0) / testResults.length
                        ).toFixed(0)}%`
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
