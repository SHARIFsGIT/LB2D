'use client';

import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import { appConfig } from '@/config/app.config';
import { useCurrency } from '@/hooks/useCurrency';
import { useAppSelector } from '@/store/hooks';
import { RootState } from '@/store/store';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

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

const LandingPage: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated, user } = useAppSelector((state: RootState) => state.auth);
  const { convertEuroToTaka, formatCurrency } = useCurrency();
  const [stats, setStats] = useState({
    totalStudents: 0,
    coursesCompleted: 0,
    countries: 0,
    successRate: 0
  });

  const [hasAnimated, setHasAnimated] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [testimonials, setTestimonials] = useState<any[]>([]);

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

  const levelTitles = {
    A1: 'Beginner',
    A2: 'Elementary',
    B1: 'Intermediate',
    B2: 'Upper Intermediate',
    C1: 'Advanced',
    C2: 'Proficiency',
  };

  // Fetch real enrolled students for testimonials
  const fetchTestimonials = async () => {
    try {
      const response = await fetch(`${appConfig.api.baseUrl}/analytics/recent-students?limit=10&showAllEnrolled=true`);
      const data = await response.json();

      if (data.success && data.data?.students) {
        const studentsWithCourses = data.data.students
          .filter((student: any) => student.enrollments && student.enrollments.length > 0)
          .map((student: any) => ({
            id: student._id || student.id,
            name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student',
            location: student.phone || 'Bangladesh',
            finishedClass: student.enrollments[0]?.course?.title || student.enrollments[0]?.courseName || 'German Course',
            reviewText: `Currently enrolled in ${student.enrollments[0]?.course?.level || student.enrollments[0]?.courseLevel || 'German'} course`,
            profilePhoto: student.profilePhoto || student.profilePicture || student.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(`${student.firstName} ${student.lastName}`),
            rating: 5,
            createdAt: student.createdAt || new Date().toISOString()
          }));

        setTestimonials(studentsWithCourses.slice(0, 6)); // Show up to 6 students
      }
    } catch (error) {
      console.error('Failed to fetch testimonials:', error);
      // Keep empty array if fetch fails
      setTestimonials([]);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchTestimonials();
    
    if (!hasAnimated) {
      // Count up animation for each stat
      const animateStats = () => {
        const duration = 2000; // 2 seconds
        const steps = 60; // 60 steps for smooth animation
        const stepDuration = duration / steps;

        const targets = {
          totalStudents: 250,
          coursesCompleted: 120,
          countries: 3,
          successRate: 90
        };

        let currentStep = 0;

        const interval = setInterval(() => {
          currentStep++;
          const progress = currentStep / steps;

          setStats({
            totalStudents: Math.floor(targets.totalStudents * progress),
            coursesCompleted: Math.floor(targets.coursesCompleted * progress),
            countries: Math.floor(targets.countries * progress),
            successRate: Math.floor(targets.successRate * progress)
          });

          if (currentStep >= steps) {
            setStats(targets); // Ensure final values are exact
            clearInterval(interval);
            setHasAnimated(true);
          }
        }, stepDuration);

        return interval;
      };

      const timeoutId = setTimeout(animateStats, 500); // Start after 500ms
      return () => clearTimeout(timeoutId);
    }
  }, [hasAnimated]);

  const fetchCourses = async () => {
    try {
      const response = await fetch(
        `${appConfig.api.baseUrl}/courses?status=upcoming&limit=6`
      );
      const data = await response.json();

      if (data.success) {
        setCourses(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
    setCoursesLoading(false);
  };

  // Auto-scroll testimonials (showing 1 at a time)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [testimonials.length]);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push(user?.role === 'Admin' ? '/admin' : '/courses');
    } else {
      router.push('/courses');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-green-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-800 to-blue-900 bg-cover bg-no-repeat text-white min-h-[600px] sm:min-h-[650px] md:min-h-[700px] flex items-center" style={{backgroundImage: 'url(/hero-bg.jpg)', backgroundPosition: 'center 5%'}}>
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 lg:py-24 w-full">
          <div className="text-center">
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 sm:mb-12">
              <div className="relative group">
                {/* Star 1 - Black - Top Left */}
                  <div className="fixed w-5 h-5 top-[3%] left-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-black drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>

                  {/* Star 2 - Blue - Top Right */}
                  <div className="fixed w-3 h-3 top-[12%] right-[7%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[1800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-blue-800 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>

                  {/* Star 3 - White - Top Center */}
                  <div className="fixed w-4 h-4 top-[7%] left-[45%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>

                  {/* Star 4 - Orange - Middle Right */}
                  <div className="fixed w-2 h-2 top-[45%] right-[5%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-orange-500 drop-shadow-[0_0_7px_rgba(251,146,60,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>

                  {/* Star 5 - Cyan - Middle Left */}
                  <div className="fixed w-3 h-3 top-[55%] left-[10%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[3200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-cyan-600 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>

                  {/* Star 6 - White - Bottom Right */}
                  <div className="fixed w-4 h-4 bottom-[8%] right-[15%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2600ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>

                  {/* Star 7 - Red - Bottom Left */}
                  <div className="fixed w-2 h-2 bottom-[15%] left-[12%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-red-800 drop-shadow-[0_0_7px_rgba(248,113,113,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>

                  {/* Star 8 - Indigo - Middle Right Center */}
                  <div className="fixed w-3 h-3 top-[38%] right-[25%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-indigo-100 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>

                  {/* Star 9 - Purple - Bottom Center */}
                  <div className="fixed w-3 h-3 bottom-[6%] left-[50%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2100ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>

                  {/* Star 10 - Rose - Middle Left Center */}
                  <div className="fixed w-2 h-2 top-[30%] left-[22%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-rose-500 drop-shadow-[0_0_7px_rgba(251,113,133,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>

                  {/* Star 11 - Emerald - Bottom Far Right */}
                  <div className="fixed w-3 h-3 bottom-[20%] right-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-emerald-600 drop-shadow-[0_0_8px_rgba(5,150,105,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>

                {/* Star 12 - Lime - Top Far Right */}
                <div className="fixed w-2 h-2 top-[18%] right-[18%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 784.11 815.53"
                    className="w-full h-full fill-lime-600 drop-shadow-[0_0_7px_rgba(163,230,53,0.8)]"
                  >
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>

                <div className="absolute -inset-1 bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 rounded-full opacity-60 blur-lg animate-pulse"></div>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 via-yellow-500 to-red-600 rounded-full opacity-80 blur-md"></div>
                <Button
                  onClick={handleGetStarted}
                  className="animated-btn relative bg-white bg-opacity-20 backdrop-blur-md border-2 border-white border-opacity-30 text-white font-bold px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-full shadow-xl hover:!bg-transparent min-h-[44px]"
                >
                  Start Learning Now
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-4 md:gap-6 mt-12 sm:mt-16 md:mt-20">
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white border-opacity-30 flex flex-col items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-400 text-left">{stats.totalStudents.toLocaleString()}+</div>
                  <div className="text-xs sm:text-sm md:text-base text-white text-left">Happy Students</div>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white border-opacity-30 flex flex-col items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-yellow-400 text-left">{stats.coursesCompleted.toLocaleString()}+</div>
                  <div className="text-xs sm:text-sm md:text-base text-white text-left">Courses Completed</div>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white border-opacity-30 flex flex-col items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-400 text-left">{stats.countries}+</div>
                  <div className="text-xs sm:text-sm md:text-base text-white text-left">Countries</div>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white border-opacity-30 flex flex-col items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-cyan-400 text-left">{stats.successRate}%</div>
                  <div className="text-xs sm:text-sm md:text-base text-white text-left">Success Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </section>

      {/* CEFR Levels Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-clip-text text-transparent mb-3 sm:mb-4">
              Choose Your German Level
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              From complete beginner to advanced proficiency - we have the perfect course for your German learning journey
            </p>
          </div>

          {coursesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded mb-3"></div>
                  <div className="h-16 bg-gray-200 rounded mb-4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : courses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {courses.map((course) => (
                <Card key={course._id} className="hover:shadow-lg hover:scale-[1.02] transition-all duration-300 overflow-hidden border border-gray-200 shadow-md rounded-2xl">
                  <div className={`h-2 bg-gradient-to-r ${levelGradients[course.level]}`}></div>
                  <div className="p-6 bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className={`text-xl font-bold px-3 py-2 bg-gradient-to-r ${levelGradients[course.level]} text-white rounded-xl mr-3 shadow-lg flex items-center`}>
                          <span className="mr-1">{levelIcons[course.level]}</span>
                          {course.level}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">{levelTitles[course.level]}</h3>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(course.price, 'EUR')}
                        </div>
                        <div className="text-sm font-semibold text-blue-600">
                          {formatCurrency(convertEuroToTaka(course.price), 'BDT')}
                        </div>
                      </div>
                    </div>
                    
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{course.title}</h4>
                    <p className="text-gray-700 mb-4 leading-relaxed line-clamp-2">{course.description}</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium w-20">Duration:</span>
                        <span>{course.duration} weeks</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium w-20">Instructor:</span>
                        <span>{course.instructor}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium w-20">Starts:</span>
                        <span>{new Date(course.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium w-20">Spots:</span>
                        <span>{course.maxStudents - course.currentStudents} available</span>
                      </div>
                    </div>
                    
                    {course.features.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {course.features.slice(0, 3).map((feature, i) => (
                          <div key={i} className="flex items-center text-sm text-gray-700 bg-white bg-opacity-60 rounded-lg p-2">
                            <span className="text-green-600 mr-2 text-lg">✓</span>
                            <span className="font-medium">{feature}</span>
                          </div>
                        ))}
                        {course.features.length > 3 && (
                          <div className="text-xs text-blue-600 font-medium pl-6">
                            +{course.features.length - 3} more features...
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="relative mt-4 group">
                      {/* Stars for See More button */}
                      <div className="fixed w-5 h-5 top-[3%] left-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-black drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                          <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                        </svg>
                      </div>
                      <div className="fixed w-3 h-3 top-[12%] right-[7%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[1800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-blue-800 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]">
                          <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                        </svg>
                      </div>
                      <div className="fixed w-4 h-4 top-[7%] left-[45%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                          <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                        </svg>
                      </div>
                      <div className="fixed w-2 h-2 top-[45%] right-[5%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-orange-500 drop-shadow-[0_0_7px_rgba(251,146,60,0.8)]">
                          <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                        </svg>
                      </div>
                      <div className="fixed w-3 h-3 top-[55%] left-[10%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[3200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-cyan-600 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
                          <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                        </svg>
                      </div>
                      <div className="fixed w-4 h-4 bottom-[8%] right-[15%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2600ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                          <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                        </svg>
                      </div>
                      <div className="fixed w-2 h-2 bottom-[15%] left-[12%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-red-800 drop-shadow-[0_0_7px_rgba(248,113,113,0.8)]">
                          <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                        </svg>
                      </div>
                      <div className="fixed w-3 h-3 top-[38%] right-[25%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-indigo-100 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]">
                          <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                        </svg>
                      </div>
                      <div className="fixed w-3 h-3 bottom-[6%] left-[50%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2100ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">
                          <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                        </svg>
                      </div>
                      <div className="fixed w-2 h-2 top-[30%] left-[22%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-rose-500 drop-shadow-[0_0_7px_rgba(251,113,133,0.8)]">
                          <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                        </svg>
                      </div>
                      <div className="fixed w-3 h-3 bottom-[20%] right-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-emerald-600 drop-shadow-[0_0_8px_rgba(5,150,105,0.8)]">
                          <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                        </svg>
                      </div>
                      <div className="fixed w-2 h-2 top-[18%] right-[18%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-lime-600 drop-shadow-[0_0_7px_rgba(163,230,53,0.8)]">
                          <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                        </svg>
                      </div>

                      <Button
                        onClick={() => router.push('/courses')}
                        className="animated-btn relative w-full bg-gradient-to-r from-slate-50 to-gray-50 text-black border-2 border-slate-200 hover:border-slate-500 hover:shadow-lg rounded-xl py-3 font-semibold"
                      >
                        See More
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-clip-text text-transparent mb-4">No Courses Available</h3>
              <p className="text-gray-600 mb-6">We're working on adding new courses for you. Check back soon!</p>
              <div className="relative inline-block group">
                {/* Stars for View All Courses button */}
                <div className="fixed w-5 h-5 top-[3%] left-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-black drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-3 h-3 top-[12%] right-[7%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[1800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-blue-800 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-4 h-4 top-[7%] left-[45%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-2 h-2 top-[45%] right-[5%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-orange-500 drop-shadow-[0_0_7px_rgba(251,146,60,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-3 h-3 top-[55%] left-[10%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[3200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-cyan-600 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-4 h-4 bottom-[8%] right-[15%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2600ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-2 h-2 bottom-[15%] left-[12%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-red-800 drop-shadow-[0_0_7px_rgba(248,113,113,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-3 h-3 top-[38%] right-[25%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-indigo-100 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-3 h-3 bottom-[6%] left-[50%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2100ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-2 h-2 top-[30%] left-[22%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-rose-500 drop-shadow-[0_0_7px_rgba(251,113,133,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-3 h-3 bottom-[20%] right-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-emerald-600 drop-shadow-[0_0_8px_rgba(5,150,105,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-2 h-2 top-[18%] right-[18%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-lime-600 drop-shadow-[0_0_7px_rgba(163,230,53,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>

                <Button
                  onClick={() => router.push('/courses')}
                  className="animated-btn relative bg-gradient-to-r from-slate-50 to-gray-50 !text-gray-600 hover:!text-gray-700 border-2 border-slate-200 hover:border-slate-500 hover:shadow-lg px-8 py-3 rounded-xl font-semibold min-h-[44px]"
                >
                  View All Courses
                </Button>
              </div>
            </div>
          )}
          
          {courses.length > 0 && (
            <div className="text-center mt-8 sm:mt-10 md:mt-12">
              <div className="relative inline-block group">
                {/* Stars for View All Courses button */}
                <div className="fixed w-5 h-5 top-[3%] left-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-black drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-3 h-3 top-[12%] right-[7%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[1800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-blue-800 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-4 h-4 top-[7%] left-[45%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-2 h-2 top-[45%] right-[5%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-orange-500 drop-shadow-[0_0_7px_rgba(251,146,60,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-3 h-3 top-[55%] left-[10%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[3200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-cyan-600 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-4 h-4 bottom-[8%] right-[15%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2600ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-2 h-2 bottom-[15%] left-[12%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-red-800 drop-shadow-[0_0_7px_rgba(248,113,113,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-3 h-3 top-[38%] right-[25%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-indigo-100 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-3 h-3 bottom-[6%] left-[50%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2100ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-2 h-2 top-[30%] left-[22%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-rose-500 drop-shadow-[0_0_7px_rgba(251,113,133,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-3 h-3 bottom-[20%] right-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-emerald-600 drop-shadow-[0_0_8px_rgba(5,150,105,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>
                <div className="fixed w-2 h-2 top-[18%] right-[18%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-lime-600 drop-shadow-[0_0_7px_rgba(163,230,53,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>

                <Button
                  onClick={() => router.push('/courses')}
                  className="animated-btn relative bg-gradient-to-r from-slate-50 to-gray-50 !text-gray-600 hover:!text-gray-700 border-2 border-slate-200 hover:border-slate-500 hover:shadow-lg px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-xl font-semibold min-h-[44px]"
                >
                  View All Courses
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-clip-text text-transparent mb-3 sm:mb-4">
              Why Learn Bangla to Deutsch?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600">
              The only platform designed specifically for Bengali speakers learning German
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            <Card className="text-center p-6 sm:p-8 hover:shadow-xl transition-all bg-gradient-to-br from-blue-25 to-blue-50">
              <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-clip-text text-transparent mb-3 sm:mb-4">Bengali Teachers</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Learn from native Bengali speakers who mastered German. They understand your challenges!
              </p>
            </Card>

            <Card className="text-center p-6 sm:p-8 hover:shadow-xl transition-all bg-gradient-to-br from-orange-25 to-orange-50">
              <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-clip-text text-transparent mb-3 sm:mb-4">Career Support</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Get guidance on German job applications, visa processes, and university admissions.
              </p>
            </Card>

            <Card className="text-center p-6 sm:p-8 hover:shadow-xl transition-all bg-gradient-to-br from-teal-25 to-teal-50">
              <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-clip-text text-transparent mb-3 sm:mb-4">Flexible Schedule</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Morning, evening, and weekend classes to fit your busy schedule in Bangladesh.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-8 sm:py-10 md:py-12 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6 sm:mb-8 md:mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">Our Students</h2>
            <p className="text-sm sm:text-base md:text-lg">Meet real students currently learning German with us</p>
          </div>

          {/* Single Review Display */}
          <div className="max-w-2xl mx-auto mb-4 sm:mb-6">
            <div className="flex justify-center">
              {(() => {
                if (!testimonials || testimonials.length === 0) {
                  return (
                    <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white border-opacity-20 shadow-lg w-full text-center">
                      <p className="text-white text-sm sm:text-base">No feedback from students</p>
                    </div>
                  );
                }

                const testimonial = testimonials[currentTestimonial];
                if (!testimonial) return null;

                return (
                  <div key={testimonial.id} className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white border-opacity-20 shadow-lg transition-all duration-500 w-full">
                    {/* Student Header */}
                    <div className="flex items-center mb-3 sm:mb-4">
                      <img
                        src={testimonial.profilePhoto}
                        alt={testimonial.name}
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white border-opacity-50 mr-3 sm:mr-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <h4 className="text-base sm:text-lg font-bold text-white">{testimonial.name}</h4>
                          <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                            {testimonial.finishedClass}
                          </span>
                        </div>
                        <p className="text-yellow-200 text-xs sm:text-sm">{testimonial.location}</p>
                      </div>
                    </div>

                    {/* Review Text */}
                    <p className="text-white text-sm sm:text-base leading-relaxed italic text-center">
                      "{testimonial.reviewText}"
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Navigation Dots */}
          <div className="flex justify-center space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  currentTestimonial === index
                    ? 'bg-yellow-400 w-6'
                    : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-10 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-blue-400">Learn Bangla to Deutsch</h3>
              <p className="text-sm sm:text-base text-gray-400">
                Making German accessible for Bengali speakers worldwide.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base">Courses</h4>
              <ul className="space-y-2 text-gray-400 text-sm sm:text-base">
                <li>A1 Beginner German</li>
                <li>A2 Elementary German</li>
                <li>B1 Intermediate German</li>
                <li>B2 Upper Intermediate</li>
                <li>C1 Advanced German</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base">Support</h4>
              <ul className="space-y-2 text-gray-400 text-sm sm:text-base">
                <li>learnbangla2deutsch@gmail.com</li>
                <li>+49-176-31397772</li>
                <li>www.learnbangla2deutsch.com</li>
                <li>Join our WhatsApp Group</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base">Follow Us</h4>
              <div className="flex space-x-4">
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 sm:pt-8 mt-6 sm:mt-8 text-center text-gray-400">
            <p className="text-xs sm:text-sm">&copy; 2024 Learn Bangla to Deutsch. All rights reserved. Made for Bengali German learners.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;