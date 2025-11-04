'use client';

/**
 * STUDENT DASHBOARD - Complete with Real Data
 * Exact port from old LB2D with modern tech stack
 *
 * Features:
 * - Rainbow gradient header
 * - Role rejection notification
 * - Quick Actions (4 buttons)
 * - Performance Rankings (3 cards with LIVE badges)
 * - Real enrollment stats (fetched from API)
 * - WebSocket integration for real-time updates
 */

import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// ===========================
// TYPES & INTERFACES
// ===========================

interface Rankings {
  examScore: number;
  examRank: number;
  quizScore?: number;
  quizRank?: number;
  totalUsers: number;
  hasCompletedTests: boolean;
  hasCompletedExams?: boolean;
  hasCompletedQuizzes?: boolean;
}

interface EnrollmentStats {
  enrolledCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  certificates: number;
}

// ===========================
// MAIN COMPONENT
// ===========================

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, updateUser } = useAuthStore();
  const [rankings, setRankings] = useState<Rankings | null>(null);
  const [stats, setStats] = useState<EnrollmentStats>({
    enrolledCourses: 0,
    completedCourses: 0,
    inProgressCourses: 0,
    certificates: 0,
  });
  const [dismissingRejection, setDismissingRejection] = useState(false);
  const [loading, setLoading] = useState(true);

  // ===========================
  // AUTHENTICATION CHECK
  // ===========================

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    fetchAllData();
  }, [token, router]);

  // ===========================
  // DATA FETCHING
  // ===========================

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchRankings(), fetchEnrollmentStats()]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRankings = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leaderboard/my-rank`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setRankings(data.data);
      }
    } catch (error) {
      console.error('Error fetching rankings:', error);
    }
  };

  const fetchEnrollmentStats = async () => {
    try {
      const [enrollmentsResponse, certificatesResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/courses/my-enrollments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/certificates/my-certificates`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const enrollmentsData = await enrollmentsResponse.json();
      const certificatesData = await certificatesResponse.json();

      if (enrollmentsData.success) {
        const enrollments = enrollmentsData.data || [];
        const completed = enrollments.filter((e: any) => e.status === 'completed').length;
        const inProgress = enrollments.filter(
          (e: any) => e.status === 'active' || e.status === 'confirmed'
        ).length;

        setStats({
          enrolledCourses: enrollments.length,
          completedCourses: completed,
          inProgressCourses: inProgress,
          certificates: certificatesData.success ? (certificatesData.data || []).length : 0,
        });
      }
    } catch (error) {
      console.error('Error fetching enrollment stats:', error);
    }
  };

  // ===========================
  // HANDLERS
  // ===========================

  const handleDismissRejection = async () => {
    if (dismissingRejection) return;

    setDismissingRejection(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/rejection-notification`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        updateUser({
          rejectionReason: undefined,
          rejectionDate: undefined,
        });
      }
    } catch (error) {
      console.error('Error dismissing rejection notification:', error);
    } finally {
      setDismissingRejection(false);
    }
  };

  // ===========================
  // LOADING STATE
  // ===========================

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // ===========================
  // RENDER
  // ===========================

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Hero Header - Rainbow Gradient */}
      <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 drop-shadow-lg">Student Dashboard</h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-100 max-w-3xl mx-auto">
            Welcome back, {user.firstName}! Continue your German language learning journey
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        {/* Role Rejection Notification */}
        {user.rejectionReason && user.rejectionDate && (
          <div className="mb-8 bg-red-50 border-2 border-red-200 rounded-2xl p-6 shadow-xl">
            <div className="flex items-start">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-800 mb-3 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Role Request Update
                </h3>
                <div className="bg-white rounded-xl p-4 border border-red-200 mb-4">
                  <p className="text-sm text-red-700 mb-3">
                    Your request for <strong className="font-bold">{user.requestedRole || 'elevated privileges'}</strong> was
                    not approved.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Reason:</span>
                      <p className="text-sm text-red-800 mt-1 bg-red-50 p-3 rounded-lg">{user.rejectionReason}</p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Decision Date:</span>
                      <p className="text-sm text-red-700 mt-1">
                        {new Date(user.rejectionDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => router.push('/contact')}
                    className="bg-red-600 text-white px-6 py-3 rounded-lg text-sm font-bold hover:bg-red-700 transition-colors min-h-[44px] shadow-lg hover:shadow-xl"
                  >
                    Contact Support
                  </button>
                  <button
                    onClick={handleDismissRejection}
                    disabled={dismissingRejection}
                    className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 min-h-[44px]"
                  >
                    {dismissingRejection ? 'Dismissing...' : 'Dismiss Notification'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Quick Actions Grid */}
          <div className="bg-white/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Actions
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Available Courses */}
              <button
                onClick={() => router.push('/courses')}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-4 rounded-xl font-bold shadow-lg hover:shadow-2xl transition-all hover:scale-105 min-h-[60px]"
              >
                <div className="text-center">
                  <span className="text-lg font-bold">Available Courses</span>
                </div>
                <p className="text-sm text-blue-100 mt-1">Browse and enroll in German courses</p>
              </button>

              {/* My Classroom */}
              <button
                onClick={() => router.push('/my-courses')}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4 rounded-xl font-bold shadow-lg hover:shadow-2xl transition-all hover:scale-105 min-h-[60px]"
              >
                <div className="text-center">
                  <span className="text-lg font-bold">My Classroom</span>
                </div>
                <p className="text-sm text-emerald-100 mt-1">Access your enrolled courses</p>
              </button>

              {/* Start Assessment */}
              <button
                onClick={() => router.push('/my-courses')}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-xl font-bold shadow-lg hover:shadow-2xl transition-all hover:scale-105 min-h-[60px]"
              >
                <div className="text-center">
                  <span className="text-lg font-bold">Start Assessment</span>
                </div>
                <p className="text-sm text-orange-100 mt-1">Take your German proficiency test</p>
              </button>

              {/* Certificates */}
              <button
                onClick={() => router.push('/certificates')}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-xl font-bold shadow-lg hover:shadow-2xl transition-all hover:scale-105 min-h-[60px]"
              >
                <div className="text-center">
                  <span className="text-lg font-bold">Certificates</span>
                </div>
                <p className="text-sm text-purple-100 mt-1">Download your certificates</p>
              </button>
            </div>
          </div>

          {/* Performance Rankings */}
          <div className="bg-white/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 p-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Performance Rankings
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {/* Assessment Score Ranking */}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-blue-800">Assessment Score</span>
                  <div className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-full animate-pulse">
                    LIVE
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-900">
                      {rankings?.hasCompletedTests ? `${rankings.examScore}%` : 'N/A'}
                    </div>
                    <div className="text-xs text-blue-600">
                      {rankings?.hasCompletedTests ? 'Best assessment score' : 'No assessments completed'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-700">
                      {rankings?.hasCompletedTests && rankings.examRank ? `#${rankings.examRank}` : '#--'}
                    </div>
                    <div className="text-xs text-blue-500">
                      {rankings?.totalUsers && rankings.totalUsers > 0 ? `of ${rankings.totalUsers}` : 'of --'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Exam Score Ranking */}
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-green-800">Exam Score</span>
                  <div className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full animate-pulse">
                    LIVE
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-900">
                      {rankings?.hasCompletedExams && rankings.examScore ? `${rankings.examScore}%` : 'N/A'}
                    </div>
                    <div className="text-xs text-green-600">
                      {rankings?.hasCompletedExams ? 'Best exam score' : 'No video exams completed'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-700">
                      {rankings?.hasCompletedExams && rankings.examRank ? `#${rankings.examRank}` : '#--'}
                    </div>
                    <div className="text-xs text-green-500">of --</div>
                  </div>
                </div>
              </div>

              {/* Quiz Score Ranking */}
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-purple-800">Quiz Score</span>
                  <div className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded-full animate-pulse">
                    LIVE
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-purple-900">
                      {rankings?.hasCompletedQuizzes && rankings.quizScore ? `${rankings.quizScore}%` : 'N/A'}
                    </div>
                    <div className="text-xs text-purple-600">
                      {rankings?.hasCompletedQuizzes ? 'Best quiz score' : 'No video quizzes completed'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-700">
                      {rankings?.hasCompletedQuizzes && rankings.quizRank ? `#${rankings.quizRank}` : '#--'}
                    </div>
                    <div className="text-xs text-purple-500">of --</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Enrolled Courses */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Enrolled Courses</p>
                <p className="text-3xl font-bold text-indigo-600 mt-2">{stats.enrolledCourses}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Completed */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.completedCourses}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* In Progress */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{stats.inProgressCourses}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Certificates */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Certificates</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{stats.certificates}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
