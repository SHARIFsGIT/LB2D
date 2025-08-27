import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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

const MyCourses: React.FC = () => {
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');

  // Course level gradients matching CourseCatalog
  const levelGradients = {
    A1: 'from-emerald-500 to-green-500',
    A2: 'from-blue-500 to-cyan-500',
    B1: 'from-amber-500 to-yellow-500',
    B2: 'from-orange-500 to-red-500',
    C1: 'from-red-500 to-pink-500',
    C2: 'from-purple-500 to-indigo-500'
  };

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  const fetchEnrolledCourses = async () => {
    try {
      const token = sessionStorage.getItem('accessToken');
      console.log('🔍 Fetching enrolled courses...');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/courses/user/enrollments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log('📚 Enrolled courses response:', data);
      
      if (data.success) {
        console.log(`✅ Found ${data.data.length} enrollments:`, data.data.map((course: any) => ({
          courseTitle: course.courseId?.title,
          status: course.status,
          enrollmentDate: course.enrollmentDate,
          paymentStatus: course.paymentId?.status
        })));
        setEnrolledCourses(data.data);
      } else {
        console.error('❌ Failed to fetch enrolled courses:', data.message);
      }
    } catch (error) {
      console.error('❌ Error fetching enrolled courses:', error);
    }
    setLoading(false);
  };


  const filteredCourses = enrolledCourses.filter(course => {
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
    
    console.log(`🔍 Filter check for course "${course.courseId?.title}": status="${course.status}", activeTab="${activeTab}", included=${isIncluded}`);
    return isIncluded;
  });

  const handleDownloadCertificate = async (courseId: string) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/certificates/download/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      alert('Failed to download certificate');
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Meine Kurse (My Courses)
          </h1>
          <p className="text-xl text-gray-600">
            Track your German learning progress and access your course materials
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'active', label: 'Active Courses', count: enrolledCourses.filter(c => ['confirmed', 'active'].includes(c.status)).length },
                { key: 'completed', label: 'Completed', count: enrolledCourses.filter(c => c.status === 'completed').length },
                { key: 'all', label: 'All Courses', count: enrolledCourses.length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="bg-gray-100 text-gray-600 rounded-full px-2 py-1 text-xs">
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Courses Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredCourses.map((enrollment) => (
              <div key={enrollment._id} className="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
                {/* Course Header with Matching Gradient */}
                <div className={`bg-gradient-to-r ${levelGradients[enrollment.courseId.level as keyof typeof levelGradients]} p-6 text-white relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                  <div className="relative z-10 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <div className="inline-flex items-center px-3 py-1 text-sm font-bold rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mr-3">
                          <span className="mr-2">🌱</span>
                          {enrollment.courseId.level}
                        </div>
                        {enrollment.status !== 'active' && enrollment.status !== 'confirmed' && (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30`}>
                            {enrollment.status.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold mb-2">
                        {enrollment.courseId.title}
                      </h3>
                      <p className="text-blue-100 opacity-90 flex items-center">
                        <span className="mr-2">Instructor:</span>
                        {enrollment.courseId.instructor}
                      </p>
                    </div>
                    {/* Instructor's Photo */}
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30 ml-4">
                      {enrollment.courseId.supervisor ? (
                        <>
                          {enrollment.courseId.supervisor.profilePhoto ? (
                            <img 
                              src={enrollment.courseId.supervisor.profilePhoto} 
                              alt={`${enrollment.courseId.supervisor.firstName} ${enrollment.courseId.supervisor.lastName}`}
                              className="w-full h-full rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallbackDiv = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallbackDiv) {
                                  fallbackDiv.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full rounded-full bg-white/30 flex items-center justify-center text-white font-bold text-lg ${enrollment.courseId.supervisor.profilePhoto ? 'hidden' : 'flex'}`}>
                            {enrollment.courseId.supervisor.firstName.charAt(0)}
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full rounded-full bg-white/30 flex items-center justify-center text-white font-bold text-lg">
                          {enrollment.courseId.instructor.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Progress Section */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Learning Progress</span>
                      <span className="text-sm font-bold text-blue-600">
                        {enrollment.progress.percentage || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${enrollment.progress.percentage || 0}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>
                        {enrollment.progress.lessonsCompleted || 0} / {enrollment.progress.totalLessons || 0} lessons completed
                      </span>
                      <span>
                        {enrollment.courseId.duration} weeks duration
                      </span>
                    </div>
                  </div>

                  {/* Course Information */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-900 mb-1">Start Date</div>
                        <div className="text-gray-600">
                          {new Date(enrollment.courseId.startDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 mb-1">End Date</div>
                        <div className="text-gray-600">
                          {new Date(enrollment.courseId.endDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 mb-1">Schedule</div>
                        <div className="text-gray-600">
                          {enrollment.courseId.schedule.days.join(', ')}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 mb-1">Enrolled</div>
                        <div className="text-gray-600">
                          {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {enrollment.status === 'active' || enrollment.status === 'confirmed' ? (
                      <button 
                        onClick={() => navigate(`/course/${enrollment.courseId._id}/videos`)}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-800 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
                      >
                        Continue Learning
                      </button>
                    ) : null}

                    {enrollment.certificateGenerated && (
                      <button 
                        onClick={() => handleDownloadCertificate(enrollment.courseId._id)}
                        className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
                      >
                        Download Certificate
                      </button>
                    )}
                  </div>

                  {/* Achievement Badge */}
                  {enrollment.progress.percentage >= 100 && (
                    <div className="mt-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg p-3 text-center">
                      <span className="font-bold">🏆 Course Completed!</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 text-center py-12 px-8">
            <div className="text-6xl mb-4">
              {activeTab === 'active' ? '📚' : activeTab === 'completed' ? '🎯' : '📖'}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {activeTab === 'active' ? 'No Active Courses' : 
               activeTab === 'completed' ? 'No Completed Courses' : 'No Courses Found'}
            </h3>
            <p className="text-gray-600">
              {activeTab === 'active' ? 'Start your German learning journey today!' : 
               activeTab === 'completed' ? 'Complete a course to see it here!' : 'Enroll in a course to get started!'}
            </p>
          </div>
        )}

        {/* Bottom spacing */}
        <div className="h-8"></div>
      </div>
    </div>
  );
};

export default MyCourses;