'use client';

/**
 * SUPERVISOR DASHBOARD - COMPLETE with 4 TABS
 * Exact port from old LB2D with modern tech stack
 *
 * TABS:
 * 1. COURSES - Course grid + Upload Modal (3 sub-tabs)
 * 2. STUDENTS - Student grid + Search + Profile Modal
 * 3. VIDEOS - All videos with filters
 * 4. SALARY - Monthly breakdown + Auto-refresh
 */

import ConfirmModal from '@/components/common/ConfirmModal';
import Input from '@/components/common/Input';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SalaryOverview from './components/SalaryOverview';
import StudentProfileModal from './components/StudentProfileModal';
import VideoCard from './components/VideoCard';

// ===========================
// TYPES & INTERFACES
// ===========================
import UploadModalComplete from './components/UploadModalComplete';

interface Stats {
  totalStudents: number;
  activeCourses: number;
  pendingApprovals: number;
  completedCourses: number;
}

interface Course {
  _id: string;
  id?: string;
  title: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  instructor: string;
  description: string;
  duration: number;
  currentStudents?: number;
  maxStudents: number;
  status: string;
}

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePhoto?: string;
  lastLogin?: string;
  role: string;
}

interface Video {
  _id: string;
  title: string;
  description: string;
  courseId: string;
  courseName?: string;
  courseLevel?: string;
  status: 'pending' | 'approved' | 'rejected';
  sequenceNumber: number;
  duration?: number;
  viewCount?: number;
  videoUrl?: string;
  rejectionReason?: string;
  deletionStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  commentCount?: number;
  newCommentCount?: number;
}

interface Quiz {
  _id: string;
  title: string;
  type: 'quiz' | 'exam' | 'practice';
  courseId: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  sequenceNumber: number;
  questions?: any[];
  totalPoints?: number;
  timeLimit?: number;
  attemptsAllowed?: number;
  deletionStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

interface Resource {
  _id: string;
  title: string;
  type: 'document' | 'audio';
  courseId: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  fileName: string;
  fileSize: number;
  downloadCount?: number;
  sequenceNumber: number;
  category: 'lesson' | 'homework' | 'reference' | 'exercise';
  deletionStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  description?: string;
}

interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  correctAnswer: number;
  points?: number;
}

interface SalaryData {
  currentMonth: number;
  yearToDate: number;
  monthlyBreakdown: Array<{
    month: string;
    year: number;
    amount: number;
    status: 'paid' | 'pending' | 'unpaid';
    paymentDate?: string;
    paymentMethod?: string;
    transactionId?: string;
  }>;
  assignedCourses: Array<{
    courseId: string;
    title: string;
    students: number;
    revenue: number;
    commission: number;
    earning: number;
  }>;
}

// ===========================
// HELPER FUNCTIONS
// ===========================

const getStatusBadge = (
  status: string
): { variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning'; label: string } => {
  const statusMap: Record<string, any> = {
    draft: { variant: 'secondary', label: 'Draft' },
    pending: { variant: 'warning', label: 'Pending' },
    approved: { variant: 'success', label: 'Approved' },
    rejected: { variant: 'destructive', label: 'Rejected' },
  };
  return statusMap[status] || { variant: 'default', label: status };
};

// ===========================
// MAIN COMPONENT
// ===========================

export default function SupervisorDashboardPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<'courses' | 'students' | 'videos' | 'salary'>('courses');

  // Stats
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    activeCourses: 0,
    pendingApprovals: 0,
    completedCourses: 0,
  });

  // Courses Tab
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTab, setUploadTab] = useState<'quizzes' | 'resources' | 'videos'>('quizzes');

  // Students Tab
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentProfile, setShowStudentProfile] = useState(false);

  // Videos Tab
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [videoFilter, setVideoFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Salary Tab
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);

  // Quiz states
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [quizForm, setQuizForm] = useState({
    title: '',
    type: 'quiz' as 'quiz' | 'exam' | 'practice',
    timeLimit: 30,
    attemptsAllowed: 3,
    sequenceNumber: 1,
    questions: [] as QuizQuestion[],
  });
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion>({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    points: 1,
  });

  // Resource states
  const [resources, setResources] = useState<Resource[]>([]);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [resourceForm, setResourceForm] = useState({
    title: '',
    description: '',
    type: 'document' as 'document' | 'audio',
    category: 'lesson' as 'lesson' | 'homework' | 'reference' | 'exercise',
    sequenceNumber: 1,
  });

  // Video states (for upload modal)
  const [videos, setVideos] = useState<Video[]>([]);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    sequenceNumber: 1,
    duration: 0,
    videoUrl: '',
  });

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; type: string } | null>(null);

  // Alert
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; message: string } | null>(null);

  // Level colors (exact from old version)
  const levelGradients = {
    A1: 'from-green-400 to-emerald-500',
    A2: 'from-blue-400 to-cyan-500',
    B1: 'from-yellow-400 to-orange-500',
    B2: 'from-orange-400 to-red-500',
    C1: 'from-red-400 to-pink-500',
    C2: 'from-purple-400 to-indigo-500',
  };

  const levelBgColors = {
    A1: 'bg-green-50',
    A2: 'bg-blue-50',
    B1: 'bg-yellow-50',
    B2: 'bg-orange-50',
    C1: 'bg-red-50',
    C2: 'bg-purple-50',
  };

  // ===========================
  // AUTHENTICATION CHECK
  // ===========================

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'SUPERVISOR') {
      router.push('/dashboard');
      return;
    }

    fetchInitialData();
  }, [token, user, router]);

  // Load tab-specific data when tab changes
  useEffect(() => {
    if (user && token) {
      loadTabData();
    }
  }, [activeTab]);

  // Auto-refresh salary every 30 seconds
  useEffect(() => {
    if (activeTab === 'salary' && token) {
      const interval = setInterval(() => fetchSalaryData(), 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, token]);

  // Auto-dismiss alerts
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearInterval(timer);
    }
  }, [alert]);

  // Student search filter
  useEffect(() => {
    if (studentSearch.trim() === '') {
      setFilteredStudents(students);
    } else {
      const search = studentSearch.toLowerCase();
      setFilteredStudents(
        students.filter(
          (s) =>
            s.firstName.toLowerCase().includes(search) ||
            s.lastName.toLowerCase().includes(search) ||
            s.email.toLowerCase().includes(search)
        )
      );
    }
  }, [studentSearch, students]);

  // ===========================
  // DATA FETCHING
  // ===========================

  const loadTabData = async () => {
    switch (activeTab) {
      case 'students':
        await fetchStudents();
        break;
      case 'videos':
        await fetchAllVideos();
        break;
      case 'salary':
        await fetchSalaryData();
        break;
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchStats(), fetchCourses()]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      showAlert('error', 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.analytics.getSupervisorDashboard();
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.courses.getAll();
      if (response.data.success) {
        setCourses(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users?role=STUDENT`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setStudents(data.data || []);
        setFilteredStudents(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchAllVideos = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/videos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setAllVideos(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const fetchSalaryData = async () => {
    setSalaryLoading(true);
    try {
      const response = await api.analytics.getSupervisorDashboard();
      if (response.data.success) {
        // Mock salary data for now - replace with actual endpoint
        const mockSalary: SalaryData = {
          currentMonth: 50000,
          yearToDate: 350000,
          monthlyBreakdown: [
            { month: 'January', year: 2025, amount: 50000, status: 'paid', paymentDate: '2025-02-01', paymentMethod: 'Bank Transfer' },
            { month: 'February', year: 2025, amount: 45000, status: 'paid', paymentDate: '2025-03-01', paymentMethod: 'bKash' },
            { month: 'March', year: 2025, amount: 52000, status: 'paid', paymentDate: '2025-04-01', paymentMethod: 'Bank Transfer' },
            { month: 'April', year: 2025, amount: 48000, status: 'pending' },
            { month: 'May', year: 2025, amount: 0, status: 'unpaid' },
            { month: 'June', year: 2025, amount: 0, status: 'unpaid' },
            { month: 'July', year: 2025, amount: 0, status: 'unpaid' },
            { month: 'August', year: 2025, amount: 0, status: 'unpaid' },
            { month: 'September', year: 2025, amount: 0, status: 'unpaid' },
            { month: 'October', year: 2025, amount: 0, status: 'unpaid' },
            { month: 'November', year: 2025, amount: 50000, status: 'pending' },
            { month: 'December', year: 2025, amount: 0, status: 'unpaid' },
          ],
          assignedCourses: [
            { courseId: '1', title: 'German A1 - Beginner', students: 15, revenue: 150000, commission: 20, earning: 30000 },
            { courseId: '2', title: 'German A2 - Elementary', students: 12, revenue: 120000, commission: 20, earning: 24000 },
          ],
        };
        setSalaryData(mockSalary);
      }
    } catch (error) {
      console.error('Error fetching salary data:', error);
    } finally {
      setSalaryLoading(false);
    }
  };

  const fetchQuizzes = async (courseId: string) => {
    try {
      const response = await api.quizzes.getByCourse(courseId);
      if (response.data.success) {
        setQuizzes(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    }
  };

  const fetchResources = async (courseId: string) => {
    try {
      const response = await api.resources.getByCourse(courseId);
      if (response.data.success) {
        setResources(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const fetchVideos = async (courseId: string) => {
    try {
      const response = await api.videos.getByCourse(courseId);
      if (response.data.success) {
        setVideos(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  // ===========================
  // HANDLERS
  // ===========================

  const showAlert = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    setAlert({ type, message });
  };

  const handleCourseUpload = (course: Course) => {
    setSelectedCourse(course);
    const courseId = course._id || course.id || '';
    fetchQuizzes(courseId);
    fetchResources(courseId);
    fetchVideos(courseId);
    setShowUploadModal(true);
  };

  const handleAddQuestion = () => {
    if (currentQuestion.question && currentQuestion.options.every((opt) => opt.trim() !== '')) {
      setQuizForm({
        ...quizForm,
        questions: [
          ...quizForm.questions,
          {
            id: Date.now().toString(),
            ...currentQuestion,
          },
        ],
      });
      setCurrentQuestion({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        points: 1,
      });
    } else {
      showAlert('warning', 'Please fill in all question fields');
    }
  };

  const handleRemoveQuestion = (index: number) => {
    setQuizForm({
      ...quizForm,
      questions: quizForm.questions.filter((_, i) => i !== index),
    });
  };

  const handleCreateQuiz = async () => {
    try {
      if (!quizForm.title || !selectedCourse || quizForm.questions.length === 0) {
        showAlert('warning', 'Please fill in all fields and add at least one question');
        return;
      }

      const courseId = selectedCourse._id || selectedCourse.id || '';

      await api.quizzes.create({
        ...quizForm,
        courseId,
      });

      showAlert('success', 'Quiz created successfully!');
      resetQuizForm();
      setShowQuizForm(false);
      fetchQuizzes(courseId);
      fetchStats();
    } catch (error: any) {
      console.error('Error creating quiz:', error);
      showAlert('error', error.response?.data?.message || 'Failed to create quiz');
    }
  };

  const resetQuizForm = () => {
    setQuizForm({
      title: '',
      type: 'quiz',
      timeLimit: 30,
      attemptsAllowed: 3,
      sequenceNumber: 1,
      questions: [],
    });
    setCurrentQuestion({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      points: 1,
    });
    setEditingQuiz(null);
  };

  const handleSubmitQuizForApproval = async (quizId: string) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/quizzes/${quizId}/submit-approval`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        showAlert('success', 'Quiz submitted for admin approval successfully!');
        if (selectedCourse) {
          fetchQuizzes(selectedCourse._id || selectedCourse.id || '');
        }
        fetchStats();
      } else {
        const errorData = await response.json();
        showAlert('error', errorData.message || 'Failed to submit quiz for approval');
      }
    } catch (error) {
      console.error('Error submitting quiz for approval:', error);
      showAlert('error', 'Failed to submit quiz for approval');
    }
  };

  const handleResubmitQuiz = async (quizId: string) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/quizzes/${quizId}/resubmit`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        showAlert('success', 'Quiz resubmitted successfully!');
        if (selectedCourse) {
          fetchQuizzes(selectedCourse._id || selectedCourse.id || '');
        }
        fetchStats();
      } else {
        const errorData = await response.json();
        showAlert('error', errorData.message || 'Failed to resubmit quiz');
      }
    } catch (error) {
      console.error('Error resubmitting quiz:', error);
      showAlert('error', 'Failed to resubmit quiz');
    }
  };

  const handleUploadResource = async () => {
    try {
      if (!resourceFile || !resourceForm.title || !selectedCourse) {
        showAlert('warning', 'Please fill in all fields');
        return;
      }

      const formData = new FormData();
      formData.append('file', resourceFile);
      formData.append('title', resourceForm.title);
      formData.append('description', resourceForm.description);
      formData.append('courseId', selectedCourse._id || selectedCourse.id || '');
      formData.append('type', resourceForm.type);
      formData.append('category', resourceForm.category);
      formData.append('sequenceNumber', resourceForm.sequenceNumber.toString());

      await api.resources.upload(formData);

      showAlert('success', 'Resource uploaded successfully!');
      resetResourceForm();
      setShowResourceForm(false);
      fetchResources(selectedCourse._id || selectedCourse.id || '');
      fetchStats();
    } catch (error: any) {
      console.error('Error uploading resource:', error);
      showAlert('error', error.response?.data?.message || 'Failed to upload resource');
    }
  };

  const resetResourceForm = () => {
    setResourceFile(null);
    setResourceForm({
      title: '',
      description: '',
      type: 'document',
      category: 'lesson',
      sequenceNumber: 1,
    });
  };

  const handleSubmitResourceForApproval = async (resourceId: string) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/resources/${resourceId}/submit-approval`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        showAlert('success', 'Resource submitted for admin approval successfully!');
        if (selectedCourse) {
          fetchResources(selectedCourse._id || selectedCourse.id || '');
        }
        fetchStats();
      } else {
        const errorData = await response.json();
        showAlert('error', errorData.message || 'Failed to submit resource for approval');
      }
    } catch (error) {
      console.error('Error submitting resource for approval:', error);
      showAlert('error', 'Failed to submit resource for approval');
    }
  };

  const handleResubmitResource = async (resourceId: string) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/resources/${resourceId}/submit-approval`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        showAlert('success', 'Resource resubmitted successfully!');
        if (selectedCourse) {
          fetchResources(selectedCourse._id || selectedCourse.id || '');
        }
        fetchStats();
      } else {
        const errorData = await response.json();
        showAlert('error', errorData.message || 'Failed to resubmit resource');
      }
    } catch (error) {
      console.error('Error resubmitting resource:', error);
      showAlert('error', 'Failed to resubmit resource');
    }
  };

  const handleUploadVideo = async () => {
    try {
      if ((!videoFile && !videoForm.videoUrl) || !videoForm.title || !selectedCourse) {
        showAlert('warning', 'Please fill in all fields');
        return;
      }

      const formData = new FormData();
      if (videoFile) {
        formData.append('file', videoFile);
      } else if (videoForm.videoUrl) {
        formData.append('videoUrl', videoForm.videoUrl);
      }
      formData.append('title', videoForm.title);
      formData.append('description', videoForm.description);
      formData.append('courseId', selectedCourse._id || selectedCourse.id || '');
      formData.append('sequenceNumber', videoForm.sequenceNumber.toString());
      if (videoForm.duration) {
        formData.append('duration', videoForm.duration.toString());
      }

      await api.videos.upload(formData);

      showAlert('success', 'Video uploaded successfully!');
      resetVideoForm();
      setShowVideoForm(false);
      fetchVideos(selectedCourse._id || selectedCourse.id || '');
      fetchStats();
    } catch (error: any) {
      console.error('Error uploading video:', error);
      showAlert('error', error.response?.data?.message || 'Failed to upload video');
    }
  };

  const resetVideoForm = () => {
    setVideoFile(null);
    setVideoForm({
      title: '',
      description: '',
      sequenceNumber: 1,
      duration: 0,
      videoUrl: '',
    });
  };

  const handleResubmitVideo = async (videoId: string) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/videos/${videoId}/resubmit`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        showAlert('success', 'Video resubmitted successfully!');
        fetchAllVideos(); // Refresh all videos
        fetchStats();
      } else {
        const errorData = await response.json();
        showAlert('error', errorData.message || 'Failed to resubmit video');
      }
    } catch (error) {
      console.error('Error resubmitting video:', error);
      showAlert('error', 'Failed to resubmit video');
    }
  };

  const handleDeleteQuiz = (quizId: string, quizTitle: string) => {
    setDeleteTarget({ id: quizId, title: quizTitle, type: 'quiz' });
    setShowDeleteConfirm(true);
  };

  const handleDeleteResource = (resourceId: string, resourceTitle: string) => {
    setDeleteTarget({ id: resourceId, title: resourceTitle, type: 'resource' });
    setShowDeleteConfirm(true);
  };

  const handleDeleteVideo = (videoId: string, videoTitle: string) => {
    setDeleteTarget({ id: videoId, title: videoTitle, type: 'video' });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const token = sessionStorage.getItem('accessToken');
      let endpoint = '';
      if (deleteTarget.type === 'quiz') {
        endpoint = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/quizzes/${deleteTarget.id}`;
      } else if (deleteTarget.type === 'resource') {
        endpoint = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/resources/${deleteTarget.id}`;
      } else if (deleteTarget.type === 'video') {
        endpoint = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/videos/${deleteTarget.id}`;
      }

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        if (data.data?.requiresApproval) {
          showAlert('info', 'Deletion request submitted to admin for approval.');
        } else {
          showAlert('success', `${deleteTarget.type} deleted successfully`);
        }

        if (deleteTarget.type === 'video' && activeTab === 'videos') {
          fetchAllVideos();
        } else if (selectedCourse) {
          const courseId = selectedCourse._id || selectedCourse.id || '';
          if (deleteTarget.type === 'quiz') fetchQuizzes(courseId);
          else if (deleteTarget.type === 'resource') fetchResources(courseId);
          else if (deleteTarget.type === 'video') fetchVideos(courseId);
        }
        fetchStats();
      } else {
        showAlert('error', data.message || `Failed to delete ${deleteTarget.type}`);
      }
    } catch (error) {
      console.error(`Error deleting ${deleteTarget?.type}:`, error);
      showAlert('error', `Failed to delete ${deleteTarget?.type}`);
    } finally {
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  const handleViewQuiz = (quiz: any) => {
    setEditingQuiz({ ...quiz, isViewOnly: true });
    setQuizForm({
      title: quiz.title,
      type: quiz.type,
      timeLimit: quiz.timeLimit,
      attemptsAllowed: quiz.attemptsAllowed || 3,
      sequenceNumber: quiz.sequenceNumber,
      questions: quiz.questions || [],
    });
    setShowQuizForm(true);
  };

  const handleEditQuiz = (quiz: any) => {
    setEditingQuiz(quiz);
    setQuizForm({
      title: quiz.title,
      type: quiz.type,
      timeLimit: quiz.timeLimit,
      attemptsAllowed: quiz.attemptsAllowed || 3,
      sequenceNumber: quiz.sequenceNumber,
      questions: quiz.questions || [],
    });
    setShowQuizForm(true);
  };

  const getNextSequenceNumber = (items: any[]) => {
    if (items.length === 0) return 1;
    return Math.max(...items.map((item) => item.sequenceNumber || 0)) + 1;
  };

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // ===========================
  // LOADING STATE
  // ===========================

  if (loading || !user || user.role !== 'SUPERVISOR') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // ===========================
  // RENDER
  // ===========================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Alert Notification */}
      {alert && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in">
          <div
            className={`p-4 rounded-lg shadow-2xl border-2 ${
              alert.type === 'success'
                ? 'bg-green-100 border-green-400 text-green-900'
                : alert.type === 'error'
                ? 'bg-red-100 border-red-400 text-red-900'
                : alert.type === 'warning'
                ? 'bg-yellow-100 border-yellow-400 text-yellow-900'
                : 'bg-blue-100 border-blue-400 text-blue-900'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-1">
                <p className="font-semibold">{alert.message}</p>
              </div>
              <button onClick={() => setAlert(null)} className="ml-4 text-gray-600 hover:text-gray-900 text-xl">
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-cyan-900 via-blue-700 to-gray-400 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">Supervisor Dashboard</h1>
          <p className="text-xl text-blue-100">Welcome back, {user.firstName}! Manage your courses and students</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 -mt-16">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalStudents}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Courses</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.activeCourses}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{stats.pendingApprovals}</p>
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

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Courses</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{stats.completedCourses}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </div>

        {/* TAB NAVIGATION */}
        <div className="bg-white rounded-t-2xl shadow-xl border-b-2 border-blue-200 mb-0">
          <div className="flex flex-wrap gap-2 p-3">
            <button
              onClick={() => setActiveTab('courses')}
              className={`flex-1 min-w-[140px] px-6 py-4 rounded-xl font-bold transition-all transform hover:scale-105 ${
                activeTab === 'courses'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-xl'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">📚</span>
                <span>Courses</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`flex-1 min-w-[140px] px-6 py-4 rounded-xl font-bold transition-all transform hover:scale-105 ${
                activeTab === 'students'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-xl'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">👥</span>
                <span>Students</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`flex-1 min-w-[140px] px-6 py-4 rounded-xl font-bold transition-all transform hover:scale-105 ${
                activeTab === 'videos'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-xl'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">🎥</span>
                <span>Videos</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('salary')}
              className={`flex-1 min-w-[140px] px-6 py-4 rounded-xl font-bold transition-all transform hover:scale-105 ${
                activeTab === 'salary'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-xl'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">💰</span>
                <span>Salary</span>
              </div>
            </button>
          </div>
        </div>

        {/* TAB CONTENT */}
        <div className="bg-white rounded-b-2xl shadow-xl border border-gray-100 p-8">
          {/* TAB 1: COURSES */}
          {activeTab === 'courses' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Courses</h2>

              {courses.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  <h4 className="text-lg font-medium text-gray-800 mb-2">No Courses Yet</h4>
                  <p className="text-gray-600">You haven't been assigned any courses yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <div
                      key={course._id || course.id}
                      className={`${
                        levelBgColors[course.level]
                      } border-2 border-gray-200 rounded-xl p-6 hover:shadow-2xl transition-all hover:-translate-y-2`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div
                            className={`inline-block px-4 py-1 rounded-full text-white text-sm font-bold bg-gradient-to-r ${
                              levelGradients[course.level]
                            } mb-3 shadow-lg`}
                          >
                            Level {course.level}
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1">{course.title}</h3>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                      <div className="space-y-2 mb-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Duration: {course.duration} weeks
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          Instructor: {course.instructor}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                          Students: {course.currentStudents || 0} / {course.maxStudents}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCourseUpload(course)}
                        className={`w-full bg-gradient-to-r ${
                          levelGradients[course.level]
                        } text-white py-3 px-4 rounded-lg font-bold hover:shadow-xl transition-all`}
                      >
                        📤 Upload Content
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STUDENTS */}
          {activeTab === 'students' && (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Your Students</h2>
                <div className="w-full md:w-auto md:max-w-md">
                  <Input
                    type="search"
                    placeholder="🔍 Search students by name or email..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <p className="text-gray-600 font-medium">
                    {studentSearch ? 'No students found matching your search.' : 'No students enrolled yet.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredStudents.map((student) => (
                    <div
                      key={student._id}
                      onClick={() => {
                        setSelectedStudent(student);
                        setShowStudentProfile(true);
                      }}
                      className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 rounded-xl p-6 hover:shadow-2xl transition-all cursor-pointer hover:-translate-y-2"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        {student.profilePhoto ? (
                          <img
                            src={student.profilePhoto}
                            alt={student.firstName}
                            className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                            {student.firstName[0]}
                            {student.lastName[0]}
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900">
                            {student.firstName} {student.lastName}
                          </h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                            {student.email}
                          </p>
                        </div>
                      </div>
                      {student.lastLogin && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white rounded-lg p-2">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Last login: {formatTimeAgo(student.lastLogin)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VIDEOS */}
          {activeTab === 'videos' && (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">All Your Videos</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setVideoFilter('all')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      videoFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setVideoFilter('pending')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      videoFilter === 'pending'
                        ? 'bg-yellow-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ⏳ Pending
                  </button>
                  <button
                    onClick={() => setVideoFilter('approved')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      videoFilter === 'approved'
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ✅ Approved
                  </button>
                  <button
                    onClick={() => setVideoFilter('rejected')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      videoFilter === 'rejected'
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ❌ Rejected
                  </button>
                </div>
              </div>

              {allVideos.filter((v) => videoFilter === 'all' || v.status === videoFilter).length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-gray-600 font-medium">No videos found</p>
                  <p className="text-gray-500 text-sm mt-1">
                    {videoFilter !== 'all' ? `No ${videoFilter} videos available` : 'Upload videos from the Courses tab'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allVideos
                    .filter((v) => videoFilter === 'all' || v.status === videoFilter)
                    .map((video) => (
                      <VideoCard
                        key={video._id}
                        video={video}
                        onResubmit={handleResubmitVideo}
                        onDelete={handleDeleteVideo}
                      />
                    ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SALARY */}
          {activeTab === 'salary' && (
            <SalaryOverview salaryData={salaryData} loading={salaryLoading} />
          )}
        </div>
      </div>

      {/* Student Profile Modal */}
      {selectedStudent && (
        <StudentProfileModal
          isOpen={showStudentProfile}
          onClose={() => {
            setShowStudentProfile(false);
            setSelectedStudent(null);
          }}
          student={selectedStudent}
        />
      )}

      {/* Upload Modal - COMPLETE with 3 Sub-Tabs */}
        <UploadModalComplete
          isOpen={showUploadModal}
          onClose={() => {
            setShowUploadModal(false);
            setSelectedCourse(null);
          }}
          course={selectedCourse}
          quizzes={quizzes}
          resources={resources}
          videos={videos}
          onCreateQuiz={async (quizData) => {
            const courseId = selectedCourse?._id || selectedCourse?.id || '';
            await api.quizzes.create({ ...quizData, courseId });
            showAlert('success', 'Quiz created successfully!');
            fetchQuizzes(courseId);
            fetchStats();
          }}
          onSubmitQuiz={handleSubmitQuizForApproval}
          onResubmitQuiz={handleResubmitQuiz}
          onDeleteQuiz={handleDeleteQuiz}
          onViewQuiz={handleViewQuiz}
          onEditQuiz={handleEditQuiz}
          onUploadResource={async (formData) => {
            await api.resources.upload(formData);
            showAlert('success', 'Resource uploaded successfully!');
            if (selectedCourse) fetchResources(selectedCourse._id || selectedCourse.id || '');
            fetchStats();
          }}
          onSubmitResource={handleSubmitResourceForApproval}
          onResubmitResource={handleResubmitResource}
          onDeleteResource={handleDeleteResource}
          onUploadVideo={async (formData) => {
            await api.videos.upload(formData);
            showAlert('success', 'Video uploaded successfully!');
            if (selectedCourse) fetchVideos(selectedCourse._id || selectedCourse.id || '');
            fetchStats();
          }}
          onDeleteVideo={handleDeleteVideo}
          getNextSequenceNumber={getNextSequenceNumber}
        />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action may require admin approval.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
