'use client';

import { useNotification } from '@/hooks/useNotification';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Course {
  _id: string;
  title: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  description: string;
  duration: number;
  price: number;
  currency: string;
  instructor: string;
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
}

export default function CoursesPage() {
  const router = useRouter();
  const { showError } = useNotification();
  const { token } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [enrollments, setEnrollments] = useState<{ [key: string]: any }>({});

  const levelColors = {
    A1: 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border-emerald-300 shadow-sm',
    A2: 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-300 shadow-sm',
    B1: 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-300 shadow-sm',
    B2: 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 border-orange-300 shadow-sm',
    C1: 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-red-300 shadow-sm',
    C2: 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border-purple-300 shadow-sm',
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

  useEffect(() => {
    fetchCourses();
    if (token) {
      fetchUserEnrollments();
    }
  }, [selectedLevel, token]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && token) {
        fetchUserEnrollments();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [token]);

  const fetchCourses = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (selectedLevel) queryParams.append('level', selectedLevel);
      queryParams.append('status', 'upcoming');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses?${queryParams.toString()}`);
      const data = await response.json();

      if (data.success) {
        setCourses(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
    setLoading(false);
  };

  const fetchUserEnrollments = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/user/enrollments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        const enrollmentMap: { [key: string]: any } = {};
        data.data.forEach((enrollment: any) => {
          const courseId = enrollment.courseId?._id || enrollment.courseId;
          if (courseId) {
            enrollmentMap[courseId] = enrollment;
          }
        });
        setEnrollments(enrollmentMap);
      }
    } catch (error) {
      console.error('Failed to fetch enrollments:', error);
    }
  };

  const handleEnrollNow = (courseId: string) => {
    if (!token) {
      showError('Please register to enroll in courses', 'Registration Required', {
        duration: 6000,
        actions: [
          {
            label: 'Go to Register',
            onClick: () => router.push('/register'),
          },
        ],
      });
      router.push('/register');
      return;
    }
    router.push(`/enroll/${courseId}`);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  const convertEuroToTaka = (euros: number) => Math.round(euros * 115);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 font-medium">Loading amazing courses for you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div
        className="relative bg-cover bg-no-repeat text-white min-h-[580px] flex items-center"
        style={{
          backgroundImage: 'url(/hero-bg-without-text.png)',
          backgroundPosition: 'center 20%',
        }}
      >
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            German Language Courses
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-blue-100 max-w-3xl mx-auto mb-4">
            Learn German from A1 to C2 with expert Bengali teachers.
          </p>
          <div className="inline-flex items-center border border-white border-opacity-50 rounded-full px-4 py-2 mt-2">
            <span className="text-lg sm:text-xl font-bold text-yellow-400">{courses.length}</span>
            <span className="text-sm sm:text-base text-white ml-2">Courses Available</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12 space-y-8 sm:space-y-10 md:space-y-12">
        {/* Level Filter */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 md:p-8">
          <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-clip-text text-transparent mb-4 sm:mb-6 text-center">
            Choose Your German Level
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
            <button
              onClick={() => setSelectedLevel('')}
              className={`px-3 sm:px-4 md:px-6 py-3 sm:py-3.5 md:py-4 rounded-xl border-2 text-xs sm:text-sm font-bold min-h-[44px] transition-all ${
                selectedLevel === ''
                  ? 'bg-gradient-to-r from-gray-600 to-green-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-500'
              }`}
            >
              All Levels
            </button>
            {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`px-3 sm:px-4 md:px-6 py-3 sm:py-3.5 md:py-4 rounded-xl border-2 text-xs sm:text-sm font-bold min-h-[44px] transition-all ${
                  selectedLevel === level
                    ? 'bg-gradient-to-r from-gray-600 to-green-600 text-white border-transparent shadow-lg'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-green-500'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Course Grid */}
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => {
              const isEnrolled = enrollments[course._id];
              const isFull = course.currentStudents >= course.maxStudents;

              return (
                <div key={course._id} className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300">
                  {/* Course Header with Gradient */}
                  <div className={`bg-gradient-to-r ${levelGradients[course.level]} p-6 text-white relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <div className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                          <span className="mr-2">{levelIcons[course.level]}</span>
                          {course.level}
                        </div>
                        {isEnrolled && (
                          <span className="inline-flex items-center px-3 py-1 text-xs font-bold rounded-full bg-green-500 text-white">
                            ENROLLED
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold mb-2">{course.title}</h3>
                      <p className="text-blue-100 opacity-90 flex items-center">
                        <span className="mr-2">Instructor:</span>
                        {course.instructor}
                      </p>
                    </div>
                  </div>

                  {/* Course Body */}
                  <div className="p-6">
                    <p className="text-gray-600 mb-6 line-clamp-3">{course.description}</p>

                    <div className="space-y-4 mb-6">
                      <div className="flex items-center text-sm text-gray-700">
                        <span className="font-semibold mr-2 w-24">Duration:</span>
                        <span>{course.duration} weeks</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <span className="font-semibold mr-2 w-24">Schedule:</span>
                        <span>{course.schedule.days.join(', ')} • {course.schedule.time}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <span className="font-semibold mr-2 w-24">Starts:</span>
                        <span>{new Date(course.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <span className="font-semibold mr-2 w-24">Students:</span>
                        <span>
                          {course.currentStudents} / {course.maxStudents}
                        </span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-4 mb-6">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="text-2xl font-bold text-gray-900">{formatCurrency(course.price, course.currency)}</div>
                          <div className="text-sm text-gray-600">
                            ≈ {convertEuroToTaka(course.price).toLocaleString()} BDT
                          </div>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          per {course.duration} weeks
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    {course.features && course.features.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-sm text-gray-900 mb-3">What you&apos;ll learn:</h4>
                        <ul className="space-y-2">
                          {course.features.slice(0, 3).map((feature, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-start">
                              <span className="text-green-500 mr-2">✓</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Enroll Button */}
                    {isEnrolled ? (
                      <button
                        onClick={() => router.push('/my-courses')}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
                      >
                        View My Course
                      </button>
                    ) : isFull ? (
                      <button disabled className="w-full bg-gray-300 text-gray-500 py-3 px-6 rounded-xl font-semibold cursor-not-allowed">
                        Course Full
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnrollNow(course._id)}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
                      >
                        Enroll Now
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 text-center py-12 px-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Courses Available</h3>
            <p className="text-gray-600">
              {selectedLevel ? `No ${selectedLevel} courses available at the moment. Try selecting a different level.` : 'Check back soon for new courses!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
