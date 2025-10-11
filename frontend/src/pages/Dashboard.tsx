import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useGetTestHistoryQuery, useGetUserRankingsQuery, useLogoutMutation, useValidateTokenQuery } from '../store/api/apiSlice';
import { AuthState, logout, updateUser } from '../store/slices/authSlice';
import { RootState } from '../store/store';
import { useWebSocket, NotificationData } from '../hooks/useWebSocket';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const authState = useSelector((state: RootState) => state.auth) as AuthState;
  const { user } = authState;
  const [logoutApi] = useLogoutMutation();
  const { data: testHistory } = useGetTestHistoryQuery({});
  const { data: rankingsData, refetch: refetchRankings } = useGetUserRankingsQuery({});
  const [downloadingCert, setDownloadingCert] = useState<string | null>(null);
  const [dismissingRejection, setDismissingRejection] = useState(false);
  
  // WebSocket notification handling for students
  const handleStudentNotification = useCallback((notification: NotificationData) => {
    // Handle different types of student notifications
    const notificationActions = {
      course: () => {
        // Refresh course-related data
        // Could trigger a toast notification here
      },
      video: () => {
        // Refresh video content
        // Could trigger a toast notification here
      },
      document: () => {
        // Refresh document/resource content
        // Could trigger a toast notification here
      },
      assessment: () => {
        // Refresh assessment data
        // Could trigger a toast notification here
      },
      certificate: () => {
        // Refresh certificate data
        // Could trigger a toast notification here
      },
      ranking: () => {
        // Refresh rankings
        refetchRankings();
      }
    };

    // Execute notification action if it exists
    if (notification.type && notificationActions[notification.type as keyof typeof notificationActions]) {
      notificationActions[notification.type as keyof typeof notificationActions]();
    }
  }, [refetchRankings]);

  // Connect to WebSocket for student notifications
  useWebSocket({
    onNotification: handleStudentNotification
  });
  
  // Fetch current user data to ensure verification status is up-to-date
  const { data: currentUserData } = useValidateTokenQuery(undefined, {
    skip: !authState.token,
  });

  // Update user data when fresh data is available
  useEffect(() => {
    if (currentUserData?.success && currentUserData.data?.user) {
      dispatch(updateUser(currentUserData.data.user));
    }
  }, [currentUserData, dispatch]);

  const handleLogout = async () => {
    try {
      await logoutApi({}).unwrap();
    } catch (error) {
      console.error('Logout error:', error);
    }
    dispatch(logout());
    navigate('/login');
  };

  const handleDismissRejection = async () => {
    if (dismissingRejection) return;
    
    setDismissingRejection(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/users/rejection-notification`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update user state to remove rejection information
        dispatch(updateUser({
          ...user,
          rejectionReason: undefined,
          rejectionDate: undefined
        }));
      } else {
        console.error('Failed to dismiss rejection notification');
      }
    } catch (error) {
      console.error('Error dismissing rejection notification:', error);
    } finally {
      setDismissingRejection(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-gray-100 bg-clip-text text-transparent">
            Student Dashboard
          </h1>
          <p className="text-xl md:text-2xl text-gray-100 max-w-3xl mx-auto">
            Welcome back, {user.firstName}! Continue your German language learning journey
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">

        {/* Role Rejection Notification */}
        {user.rejectionReason && user.rejectionDate && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-6 shadow-lg">
            <div className="flex items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  Role Request Update
                </h3>
                <div className="bg-white rounded-lg p-4 border border-red-200">
                  <p className="text-sm text-red-700 mb-3">
                    Your request for <strong>{user.requestedRole || 'elevated privileges'}</strong> was not approved.
                  </p>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-medium text-red-600">Reason:</span>
                      <p className="text-sm text-red-800 mt-1">{user.rejectionReason}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-red-600">Decision Date:</span>
                      <p className="text-sm text-red-700 mt-1">
                        {new Date(user.rejectionDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => navigate('/contact')}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Contact Support
                  </button>
                  <button
                    onClick={handleDismissRejection}
                    disabled={dismissingRejection}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
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
          {/* Quick Actions */}
          <div className="bg-white/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                Quick Actions
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <button
                onClick={() => navigate('/courses')}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-4 rounded-xl font-semibold shadow-lg transition-colors duration-200"
              >
                <div className="text-center">
                  <span className="text-lg font-semibold">Available Courses</span>
                </div>
                <p className="text-sm text-blue-100 mt-1">Browse and enroll in German courses</p>
              </button>
              <button
                onClick={() => navigate('/my-courses')}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4 rounded-xl font-semibold shadow-lg transition-colors duration-200"
              >
                <div className="text-center">
                  <span className="text-lg font-semibold">My Classroom</span>
                </div>
                <p className="text-sm text-emerald-100 mt-1">Access your enrolled courses</p>
              </button>
              <button
                onClick={() => navigate('/assessment')}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-xl font-semibold shadow-lg transition-colors duration-200"
              >
                <div className="text-center">
                  <span className="text-lg font-semibold">Start Assessment</span>
                </div>
                <p className="text-sm text-orange-100 mt-1">Take your German proficiency test</p>
              </button>
              <button
                onClick={() => navigate('/certificates')}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-xl font-semibold shadow-lg transition-colors duration-200"
              >
                <div className="text-center">
                  <span className="text-lg font-semibold">Certificates</span>
                </div>
                <p className="text-sm text-purple-100 mt-1">Download your certificates</p>
              </button>
            </div>
          </div>

          {/* Real-time Rankings */}
          <div className="bg-white/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 p-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                Performance Rankings
              </h3>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {/* Assessment Ranking */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-blue-800">Assessment Score</span>
                    </div>
                    <div className="text-xs text-blue-600">Live Rank</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-blue-900">
                        {rankingsData?.data?.hasCompletedTests ? 
                          `${rankingsData.data.examScore}%` : 'N/A'
                        }
                      </div>
                      <div className="text-sm text-blue-600">
                        {rankingsData?.data?.hasCompletedTests ? 'Best assessment score' : 'No assessments completed'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-700">
                        {rankingsData?.data?.hasCompletedTests && rankingsData.data.examRank ? `# ${rankingsData.data.examRank}` : '# --'}
                      </div>
                      <div className="text-sm text-blue-500">
                        {rankingsData?.data?.totalUsers > 0 ? `of ${rankingsData.data.totalUsers}` : 'of --'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Exam Ranking */}
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-green-800">Exam Score</span>
                    </div>
                    <div className="text-xs text-green-600">Live Rank</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-green-900">N/A</div>
                      <div className="text-sm text-green-600">No video exams completed</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-700"># --</div>
                      <div className="text-sm text-green-500">of --</div>
                    </div>
                  </div>
                </div>

                {/* Quiz Ranking */}
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-purple-800">Quiz Score</span>
                    </div>
                    <div className="text-xs text-purple-600">Live Rank</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-purple-900">N/A</div>
                      <div className="text-sm text-purple-600">No video quizzes completed</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-700"># --</div>
                      <div className="text-sm text-purple-500">of --</div>
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
};

export default Dashboard;