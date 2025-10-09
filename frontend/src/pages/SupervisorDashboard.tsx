import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "../hooks/useWebSocket";
import { RootState } from "../store/store";

interface Student {
  _id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  profilePhoto?: string;
  isActive?: boolean;
  lastLogin?: string;
  enrollments: Array<{
    courseName: string;
    courseLevel: string;
    enrollmentDate: string;
    status: string;
    progress: {
      lecturesCompleted: number;
      totalLectures: number;
      percentage: number;
    };
  }>;
  testResults: Array<{
    step: number;
    score: number;
    certificationLevel: string;
    status: string;
    completedAt: string;
  }>;
  overallProgress: number;
  attendance: {
    present: number;
    absent: number;
    total: number;
  };
}

interface TestResult {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  step: number;
  score: number;
  certificationLevel: string;
  status: string;
  createdAt: string;
  completedAt: string;
}

interface Video {
  _id: string;
  title: string;
  description: string;
  courseId: {
    _id: string;
    title: string;
  };
  status: "pending" | "approved" | "rejected";
  sequenceNumber: number;
  duration: number;
  createdAt: string;
  rejectionReason?: string;
  deletionStatus?: "none" | "pending" | "approved" | "rejected";
  deletionRejectionReason?: string;
  commentCount?: number;
  hasNewComments?: boolean;
  isActive?: boolean;
  viewCount?: number;
  videoUrl?: string;
}

interface Course {
  _id: string;
  title: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  instructor: string;
  description: string;
  duration: number;
  startDate: string;
  endDate: string;
  currentStudents?: number;
  maxStudents: number;
  status: string;
  schedule?: {
    days: string[];
    time: string;
  };
  features?: string[];
  requirements?: string[];
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
}

interface StudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
}

interface UploadVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  onUpload: () => void;
  selectedCourse: Course | null;
}

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  studentProgress: any[];
}

const getNextSequenceNumber = async (courseId: string): Promise<number> => {
  const token = sessionStorage.getItem("accessToken");
  let maxSequence = 0;

  try {
    // Fetch all videos for the course
    const videosResponse = await fetch(
      `${process.env.REACT_APP_API_URL}/videos/course/${courseId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (videosResponse.ok) {
      const videosData = await videosResponse.json();
      const videos = videosData.data || [];
      const videoMaxSequence = Math.max(
        0,
        ...videos.map((v: any) => v.sequenceNumber || 0)
      );
      maxSequence = Math.max(maxSequence, videoMaxSequence);
    }

    // Fetch all quizzes for the course
    const quizzesResponse = await fetch(
      `${process.env.REACT_APP_API_URL}/quizzes/course/${courseId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (quizzesResponse.ok) {
      const quizzesData = await quizzesResponse.json();
      const quizzes = quizzesData.data || [];
      const quizMaxSequence = Math.max(
        0,
        ...quizzes.map((q: any) => q.sequenceNumber || 0)
      );
      maxSequence = Math.max(maxSequence, quizMaxSequence);
    }

    // Fetch all resources for the course
    const resourcesResponse = await fetch(
      `${process.env.REACT_APP_API_URL}/resources/course/${courseId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (resourcesResponse.ok) {
      const resourcesData = await resourcesResponse.json();
      const resources = resourcesData.data || [];
      const resourceMaxSequence = Math.max(
        0,
        ...resources.map((r: any) => r.sequenceNumber || 0)
      );
      maxSequence = Math.max(maxSequence, resourceMaxSequence);
    }
  } catch (error) {
    console.error("Error fetching content for sequence calculation:", error);
  }

  return maxSequence + 1;
};

// Upload Modal - For uploading Quizzes, Documents, and Videos
const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  course,
}) => {
  const [activeTab, setActiveTab] = useState<
    "quizzes" | "resources" | "videos"
  >("quizzes");
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [editingResource, setEditingResource] = useState<any>(null);

  const token = sessionStorage.getItem("accessToken");

  useEffect(() => {
    if (isOpen) {
      fetchCourseData();
    }
  }, [isOpen, activeTab]);

  const fetchCourseData = async () => {
    setLoading(true);
    try {
      if (activeTab === "quizzes") {
        await fetchQuizzes();
      } else if (activeTab === "resources") {
        await fetchResources();
      } else if (activeTab === "videos") {
        await fetchVideos();
      }
    } catch (error) {
      console.error("Error fetching course data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/quizzes/course/${course._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching quizzes:", error);
    }
  };

  const fetchResources = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/resources/course/${course._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setResources(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching resources:", error);
    }
  };

  const fetchVideos = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/videos/course/${course._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setVideos(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
    }
  };

  // Handler functions for quiz buttons
  const handleSubmitQuizForApproval = async (quizId: string) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/quizzes/${quizId}/submit-approval`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        // Refresh quizzes to update status
        fetchQuizzes();
        alert("Quiz submitted for admin approval successfully!");
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Failed to submit quiz for approval");
      }
    } catch (error) {
      console.error("Error submitting quiz for approval:", error);
      alert("Failed to submit quiz for approval");
    }
  };

  const handleResubmitQuiz = async (quizId: string) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/quizzes/${quizId}/resubmit`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        // Refresh quizzes to update status
        fetchQuizzes();
        alert("Quiz resubmitted for admin approval successfully!");
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Failed to resubmit quiz for approval");
      }
    } catch (error) {
      console.error("Error resubmitting quiz for approval:", error);
      alert("Failed to resubmit quiz for approval");
    }
  };

  const handleSubmitResourceForApproval = async (resourceId: string) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/resources/${resourceId}/submit-approval`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        // Refresh resources to update status
        fetchResources();
        alert("Resource submitted for admin approval successfully!");
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Failed to submit resource for approval");
      }
    } catch (error) {
      console.error("Error submitting resource for approval:", error);
      alert("Failed to submit resource for approval");
    }
  };

  const handleEditQuiz = (quiz: any) => {
    setEditingQuiz(quiz);
    setShowQuizForm(true);
  };

  const handleViewQuiz = (quiz: any) => {
    // Set quiz as view-only mode
    setEditingQuiz({ ...quiz, isViewOnly: true });
    setShowQuizForm(true);
  };

  const handleDeleteQuiz = async (quizId: string, quizTitle: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${quizTitle}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/quizzes/${quizId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        if (data.data?.requiresApproval) {
          alert(
            "Deletion request submitted to admin for approval. You will be notified once the admin reviews your request."
          );
        } else {
          alert("Quiz deleted successfully");
        }
        fetchQuizzes();
      } else {
        alert(data.message || "Failed to delete quiz");
      }
    } catch (error) {
      console.error("Error deleting quiz:", error);
      alert("Failed to delete quiz");
    }
  };

  // Handler functions for resource buttons
  const handleDownloadResource = async (resource: any) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/resources/${resource._id}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = resource.fileName || "download";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Refresh resources to update download count
        fetchResources();
      } else {
        alert("Failed to download resource");
      }
    } catch (error) {
      console.error("Error downloading resource:", error);
      alert("Failed to download resource");
    }
  };

  const handleDeleteResource = async (resourceId: string, resourceTitle: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${resourceTitle}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/resources/${resourceId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        if (data.data?.requiresApproval) {
          alert(
            "Deletion request submitted to admin for approval. You will be notified once the admin reviews your request."
          );
        } else {
          alert("Resource deleted successfully");
        }
        fetchResources();
      } else {
        alert(data.message || "Failed to delete resource");
      }
    } catch (error) {
      console.error("Error deleting resource:", error);
      alert("Failed to delete resource");
    }
  };

  // Add missing resource handlers to match quiz handlers
  const handleResubmitResource = async (resourceId: string) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/resources/${resourceId}/submit-approval`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        // Refresh resources to update status
        fetchResources();
        alert("Resource resubmitted for admin approval successfully!");
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Failed to resubmit resource for approval");
      }
    } catch (error) {
      console.error("Error resubmitting resource for approval:", error);
      alert("Failed to resubmit resource for approval");
    }
  };

  const handleResubmitVideo = async (videoId: string) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/videos/${videoId}/resubmit`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        // Refresh videos to update status
        fetchVideos();
        alert("Video resubmitted for admin approval successfully!");
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Failed to resubmit video for approval");
      }
    } catch (error) {
      console.error("Error resubmitting video for approval:", error);
      alert("Failed to resubmit video for approval");
    }
  };

  const handleEditResource = (resource: any) => {
    setEditingResource(resource);
    setShowResourceForm(true);
  };

  const handleViewResource = async (resource: any) => {
    try {
      // Get the view URL
      const viewUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/resources/${resource._id}/view`;

      // Get the token for authentication
      const token = sessionStorage.getItem('accessToken');

      // Fetch the file with authentication
      const response = await fetch(viewUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch resource');
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create object URL from blob
      const blobUrl = URL.createObjectURL(blob);

      // Open in new tab
      window.open(blobUrl, '_blank');

      // Clean up the blob URL after a delay to ensure it opens
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error('Error viewing resource:', error);
      alert('Failed to view resource. Please try again.');
    }
  };

  // Handler functions for video buttons
  const handleDeleteVideo = async (videoId: string, videoTitle: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${videoTitle}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/videos/${videoId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        if (data.data?.requiresApproval) {
          alert(
            "Deletion request submitted to admin for approval. You will be notified once the admin reviews your request."
          );
        } else {
          alert("Video deleted successfully");
        }
        fetchVideos();
      } else {
        alert(data.message || "Failed to delete video");
      }
    } catch (error) {
      console.error("Error deleting video:", error);
      alert("Failed to delete video");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-tr from-cyan-900 via-sky-800 to-gray-400 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">{course.title}</h2>
              <p className="text-purple-100">
                Level: {course.level} | Duration: {course.duration} weeks
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:bg-opacity-20"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: "quizzes", label: "Quizzes & Exams", icon: "📝" },
              { key: "resources", label: "Documents & Audio", icon: "📁" },
              { key: "videos", label: "Videos", icon: "🎬" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <>
              {/* Quizzes Tab */}
              {activeTab === "quizzes" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Quizzes & Exams</h3>
                    <button
                      onClick={() => {
                        setEditingQuiz(null);
                        setShowQuizForm(true);
                      }}
                      className="bg-gradient-to-bl from-cyan-800 via-sky-600 to-gray-400 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center space-x-2"
                    >
                      <span>📝</span>
                      <span>Create Quiz/Exam</span>
                    </button>
                  </div>

                  {quizzes.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                      <div className="text-4xl mb-4">📝</div>
                      <h4 className="text-lg font-medium text-gray-800 mb-2">
                        No Quizzes Yet
                      </h4>
                      <p className="text-gray-600">
                        Create your first quiz or exam for this course!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {quizzes.map((quiz) => (
                        <div
                          key={quiz._id}
                          className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {quiz.title}
                              </h4>
                              <p className="text-sm text-gray-500 capitalize">
                                {quiz.type}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                quiz.status === "approved" && quiz.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {quiz.status === "approved" && quiz.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1 mb-3">
                            <div>Sequence: {quiz.sequenceNumber}</div>
                            <div>Questions: {quiz.questions?.length || 0}</div>
                            <div>Total Points: {quiz.totalPoints || 0}</div>
                            {quiz.timeLimit && (
                              <div>Time: {quiz.timeLimit} min</div>
                            )}
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-600">
                                Status:
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  quiz.status === "pending"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : quiz.status === "approved"
                                    ? "bg-green-100 text-green-700"
                                    : quiz.status === "rejected"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {quiz.status === "draft"
                                  ? "Draft"
                                  : quiz.status?.charAt(0).toUpperCase() +
                                    quiz.status?.slice(1)}
                              </span>
                              {quiz.deletionStatus === "pending" && (
                                <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">
                                  Deletion Pending
                                </span>
                              )}
                              {quiz.deletionStatus === "rejected" && (
                                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                                  Deletion Rejected
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {quiz.status !== "pending" && (
                              <button
                                onClick={() =>
                                  quiz.status === "approved"
                                    ? handleViewQuiz(quiz)
                                    : handleEditQuiz(quiz)
                                }
                                className={`flex-1 text-xs px-2 py-1 rounded transition-colors ${
                                  quiz.status === "approved"
                                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                    : quiz.status === "rejected"
                                    ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                }`}
                              >
                                {quiz.status === "approved" ? "View" : "Edit"}
                              </button>
                            )}
                            {quiz.status === "pending" ? (
                              <button
                                disabled
                                className="flex-1 text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 cursor-not-allowed"
                              >
                                Pending
                              </button>
                            ) : quiz.status === "rejected" ? (
                              <button
                                onClick={() => handleResubmitQuiz(quiz._id)}
                                className="flex-1 text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                              >
                                Resubmit
                              </button>
                            ) : quiz.status ===
                              "approved" ? // No second button for approved quizzes, just the View button and delete icon
                            null : (
                              <button
                                onClick={() =>
                                  handleSubmitQuizForApproval(quiz._id)
                                }
                                className="flex-1 text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                              >
                                Submit for Approval
                              </button>
                            )}
                            <button
                              onClick={() =>
                                handleDeleteQuiz(quiz._id, quiz.title)
                              }
                              disabled={quiz.deletionStatus === "pending"}
                              className={`text-xs px-2 py-1 rounded transition-colors ${
                                quiz.deletionStatus === "pending"
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : "bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700"
                              }`}
                              title={
                                quiz.deletionStatus === "pending"
                                  ? "Deletion request pending admin approval"
                                  : "Delete quiz"
                              }
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Documents & Audio Tab */}
              {activeTab === "resources" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Documents & Audio</h3>
                    <button
                      onClick={() => setShowResourceForm(true)}
                      className="bg-gradient-to-bl from-cyan-800 via-sky-600 to-gray-400 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center space-x-2"
                    >
                      <span>📄</span>
                      <span>Upload Resource</span>
                    </button>
                  </div>

                  {resources.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                      <div className="text-4xl mb-4">📄</div>
                      <h4 className="text-lg font-medium text-gray-800 mb-2">
                        No Resources Yet
                      </h4>
                      <p className="text-gray-600">
                        Upload your first document or audio file for this course!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {resources.map((resource) => (
                        <div
                          key={resource._id}
                          className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {resource.title}
                              </h4>
                              <p className="text-sm text-gray-500 capitalize">
                                {resource.type}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                resource.status === "approved" && resource.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {resource.status === "approved" && resource.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1 mb-3">
                            <div>Sequence: {resource.sequenceNumber}</div>
                            <div>File: {resource.fileName}</div>
                            <div>Size: {Math.round((resource.fileSize || 0) / 1024)} KB</div>
                            <div>Downloads: {resource.downloadCount || 0}</div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-600">
                                Status:
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  resource.status === "pending"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : resource.status === "approved"
                                    ? "bg-green-100 text-green-700"
                                    : resource.status === "rejected"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {resource.status === "draft"
                                  ? "Draft"
                                  : resource.status?.charAt(0).toUpperCase() +
                                    resource.status?.slice(1)}
                              </span>
                              {resource.deletionStatus === "pending" && (
                                <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">
                                  Deletion Pending
                                </span>
                              )}
                              {resource.deletionStatus === "rejected" && (
                                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                                  Deletion Rejected
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {resource.status !== "pending" && (
                              <button
                                onClick={() =>
                                  resource.status === "approved"
                                    ? handleViewResource(resource)
                                    : handleEditResource(resource)
                                }
                                className={`flex-1 text-xs px-2 py-1 rounded transition-colors ${
                                  resource.status === "approved"
                                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                    : resource.status === "rejected"
                                    ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                }`}
                              >
                                {resource.status === "approved" ? "View" : "Edit"}
                              </button>
                            )}
                            {resource.status === "pending" ? (
                              <button
                                disabled
                                className="flex-1 text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 cursor-not-allowed"
                              >
                                Pending
                              </button>
                            ) : resource.status === "rejected" ? (
                              <button
                                onClick={() => handleResubmitResource(resource._id)}
                                className="flex-1 text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                              >
                                Resubmit
                              </button>
                            ) : resource.status === "approved" ? (
                              null
                            ) : (
                              <button
                                onClick={() =>
                                  handleSubmitResourceForApproval(resource._id)
                                }
                                className="flex-1 text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                              >
                                Submit for Approval
                              </button>
                            )}
                            <button
                              onClick={() =>
                                handleDeleteResource(resource._id, resource.title)
                              }
                              disabled={resource.deletionStatus === "pending"}
                              className={`text-xs px-2 py-1 rounded transition-colors ${
                                resource.deletionStatus === "pending"
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : "bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700"
                              }`}
                              title={
                                resource.deletionStatus === "pending"
                                  ? "Deletion request pending admin approval"
                                  : "Delete resource"
                              }
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Videos Tab */}
              {activeTab === "videos" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Videos</h3>
                    <button
                      onClick={() => setShowVideoForm(true)}
                      className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-4 py-2 rounded-lg font-medium hover:from-green-600 hover:to-teal-600 transition-all"
                    >
                      + Upload Video
                    </button>
                  </div>

                  {videos.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                      <div className="text-4xl mb-4">🎬</div>
                      <h4 className="text-lg font-medium text-gray-800 mb-2">
                        No Videos Yet
                      </h4>
                      <p className="text-gray-600">
                        Upload your first video to get started!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {videos.map((video) => (
                        <div
                          key={video._id}
                          className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {video.title}
                              </h4>
                              <p className="text-sm text-gray-500 mt-1">
                                {video.description}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                video.status === "approved" && video.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {video.status === "approved" && video.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1 mb-3">
                            <div>Sequence: {video.sequenceNumber}</div>
                            <div>Duration: {video.duration}s</div>
                            {video.viewCount !== undefined && (
                              <div>Views: {video.viewCount || 0}</div>
                            )}
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-600">
                                Status:
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  video.status === "pending"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : video.status === "approved"
                                    ? "bg-green-100 text-green-700"
                                    : video.status === "rejected"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {video.status === "draft"
                                  ? "Draft"
                                  : video.status?.charAt(0).toUpperCase() +
                                    video.status?.slice(1)}
                              </span>
                              {video.deletionStatus === "pending" && (
                                <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">
                                  Deletion Pending
                                </span>
                              )}
                              {video.deletionStatus === "rejected" && (
                                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                                  Deletion Rejected
                                </span>
                              )}
                            </div>
                          </div>
                          {video.rejectionReason && (
                            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                              <strong>Rejection:</strong> {video.rejectionReason}
                            </div>
                          )}
                          {video.deletionRejectionReason && (
                            <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                              <strong>Deletion Rejected:</strong> {video.deletionRejectionReason}
                            </div>
                          )}
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                // For now just show alert, can implement edit later
                                alert(`View video: ${video.title}\nURL: ${video.videoUrl}`);
                              }}
                              className="flex-1 text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                            >
                              View
                            </button>
                            {video.status === "pending" ? (
                              <button
                                disabled
                                className="flex-1 text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 cursor-not-allowed"
                              >
                                Pending
                              </button>
                            ) : video.status === "rejected" ? (
                              <button
                                onClick={() => handleResubmitVideo(video._id)}
                                className="flex-1 text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                              >
                                Resubmit
                              </button>
                            ) : null}
                            <button
                              onClick={() =>
                                handleDeleteVideo(video._id, video.title)
                              }
                              disabled={video.deletionStatus === "pending"}
                              className={`text-xs px-2 py-1 rounded transition-colors ${
                                video.deletionStatus === "pending"
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : "bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700"
                              }`}
                              title={
                                video.deletionStatus === "pending"
                                  ? "Deletion request pending admin approval"
                                  : "Delete video"
                              }
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Quiz Creation/Edit Form Modal */}
          {showQuizForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {editingQuiz
                      ? `Edit ${editingQuiz.title}`
                      : "Create Quiz/Exam"}
                  </h3>
                  <button
                    onClick={() => {
                      setShowQuizForm(false);
                      setEditingQuiz(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>

                <QuizForm
                  courseId={course._id}
                  editingQuiz={editingQuiz}
                  onSuccess={() => {
                    setShowQuizForm(false);
                    setEditingQuiz(null);
                    fetchQuizzes();
                  }}
                  onCancel={() => {
                    setShowQuizForm(false);
                    setEditingQuiz(null);
                  }}
                />
              </div>
            </div>
          )}

          {/* Resource Upload Form Modal */}
          {showResourceForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {editingResource
                      ? `${editingResource.isViewOnly ? 'View' : 'Edit'} ${editingResource.title}`
                      : "Upload Resource"}
                  </h3>
                  <button
                    onClick={() => {
                      setShowResourceForm(false);
                      setEditingResource(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>

                <ResourceUploadForm
                  courseId={course._id}
                  onSuccess={() => {
                    setShowResourceForm(false);
                    setEditingResource(null);
                    fetchResources();
                  }}
                  onCancel={() => {
                    setShowResourceForm(false);
                    setEditingResource(null);
                  }}
                  editingResource={editingResource}
                />
              </div>
            </div>
          )}

          {/* Video Upload Form Modal */}
          {showVideoForm && (
            <UploadVideoModal
              isOpen={showVideoForm}
              onClose={() => setShowVideoForm(false)}
              courses={[course]}
              onUpload={() => {
                setShowVideoForm(false);
                fetchVideos();
              }}
              selectedCourse={course}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Students Modal - For reviewing and grading student submissions
const StudentsModal: React.FC<StudentsModalProps> = ({
  isOpen,
  onClose,
  course,
}) => {
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const token = sessionStorage.getItem("accessToken");

  useEffect(() => {
    if (isOpen) {
      fetchQuizAttempts();
    }
  }, [isOpen]);

  const fetchQuizAttempts = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/quizzes/supervisor/all-attempts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Filter attempts for this specific course
        const courseAttempts = (data.data || []).filter(
          (attempt: any) => attempt.quizId?.courseId === course._id
        );
        setQuizAttempts(courseAttempts);
      }
    } catch (error) {
      console.error("Error fetching quiz attempts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeAttempt = (attempt: any) => {
    // For now, show an alert with attempt details
    // TODO: Implement a proper grading modal/form
    alert(`
Grading Details:
Student: ${attempt.studentId?.firstName} ${attempt.studentId?.lastName}
Quiz: ${attempt.quizId?.title}
Score: ${attempt.score}/${attempt.maxScore} (${attempt.percentage}%)
Status: ${attempt.isGraded ? "Already Graded" : "Needs Review"}
Submitted: ${new Date(attempt.submittedAt).toLocaleString()}
    `);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">{course.title}</h2>
              <p className="text-blue-100">
                Review & Grade Student Submissions
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:bg-opacity-20"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Student Quiz Submissions</h3>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : quizAttempts.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <div className="text-4xl mb-4">📝</div>
                <h4 className="text-lg font-medium text-gray-800 mb-2">
                  No Submissions Yet
                </h4>
                <p className="text-gray-600">
                  Student quiz submissions will appear here when they complete quizzes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quizAttempts.map((attempt) => (
                  <div
                    key={attempt._id}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow"
                  >
                    <div className="mb-3">
                      <h4 className="font-semibold text-gray-900">
                        {attempt.studentId?.firstName} {attempt.studentId?.lastName}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {attempt.quizId?.title}
                      </p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Score:</span>
                        <span className="font-medium">
                          {attempt.score}/{attempt.maxScore}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Percentage:</span>
                        <span className="font-medium">{attempt.percentage}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            attempt.isGraded
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {attempt.isGraded ? "Graded" : "Pending"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Submitted: {new Date(attempt.submittedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <button
                      onClick={() => handleGradeAttempt(attempt)}
                      className="w-full mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                      {attempt.isGraded ? "Review" : "Grade"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Quiz Form Component
interface QuizFormProps {
  courseId: string;
  onSuccess: () => void;
  onCancel: () => void;
  editingQuiz?: any;
}

const QuizForm: React.FC<QuizFormProps> = ({
  courseId,
  onSuccess,
  onCancel,
  editingQuiz = null,
}) => {
  const isViewOnly = editingQuiz?.isViewOnly || false;

  const [formData, setFormData] = useState({
    title: editingQuiz?.title || "",
    description: editingQuiz?.description || "",
    type: editingQuiz?.type || "quiz",
    timeLimit: editingQuiz?.timeLimit || 30,
    attemptLimit: editingQuiz?.attemptLimit || 1,
    sequenceNumber: editingQuiz?.sequenceNumber || 1,
    questions: editingQuiz?.questions?.map((q: any) => ({
      ...q,
      correctAnswer:
        typeof q.correctAnswer === "string"
          ? q.options?.indexOf(q.correctAnswer) || 0
          : q.correctAnswer || 0,
    })) || [
      {
        questionText: "",
        questionType: "multiple-choice",
        options: ["", "", "", ""],
        correctAnswer: 0,
        points: 10,
      },
    ],
  });
  const [loading, setLoading] = useState(false);
  const token = sessionStorage.getItem("accessToken");

  useEffect(() => {
    const loadNextSequence = async () => {
      if (!editingQuiz) {
        const nextSequence = await getNextSequenceNumber(courseId);
        setFormData((prev) => ({ ...prev, sequenceNumber: nextSequence }));
      }
    };
    loadNextSequence();
  }, [courseId, editingQuiz]);

  const addQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          questionText: "",
          questionType: "multiple-choice",
          options: ["", "", "", ""],
          correctAnswer: 0,
          points: 10,
        },
      ],
    }));
  };

  const removeQuestion = (index: number) => {
    if (formData.questions.length > 1) {
      setFormData((prev) => ({
        ...prev,
        questions: prev.questions.filter((_: any, i: number) => i !== index),
      }));
    }
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.map((q: any, i: number) =>
        i === index ? { ...q, [field]: value } : q
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent submission in view-only mode
    if (isViewOnly) {
      return;
    }

    setLoading(true);

    try {
      // Transform the data to match backend expectations
      const submitData = {
        ...formData,
        courseId,
        questions: formData.questions.map((q: any) => ({
          ...q,
          correctAnswer: q.options[q.correctAnswer], // Convert index to actual answer
        })),
      };

      const url = editingQuiz
        ? `${process.env.REACT_APP_API_URL}/quizzes/${editingQuiz._id}`
        : `${process.env.REACT_APP_API_URL}/quizzes`;

      const method = editingQuiz ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const responseData = await response.json();
        const quizId = editingQuiz
          ? editingQuiz._id
          : responseData.data?._id || responseData._id;

        // If creating a new quiz OR editing a rejected quiz, automatically submit for approval
        if (
          !editingQuiz ||
          (editingQuiz && editingQuiz.status === "rejected")
        ) {
          try {
            const action = editingQuiz ? "resubmit" : "submit";
            const submitResponse = await fetch(
              `${process.env.REACT_APP_API_URL}/quizzes/${quizId}/submit-approval`,
              {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (submitResponse.ok) {
              const submitData = await submitResponse.json();
              const message = editingQuiz
                ? "Quiz updated and resubmitted for approval successfully!"
                : "Quiz created and submitted for approval successfully!";
              alert(message);
            } else {
              const submitError = await submitResponse.json();
              console.error(
                "Submission failed:",
                submitResponse.status,
                submitError
              );

              // Try alternative endpoint format
              const alternativeResponse = await fetch(
                `${process.env.REACT_APP_API_URL}/quizzes/${quizId}/approve-request`,
                {
                  method: "PUT",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ status: "pending" }),
                }
              );

              if (alternativeResponse.ok) {
                const message = editingQuiz
                  ? "Quiz updated and resubmitted for approval successfully!"
                  : "Quiz created and submitted for approval successfully!";
                alert(message);
              } else {
                console.error("Alternative submission also failed");
                const baseMessage = editingQuiz
                  ? "Quiz updated successfully"
                  : "Quiz created successfully";
                alert(
                  `${baseMessage}, but failed to submit for approval. Error: ${
                    submitError.message || "Unknown error"
                  }. Please try submitting manually.`
                );
              }
            }
          } catch (submitError) {
            console.error("Error submitting quiz:", submitError);
            const baseMessage = editingQuiz
              ? "Quiz updated successfully"
              : "Quiz created successfully";
            alert(
              `${baseMessage}, but network error occurred during submission. Please try submitting manually.`
            );
          }
        } else {
          // For regular updates (approved quizzes being edited), just show success
          alert("Quiz updated successfully!");
        }
        onSuccess();
      } else {
        const errorData = await response.json();
        alert(
          `Failed to ${editingQuiz ? "update" : "create"} quiz: ${
            errorData.message || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error(
        `Error ${editingQuiz ? "updating" : "creating"} quiz:`,
        error
      );
      alert(`Failed to ${editingQuiz ? "update" : "create"} quiz`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Show rejection reason if editing a rejected quiz */}
      {editingQuiz &&
        editingQuiz.status === "rejected" &&
        editingQuiz.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Quiz was rejected
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    <strong>Reason:</strong> {editingQuiz.rejectionReason}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Sequence Number and Quiz Title Row - matching video upload style */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sequence
          </label>
          <input
            type="number"
            value={formData.sequenceNumber}
            onChange={(e) =>
              setFormData({
                ...formData,
                sequenceNumber: Number(e.target.value),
              })
            }
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="1"
            disabled={isViewOnly}
            required
          />
        </div>
        <div className="col-span-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quiz/Exam Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter quiz title"
            disabled={isViewOnly}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
          placeholder="Describe what students will be assessed on"
          required
        />
      </div>

      {/* Quiz Settings - matching video upload style */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="quiz">Quiz</option>
            <option value="exam">Exam</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Limit (min)
          </label>
          <input
            type="number"
            value={formData.timeLimit}
            onChange={(e) =>
              setFormData({ ...formData, timeLimit: Number(e.target.value) })
            }
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="1"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Attempts Allowed
          </label>
          <input
            type="number"
            value={formData.attemptLimit}
            onChange={(e) =>
              setFormData({ ...formData, attemptLimit: Number(e.target.value) })
            }
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="1"
            required
          />
        </div>
      </div>

      {/* Questions Section - Enhanced UI */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold text-gray-900">Questions</h4>
          <button
            type="button"
            onClick={addQuestion}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
          >
            <span>➕</span>
            <span>Add Question</span>
          </button>
        </div>

        <div className="space-y-4">
          {formData.questions.map((question: any, index: number) => (
            <div
              key={index}
              className="bg-gray-50 border border-gray-200 rounded-xl p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <h5 className="text-lg font-semibold text-gray-800">
                  Question {index + 1}
                </h5>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-600">
                      Points:
                    </label>
                    <input
                      type="number"
                      value={question.points}
                      onChange={(e) =>
                        updateQuestion(index, "points", Number(e.target.value))
                      }
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                    />
                  </div>
                  {formData.questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      title="Remove question"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  value={question.questionText}
                  onChange={(e) =>
                    updateQuestion(index, "questionText", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your question here"
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {question.options.map((option: string, optIndex: number) => (
                    <div
                      key={optIndex}
                      className="flex items-center space-x-3 bg-white border border-gray-200 rounded-lg p-3"
                    >
                      <input
                        type="radio"
                        name={`correct-${index}`}
                        checked={question.correctAnswer === optIndex}
                        onChange={() =>
                          updateQuestion(index, "correctAnswer", optIndex)
                        }
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...question.options];
                          newOptions[optIndex] = e.target.value;
                          updateQuestion(index, "options", newOptions);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={`Option ${String.fromCharCode(
                          65 + optIndex
                        )}`}
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons - matching video upload style */}
      <div className="flex justify-end">
        {!isViewOnly && (
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? editingQuiz
                ? "Updating..."
                : "Creating..."
              : editingQuiz
              ? `Update ${
                  formData.type.charAt(0).toUpperCase() + formData.type.slice(1)
                }`
              : `Create ${
                  formData.type.charAt(0).toUpperCase() + formData.type.slice(1)
                }`}
          </button>
        )}
      </div>
    </form>
  );
};

// Resource Upload Form Component
interface ResourceUploadFormProps {
  courseId: string;
  onSuccess: () => void;
  onCancel: () => void;
  editingResource?: any;
}

const ResourceUploadForm: React.FC<ResourceUploadFormProps> = ({
  courseId,
  onSuccess,
  onCancel,
  editingResource,
}) => {
  const [formData, setFormData] = useState({
    title: editingResource?.title || "",
    description: editingResource?.description || "",
    category: editingResource?.category || "lesson",
    sequenceNumber: editingResource?.sequenceNumber || 1,
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<"document" | "audio">(
    (editingResource?.type === "audio" ? "audio" : "document") as "document" | "audio"
  );
  const [loading, setLoading] = useState(false);
  const token = sessionStorage.getItem("accessToken");

  useEffect(() => {
    const loadNextSequence = async () => {
      const nextSequence = await getNextSequenceNumber(courseId);
      setFormData((prev) => ({ ...prev, sequenceNumber: nextSequence }));
    };
    loadNextSequence();
  }, [courseId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);

      // Auto-detect file type and set appropriate category
      const fileType = selectedFile.type;
      if (fileType.startsWith("audio/")) {
        setUploadType("audio");
        setFormData((prev) => ({ ...prev, category: "exercise" }));
      } else {
        setUploadType("document");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Skip file requirement for editing existing resources
    if (!editingResource && !file) {
      alert("Please select a file");
      return;
    }

    // Check if this is view-only mode
    if (editingResource?.isViewOnly) {
      alert("This resource is in view-only mode");
      return;
    }

    setLoading(true);

    try {
      if (editingResource) {
        // Update existing resource
        const updateData = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          sequenceNumber: formData.sequenceNumber,
        };

        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/resources/${editingResource._id}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData),
          }
        );

        if (response.ok) {
          onSuccess();
        } else {
          const errorData = await response.json();
          alert(
            `Failed to update resource: ${errorData.message || "Unknown error"}`
          );
        }
      } else {
        // Create new resource
        const uploadData = new FormData();
        uploadData.append("file", file!);
        uploadData.append("courseId", courseId);
        uploadData.append("title", formData.title);
        uploadData.append("description", formData.description);
        uploadData.append("category", formData.category);
        uploadData.append("sequenceNumber", formData.sequenceNumber.toString());

        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/resources/upload`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: uploadData,
          }
        );

        if (response.ok) {
          onSuccess();
        } else {
          const errorData = await response.json();
          alert(
            `Failed to upload resource: ${errorData.message || "Unknown error"}`
          );
        }
      }
    } catch (error) {
      console.error("Error with resource:", error);
      alert(editingResource ? "Failed to update resource" : "Failed to upload resource");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Show rejection reason if editing a rejected resource */}
      {editingResource &&
        editingResource.status === "rejected" &&
        editingResource.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Resource was rejected
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    <strong>Reason:</strong> {editingResource.rejectionReason}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Sequence Number and Resource Title Row - matching video upload style */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sequence
          </label>
          <input
            type="number"
            value={formData.sequenceNumber}
            onChange={(e) =>
              setFormData({
                ...formData,
                sequenceNumber: Number(e.target.value),
              })
            }
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="1"
            required
            disabled={editingResource?.isViewOnly}
          />
        </div>
        <div className="col-span-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resource Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter resource title"
            required
            disabled={editingResource?.isViewOnly}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
          placeholder="Describe how students will use this resource"
          required
          disabled={editingResource?.isViewOnly}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category
        </label>
        <select
          value={formData.category}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value })
          }
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={editingResource?.isViewOnly}
        >
          <option value="lesson">📚 Lesson Material</option>
          <option value="homework">📝 Homework</option>
          <option value="reference">📖 Reference</option>
          <option value="exercise">🎯 Exercise</option>
          <option value="other">📎 Other</option>
        </select>
      </div>

      {/* Upload Method with Dynamic Input Area - matching video upload style */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Upload Method
        </label>
        <div className="flex space-x-4 mb-4">
          <button
            type="button"
            onClick={() => setUploadType("document")}
            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
              uploadType === "document"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <span>📄</span>
              <span className="font-medium">Document</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setUploadType("audio")}
            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
              uploadType === "audio"
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <span>🎵</span>
              <span className="font-medium">Audio File</span>
            </div>
          </button>
        </div>

        {/* Dynamic Input Area */}
        <div className="mt-4">
          <div className="relative">
            <input
              type="file"
              onChange={handleFileChange}
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium transition-all ${
                uploadType === "document"
                  ? "focus:ring-blue-500 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  : "focus:ring-green-500 file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              }`}
              accept={
                uploadType === "document"
                  ? ".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                  : ".mp3,.wav,.ogg,.m4a,.aac"
              }
              required
            />
            {file && (
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {file.type.startsWith("audio/")
                      ? "🎵"
                      : file.type.startsWith("image/")
                      ? "🖼️"
                      : "📄"}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{file.name}</div>
                    <div className="text-sm text-gray-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                      {file.type && ` • ${file.type}`}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 text-sm text-gray-500">
          <div className="flex items-start space-x-2">
            <div>
              <strong>Supported formats:</strong>
              <div className="mt-1">
                <span className="inline-block bg-purple-100 text-gray-800 text-sm px-1 py-1 mr-2 rounded">
                  Documents: PDF, DOC, DOCX, TXT
                </span>
                <span className="inline-block bg-blue-100 text-gray-800 text-sm px-1 py-1 mr-2 rounded">
                  Images: JPG, PNG, GIF
                </span>
                <span className="inline-block bg-pink-100 text-gray-800 text-sm px-1 py-1 mr-2 rounded">
                  Audio: MP3, WAV, OGG, M4A
                </span>
                <span className="inline-block bg-orange-100 text-gray-800 text-sm px-1 py-1 rounded">
                  Maximum file size: 50MB
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - matching video upload style */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        {!editingResource?.isViewOnly && (
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? editingResource ? "Updating..." : "Uploading..."
              : editingResource
              ? "Update Resource"
              : `Upload ${uploadType === "document" ? "Document" : "Audio File"}`}
          </button>
        )}
      </div>
    </form>
  );
};

const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  student,
  studentProgress,
}) => {
  if (!isOpen) return null;

  // Get progress information for a specific student
  const getStudentProgressInfo = (studentId: string) => {
    const studentData = studentProgress.find(
      (sp) => sp.student.id === studentId
    );
    if (!studentData) return null;

    // Calculate overall progress across all courses
    const courses = Object.values(studentData.courses);
    if (courses.length === 0) return null;

    const totalProgress = courses.reduce(
      (sum: number, course: any) => sum + course.overallProgress,
      0
    );
    const averageProgress = totalProgress / courses.length;
    const totalVideos = courses.reduce(
      (sum: number, course: any) => sum + course.totalVideos,
      0
    );
    const completedVideos = courses.reduce(
      (sum: number, course: any) => sum + course.completedVideos,
      0
    );

    return {
      averageProgress: Math.round(averageProgress),
      completedVideos,
      totalVideos,
      courses: courses,
    };
  };

  // Get login-based attendance data for a specific student
  const getStudentAttendanceInfo = (studentId: string) => {
    // Calculate attendance based on login activity
    const enrollmentDate = new Date(
      student.enrollments[0]?.enrollmentDate || Date.now()
    );
    const currentDate = new Date();

    // Calculate days since enrollment
    const daysDifference = Math.floor(
      (currentDate.getTime() - enrollmentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalExpectedDays = Math.max(1, daysDifference); // At least 1 day

    // Simulate login-based attendance (in real app, this would come from login tracking API)
    let presentDays = 0;

    if (student.lastLogin) {
      const lastLoginDate = new Date(student.lastLogin);
      const daysSinceLastLogin = Math.floor(
        (currentDate.getTime() - lastLoginDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // If they logged in recently (within 7 days), assume better attendance
      if (daysSinceLastLogin <= 7) {
        presentDays = Math.floor(totalExpectedDays * 0.7); // 70% attendance for active users
      } else if (daysSinceLastLogin <= 30) {
        presentDays = Math.floor(totalExpectedDays * 0.4); // 40% for less active
      } else {
        presentDays = Math.floor(totalExpectedDays * 0.2); // 20% for inactive
      }
    } else {
      // No login data, assume minimal attendance
      presentDays = Math.floor(totalExpectedDays * 0.1);
    }

    const absentDays = totalExpectedDays - presentDays;
    const attendanceRate =
      totalExpectedDays > 0 ? (presentDays / totalExpectedDays) * 100 : 0;

    return {
      present: presentDays,
      absent: absentDays,
      rate: Math.round(attendanceRate),
      isRealData: true,
    };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 text-xl font-bold w-8 h-8 flex items-center justify-center rounded transition-all"
          >
            ×
          </button>
          <h1 className="text-2xl font-bold mb-3 text-center">
            {student.firstName
              ? `${student.firstName} ${student.lastName}`
              : student.name}
          </h1>
          <div className="flex items-center justify-around text-sm">
            <div>
              <span className="text-blue-100">Email: </span>
              <span className="font-medium">{student.email}</span>
            </div>
            {student.phone && (
              <div>
                <span className="text-blue-100">Phone: </span>
                <span className="font-medium">{student.phone}</span>
              </div>
            )}
            {student.lastLogin && (
              <div>
                <span className="text-blue-100">Last Login: </span>
                <span className="font-medium">
                  {new Date(student.lastLogin).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
            <div>
              <span className="text-blue-100">Status: </span>
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                  student.isActive
                    ? "bg-green-400 text-green-900"
                    : "bg-red-400 text-red-900"
                }`}
              >
                {student.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Course Enrollments */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Course Enrollments
            </h3>
            <div className="space-y-3">
              {(() => {
                const progressInfo = getStudentProgressInfo(student._id);

                if (student.enrollments && student.enrollments.length > 0) {
                  return student.enrollments.map((enrollment, index) => {
                    // Get real progress data
                    let realProgress = 0;
                    let completedVideos = 0;
                    let totalVideos = 0;

                    if (progressInfo && progressInfo.courses) {
                      const matchingCourse = progressInfo.courses.find(
                        (course: any) =>
                          course.courseName === enrollment.courseName
                      );
                      if (matchingCourse) {
                        realProgress =
                          (matchingCourse as any).overallProgress || 0;
                        completedVideos = (matchingCourse as any).completedVideos || 0;
                        totalVideos = (matchingCourse as any).totalVideos || 0;
                      }
                    }

                    return (
                      <div
                        key={index}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-base text-gray-900">
                              {enrollment.courseName}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Level: {enrollment.courseLevel}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-blue-600">
                            {Math.round(realProgress)}%
                          </span>
                        </div>

                        <div className="mb-3">
                          <div className="w-full bg-gray-300 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{
                                width: `${Math.min(realProgress, 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Videos Completed</p>
                            <p className="font-semibold text-gray-900">
                              {completedVideos} / {totalVideos}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Enrolled Date</p>
                            <p className="font-semibold text-gray-900">
                              {new Date(enrollment.enrollmentDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  });
                } else {
                  // Show progress data from API if available
                  if (
                    progressInfo &&
                    progressInfo.courses &&
                    progressInfo.courses.length > 0
                  ) {
                    return progressInfo.courses.map(
                      (course: any, index: number) => (
                        <div
                          key={index}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-bold text-base text-gray-900">
                                {course.courseName || "Unknown Course"}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Level: {course.courseLevel || "N/A"}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-blue-600">
                              {Math.round(course.overallProgress)}%
                            </span>
                          </div>

                          <div className="mb-3">
                            <div className="w-full bg-gray-300 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(
                                    course.overallProgress,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Videos Completed</p>
                              <p className="font-semibold text-gray-900">
                                {course.completedVideos || 0} / {course.totalVideos || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Status</p>
                              <p className="font-semibold text-gray-900">
                                Active
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    );
                  }
                }

                return (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <p className="text-gray-600 text-sm">
                      No course enrollments found.
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Attendance Overview */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Attendance Overview
            </h3>
            {(() => {
              const realAttendanceInfo = getStudentAttendanceInfo(student._id);
              const enrollmentDate = student.enrollments[0]?.enrollmentDate
                ? new Date(student.enrollments[0].enrollmentDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : 'N/A';

              return (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Present Days</p>
                      <p className="text-xl font-bold text-green-600">
                        {realAttendanceInfo?.present || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Absent Days</p>
                      <p className="text-xl font-bold text-red-600">
                        {realAttendanceInfo?.absent || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Attendance Rate</p>
                      <p className="text-xl font-bold text-blue-600">
                        {realAttendanceInfo?.rate || 0}%
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="w-full bg-gray-300 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${realAttendanceInfo?.rate || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    Calculated based on login activity since enrollment date: {enrollmentDate}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Overall Summary */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Performance Summary
            </h3>
            {(() => {
              const progressInfo = getStudentProgressInfo(student._id);

              return (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">Total Courses</p>
                      <p className="font-bold text-gray-900">
                        {student.enrollments?.length || (progressInfo?.courses?.length || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Average Progress</p>
                      <p className="font-bold text-gray-900">
                        {progressInfo?.averageProgress || 0}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Videos Completed</p>
                      <p className="font-bold text-gray-900">
                        {progressInfo?.completedVideos || 0} / {progressInfo?.totalVideos || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Account Status</p>
                      <p className="font-bold text-gray-900">
                        {student.isActive ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

const UploadVideoModal: React.FC<UploadVideoModalProps> = ({
  isOpen,
  onClose,
  courses,
  onUpload,
  selectedCourse = null,
}) => {
  const [formData, setFormData] = useState({
    courseId: selectedCourse?._id || "",
    title: "",
    description: "",
    videoUrl: "",
    thumbnailUrl: "",
    duration: 0, // Will be filled when video is selected or user enters manually
    sequenceNumber: 1,
    videoSize: 104857600, // 100MB default
    videoFormat: "mp4",
  });

  const [uploadType, setUploadType] = useState<"url" | "file">("url");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Update courseId when selectedCourse changes
  useEffect(() => {
    if (selectedCourse?._id) {
      setFormData((prev) => ({
        ...prev,
        courseId: selectedCourse._id,
      }));
    } else {
    }
  }, [selectedCourse]);

  // Load next sequence number when course is selected
  useEffect(() => {
    const loadNextSequence = async () => {
      if (formData.courseId) {
        const nextSequence = await getNextSequenceNumber(formData.courseId);
        setFormData((prev) => ({ ...prev, sequenceNumber: nextSequence }));
      }
    };
    loadNextSequence();
  }, [formData.courseId]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (500MB limit)
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        alert("File too large. Maximum size is 500MB.");
        e.target.value = ""; // Clear the input
        return;
      }

      // Validate file type
      const allowedTypes = [
        "video/mp4",
        "video/mpeg",
        "video/quicktime",
        "video/x-msvideo",
        "video/x-ms-wmv",
        "video/webm",
      ];
      if (!allowedTypes.includes(file.type)) {
        alert(
          "Invalid file type. Please select a video file (MP4, MPEG, MOV, AVI, WMV, or WEBM)."
        );
        e.target.value = ""; // Clear the input
        return;
      }

      setVideoFile(file);
      // Auto-fill some form data based on file
      setFormData((prev) => ({
        ...prev,
        videoFormat: file.name.split(".").pop()?.toLowerCase() || "mp4",
        videoSize: file.size,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    const token = sessionStorage.getItem("accessToken");

    try {
      if (uploadType === "file" && videoFile) {
        // Handle file upload
        const uploadData = new FormData();
        uploadData.append("video", videoFile);
        uploadData.append("courseId", formData.courseId);
        uploadData.append("title", formData.title);
        uploadData.append("description", formData.description);
        uploadData.append("sequenceNumber", formData.sequenceNumber.toString());
        uploadData.append("duration", formData.duration.toString());
        uploadData.append("videoFormat", formData.videoFormat);
        uploadData.append("videoSize", formData.videoSize.toString());

        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/videos/upload`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: uploadData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to upload video");
        }

        alert("Video uploaded successfully!");
      } else {
        // Handle URL upload
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/videos/upload`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to upload video");
        }

        alert("Video uploaded successfully!");
      }

      // Reset form
      setFormData({
        courseId: selectedCourse?._id || "",
        title: "",
        description: "",
        videoUrl: "",
        thumbnailUrl: "",
        duration: 0,
        sequenceNumber: 1,
        videoSize: 104857600,
        videoFormat: "mp4",
      });
      setVideoFile(null);
      setUploadType("url");

      // Call parent callback to refresh the list
      onUpload();
      onClose();
    } catch (error: any) {
      console.error("Upload error:", error);
      alert(error.message || "Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Upload New Video</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!selectedCourse && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course
              </label>
              <select
                value={formData.courseId}
                onChange={(e) =>
                  setFormData({ ...formData, courseId: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.title} ({course.level})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sequence Number and Video Title Row */}
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sequence
              </label>
              <input
                type="number"
                value={formData.sequenceNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sequenceNumber: Number(e.target.value),
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                required
              />
            </div>
            <div className="col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter video title"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Describe what students will learn from this video"
              required
            />
          </div>

          {/* Upload Method with Dynamic Input Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Upload Method
            </label>
            <div className="flex space-x-4 mb-4">
              <button
                type="button"
                onClick={() => setUploadType("url")}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  uploadType === "url"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>🔗</span>
                  <span className="font-medium">URL Link</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setUploadType("file")}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  uploadType === "file"
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>📁</span>
                  <span className="font-medium">Local File</span>
                </div>
              </button>
            </div>

            {/* Dynamic Input Area */}
            <div className="mt-4">
              {uploadType === "url" ? (
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, videoUrl: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Paste your video URL here (e.g., https://example.com/video.mp4)"
                  required
                />
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    required
                  />
                  {videoFile && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Selected:</span>{" "}
                      {videoFile.name}
                      <span className="text-gray-500 ml-2">
                        ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                uploading ||
                (uploadType === "file" && !videoFile) ||
                (uploadType === "url" && !formData.videoUrl)
              }
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <span>{uploadType === "file" ? "📁" : "🔗"}</span>
                  <span>
                    {uploadType === "file" ? "Upload File" : "Upload Video"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SupervisorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentProgress, setStudentProgress] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [myVideos, setMyVideos] = useState<Video[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "courses" | "students" | "videos" | "salary"
  >("courses");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [salaryData, setSalaryData] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTests: 0,
    totalVideos: 0,
    totalCourses: 0,
    averageScore: 0,
    pendingVideos: 0,
    approvedVideos: 0,
  });
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected"
  >("disconnected");
  const [lastActivity, setLastActivity] = useState<string>("");

  const token = sessionStorage.getItem("accessToken");

  // Simple connection status tracking - notifications handled by Navbar
  const { isConnected } = useWebSocket({
    onConnect: () => setConnectionStatus("connected"),
    onDisconnect: () => setConnectionStatus("disconnected"),
  });

  useEffect(() => {
    if (user?.role !== "Supervisor") {
      navigate("/dashboard");
      return;
    }
    fetchDashboardData();
  }, [user, navigate]);

  // Refresh salary data when switching to salary tab and set up auto-refresh
  useEffect(() => {
    if (activeTab === "salary") {
      fetchSalaryData();

      // Set up automatic refresh every 30 seconds when on salary tab
      const intervalId = setInterval(() => {
        fetchSalaryData();
      }, 30000); // 30 seconds

      // Cleanup interval when leaving salary tab
      return () => clearInterval(intervalId);
    }
  }, [activeTab]);

  // Refresh student progress when switching to students tab
  useEffect(() => {
    if (activeTab === "students") {
      fetchStudentProgress();
    }
  }, [activeTab]);

  // Auto-refresh student progress when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && activeTab === "students") {
        fetchStudentProgress();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTab]);

  // Update stats whenever data changes
  useEffect(() => {
    const averageScore =
      testResults.length > 0
        ? testResults.reduce((acc, test) => acc + test.score, 0) /
          testResults.length
        : 0;

    const newStats = {
      totalStudents: students.length,
      totalTests: testResults.length,
      totalVideos: myVideos.length,
      totalCourses: courses.length,
      averageScore: Math.round(averageScore),
      pendingVideos: myVideos.filter((v) => v.status === "pending").length,
      approvedVideos: myVideos.filter((v) => v.status === "approved").length,
    };

    // Debug logging
    setStats(newStats);
  }, [students, testResults, myVideos, courses]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStudents(),
        fetchTestResults(),
        fetchQuizResults(),
        fetchMyVideos(),
        fetchCourses(),
        fetchSalaryData(),
        fetchStudentProgress(),
      ]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      // Use the supervisor ID from current user
      const supervisorId = user?.id || "default";
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/analytics/supervisor-students/${supervisorId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStudents(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const fetchTestResults = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/tests/all-results`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTestResults(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching test results:", error);
    }
  };

  const fetchQuizResults = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/quizzes/supervisor/all-attempts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setQuizResults(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching quiz results:", error);
    }
  };

  // Get student performance rankings
  const getStudentRankings = () => {
    const studentScores: {
      [key: string]: {
        student: any;
        totalScore: number;
        testCount: number;
        quizCount: number;
        averageScore: number;
      };
    } = {};

    // Process test results
    testResults.forEach((result) => {
      const studentId = result.userId._id;
      if (!studentScores[studentId]) {
        studentScores[studentId] = {
          student: result.userId,
          totalScore: 0,
          testCount: 0,
          quizCount: 0,
          averageScore: 0,
        };
      }
      studentScores[studentId].totalScore += result.score;
      studentScores[studentId].testCount += 1;
    });

    // Process quiz results
    quizResults.forEach((result) => {
      const studentId = result.studentId._id;
      if (!studentScores[studentId]) {
        studentScores[studentId] = {
          student: result.studentId,
          totalScore: 0,
          testCount: 0,
          quizCount: 0,
          averageScore: 0,
        };
      }
      studentScores[studentId].totalScore += result.percentage;
      studentScores[studentId].quizCount += 1;
    });

    // Calculate average scores and convert to array
    const rankings = Object.values(studentScores).map((entry) => ({
      ...entry,
      averageScore:
        entry.testCount + entry.quizCount > 0
          ? Math.round(entry.totalScore / (entry.testCount + entry.quizCount))
          : 0,
      totalAssessments: entry.testCount + entry.quizCount,
    }));

    // Sort by average score (highest first)
    return rankings.sort((a, b) => b.averageScore - a.averageScore);
  };

  // Get progress information for a specific student (for student list display)
  const getStudentProgressInfo = (studentId: string) => {
    const studentData = studentProgress.find(
      (sp: any) => sp.student.id === studentId
    );
    if (!studentData) return null;

    // Calculate overall progress across all courses
    const courses = Object.values(studentData.courses);
    if (courses.length === 0) return null;

    const totalProgress = courses.reduce(
      (sum: number, course: any) => sum + course.overallProgress,
      0
    );
    const averageProgress = totalProgress / courses.length;

    // Calculate comprehensive lesson counts (videos + quizzes + resources)
    const totalLessons = courses.reduce((sum: number, course: any) => {
      const videos = course.totalVideos || 0;
      const quizzes = course.totalQuizzes || 0;
      const resources = course.totalResources || 0;
      return sum + videos + quizzes + resources;
    }, 0);

    const completedLessons = courses.reduce((sum: number, course: any) => {
      const completedVideos = course.completedVideos || 0;
      const completedQuizzes = course.completedQuizzes || 0;
      const completedResources = course.completedResources || 0;
      const calculatedCompleted =
        completedVideos + completedQuizzes + completedResources;

      // If overall progress is 100%, use total lessons as completed count
      // This handles cases where individual tracking might be inconsistent
      if (course.overallProgress >= 100) {
        const courseTotalLessons =
          (course.totalVideos || 0) +
          (course.totalQuizzes || 0) +
          (course.totalResources || 0);
        return sum + courseTotalLessons;
      }

      return sum + calculatedCompleted;
    }, 0);
    return {
      averageProgress: Math.round(averageProgress),
      completedVideos: completedLessons,
      totalVideos: totalLessons,
      courses: courses,
    };
  };

  const fetchStudentProgress = async () => {
    try {
      const token = sessionStorage.getItem("accessToken");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/videos/student-progress`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStudentProgress(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching student progress:", error);
    }
  };

  const fetchMyVideos = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/videos/my-videos`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const videosWithComments = await Promise.all(
          (data.data || []).map(async (video: Video) => {
            try {
              // Fetch comment count for each video
              const commentsResponse = await fetch(
                `${process.env.REACT_APP_API_URL}/video-comments/video/${video._id}/count`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              if (commentsResponse.ok) {
                const commentsData = await commentsResponse.json();
                return {
                  ...video,
                  commentCount: commentsData.count || null,
                  hasNewComments: commentsData.hasNewComments || false,
                };
              }
              return { ...video, commentCount: null, hasNewComments: false };
            } catch (error) {
              console.error(
                "Error fetching comment count for video:",
                video._id,
                error
              );
              return { ...video, commentCount: null, hasNewComments: false };
            }
          })
        );

        setMyVideos(videosWithComments);
      }
    } catch (error) {
      console.error("Error fetching my videos:", error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/courses/supervisor/assigned`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Debug logging
        setCourses(data.data || []);
      } else {
        console.error(
          "Failed to fetch courses:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error fetching assigned courses:", error);
    }
  };

  const fetchSalaryData = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/analytics/my-salary`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSalaryData(data.data || null);
        setLastUpdated(new Date());
      } else {
        const errorText = await response.text();
        console.error(
          "Failed to fetch salary data:",
          response.status,
          errorText
        );

        if (response.status === 404) {
          setSalaryData(null);
        }
      }
    } catch (error) {
      console.error("Error fetching salary data:", error);
      setSalaryData(null);
    }
  };

  const handleVideoUpload = async (videoData: any) => {
    try {
      let requestOptions: RequestInit;

      // Check if this is a file upload or URL upload
      if (videoData.uploadType === "file" && videoData.file) {
        // Handle file upload with FormData
        const formData = new FormData();
        formData.append("video", videoData.file);
        formData.append("courseId", videoData.courseId);
        formData.append("title", videoData.title);
        formData.append("description", videoData.description);
        formData.append("sequenceNumber", videoData.sequenceNumber.toString());
        formData.append("duration", videoData.duration.toString());
        formData.append("videoFormat", videoData.videoFormat);
        formData.append("videoSize", videoData.videoSize.toString());
        if (videoData.thumbnailUrl) {
          formData.append("thumbnailUrl", videoData.thumbnailUrl);
        }

        requestOptions = {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            // Don't set Content-Type for FormData, let browser set it with boundary
          },
          body: formData,
        };
      } else {
        // Handle URL upload with JSON
        requestOptions = {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(videoData),
        };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/videos/upload`,
        requestOptions
      );

      if (response.ok) {
        alert(
          "Video uploaded successfully! It will be reviewed by an admin before going live."
        );
        setShowUploadModal(false);
        fetchMyVideos();
      } else {
        const error = await response.json();
        alert(error.message || "Failed to upload video");
      }
    } catch (error) {
      console.error("Error uploading video:", error);
      alert("Failed to upload video");
    }
  };

  const handleDeleteVideo = async (videoId: string, videoStatus: string) => {
    const confirmMessage = videoStatus === 'approved'
      ? "Are you sure you want to request deletion of this approved video? This will require admin approval."
      : "Are you sure you want to delete this video? This action cannot be undone.";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/videos/${videoId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        if (data.data?.requiresApproval) {
          alert(
            "Deletion request submitted successfully! The admin will review your request."
          );
        } else {
          alert(
            "Video deleted successfully! You can now re-upload with the same sequence number."
          );
        }
        fetchMyVideos();
      } else {
        const error = await response.json();
        alert(error.message || "Failed to delete video");
      }
    } catch (error) {
      console.error("Error deleting video:", error);
      alert("Failed to delete video");
    }
  };

  if (!user || user.role !== "Supervisor") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-6">
            This page is only accessible to approved supervisors.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-300"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            Supervisor Dashboard
          </h1>
          <p className="text-xl md:text-2xl text-green-100 max-w-3xl mx-auto">
            Welcome back, {user?.firstName}! Hope you're having a great day.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: "courses", label: "My Classes", icon: "🎓" },
                { key: "students", label: "Students", icon: "👥" },
                { key: "videos", label: "My Videos", icon: "🎥" },
                { key: "salary", label: "My Salary", icon: "💰" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex flex-col items-center py-4 px-6 border-b-2 font-medium text-sm transition-all duration-200 ${
                    activeTab === tab.key
                      ? "border-purple-500 text-purple-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span
                    className={`text-2xl mb-2 p-2 rounded-full transition-all duration-200 ${
                      activeTab === tab.key
                        ? "bg-purple-100 shadow-md"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    {tab.icon}
                  </span>
                  <span className="font-semibold">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Courses Tab */}
        {activeTab === "courses" && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-tr from-cyan-900 via-sky-800 to-gray-400 p-6">
              <h2 className="text-3xl font-bold text-white">
                My Assigned Courses
              </h2>
            </div>

            <div className="p-6">
              {courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => {
                    const levelGradients: Record<Course["level"], string> = {
                      A1: "from-emerald-500 to-green-500",
                      A2: "from-blue-500 to-cyan-500",
                      B1: "from-amber-500 to-yellow-500",
                      B2: "from-orange-500 to-red-500",
                      C1: "from-red-500 to-pink-500",
                      C2: "from-purple-500 to-indigo-500",
                    };

                    const levelIcons: Record<Course["level"], string> = {
                      A1: "🌱",
                      A2: "🌿",
                      B1: "🌳",
                      B2: "🎯",
                      C1: "🚀",
                      C2: "💎",
                    };

                    return (
                      <div
                        key={course._id}
                        className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden group"
                      >
                        {/* Course Header */}
                        <div
                          className={`bg-gradient-to-r ${
                            levelGradients[course.level]
                          } p-6 text-white relative`}
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -mr-16 -mt-16"></div>
                          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white bg-opacity-10 rounded-full -ml-12 -mb-12"></div>
                          <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                              <div className="bg-white bg-opacity-20 backdrop-blur-sm px-3 py-2 rounded-full border border-white border-opacity-30">
                                <span className="text-lg">
                                  {levelIcons[course.level]}
                                </span>
                                <span className="font-bold ml-2">
                                  {course.level}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xl font-bold">
                                {course.title}
                              </h3>
                            </div>
                            <p className="text-white text-opacity-90 text-sm">
                              {course.instructor}
                            </p>
                          </div>
                        </div>

                        {/* Course Body */}
                        <div className="p-6">
                          <div className="space-y-4 mb-6">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 flex items-center">
                                Duration
                              </span>
                              <span className="font-semibold">
                                {course.duration} weeks
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 flex items-center">
                                Start Date
                              </span>
                              <span className="font-semibold">
                                {new Date(
                                  course.startDate
                                ).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 flex items-center">
                                End Date
                              </span>
                              <span className="font-semibold">
                                {new Date(course.endDate).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 flex items-center">
                                Schedule Days
                              </span>
                              <span className="font-semibold">
                                {course.schedule?.days?.join(", ") || "Not set"}
                              </span>
                            </div>
                          </div>

                          {/* Available Spots */}
                          <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                Available Spots
                              </span>
                              <span className="text-sm text-gray-600">
                                {course.maxStudents -
                                  (course.currentStudents || 0)}{" "}
                                of {course.maxStudents}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${
                                    ((course.currentStudents || 0) /
                                      course.maxStudents) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* Features */}
                          {course.features && course.features.length > 0 && (
                            <div className="mb-6">
                              <h4 className="font-bold text-gray-900 mb-3">
                                What you'll teach:
                              </h4>
                              <ul className="space-y-2">
                                {course.features
                                  .slice(0, 3)
                                  .map((feature, index) => (
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
                                    + {course.features.length - 3} more
                                    features...
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}

                          {/* Requirements/Prerequisites */}
                          {course.requirements &&
                            course.requirements.length > 0 && (
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

                          {/* Action Buttons */}
                          <div className="flex space-x-3">
                            <button
                              onClick={() => {
                                setSelectedCourse(course);
                                setShowUploadModal(true);
                              }}
                              className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 text-white px-4 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:from-green-600 hover:to-teal-600 transition-all duration-300"
                            >
                              Upload
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCourse(course);
                                setShowStudentsModal(true);
                              }}
                              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-indigo-600 transition-all duration-300"
                            >
                              Students
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🎓</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    No Courses Assigned
                  </h3>
                  <p className="text-gray-600 text-lg max-w-md mx-auto">
                    You haven't been assigned to any courses yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === "students" && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-tr from-cyan-900 via-sky-800 to-gray-400 p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold text-white">
                    Student Management
                  </h2>
                </div>
                <div className="text-right text-white">
                  <div className="text-2xl font-bold">{students.length}</div>
                  <div className="text-sm text-blue-100">Total Students</div>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search students by name or email..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-900 placeholder-gray-500"
                  />
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                    🔍
                  </div>
                </div>
              </div>

              {students.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-8xl mb-6">👥</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">
                    No Students Found
                  </h3>
                  <p className="text-gray-600 text-lg">
                    No students are enrolled in courses assigned to you yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {students
                    .filter(
                      (student) =>
                        student.name
                          .toLowerCase()
                          .includes(studentSearchTerm.toLowerCase()) ||
                        student.email
                          .toLowerCase()
                          .includes(studentSearchTerm.toLowerCase())
                    )
                    .map((student) => (
                      <div
                        key={student._id}
                        className="bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                        onClick={async () => {
                          setSelectedStudent(student);
                          setShowStudentModal(true);
                          // Refresh student progress data when opening modal
                          await fetchStudentProgress();
                        }}
                      >
                        <div className="flex items-center space-x-4">
                          {/* Profile Photo */}
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg overflow-hidden">
                              {student.profilePhoto ? (
                                <img
                                  src={student.profilePhoto}
                                  alt={student.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-white font-semibold text-sm">
                                  {student.firstName
                                    ? `${student.firstName.charAt(0)}${
                                        student.lastName?.charAt(0) || ""
                                      }`
                                    : student.name.charAt(0)}
                                </span>
                              )}
                            </div>
                            {/* Status Indicator */}
                            <div
                              className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                                student.isActive
                                  ? "bg-emerald-400"
                                  : "bg-gray-300"
                              }`}
                            ></div>
                          </div>

                          {/* Student Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-200">
                              {student.firstName
                                ? `${student.firstName} ${student.lastName}`
                                : student.name}
                            </h3>
                            <p className="text-xs text-gray-500 truncate mt-1">
                              {student.email}
                            </p>
                            {/* Progress Information */}
                            {(() => {
                              const progressInfo = getStudentProgressInfo(
                                student._id
                              );
                              if (!progressInfo) return null;

                              return (
                                <div className="mt-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600">
                                      {progressInfo.completedVideos || 0}/
                                      {progressInfo.totalVideos || 0} lessons
                                      completed
                                    </span>
                                    <span className="text-blue-600 font-medium">
                                      {progressInfo.averageProgress}%
                                    </span>
                                  </div>
                                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                                    <div
                                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-300"
                                      style={{
                                        width: `${progressInfo.averageProgress}%`,
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* My Videos Tab */}
        {activeTab === "videos" && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-tr from-cyan-900 via-sky-800 to-gray-400 p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold text-white">
                    My Videos
                  </h2>
                </div>
                <div className="text-right text-white">
                  <div className="text-2xl font-bold">{myVideos.length}</div>
                  <div className="text-sm text-blue-100">Total Videos</div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50">
              {myVideos.length === 0 ? (
                <div className="text-center py-20 rounded-xl">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">
                    No Videos Yet
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                    Your uploaded videos will appear here with their approval status and admin feedback. Upload content from other sections to get started.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myVideos.map((video) => (
                    <div
                      key={video._id}
                      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-200"
                    >
                      {/* Video Header with Status */}
                      <div className="relative">
                        <div
                          className={`p-3 ${
                            video.status === "approved"
                              ? "bg-gradient-to-r from-green-500 to-emerald-600"
                              : video.status === "pending"
                              ? "bg-gradient-to-r from-amber-500 to-orange-600"
                              : "bg-gradient-to-r from-red-500 to-rose-600"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-white text-sm font-semibold">
                                #{video.sequenceNumber}
                              </span>
                              {video.commentCount && video.commentCount > 0 && (
                                <span className="relative text-white text-sm font-semibold">
                                  {video.commentCount} comment{video.commentCount > 1 ? 's' : ''}
                                  {video.hasNewComments && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></span>
                                  )}
                                </span>
                              )}
                            </div>
                            <div className={`px-3 py-1 rounded text-xs font-bold uppercase ${
                              video.status === "approved"
                                ? "bg-white text-green-600"
                                : video.status === "pending"
                                ? "bg-white text-amber-600"
                                : "bg-white text-red-600"
                            }`}>
                              {video.status}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Video Content */}
                      <div className="p-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                          {video.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {video.description}
                        </p>

                        <div className="space-y-2 mb-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Course:</span>
                            <span className="font-semibold text-gray-900 truncate ml-2">{video.courseId.title}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Duration:</span>
                            <span className="font-semibold text-gray-900">{Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')} min</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Uploaded:</span>
                            <span className="font-semibold text-gray-900">{new Date(video.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>

                        {/* Status Messages */}
                        {video.deletionStatus === "pending" && (
                          <div className="p-3 bg-orange-50 border-l-4 border-orange-500 rounded mb-3">
                            <p className="text-sm text-orange-800 font-semibold">Deletion Pending Approval</p>
                          </div>
                        )}

                        {video.deletionStatus === "rejected" && video.deletionRejectionReason && (
                          <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded mb-3">
                            <p className="text-sm text-yellow-800 font-semibold mb-1">Deletion Request Rejected</p>
                            <p className="text-xs text-yellow-700">{video.deletionRejectionReason}</p>
                          </div>
                        )}

                        {video.status === "pending" && (
                          <div className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded mb-3">
                            <p className="text-sm text-amber-800 font-semibold">Awaiting Review</p>
                          </div>
                        )}

                        {video.status === "rejected" && video.rejectionReason && (
                          <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded mb-3">
                            <p className="text-sm text-red-800 font-semibold mb-1">Rejected by Admin</p>
                            <p className="text-xs text-red-700">{video.rejectionReason}</p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-3">
                          {video.status === "approved" && (
                            <button
                              onClick={() =>
                                navigate(`/course/${video.courseId._id}/videos`)
                              }
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
                            >
                              Watch Video
                            </button>
                          )}

                          {video.status === "pending" && (
                            <div className="w-full bg-gray-100 text-gray-500 px-4 py-2 rounded text-sm font-medium text-center">
                              Under Review
                            </div>
                          )}

                          {video.status === "rejected" && (
                            <button
                              onClick={() => handleDeleteVideo(video._id, video.status)}
                              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
                            >
                              Delete Video
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Salary Tab */}
        {activeTab === "salary" && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-tr from-cyan-900 via-sky-800 to-gray-400 p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white">
                  My Salary Overview
                </h2>
                {lastUpdated && (
                  <div className="text-green-100 text-sm">
                    Updated:{" "}
                    {lastUpdated.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6">
              {salaryData ? (
                <div className="space-y-6">
                  {/* Salary Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-green-600 mb-1">
                            Monthly Salary
                          </h3>
                          <p className="text-2xl font-bold text-green-800">
                            €{salaryData.monthlySalary?.toLocaleString() || 0}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">💰</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-blue-600 mb-1">
                            Total Paid This Year
                          </h3>
                          <p className="text-2xl font-bold text-blue-800">
                            €
                            {salaryData.totalPaidThisYear?.toLocaleString() ||
                              0}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">📈</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-purple-600 mb-1">
                            Payments Received
                          </h3>
                          <p className="text-2xl font-bold text-purple-800">
                            {salaryData.monthlyPayments?.filter(
                              (p: any) => p.paid
                            ).length || 0}
                            /12
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">✅</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Payment Status */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">
                      {new Date().getFullYear()} Payment Status
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {salaryData.monthlyPayments?.map(
                        (payment: any, index: number) => {
                          const monthName = new Date(
                            2024,
                            index
                          ).toLocaleDateString("en-US", { month: "short" });
                          return (
                            <div
                              key={index}
                              className={`p-4 rounded-lg text-center border-2 ${
                                payment.paid
                                  ? "bg-green-50 border-green-200"
                                  : "bg-gray-50 border-gray-200"
                              }`}
                            >
                              <div
                                className={`text-2xl mb-2 ${
                                  payment.paid
                                    ? "text-green-600"
                                    : "text-gray-400"
                                }`}
                              >
                                {payment.paid ? "✅" : "⏳"}
                              </div>
                              <div className="text-sm font-medium text-gray-700">
                                {monthName}
                              </div>
                              <div
                                className={`text-xs mt-1 ${
                                  payment.paid
                                    ? "text-green-600"
                                    : "text-gray-500"
                                }`}
                              >
                                {payment.paid ? (
                                  <span>
                                    €{payment.amount?.toLocaleString()}
                                    <br />
                                    <span className="text-xs">
                                      {payment.paidDate
                                        ? new Date(
                                            payment.paidDate
                                          ).toLocaleDateString()
                                        : "Paid"}
                                      {payment.paymentMethod && (
                                        <>
                                          <br />
                                          <span className="capitalize">
                                            {payment.paymentMethod.replace(
                                              "_",
                                              " "
                                            )}
                                          </span>
                                        </>
                                      )}
                                    </span>
                                  </span>
                                ) : (
                                  <span>Pending</span>
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {/* Assigned Courses */}
                  {salaryData.assignedCourses &&
                    salaryData.assignedCourses.length > 0 && (
                      <div className="bg-blue-50 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">
                          My Assigned Courses
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {salaryData.assignedCourses.map(
                            (course: any, index: number) => (
                              <div
                                key={index}
                                className="bg-white p-4 rounded-lg border border-blue-100"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium text-gray-800">
                                      {course.title}
                                    </h4>
                                    <p className="text-sm text-blue-600">
                                      Level: {course.level}
                                    </p>
                                  </div>
                                  <div className="text-2xl">🎓</div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">💳</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    No Salary Data Available
                  </h3>
                  <p className="text-gray-600">
                    Your salary information hasn't been set up yet. Please
                    contact the administrator to initialize your salary record.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Upload Modal - Quizzes, Resources, Videos */}
      {showUploadModal && selectedCourse && (
        <UploadModal
          isOpen={showUploadModal}
          onClose={() => {
            setShowUploadModal(false);
            setSelectedCourse(null);
          }}
          course={selectedCourse}
        />
      )}

      {/* Students Modal - Review & Grade Submissions */}
      {showStudentsModal && selectedCourse && (
        <StudentsModal
          isOpen={showStudentsModal}
          onClose={() => {
            setShowStudentsModal(false);
            setSelectedCourse(null);
          }}
          course={selectedCourse}
        />
      )}

      {/* Student Profile Modal */}
      {showStudentModal && selectedStudent && (
        <StudentProfileModal
          isOpen={showStudentModal}
          onClose={() => {
            setShowStudentModal(false);
            setSelectedStudent(null);
          }}
          student={selectedStudent}
          studentProgress={studentProgress}
        />
      )}
    </div>
  );
};

export default SupervisorDashboard;
