import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "../hooks/useCurrency";
import { useNotification } from "../hooks/useNotification";
import '../styles/AnimatedButton.css';

interface Course {
  _id: string;
  title: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
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
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  features: string[];
  requirements: string[];
}

const CourseCatalog: React.FC = () => {
  const { showError, showSuccess } = useNotification();
  const navigate = useNavigate();
  const { convertEuroToTaka, formatCurrency } = useCurrency();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [enrollments, setEnrollments] = useState<{ [key: string]: any }>({});
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    fetchCourses();
    fetchUserEnrollments();

    // Check if user is logged in
    const token = sessionStorage.getItem("accessToken");
    setIsLoggedIn(!!token);
  }, [selectedLevel]);

  // Refetch enrollments when user navigates back to course catalog
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUserEnrollments();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fetchCourses = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (selectedLevel) queryParams.append("level", selectedLevel);
      queryParams.append("status", "upcoming");

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/courses?${queryParams.toString()}`
      );
      const data = await response.json();

      if (data.success) {
        setCourses(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    }
    setLoading(false);
  };

  const fetchUserEnrollments = async () => {
    const token = sessionStorage.getItem("accessToken");
    if (!token) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/courses/user/enrollments`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        const enrollmentMap: { [key: string]: any } = {};
        data.data.forEach((enrollment: any) => {
          // Handle both possible data structures
          const courseId = enrollment.courseId?._id || enrollment.courseId;
          if (courseId) {
            enrollmentMap[courseId] = enrollment;
          }
        });
        setEnrollments(enrollmentMap);
      } else {
        console.warn('Enrollment fetch failed:', data.message);
      }
    } catch (error) {
      console.error("Failed to fetch enrollments:", error);
    }
  };

  const handleEnrollNow = (courseId: string) => {
    const token = sessionStorage.getItem("accessToken");
    if (!token) {
      showError(
        "Please register to enroll in courses",
        "Registration Required",
        {
          duration: 6000,
          actions: [
            {
              label: "Go to Register",
              onClick: () => navigate("/register"),
            },
          ],
        }
      );
      navigate("/register");
      return;
    }
    navigate(`/enroll/${courseId}`);
  };

  const levelColors = {
    A1: "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border-emerald-300 shadow-sm",
    A2: "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-300 shadow-sm",
    B1: "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-300 shadow-sm",
    B2: "bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 border-orange-300 shadow-sm",
    C1: "bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-red-300 shadow-sm",
    C2: "bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border-purple-300 shadow-sm",
  };

  const levelGradients = {
    A1: "from-emerald-500 to-green-500",
    A2: "from-blue-500 to-cyan-500",
    B1: "from-amber-500 to-yellow-500",
    B2: "from-orange-500 to-red-500",
    C1: "from-red-500 to-pink-500",
    C2: "from-purple-500 to-indigo-500",
  };

  // Custom icons for each level
  const levelIcons = {
    A1: "🌱",
    A2: "🌿",
    B1: "🌳",
    B2: "🎯",
    C1: "🚀",
    C2: "💎",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 font-medium">
            Loading amazing courses for you...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div
        className="relative bg-cover bg-center bg-no-repeat text-white py-16 sm:py-24 md:py-32"
        style={{
          backgroundImage: "url(/hero-bg-without-text.png)",
          backgroundPosition: "center 30%",
        }}
      >
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            German Language Courses
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 text-blue-100 max-w-3xl mx-auto">
            Learn German from A1 to C2 with expert Bengali teachers. <br />
            Start your journey to fluency today!
          </p>
          <div className="mt-6 sm:mt-8 flex justify-center space-x-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 sm:px-6 py-2 sm:py-3 border border-white/20">
              <span className="text-white font-semibold text-sm sm:text-base">
                {courses.length} Courses Available
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12 space-y-8 sm:space-y-10 md:space-y-12">
        {/* Level Filter */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 md:p-8">
          <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-clip-text text-transparent mb-4 sm:mb-6 text-center">
            Choose Your German Level
          </h3>
          <div className="relative group">
            {/* Star 1 - Black - Top Left */}
            <div className="fixed w-5 h-5 top-[3%] left-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-black drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 2 - Blue - Top Right */}
            <div className="fixed w-3 h-3 top-[12%] right-[7%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[1800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-blue-800 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 3 - White - Top Center */}
            <div className="fixed w-4 h-4 top-[7%] left-[45%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 4 - Orange - Middle Right */}
            <div className="fixed w-2 h-2 top-[45%] right-[5%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-orange-500 drop-shadow-[0_0_7px_rgba(251,146,60,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 5 - Cyan - Middle Left */}
            <div className="fixed w-3 h-3 top-[55%] left-[10%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[3200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-cyan-600 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 6 - White - Bottom Right */}
            <div className="fixed w-4 h-4 bottom-[8%] right-[15%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2600ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 7 - Red - Bottom Left */}
            <div className="fixed w-2 h-2 bottom-[15%] left-[12%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-red-800 drop-shadow-[0_0_7px_rgba(248,113,113,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 8 - Indigo - Middle Right Center */}
            <div className="fixed w-3 h-3 top-[38%] right-[25%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-indigo-100 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 9 - Purple - Bottom Center */}
            <div className="fixed w-3 h-3 bottom-[6%] left-[50%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2100ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 10 - Rose - Middle Left Center */}
            <div className="fixed w-2 h-2 top-[30%] left-[22%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-rose-500 drop-shadow-[0_0_7px_rgba(251,113,133,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 11 - Emerald - Bottom Far Right */}
            <div className="fixed w-3 h-3 bottom-[20%] right-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-emerald-600 drop-shadow-[0_0_8px_rgba(5,150,105,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            {/* Star 12 - Lime - Top Far Right */}
            <div className="fixed w-2 h-2 top-[18%] right-[18%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-lime-600 drop-shadow-[0_0_7px_rgba(163,230,53,0.8)]">
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
              <button
                onClick={() => setSelectedLevel("")}
                className={`animated-btn px-3 sm:px-4 md:px-6 py-3 sm:py-3.5 md:py-4 rounded-xl border-2 text-xs sm:text-sm font-bold min-h-[44px] hover:!bg-transparent ${
                  selectedLevel === ""
                    ? "bg-gradient-to-r from-gray-600 to-green-600 text-white shadow-lg"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                All Levels
              </button>
              {(["A1", "A2", "B1", "B2", "C1", "C2"] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`animated-btn px-3 sm:px-4 md:px-6 py-3 sm:py-3.5 md:py-4 rounded-xl border-2 text-xs sm:text-sm font-bold min-h-[44px] hover:!bg-transparent ${
                    selectedLevel === level
                      ? "bg-gradient-to-r from-gray-600 to-green-600 text-white border-transparent shadow-lg"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => {
            const isEnrolled = enrollments[course._id];
            const isFull = course.currentStudents >= course.maxStudents;
            
            // Debug logging for enrollment status
            return (
              <div
                key={course._id}
                className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
              >
                {/* Course Header with Gradient */}
                <div
                  className={`bg-gradient-to-r ${
                    levelGradients[course.level]
                  } p-6 text-white relative overflow-hidden`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                        <span className="mr-2">{levelIcons[course.level]}</span>
                        {course.level}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {formatCurrency(course.price, "EUR")}
                        </div>
                        <div className="text-lg font-semibold opacity-90 flex items-center">
                          <span className="mr-1">⇄</span>
                          {formatCurrency(
                            convertEuroToTaka(course.price),
                            "BDT"
                          )}
                        </div>
                        <div className="text-sm opacity-80">per course</div>
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{course.title}</h3>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  {/* Course Details */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium text-gray-900 w-32">
                        Instructor
                      </span>
                      <span>{course.instructor}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium text-gray-900 w-32">
                        Duration
                      </span>
                      <span>{course.duration} weeks</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium text-gray-900 w-32">
                        Starts
                      </span>
                      <span>
                        {new Date(course.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium text-gray-900 w-32">
                        Ends
                      </span>
                      <span>
                        {new Date(course.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium text-gray-900 w-32">
                        Schedule
                      </span>
                      <span>{course.schedule.days.join(", ")}</span>
                    </div>
                  </div>

                  {/* Availability Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        Available Spots
                      </span>
                      <span className="text-sm text-gray-600">
                        {course.maxStudents - course.currentStudents} of{" "}
                        {course.maxStudents}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            ((course.maxStudents - course.currentStudents) /
                              course.maxStudents) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Features */}
                  {course.features.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-900 mb-3">
                        What you'll learn:
                      </h4>
                      <ul className="space-y-2">
                        {course.features.slice(0, 3).map((feature, index) => (
                          <li
                            key={index}
                            className="flex items-start text-sm text-gray-700"
                          >
                            <span className="text-green-500 mr-2 mt-0.5 flex-shrink-0">
                              ✓
                            </span>
                            <span>{feature}</span>
                          </li>
                        ))}
                        {course.features.length > 3 && (
                          <li className="text-sm text-blue-600 font-medium ml-4">
                            + {course.features.length - 3} more amazing
                            features...
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Prerequisites */}
                  {course.requirements && course.requirements.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-900 mb-3">
                        Prerequisites:
                      </h4>
                      <ul className="space-y-2">
                        {course.requirements
                          .slice(0, 3)
                          .map((requirement, index) => (
                            <li
                              key={index}
                              className="flex items-start text-sm text-gray-700"
                            >
                              <span className="text-orange-500 mr-2 mt-0.5 flex-shrink-0">
                                •
                              </span>
                              <span>{requirement}</span>
                            </li>
                          ))}
                        {course.requirements.length > 3 && (
                          <li className="text-sm text-blue-600 font-medium ml-4">
                            + {course.requirements.length - 3} more
                            requirements...
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="mt-auto">
                    {isEnrolled ? (
                      <div className="w-full py-3 sm:py-4 bg-blue-100 text-blue-800 rounded-2xl font-bold border-2 border-blue-200 text-center text-sm sm:text-base min-h-[44px] flex items-center justify-center">
                        Enrolled
                      </div>
                    ) : isFull ? (
                      <button
                        disabled
                        className="w-full py-3 sm:py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold border-2 border-gray-200 cursor-not-allowed text-sm sm:text-base min-h-[44px]"
                      >
                        Course Full
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnrollNow(course._id)}
                        className="w-full py-3 sm:py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold shadow-md transition-colors duration-200 hover:from-emerald-600 hover:to-teal-700 border-0 text-sm sm:text-base min-h-[44px]"
                      >
                        {isLoggedIn ? "Enroll Now" : "Register Now"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {courses.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-white rounded-3xl shadow-xl p-12 border border-gray-100">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-clip-text text-transparent mb-4">
                No courses available
              </h3>
              <p className="text-gray-600 text-lg max-w-md mx-auto">
                {selectedLevel
                  ? `No ${selectedLevel} level courses are currently available for enrollment. Try selecting a different level or check back soon!`
                  : "No courses are currently available for enrollment. We're working on exciting new courses for you!"}
              </p>
              <div className="relative inline-block group">
                {/* Star 1 - Black - Top Left */}
                <div className="fixed w-5 h-5 top-[3%] left-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-black drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>

                {/* Star 2 - Blue - Top Right */}
                <div className="fixed w-3 h-3 top-[12%] right-[7%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[1800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-blue-800 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>

                {/* Star 3 - White - Top Center */}
                <div className="fixed w-4 h-4 top-[7%] left-[45%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>

                {/* Star 4 - Orange - Middle Right */}
                <div className="fixed w-2 h-2 top-[45%] right-[5%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-orange-500 drop-shadow-[0_0_7px_rgba(251,146,60,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>

                {/* Star 5 - Cyan - Middle Left */}
                <div className="fixed w-3 h-3 top-[55%] left-[10%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[3200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-cyan-600 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>

                {/* Star 6 - White - Bottom Right */}
                <div className="fixed w-4 h-4 bottom-[8%] right-[15%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2600ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>

                {/* Star 7 - Red - Bottom Left */}
                <div className="fixed w-2 h-2 bottom-[15%] left-[12%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-red-800 drop-shadow-[0_0_7px_rgba(248,113,113,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>

                {/* Star 8 - Indigo - Middle Right Center */}
                <div className="fixed w-3 h-3 top-[38%] right-[25%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-indigo-100 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>

                {/* Star 9 - Purple - Bottom Center */}
                <div className="fixed w-3 h-3 bottom-[6%] left-[50%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2100ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>

                {/* Star 10 - Rose - Middle Left Center */}
                <div className="fixed w-2 h-2 top-[30%] left-[22%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-rose-500 drop-shadow-[0_0_7px_rgba(251,113,133,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>

                {/* Star 11 - Emerald - Bottom Far Right */}
                <div className="fixed w-3 h-3 bottom-[20%] right-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-emerald-600 drop-shadow-[0_0_8px_rgba(5,150,105,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>

                {/* Star 12 - Lime - Top Far Right */}
                <div className="fixed w-2 h-2 top-[18%] right-[18%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="w-full h-full fill-lime-600 drop-shadow-[0_0_7px_rgba(163,230,53,0.8)]">
                    <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                  </svg>
                </div>

                <button
                  onClick={() => setSelectedLevel("")}
                  className="animated-btn mt-6 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:!bg-transparent transition-all duration-300"
                >
                  See All Courses
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-3xl shadow-2xl p-6 sm:p-8 md:p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16"></div>
          <div className="relative z-10">
            <div className="text-center mb-8 sm:mb-10 md:mb-12">
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
                Why Choose Our German Courses?
              </h3>
              <p className="text-base sm:text-lg md:text-xl text-gray-700 max-w-2xl mx-auto">
                Join thousands of students who have successfully mastered German
                with our proven methodology
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20">
                <h4 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">
                  Certified Teachers
                </h4>
                <p className="text-sm sm:text-base text-gray-700">
                  Learn from native German speakers and certified instructors
                  with years of experience
                </p>
              </div>
              <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20">
                <h4 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">
                  CEFR Aligned
                </h4>
                <p className="text-sm sm:text-base text-gray-700">
                  Courses follow European standards for language learning,
                  ensuring global recognition
                </p>
              </div>
              <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20">
                <h4 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">
                  Get Certified
                </h4>
                <p className="text-sm sm:text-base text-gray-700">
                  Receive official certificates upon course completion to boost
                  your career prospects
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCatalog;
