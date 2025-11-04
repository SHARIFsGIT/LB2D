'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api-client';
import { LoadingPage } from '@/components/ui/loading-spinner';
import Button from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function CourseDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);

  useEffect(() => {
    if (params.id) {
      loadCourse();
    }
  }, [params.id]);

  const loadCourse = async () => {
    try {
      const response = await api.courses.getById(params.id as string);
      const data = response.data?.data || response.data;
      setCourse(data.course);
      setEnrollment(data.enrollment);
    } catch (error) {
      console.error('Failed to load course:', error);
      toast.error('Course not found');
      router.push('/courses');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to enroll');
      router.push('/login');
      return;
    }

    setEnrolling(true);

    try {
      if (course.price === 0) {
        // Free course - direct enrollment
        await api.courses.enroll(course.id);
        toast.success('Successfully enrolled in course!');
        loadCourse(); // Reload to show enrollment
      } else {
        // Paid course - redirect to payment
        router.push(`/enroll/${course.id}`);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Enrollment failed';
      toast.error(message);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return <LoadingPage message="Loading course..." />;
  }

  if (!course) {
    return <div>Course not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-4">
                {course.level}
              </span>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{course.title}</h1>
              <p className="text-xl text-blue-100 mb-6">{course.description}</p>

              {/* Stats */}
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center">
                  <span className="mr-2">📹</span>
                  <span>{course.videos?.length || 0} Videos</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">📄</span>
                  <span>{course.resources?.length || 0} Resources</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">📝</span>
                  <span>{course.quizzes?.length || 0} Quizzes</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">👥</span>
                  <span>{course._count?.enrollments || 0} Students</span>
                </div>
              </div>
            </div>

            {/* Enrollment Card */}
            <div className="bg-white rounded-2xl p-8 shadow-2xl">
              {enrollment ? (
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">
                    You're Enrolled!
                  </h3>
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-semibold text-gray-800">
                        {enrollment.progress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all"
                        style={{ width: `${enrollment.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push(`/course/${course.id}/videos`)}
                    className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-lg"
                  >
                    {enrollment.progress > 0 ? 'Continue Learning' : 'Start Course'}
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="mb-6">
                    {course.price === 0 ? (
                      <div className="text-4xl font-bold text-green-600">FREE</div>
                    ) : (
                      <div>
                        {course.discountPrice && course.discountPrice < course.price ? (
                          <div>
                            <div className="text-4xl font-bold text-blue-600">
                              {formatCurrency(course.discountPrice)}
                            </div>
                            <div className="text-lg text-gray-400 line-through">
                              {formatCurrency(course.price)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-4xl font-bold text-blue-600">
                            {formatCurrency(course.price)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-lg"
                  >
                    {enrolling ? 'Enrolling...' : course.price === 0 ? 'Enroll for Free' : 'Enroll Now'}
                  </Button>

                  <p className="text-center text-sm text-gray-500 mt-4">
                    {course.price === 0
                      ? 'Start learning immediately'
                      : '30-day money-back guarantee'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Videos */}
            {course.videos && course.videos.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Course Content</h2>
                <div className="space-y-3">
                  {course.videos.map((video: any, index: number) => (
                    <div
                      key={video.id}
                      className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-all"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center font-bold text-blue-600">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">{video.title}</h4>
                          <p className="text-sm text-gray-500">
                            {Math.floor(video.duration / 60)} min
                          </p>
                        </div>
                      </div>
                      {enrollment && (
                        <button
                          onClick={() => router.push(`/course/${course.id}/videos?v=${video.id}`)}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Watch →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quizzes */}
            {course.quizzes && course.quizzes.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Quizzes</h2>
                <div className="space-y-3">
                  {course.quizzes.map((quiz: any) => (
                    <div
                      key={quiz.id}
                      className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg"
                    >
                      <div>
                        <h4 className="font-semibold text-gray-800">{quiz.title}</h4>
                        <p className="text-sm text-gray-500">
                          {quiz.duration} min • Pass: {quiz.passingScore}%
                        </p>
                      </div>
                      {enrollment && (
                        <Button size="sm" onClick={() => router.push(`/quiz/${quiz.id}`)}>
                          Take Quiz
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resources */}
            {course.resources && course.resources.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Resources</h2>
                <div className="space-y-3">
                  {course.resources.map((resource: any) => (
                    <div
                      key={resource.id}
                      className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg"
                    >
                      <div>
                        <h4 className="font-semibold text-gray-800">{resource.title}</h4>
                        <p className="text-sm text-gray-500">{resource.fileType.toUpperCase()}</p>
                      </div>
                      {enrollment && (
                        <button className="text-blue-600 hover:text-blue-700 font-medium">
                          Download
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-20">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Instructor</h3>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {course.supervisor?.firstName?.charAt(0)}
                  {course.supervisor?.lastName?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">
                    {course.supervisor?.firstName} {course.supervisor?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">Course Instructor</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Level:</span>
                  <span className="font-semibold">{course.level}</span>
                </div>
                <div className="flex justify-between">
                  <span>Language:</span>
                  <span className="font-semibold">English</span>
                </div>
                <div className="flex justify-between">
                  <span>Videos:</span>
                  <span className="font-semibold">{course.videos?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quizzes:</span>
                  <span className="font-semibold">{course.quizzes?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
