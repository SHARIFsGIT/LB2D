'use client';

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, usePathname } from "next/navigation";
// import { useNotifications } from "@/hooks/useNotifications";
import { logout } from "@/store/slices/authSlice";
import { RootState } from "@/store/store";
import Button from "@/components/ui/button";
import { useLogoutMutation } from "@/store/api/apiSlice";

const Navbar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Temporarily disabled notifications - TODO: Re-enable with proper WebSocket setup
  const unreadCount = 0;
  const notifications: any[] = [];
  const markAsRead = () => {};
  const markAllAsRead = () => {};
  const clearAll = () => {};

  const [logoutMutation] = useLogoutMutation();

  // Prevent hydration mismatch - only show auth UI after client mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      // Get refresh token before clearing sessionStorage
      const refreshToken = typeof window !== 'undefined' ? sessionStorage.getItem('refreshToken') : null;

      // Call backend to remove device session
      if (refreshToken) {
        await logoutMutation().unwrap();
      }
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout error:', error);
    } finally {
      // Clear frontend state and storage
      dispatch(logout());
      router.push("/login");
    }
  };

  // Hide these pages for logged-in users
  const navItems = !isAuthenticated
    ? [
        { name: "Home", path: "/" },
        { name: "Courses", path: "/courses" },
        { name: "About", path: "/about" },
        { name: "Contact", path: "/contact" },
      ]
    : [];

  const userMenuItems = isAuthenticated
    ? [
        ...(user?.role === "Admin"
          ? [
              { name: "Admin Dashboard", path: "/admin" },
              { name: "Manage Courses", path: "/admin/courses" },
              { name: "Analytics", path: "/admin/analytics" },
            ]
          : user?.role === "Supervisor"
          ? [
              { name: "Dashboard", path: "/supervisor" },
              { name: "Settings", path: "/profile" },
            ]
          : user?.role === "Student"
          ? [
              { name: "Dashboard", path: "/dashboard" },
              { name: "My Courses", path: "/my-courses" },
              { name: "Certificates", path: "/certificates" },
              { name: "Profile", path: "/profile" },
            ]
          : [{ name: "Profile", path: "/profile" }]),
      ]
    : [];

  // Navigate to relevant page based on notification type and data
  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Close notification dropdown
    setShowNotifications(false);

    // Navigate based on notification type and data
    switch (notification.type) {
      case 'video_comment':
        if (notification.data?.videoId && notification.data?.courseId) {
          router.push(`/course/${notification.data.courseId}/videos`);
        }
        break;

      case 'video':
        if (notification.data?.videoId && notification.data?.courseId) {
          router.push(`/course/${notification.data.courseId}/videos`);
        }
        break;

      case 'document':
        if (notification.data?.courseId) {
          // Navigate to course videos page where resources are likely accessed
          router.push(`/course/${notification.data.courseId}/videos`);
        }
        break;

      case 'course':
        if (notification.data?.courseId) {
          // Navigate to course details or supervisor's course management
          if (user?.role === 'Supervisor') {
            router.push('/supervisor');
          } else if (user?.role === 'Admin') {
            router.push('/admin/courses');
          } else {
            router.push('/courses');
          }
        }
        break;

      case 'enrollment':
        if (notification.data?.courseId) {
          router.push('/my-courses');
        }
        break;

      case 'payment':
        router.push('/my-courses');
        break;

      case 'admin':
      case 'user_registration':
        if (user?.role === 'Admin') {
          router.push('/admin');
        }
        break;

      default:
        // For other notification types, navigate to role-specific default page
        if (user?.role === 'Admin') {
          router.push('/admin');
        } else if (user?.role === 'Supervisor') {
          router.push('/supervisor');
        } else {
          router.push('/dashboard');
        }
        break;
    }
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50 relative">
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-600 via-red-600 to-yellow-500 shadow-sm"></div>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <div className="cursor-pointer group flex-shrink-0" onClick={() => router.push("/")}>
            <div className="text-sm sm:text-base md:text-lg lg:text-xl font-bold bg-gradient-to-r from-green-700 via-red-700 to-yellow-600 bg-clip-text text-transparent leading-tight">
              <span className="hidden sm:inline">Learn Bangla to Deutsch</span>
              <span className="sm:hidden">LB2D</span>
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 leading-tight">
              <span className="hidden md:inline">German for Bengali Speakers</span>
              <span className="md:hidden">German Learning</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === item.path
                    ? "text-red-600 bg-red-50"
                    : "text-gray-700"
                }`}
              >
                <span>{item.name}</span>
              </button>
            ))}
          </div>

          {/* User Menu / Auth Buttons */}
          <div className="flex items-center space-x-4">
            {!isMounted ? null : isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="relative flex items-center space-x-2 px-3 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 ease-out bg-gradient-to-r from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 text-slate-700 hover:text-slate-800 border border-slate-200 hover:border-slate-300"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-sm font-bold overflow-hidden text-white">
                    {user?.profilePhoto ? (
                      <img
                        src={user.profilePhoto}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <span>
                        {user?.firstName?.charAt(0)?.toUpperCase()}
                        {user?.lastName?.charAt(0)?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="hidden md:block font-medium text-gray-700">
                    {user?.firstName}
                  </span>

                  {/* Notification Count Badge */}
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 shadow-lg animate-pulse">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </div>
                  )}

                  <svg
                    className={`w-5 h-5 transform transition-transform duration-200 ${
                      isMenuOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 sm:w-72 md:w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] max-w-[calc(100vw-2rem)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="py-2">
                      {/* Notifications Menu Item */}
                      <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="w-full text-left px-4 py-2 flex items-center justify-between text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-medium">Notifications</span>
                          {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </div>
                        <svg
                          className={`w-4 h-4 transform transition-transform text-gray-400 ${
                            showNotifications ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {/* Notifications Dropdown Content with Smooth Transition */}
                      <div
                        className={`border-t border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 transition-all duration-300 ease-in-out transform origin-top relative z-[110] ${
                          showNotifications
                            ? 'max-h-96 opacity-100 scale-y-100 visible'
                            : 'max-h-0 opacity-0 scale-y-95 invisible'
                        }`}
                        style={{
                          minHeight: showNotifications ? (notifications.length === 0 ? '120px' : 'auto') : '0',
                          backgroundColor: showNotifications ? 'rgba(248, 250, 252, 0.95)' : 'transparent'
                        }}
                      >
                        <div className="px-3 sm:px-4 py-3 max-h-64 sm:max-h-72 overflow-y-auto">
                          {/* Notifications Header */}
                          <div className="flex items-center justify-between mb-3 sm:mb-4 mt-2">
                            {notifications.length > 0 && (
                              <div className="w-full flex justify-center space-x-2 sm:space-x-4">
                                {unreadCount > 0 && (
                                  <button
                                    onClick={markAllAsRead}
                                    className="flex-1 text-xs sm:text-sm text-blue-700 font-semibold transition-all duration-200 bg-blue-50 hover:bg-blue-100 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-blue-200 shadow-sm text-center"
                                  >
                                    Mark all read
                                  </button>
                                )}
                                <button
                                  onClick={clearAll}
                                  className="flex-1 text-xs sm:text-sm text-gray-700 font-semibold transition-all duration-200 bg-gray-50 hover:bg-gray-100 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-gray-200 shadow-sm text-center"
                                >
                                  Clear all
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Notifications List */}
                          {notifications.length === 0 ? (
                            <div className="py-4 text-center min-h-[100px] flex flex-col items-center justify-center">
                              <div className="text-4xl mb-3 filter drop-shadow-sm">🔔</div>
                              <p className="text-gray-600 text-sm font-semibold">No notifications yet</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {notifications.map((notification) => {
                                const formatTime = (timestamp: Date) => {
                                  const now = new Date();
                                  const diff = now.getTime() - timestamp.getTime();
                                  const minutes = Math.floor(diff / 60000);
                                  if (minutes < 1) return "now";
                                  if (minutes < 60) return `${minutes}m`;
                                  return `${Math.floor(minutes / 60)}h`;
                                };

                                const getNotificationBorderColor = (type: string, urgent?: boolean) => {
                                  if (urgent) return "border-l-red-300 shadow-red-100";
                                  switch (type) {
                                    case "admin":
                                    case "role_change":
                                      return "border-l-purple-300 shadow-purple-100";
                                    case "enrollment":
                                      return "border-l-emerald-300 shadow-emerald-100";
                                    case "course":
                                      return "border-l-blue-300 shadow-blue-100";
                                    case "video":
                                      return "border-l-indigo-300 shadow-indigo-100";
                                    case "video_comment":
                                      return "border-l-amber-300 shadow-amber-100";
                                    case "assessment":
                                    case "test":
                                      return "border-l-pink-300 shadow-pink-100";
                                    case "certificate":
                                      return "border-l-yellow-300 shadow-yellow-100";
                                    case "supervisor_action":
                                      return "border-l-orange-300 shadow-orange-100";
                                    case "student_action":
                                      return "border-l-cyan-300 shadow-cyan-100";
                                    case "payment":
                                      return "border-l-green-300 shadow-green-100";
                                    case "user_registration":
                                      return "border-l-violet-300 shadow-violet-100";
                                    case "document":
                                      return "border-l-teal-300 shadow-teal-100";
                                    case "ranking":
                                      return "border-l-rose-300 shadow-rose-100";
                                    case "general":
                                      return "border-l-gray-300 shadow-gray-100";
                                    default:
                                      return "border-l-slate-300 shadow-slate-100";
                                  }
                                };

                                return (
                                  <div
                                    key={notification.id}
                                    className={`p-3 sm:p-4 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200 backdrop-blur-sm hover:shadow-md ${
                                      !notification.read
                                        ? `bg-gradient-to-r from-white to-gray-50/80 border-l-4 ${getNotificationBorderColor(notification.type, notification.urgent)} shadow-lg border border-gray-100`
                                        : "bg-gray-50/70 border border-gray-200 hover:bg-gray-100/70"
                                    }`}
                                    onClick={() => handleNotificationClick(notification)}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-start space-x-1.5 sm:space-x-2 flex-1 min-w-0">
                                        <div className="flex-1 min-w-0">
                                          {notification.type === 'video_comment' ? (
                                            // Special display format for video comment notifications
                                            <div className="space-y-1.5 sm:space-y-2">
                                              <div className="flex items-center space-x-1.5 sm:space-x-2">
                                                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${!notification.read ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                                <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-semibold ${
                                                  notification.fromRole === 'Student'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : notification.fromRole === 'Supervisor'
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                  {notification.title}
                                                </span>
                                              </div>
                                              <p className={`text-xs sm:text-sm leading-relaxed ${!notification.read ? "text-gray-700" : "text-gray-500"}`}>
                                                {notification.message}
                                              </p>
                                            </div>
                                          ) : (
                                            // Default display format for other notifications
                                            <div>
                                              <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${!notification.read ? "text-gray-700" : "text-gray-500"}`}>
                                                {notification.message}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end space-y-0.5 sm:space-y-1 flex-shrink-0 ml-1 sm:ml-2">
                                        <span className={`text-[10px] sm:text-xs font-medium ${!notification.read ? 'text-gray-500' : 'text-gray-400'}`}>
                                          {formatTime(notification.timestamp)}
                                        </span>
                                        <div className="text-xs text-blue-600 opacity-70 hover:opacity-100 transition-opacity">
                                          <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                          </svg>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Admin Dashboard Options */}
                      {user?.role === "Admin" && (
                        <>
                          <button
                            onClick={() => {
                              router.push("/admin");
                              setIsMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 flex items-center space-x-3 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <span>Dashboard</span>
                          </button>
                          <button
                            onClick={() => {
                              router.push("/admin/analytics");
                              setIsMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 flex items-center space-x-3 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <span>Analytics</span>
                          </button>
                          <button
                            onClick={() => {
                              router.push("/admin/courses");
                              setIsMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 flex items-center space-x-3 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <span>Manage Courses</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsMenuOpen(false);
                              router.push("/profile");
                            }}
                            className="w-full text-left px-4 py-2 flex items-center space-x-3 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <span>Settings</span>
                          </button>
                        </>
                      )}

                      {/* Student Dashboard Options */}
                      {user?.role === "Student" && (
                        <>
                          <button
                            onClick={() => {
                              router.push("/dashboard");
                              setIsMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 flex items-center space-x-3 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <span>Dashboard</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsMenuOpen(false);
                              router.push("/profile");
                            }}
                            className="w-full text-left px-4 py-2 flex items-center space-x-3 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <span>Settings</span>
                          </button>
                        </>
                      )}

                      {/* Other user types (Supervisor, etc.) */}
                      {user?.role !== "Admin" &&
                        user?.role !== "Student" &&
                        userMenuItems.map((item) => (
                          <button
                            key={item.path}
                            onClick={() => {
                              router.push(item.path);
                              setIsMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 flex items-center space-x-3 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <span>{item.name}</span>
                          </button>
                        ))}

                      <div className="border-t border-gray-200 mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 flex items-center space-x-3 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                {/* Login Button with Stars All Over Window */}
                <div className="group relative hidden md:block">
                  <Button
                    onClick={() => router.push("/login")}
                    variant="secondary"
                    className="animated-btn relative bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 border-2 border-slate-200 hover:border-slate-500 hover:shadow-lg hover:!bg-transparent transition-all duration-2500 ease-smooth font-semibold overflow-hidden"
                  >
                    <span className="relative z-10">Login</span>
                  </Button>
                  {/* Stars positioned across the entire viewport */}
                  <div className="fixed w-4 h-4 top-[10%] left-[15%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3000 ease-smooth pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-blue-600 drop-shadow-[0_0_12px_rgba(96,165,250,0.9)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>
                  <div className="fixed w-2 h-2 top-[40%] right-[18%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2600 ease-smooth pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-indigo-500 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>
                  <div className="fixed w-3 h-3 bottom-[15%] left-[50%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3400 ease-smooth pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-slate-500 drop-shadow-[0_0_10px_rgba(100,116,139,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>
                  <div className="fixed w-2 h-2 top-[25%] left-[75%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2800 ease-smooth pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-gray-500 drop-shadow-[0_0_7px_rgba(107,114,128,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>
                  <div className="fixed w-3 h-3 bottom-[35%] right-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3200 ease-smooth pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-blue-400 drop-shadow-[0_0_9px_rgba(96,165,250,0.7)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>
                  <div className="fixed w-2.5 h-2.5 top-[60%] left-[30%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2400 ease-smooth pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>
                  <div className="fixed w-3.5 h-3.5 bottom-[20%] right-[25%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3600 ease-smooth pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-sky-500 drop-shadow-[0_0_10px_rgba(14,165,233,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>
                  <div className="fixed w-2 h-2 top-[50%] right-[45%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2900 ease-smooth pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-indigo-400 drop-shadow-[0_0_7px_rgba(129,140,248,0.7)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>
                </div>

                {/* Sign Up Button with Stars All Over Window */}
                <div className="group relative">
                  <Button
                    onClick={() => router.push("/register")}
                    className="animated-btn relative bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-xl hover:!bg-transparent shadow-lg transition-all duration-3500 ease-smooth font-semibold overflow-hidden"
                  >
                    <span className="relative z-10">Sign Up</span>
                  </Button>
                  {/* Stars positioned across the entire viewport */}
                  <div className="fixed w-5 h-5 top-[8%] left-[18%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3200 ease-smooth pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-white drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>
                  <div className="fixed w-3 h-3 top-[28%] right-[12%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2800 ease-smooth pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-emerald-200 drop-shadow-[0_0_10px_rgba(167,243,208,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>
                  <div className="fixed w-2 h-2 bottom-[25%] left-[65%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2400 ease-smooth pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-teal-200 drop-shadow-[0_0_8px_rgba(153,246,228,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>
                  <div className="fixed w-4 h-4 top-[50%] left-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3000 ease-smooth pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-cyan-300 drop-shadow-[0_0_12px_rgba(165,243,252,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>
                  <div className="fixed w-2 h-2 bottom-[10%] right-[25%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2600 ease-smooth pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-green-300 drop-shadow-[0_0_9px_rgba(134,239,172,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>
                  <div className="fixed w-3 h-3 top-[15%] right-[40%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3400 ease-smooth pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-emerald-100 drop-shadow-[0_0_8px_rgba(209,250,229,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>
                  <div className="fixed w-2 h-2 top-[42%] right-[70%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2200 ease-smooth pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-teal-300 drop-shadow-[0_0_7px_rgba(94,234,212,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>
                  <div className="fixed w-3 h-3 bottom-[35%] left-[25%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3600 ease-smooth pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-green-200 drop-shadow-[0_0_10px_rgba(187,247,208,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>
                  <div className="fixed w-3.5 h-3.5 top-[70%] right-[35%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2700 ease-smooth pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-emerald-300 drop-shadow-[0_0_11px_rgba(110,231,183,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>
                  <div className="fixed w-2.5 h-2.5 bottom-[45%] right-[15%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3100 ease-smooth pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-teal-400 drop-shadow-[0_0_9px_rgba(45,212,191,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>
                  <div className="fixed w-2 h-2 top-[35%] left-[45%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2500 ease-smooth pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 784.11 815.53"
                      className="w-full h-full fill-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]"
                    >
                      <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    router.push(item.path);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center space-x-3 ${
                    pathname === item.path
                      ? "text-red-600 bg-red-50"
                      : "text-gray-700"
                  }`}
                >
                  <span>{item.name}</span>
                </button>
              ))}

              {!isAuthenticated && (
                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <Button
                    onClick={() => router.push("/login")}
                    variant="secondary"
                    className="group relative w-full bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 border-2 border-slate-200 hover:border-slate-500 hover:shadow-lg hover:bg-gradient-to-r hover:from-slate-200 hover:to-gray-200 hover:text-slate-900 transition-all duration-2500 ease-smooth font-semibold overflow-hidden"
                  >
                    {/* Mobile Login Button Stars - Enhanced */}
                    <div className="fixed w-4 h-4 top-[10%] left-[15%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3000 ease-smooth pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 784.11 815.53"
                        className="w-full h-full fill-blue-600 drop-shadow-[0_0_12px_rgba(96,165,250,0.9)]"
                      >
                        <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                      </svg>
                    </div>
                    <div className="fixed w-2 h-2 top-[40%] right-[18%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2600 ease-smooth pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 784.11 815.53"
                        className="w-full h-full fill-indigo-500 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]"
                      >
                        <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                      </svg>
                    </div>
                    <div className="fixed w-3 h-3 bottom-[15%] left-[50%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3400 ease-smooth pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 784.11 815.53"
                        className="w-full h-full fill-slate-500 drop-shadow-[0_0_10px_rgba(100,116,139,0.8)]"
                      >
                        <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                      </svg>
                    </div>
                    <div className="fixed w-2 h-2 top-[25%] left-[75%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2800 ease-smooth pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 784.11 815.53"
                        className="w-full h-full fill-gray-500 drop-shadow-[0_0_7px_rgba(107,114,128,0.8)]"
                      >
                        <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                      </svg>
                    </div>
                    <div className="fixed w-3 h-3 bottom-[35%] right-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3200 ease-smooth pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 784.11 815.53"
                        className="w-full h-full fill-blue-400 drop-shadow-[0_0_9px_rgba(96,165,250,0.7)]"
                      >
                        <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                      </svg>
                    </div>
                    <span className="relative z-10">Login</span>
                  </Button>
                  <Button
                    onClick={() => router.push("/register")}
                    className="group relative w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-xl hover:from-emerald-700 hover:to-teal-800 shadow-lg transition-all duration-3500 ease-smooth font-semibold overflow-hidden"
                  >
                    {/* Mobile Sign Up Button Stars - Enhanced */}
                    <div className="fixed w-5 h-5 top-[8%] left-[18%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3200 ease-smooth pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 784.11 815.53"
                        className="w-full h-full fill-white drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]"
                      >
                        <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                      </svg>
                    </div>
                    <div className="fixed w-3 h-3 top-[28%] right-[12%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2800 ease-smooth pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 784.11 815.53"
                        className="w-full h-full fill-emerald-200 drop-shadow-[0_0_10px_rgba(167,243,208,0.8)]"
                      >
                        <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                      </svg>
                    </div>
                    <div className="fixed w-2 h-2 bottom-[25%] left-[65%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2400 ease-smooth pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 784.11 815.53"
                        className="w-full h-full fill-teal-200 drop-shadow-[0_0_8px_rgba(153,246,228,0.8)]"
                      >
                        <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                      </svg>
                    </div>
                    <div className="fixed w-4 h-4 top-[50%] left-[8%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3000 ease-smooth pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 784.11 815.53"
                        className="w-full h-full fill-cyan-300 drop-shadow-[0_0_12px_rgba(165,243,252,0.8)]"
                      >
                        <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                      </svg>
                    </div>
                    <div className="fixed w-2 h-2 bottom-[10%] right-[25%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2600 ease-smooth pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 784.11 815.53"
                        className="w-full h-full fill-green-300 drop-shadow-[0_0_9px_rgba(134,239,172,0.8)]"
                      >
                        <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                      </svg>
                    </div>
                    <div className="fixed w-3 h-3 top-[15%] right-[40%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3400 ease-smooth pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 784.11 815.53"
                        className="w-full h-full fill-emerald-100 drop-shadow-[0_0_8px_rgba(209,250,229,0.8)]"
                      >
                        <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                      </svg>
                    </div>
                    <div className="fixed w-2 h-2 top-[42%] right-[70%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-2200 ease-smooth pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 784.11 815.53"
                        className="w-full h-full fill-teal-300 drop-shadow-[0_0_7px_rgba(94,234,212,0.8)]"
                      >
                        <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                      </svg>
                    </div>
                    <div className="fixed w-3 h-3 bottom-[35%] left-[25%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-3600 ease-smooth pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 784.11 815.53"
                        className="w-full h-full fill-green-200 drop-shadow-[0_0_10px_rgba(187,247,208,0.8)]"
                      >
                        <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
                      </svg>
                    </div>
                    <span className="relative z-10">Get Started</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close menu */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsMenuOpen(false)}
        ></div>
      )}
    </nav>
  );
};

export default Navbar;
