'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { updateUser, logout } from '@/store/slices/authSlice';

interface Rankings {
  examScore: number;
  examRank: number;
  totalUsers: number;
  hasCompletedTests: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, token } = useSelector((state: RootState) => state.auth);
  const [rankings, setRankings] = useState<Rankings | null>(null);
  const [dismissingRejection, setDismissingRejection] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    fetchRankings();
  }, [token]);

  const fetchRankings = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/rankings`, {
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

  const handleDismissRejection = async () => {
    if (dismissingRejection) return;

    setDismissingRejection(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/rejection-notification`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        dispatch(
          updateUser({
            ...user,
            rejectionReason: undefined,
            rejectionDate: undefined,
          })
        );
      }
    } catch (error) {
      console.error('Error dismissing rejection notification:', error);
    } finally {
      setDismissingRejection(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 text-white py-8 sm:py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-white to-gray-100 bg-clip-text text-transparent">
            Student Dashboard
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-100 max-w-3xl mx-auto">
            Welcome back, {user.firstName}! Continue your German language learning journey
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        {/* Role Rejection Notification */}
        {user.rejectionReason && user.rejectionDate && (
          <div className="mb-6 sm:mb-8 bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6 shadow-lg">
            <div className="flex items-start">
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-red-800 mb-2">Role Request Update</h3>
                <div className="bg-white rounded-lg p-3 sm:p-4 border border-red-200">
                  <p className="text-xs sm:text-sm text-red-700 mb-3">
                    Your request for <strong>{user.requestedRole || 'elevated privileges'}</strong> was not approved.
                  </p>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-medium text-red-600">Reason:</span>
                      <p className="text-xs sm:text-sm text-red-800 mt-1">{user.rejectionReason}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-red-600">Decision Date:</span>
                      <p className="text-xs sm:text-sm text-red-700 mt-1">
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
                <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={() => router.push('/contact')}
                    className="bg-red-600 text-white px-4 py-3 sm:py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors min-h-[44px] sm:min-h-0"
                  >
                    Contact Support
                  </button>
                  <button
                    onClick={handleDismissRejection}
                    disabled={dismissingRejection}
                    className="bg-gray-100 text-gray-700 px-4 py-3 sm:py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 min-h-[44px] sm:min-h-0"
                  >
                    {dismissingRejection ? 'Dismissing...' : 'Dismiss Notification'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
          {/* Quick Actions */}
          <div className="bg-white/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-3 sm:p-4">
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">Quick Actions</h3>
            </div>
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <button
                onClick={() => router.push('/courses')}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-3 sm:p-4 rounded-xl font-semibold shadow-lg transition-colors duration-200 min-h-[44px]"
              >
                <div className="text-center">
                  <span className="text-base sm:text-lg font-semibold">Available Courses</span>
                </div>
                <p className="text-xs sm:text-sm text-blue-100 mt-1">Browse and enroll in German courses</p>
              </button>
              <button
                onClick={() => router.push('/my-courses')}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-3 sm:p-4 rounded-xl font-semibold shadow-lg transition-colors duration-200 min-h-[44px]"
              >
                <div className="text-center">
                  <span className="text-base sm:text-lg font-semibold">My Classroom</span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-100 mt-1">Access your enrolled courses</p>
              </button>
              <button
                onClick={() => router.push('/about')}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white p-3 sm:p-4 rounded-xl font-semibold shadow-lg transition-colors duration-200 min-h-[44px]"
              >
                <div className="text-center">
                  <span className="text-base sm:text-lg font-semibold">About Us</span>
                </div>
                <p className="text-xs sm:text-sm text-orange-100 mt-1">Learn more about our platform</p>
              </button>
              <button
                onClick={() => router.push('/contact')}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 sm:p-4 rounded-xl font-semibold shadow-lg transition-colors duration-200 min-h-[44px]"
              >
                <div className="text-center">
                  <span className="text-base sm:text-lg font-semibold">Contact Support</span>
                </div>
                <p className="text-xs sm:text-sm text-purple-100 mt-1">Get help from our team</p>
              </button>
            </div>
          </div>

          {/* Real-time Rankings */}
          <div className="bg-white/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 p-3 sm:p-4">
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">Performance Rankings</h3>
            </div>
            <div className="p-3 sm:p-4">
              <div className="space-y-2 sm:space-y-3">
                {/* Assessment Ranking */}
                <div className="bg-blue-50 rounded-lg p-2 sm:p-3 border border-blue-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm font-semibold text-blue-800">Assessment Score</span>
                    </div>
                    <div className="text-xs text-blue-600">Live Rank</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-blue-900">
                        {rankings?.hasCompletedTests ? `${rankings.examScore}%` : 'N/A'}
                      </div>
                      <div className="text-xs sm:text-sm text-blue-600">
                        {rankings?.hasCompletedTests ? 'Best assessment score' : 'No assessments completed'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base sm:text-lg font-bold text-blue-700">
                        {rankings?.hasCompletedTests && rankings.examRank ? `# ${rankings.examRank}` : '# --'}
                      </div>
                      <div className="text-xs sm:text-sm text-blue-500">{rankings?.totalUsers > 0 ? `of ${rankings.totalUsers}` : 'of --'}</div>
                    </div>
                  </div>
                </div>

                {/* Exam Ranking */}
                <div className="bg-green-50 rounded-lg p-2 sm:p-3 border border-green-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm font-semibold text-green-800">Exam Score</span>
                    </div>
                    <div className="text-xs text-green-600">Live Rank</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-green-900">N/A</div>
                      <div className="text-xs sm:text-sm text-green-600">No video exams completed</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base sm:text-lg font-bold text-green-700"># --</div>
                      <div className="text-xs sm:text-sm text-green-500">of --</div>
                    </div>
                  </div>
                </div>

                {/* Quiz Ranking */}
                <div className="bg-purple-50 rounded-lg p-2 sm:p-3 border border-purple-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm font-semibold text-purple-800">Quiz Score</span>
                    </div>
                    <div className="text-xs text-purple-600">Live Rank</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-purple-900">N/A</div>
                      <div className="text-xs sm:text-sm text-purple-600">No video quizzes completed</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base sm:text-lg font-bold text-purple-700"># --</div>
                      <div className="text-xs sm:text-sm text-purple-500">of --</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
