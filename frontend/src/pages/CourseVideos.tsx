import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import VideoComments from '../components/VideoComments';
import ResourceViewer from '../components/ResourceViewer';
import { RootState } from '../store/store';
import { useNotification } from '../hooks/useNotification';

interface Video {
  _id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  sequenceNumber: number;
  uploadedBy: {
    firstName: string;
    lastName: string;
  };
  status: string;
  createdAt: string;
}

interface Course {
  _id: string;
  title: string;
  level: string;
  instructor: string;
  description: string;
}

interface Quiz {
  _id: string;
  title: string;
  description?: string;
  type: 'quiz' | 'exam' | 'practice';
  questions: any[];
  totalPoints: number;
  timeLimit?: number;
  duration?: number; // Duration in minutes for display
  sequenceNumber: number;
  status: string;
  isActive: boolean;
  createdAt: string;
  supervisorId: {
    firstName: string;
    lastName: string;
  };
}

interface Resource {
  _id: string;
  title: string;
  description: string;
  type: 'document' | 'audio' | 'image' | 'video' | 'link';
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileExtension: string;
  isViewableInline: boolean;
  category: string;
  sequenceNumber: number;
  status: string;
  downloadCount: number;
  uploadedAt: string;
  supervisorId: {
    firstName: string;
    lastName: string;
  };
}

interface Enrollment {
  _id: string;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  progress: {
    lessonsCompleted: number;
    totalLessons: number;
    percentage: number;
  };
}

const CourseVideos: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { showWarning } = useNotification();
  
  const [videos, setVideos] = useState<Video[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  // Remove tabs - unified timeline approach
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
  const [completedQuizzes, setCompletedQuizzes] = useState<Set<string>>(new Set());
  const [videoProgress, setVideoProgress] = useState<{[videoId: string]: number}>({});
  const [actualWatchTime, setActualWatchTime] = useState<{[videoId: string]: number}>({});
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [canMarkComplete, setCanMarkComplete] = useState(false);
  
  // For Google Drive videos, simulate progress tracking
  const [googleDriveWatchTime, setGoogleDriveWatchTime] = useState(0);
  const [googleDriveInterval, setGoogleDriveInterval] = useState<NodeJS.Timeout | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  // Resource modal states
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [showResourceModal, setShowResourceModal] = useState(false);

  useEffect(() => {
    if (courseId) {
      fetchCourseAndVideos();
      fetchQuizzes();
      fetchResources();
      fetchEnrollmentStatus();
    }

    // Add debug function to window for testing
    (window as any).testVideoUrl = (url: string) => {
      return getVideoUrl(url);
    };
  }, [courseId]);

  // Fetch completed quizzes when quizzes are loaded
  useEffect(() => {
    if (quizzes.length > 0 && user?.role === 'Student') {
      fetchCompletedQuizzes();
    }
  }, [quizzes]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (googleDriveInterval) {
        clearInterval(googleDriveInterval);
      }
    };
  }, [googleDriveInterval]);

  // Refresh completed quizzes when page becomes visible (e.g., after taking a quiz)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && quizzes.length > 0 && user?.role === 'Student') {
        fetchCompletedQuizzes();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [quizzes, user]);

  const fetchEnrollmentStatus = async () => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/courses/user/enrollments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Find the enrollment for this specific course
          const currentEnrollment = data.data.find((enrollment: any) => 
            enrollment.courseId && enrollment.courseId._id === courseId
          );
          
          if (currentEnrollment) {
            setEnrollment({
              _id: currentEnrollment._id,
              status: currentEnrollment.status,
              progress: currentEnrollment.progress || { lessonsCompleted: 0, totalLessons: 0, percentage: 0 }
            });
          } else {
          }
        }
      } else {
        console.error('Failed to fetch enrollment status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching enrollment status:', error);
    }
  };

  const fetchCourseAndVideos = async () => {
    try {
      // Get token from session storage
      const token = sessionStorage.getItem('accessToken');
      // Fetch course details
      const courseResponse = await fetch(`${process.env.REACT_APP_API_URL}/courses/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (courseResponse.ok) {
        const courseData = await courseResponse.json();
        if (courseData.success) {
          setCourse(courseData.data);
        }
      } else {
        console.error('Failed to fetch course:', courseResponse.status, courseResponse.statusText);
      }

      // Fetch videos
      const videosResponse = await fetch(`${process.env.REACT_APP_API_URL}/videos/course/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (videosResponse.ok) {
        const videosData = await videosResponse.json();
        if (videosData.success) {
          setVideos(videosData.data);
          if (videosData.data.length > 0) {
            setCurrentVideo(videosData.data[0]);
          } else {
          }

          // Fetch video completion progress
          try {
            const progressResponse = await fetch(`${process.env.REACT_APP_API_URL}/videos/course/${courseId}/progress`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (progressResponse.ok) {
              const progressData = await progressResponse.json();
              if (progressData.success && progressData.data) {
                const completedVideoIds = progressData.data.map((p: any) => p.videoId);
                setWatchedVideos(new Set(completedVideoIds));
                // Also load watch progress for each video
                const savedProgress = progressData.data.reduce((acc: any, p: any) => {
                  acc[p.videoId] = p.progress || 100; // If completed, assume 100%
                  return acc;
                }, {});
                setVideoProgress(savedProgress);
              }
            }
          } catch (error) {
            console.error('Error fetching video progress:', error);
          }
        }
      } else {
        console.error('Failed to fetch videos:', videosResponse.status, videosResponse.statusText);
        const errorData = await videosResponse.json().catch(() => ({}));
        console.error('Video fetch error details:', errorData);
      }
    } catch (error) {
      console.error('Failed to fetch course and videos:', error);
    }
    setLoading(false);
  };

  const fetchQuizzes = async () => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/quizzes/course/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setQuizzes(data.data || []);
        }
      } else {
        console.error('Failed to fetch quizzes:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
    }
  };

  const fetchResources = async () => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/resources/course/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setResources(data.data || []);
        }
      } else {
        console.error('Failed to fetch resources:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    }
  };

  const fetchCompletedQuizzes = async () => {
    try {
      const token = sessionStorage.getItem('accessToken');
      // Fetch all quiz attempts for quizzes in this course
      const quizAttemptPromises = quizzes.map(async (quiz) => {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/quizzes/my-attempts/${quiz._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Check if student has completed this quiz (has any attempt)
          if (data.success && data.data && data.data.length > 0) {
            return quiz._id;
          }
        }
        return null;
      });

      const completedQuizIds = (await Promise.all(quizAttemptPromises)).filter(id => id !== null) as string[];
      setCompletedQuizzes(new Set(completedQuizIds));
    } catch (error) {
      console.error('Failed to fetch quiz attempts:', error);
    }
  };

  const handleResourceComplete = () => {
    // Refetch resources to update progress
    fetchResources();
    // Refetch enrollment status to update overall progress
    fetchEnrollmentStatus();
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Create unified timeline of all course content
  const createUnifiedTimeline = () => {
    const timelineItems: Array<{
      id: string;
      type: 'video' | 'quiz' | 'resource';
      data: Video | Quiz | Resource;
      sortOrder: number;
      createdAt: Date;
    }> = [];

    // Add videos with sequence numbers as sort order
    videos.forEach((video, index) => {
      timelineItems.push({
        id: video._id,
        type: 'video',
        data: video,
        sortOrder: video.sequenceNumber || index + 1,
        createdAt: new Date(video.createdAt || Date.now())
      });
    });

    // Add quizzes with sequence numbers
    quizzes.forEach((quiz: any, index) => {
      timelineItems.push({
        id: quiz._id,
        type: 'quiz',
        data: quiz,
        sortOrder: quiz.sequenceNumber || 1000 + index,
        createdAt: new Date(quiz.createdAt || Date.now())
      });
    });

    // Add resources with sequence numbers
    resources.forEach((resource: any, index) => {
      timelineItems.push({
        id: resource._id,
        type: 'resource',
        data: resource,
        sortOrder: resource.sequenceNumber || 2000 + index,
        createdAt: new Date(resource.uploadedAt || Date.now())
      });
    });

    // Sort by sequence number only (unified sequence across all types)
    return timelineItems.sort((a, b) => {
      // Sort by sequence number first
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      // If sequence numbers are equal (shouldn't happen), sort by creation date
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  };

  const timelineItems = createUnifiedTimeline();

  // Calculate overall course progress based on all content types and enrollment status
  const totalContentItems = timelineItems.length;
  
  // If course is completed according to enrollment status, show 100%
  const isCompletedCourse = enrollment?.status === 'completed';
  
  let completedContentItems;
  let progressPercentage;
  
  if (isCompletedCourse) {
    // For completed courses, show all content as completed
    completedContentItems = totalContentItems;
    progressPercentage = 100;
  } else {
    // For active courses, calculate based on all completed content (videos + quizzes)
    completedContentItems = watchedVideos.size + completedQuizzes.size;
    progressPercentage = totalContentItems > 0 ? (completedContentItems / totalContentItems) * 100 : 0;
  }

  // Check if a video is unlocked for student access
  const isVideoUnlocked = (video: Video, index: number) => {
    // Admins and Supervisors can access all videos
    if (user?.role === 'Admin' || user?.role === 'Supervisor') {
      return true;
    }
    
    // First video is always unlocked
    if (index === 0) {
      return true;
    }
    
    // Check if all previous videos have been watched to 90% or completed
    for (let i = 0; i < index; i++) {
      const prevVideo = videos[i];
      const prevProgress = videoProgress[prevVideo._id] || 0;
      const isCompleted = watchedVideos.has(prevVideo._id);
      
      // Previous video must be either completed OR watched to at least 90%
      if (!isCompleted && prevProgress < 90) {
        return false;
      }
    }
    
    return true;
  };

  // Check if content is locked for student access (universal locking for all content types)
  const isContentLocked = (item: any, index: number) => {
    // Admins and Supervisors can access all content
    if (user?.role === 'Admin' || user?.role === 'Supervisor') {
      return false;
    }
    
    // First item is always unlocked
    if (index === 0) {
      return false;
    }
    
    // Check if all previous items have been completed
    for (let i = 0; i < index; i++) {
      const prevItem = timelineItems[i];
      
      if (prevItem.type === 'video') {
        const prevVideo = prevItem.data as Video;
        const prevProgress = videoProgress[prevVideo._id] || 0;
        const isCompleted = watchedVideos.has(prevVideo._id);
        
        // Previous video must be either completed OR watched to at least 90%
        if (!isCompleted && prevProgress < 90) {
          return true;
        }
      } else {
        // For quizzes and resources, we'll assume they're completed if accessed
        // This can be extended later with proper completion tracking for these content types
        // For now, just check if it's the immediate predecessor to a locked item
        continue;
      }
    }
    
    return false;
  };

  // Handle selection of any content type
  const handleContentSelect = (item: any, index: number) => {
    const isLocked = isContentLocked(item, index);
    
    if (isLocked) {
      // Find which previous content needs to be completed
      let blockingItemIndex = -1;
      for (let i = 0; i < index; i++) {
        const prevItem = timelineItems[i];
        if (prevItem.type === 'video') {
          const prevVideo = prevItem.data as Video;
          const prevProgress = videoProgress[prevVideo._id] || 0;
          const isCompleted = watchedVideos.has(prevVideo._id);
          
          if (!isCompleted && prevProgress < 90) {
            blockingItemIndex = i;
            break;
          }
        }
      }
      
      const blockingItem = blockingItemIndex >= 0 ? timelineItems[blockingItemIndex] : null;
      const message = blockingItem
        ? `Please complete "${(blockingItem.data as any).title}" to at least 90% before accessing this content.`
        : 'Please complete the previous content before accessing this item.';

      showWarning(message, 'Content Locked');
      return;
    }
    
    // Handle different content types
    if (item.type === 'video') {
      handleVideoSelect(item.data as Video);
    } else if (item.type === 'quiz') {
      // Navigate to quiz page - you can implement this based on your routing
      const quiz = item.data as Quiz;
      navigate(`/quiz/${quiz._id}`);
    } else if (item.type === 'resource') {
      const resource = item.data as Resource;
      setSelectedResource(resource);
      setShowResourceModal(true);
    }
  };

  const handleVideoSelect = (video: Video) => {
    const videoIndex = videos.findIndex(v => v._id === video._id);
    
    // Check if video is unlocked before allowing selection
    if (!isVideoUnlocked(video, videoIndex)) {
      // Find which previous video needs to be completed
      let blockingVideoIndex = -1;
      for (let i = 0; i < videoIndex; i++) {
        const prevVideo = videos[i];
        const prevProgress = videoProgress[prevVideo._id] || 0;
        const isCompleted = watchedVideos.has(prevVideo._id);
        
        if (!isCompleted && prevProgress < 90) {
          blockingVideoIndex = i;
          break;
        }
      }
      
      const blockingVideo = blockingVideoIndex >= 0 ? videos[blockingVideoIndex] : null;
      const message = blockingVideo
        ? `Please complete "${blockingVideo.title}" to at least 90% before accessing this video.`
        : 'Please complete the previous videos to at least 90% before accessing this video.';

      showWarning(message, 'Video Locked');
      return;
    }
    
    // Stop previous video tracking
    stopGoogleDriveProgressTracking();
    
    setCurrentVideo(video);
    setCanMarkComplete(false);
    setLastUpdateTime(0); // Reset time tracking for new video
    
    // Reset progress for new video if not already completed
    if (!watchedVideos.has(video._id)) {
      const currentProgress = videoProgress[video._id] || 0;
      if (currentProgress >= 90) {
        setCanMarkComplete(true);
      }
    }
  };

  const handleVideoComplete = async (videoId: string) => {
    setWatchedVideos(prev => {
      const newSet = new Set(prev);
      newSet.add(videoId);
      return newSet;
    });

    // Update progress on backend
    const currentProgress = videoProgress[videoId] || 100;
    const currentWatchTime = actualWatchTime[videoId] || 0;
    
    await saveProgressToBackend(videoId, currentProgress, currentWatchTime, true);
    
    // Reset completion state
    setCanMarkComplete(false);
    stopGoogleDriveProgressTracking();
  };

  const handleVideoLoadedMetadata = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    const actualDuration = Math.round(video.duration);
    // Update the current video's duration if it differs significantly
    if (currentVideo && Math.abs(currentVideo.duration - actualDuration) > 5) {
      setCurrentVideo(prev => prev ? { ...prev, duration: actualDuration } : prev);
    }
  };

  const handleVideoError = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    console.error('Video failed to load:', video.error);
    console.error('Original Video URL:', currentVideo?.videoUrl);
    console.error('Processed Video URL:', currentVideo ? getVideoUrl(currentVideo.videoUrl) : 'N/A');
    console.error('Video src attribute:', video.currentSrc);
    console.error('Error details:', {
      code: video.error?.code,
      message: video.error?.message
    });
  };

  const handleVideoLoadStart = () => {
  };

  const handleVideoCanPlay = () => {
  };

  const handleVideoPlay = () => {
    setIsVideoPlaying(true);
  };

  const handleVideoPause = () => {
    setIsVideoPlaying(false);
  };

  const handleVideoTimeUpdate = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    if (currentVideo && video.duration > 0) {
      const now = Date.now();
      const timeSinceLastUpdate = (now - lastUpdateTime) / 1000; // Convert to seconds
      
      // Only count watch time if it's been a reasonable interval (0.1 to 2 seconds)
      // This prevents counting when user seeks/skips
      if (lastUpdateTime > 0 && timeSinceLastUpdate > 0.1 && timeSinceLastUpdate < 2) {
        setActualWatchTime(prev => {
          const currentWatchTime = prev[currentVideo._id] || 0;
          const newWatchTime = currentWatchTime + timeSinceLastUpdate;
          
          // Calculate progress based on actual watch time, not playback position
          const watchProgress = Math.min((newWatchTime / video.duration) * 100, 100);
          
          // Debug logging every 5% of actual watch time
          if (Math.floor(watchProgress) % 5 === 0 && Math.floor(watchProgress) !== Math.floor((prev[currentVideo._id] || 0) / video.duration * 100)) {
          }
          
          // Update the visual progress based on actual watch time
          setVideoProgress(prevProgress => {
            const newProgress = {
              ...prevProgress,
              [currentVideo._id]: watchProgress
            };
            
            // Check if we just unlocked the next video based on actual watch time
            if (watchProgress >= 90 && (prevProgress[currentVideo._id] || 0) < 90 && user?.role === 'Student') {
            }
            
            // Save progress to backend every 10% increment
            const prevPercentage = Math.floor((prevProgress[currentVideo._id] || 0) / 10) * 10;
            const currentPercentage = Math.floor(watchProgress / 10) * 10;
            if (currentPercentage > prevPercentage && currentPercentage >= 10 && user?.role === 'Student') {
              saveProgressToBackend(currentVideo._id, watchProgress, newWatchTime, false);
            }
            
            return newProgress;
          });
          
          // Enable Mark Complete button at 90% actual watch time (only for students)
          if (watchProgress >= 90 && !watchedVideos.has(currentVideo._id) && user?.role === 'Student') {
            setCanMarkComplete(true);
          }
          
          return {
            ...prev,
            [currentVideo._id]: newWatchTime
          };
        });
      }
      
      setLastUpdateTime(now);
    }
  };

  // Save progress to backend
  const saveProgressToBackend = async (videoId: string, progress: number, watchTime: number, completed: boolean) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/videos/${videoId}/progress`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          progress: Math.round(progress),
          watchTime: Math.round(watchTime),
          completed
        })
      });

      if (response.ok) {
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const startGoogleDriveProgressTracking = () => {
    if (currentVideo && currentVideo.videoUrl.includes('drive.google.com')) {
      // Use the actual video duration from database (more accurate than estimation)
      const actualDuration = currentVideo.duration > 0 ? currentVideo.duration : 0; // No fallback - use actual duration
      
      // Resume from previous actual watch time if exists
      const existingWatchTime = actualWatchTime[currentVideo._id] || 0;
      setGoogleDriveWatchTime(existingWatchTime);
      setCanMarkComplete(false);
      setIsVideoPlaying(false); // Start paused
      
      // Auto-start after a short delay to simulate user clicking play
      setTimeout(() => {
        setIsVideoPlaying(true);
      }, 2000);
      
      const interval = setInterval(() => {
        // Only increment when playing (this tracks actual watch time)
        if (isVideoPlaying) {
          setGoogleDriveWatchTime(prev => {
            const newTime = prev + 0.5; // Increment by 0.5 seconds for smoother progress
            const progress = Math.min((newTime / actualDuration) * 100, 100); // Cap at 100%
            
            // Update actual watch time state
            setActualWatchTime(prevWatchTime => ({
              ...prevWatchTime,
              [currentVideo._id]: newTime
            }));
            
            // Debug logging for Google Drive videos (every 5% to avoid spam)
            const prevProgress = videoProgress[currentVideo._id] || 0;
            if (Math.floor(progress) % 5 === 0 && Math.floor(progress) !== Math.floor(prevProgress)) {
            }
            
            // Update progress display with actual watch time
            setVideoProgress(prevProgress => {
              const newProgress = {
                ...prevProgress,
                [currentVideo._id]: progress
              };
              
              // Check if we just unlocked the next video based on actual watch time
              if (progress >= 90 && (prevProgress[currentVideo._id] || 0) < 90 && user?.role === 'Student') {
              }
              
              return newProgress;
            });
            
            // Enable Mark Complete at 90% actual watch time
            if (progress >= 90 && !watchedVideos.has(currentVideo._id) && user?.role === 'Student') {
              setCanMarkComplete(true);
            }
            
            return newTime;
          });
        }
      }, 500); // Update every 500ms for smoother progress
      
      setGoogleDriveInterval(interval);
    }
  };

  const stopGoogleDriveProgressTracking = () => {
    if (googleDriveInterval) {
      clearInterval(googleDriveInterval);
      setGoogleDriveInterval(null);
    }
  };

  const getVideoUrl = (url: string): string => {
    // Check if it's a Google Drive URL
    if (url.includes('drive.google.com')) {
      // Extract file ID from different Google Drive URL formats
      let fileId = '';
      
      // Format: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
      const viewMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (viewMatch) {
        fileId = viewMatch[1];
      }
      
      // Format: https://drive.google.com/open?id=FILE_ID
      const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (openMatch) {
        fileId = openMatch[1];
      }
      
      if (fileId) {
        // Convert to direct download/streaming URL
        const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        return directUrl;
      } else {
        console.warn('Could not extract Google Drive file ID from URL:', url);
      }
    }
    
    // Check if it's a locally uploaded video (starts with /uploads/)
    if (url.startsWith('/uploads/')) {
      // Remove /api from the base URL if present, since static files are served at root level
      const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5005';
      const fullUrl = `${baseUrl}${url}`;
      return fullUrl;
    }
    
    // For other URLs (YouTube, Vimeo, direct links), return as-is
    return url;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center px-4">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-white bg-opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white bg-opacity-10 rounded-full translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-white bg-opacity-5 rounded-full"></div>
        
        <div className="bg-white bg-opacity-60 backdrop-blur-md px-6 sm:px-8 md:px-10 py-6 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg border border-white border-opacity-50 relative z-10 mx-4">
          {/* Header */}
          <div className="text-center mb-4 sm:mb-6">
            <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-red-600 via-yellow-600 to-green-600 bg-clip-text text-transparent mb-2">
              Course Not Found
            </div>
          </div>

          <div className="text-center mb-6 sm:mb-8">
            <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
              The course you're looking for doesn't exist or you don't have access to it.
            </p>
          </div>
          
          <button
            onClick={() => navigate('/my-courses')}
            className="group relative w-full py-3 px-4 sm:px-6 bg-gradient-to-r from-blue-600 to-green-600 font-semibold text-white rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-300 min-h-[44px] text-sm sm:text-base"
          >
            {/* Stars for hover effect */}
            <div className="fixed w-4 h-4 top-[15%] left-[20%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 784.11 815.53"
                className="w-full h-full fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
              >
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-3 h-3 top-[25%] right-[15%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[1800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 784.11 815.53"
                className="w-full h-full fill-blue-300 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]"
              >
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-2 h-2 bottom-[25%] left-[10%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 784.11 815.53"
                className="w-full h-full fill-green-300 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]"
              >
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            <div className="fixed w-3 h-3 top-[60%] right-[20%] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 z-50 transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 784.11 815.53"
                className="w-full h-full fill-yellow-300 drop-shadow-[0_0_7px_rgba(251,191,36,0.8)]"
              >
                <path d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z" />
              </svg>
            </div>
            
            <span className="relative z-10 font-semibold text-sm sm:text-base md:text-lg">Back to My Courses</span>
          </button>

          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-gray-600 text-sm sm:text-base">
              Need help?{' '}
              <button
                onClick={() => navigate('/contact')}
                className="text-green-600 font-semibold hover:text-green-700 transition-colors"
              >
                Contact Support
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
                {course.title}
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-blue-100">
                {course.level} • {course.instructor}
              </p>
            </div>
            <Button
              onClick={() => navigate('/supervisor')}
              className="text-blue-600 hover:bg-gray-100 transition-colors duration-200 px-4 py-2 rounded-lg shadow-md text-sm sm:text-base min-h-[44px]"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Progress Bar - Only for Students */}
        {user?.role === 'Student' && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-5 md:p-6 mb-6 sm:mb-8">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">Course Progress</h3>
              <span className="text-xs sm:text-sm font-bold text-blue-600">
                {Math.round(progressPercentage)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 sm:h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between text-xs sm:text-sm text-gray-600 mt-2 gap-1 sm:gap-0">
              <span>{completedContentItems} of {totalContentItems} items completed</span>
              <span>{videos.length} videos, {quizzes.length} quizzes, {resources.length} resources</span>
            </div>
          </div>
        )}

        {/* Supervisor Info Bar */}
        {(user?.role === 'Supervisor' || user?.role === 'Admin') && (
          <div className="bg-gradient-to-r from-orange-100 via-red-100 to-pink-100 rounded-xl shadow-lg p-4 sm:p-5 md:p-6 mb-6 sm:mb-8 border-2 border-orange-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <div>
                <p className="text-sm sm:text-base text-gray-700 font-medium">
                  Review and preview course content.
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-2xl sm:text-3xl font-bold text-orange-600">{videos.length}</span>
                <p className="text-xs sm:text-sm text-orange-800 font-semibold">Videos Available</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {/* Video Player Section - Left Side */}
          <div className="lg:col-span-2">
            {currentVideo ? (
              <div>
                <Card className="overflow-hidden">
                <div className="aspect-video bg-black relative">
                  {currentVideo.videoUrl.includes('drive.google.com') ? (
                    // Google Drive videos - use iframe for better compatibility
                    <div className="relative w-full h-full overflow-hidden rounded-lg">
                      <iframe
                        key={currentVideo._id}
                        className="w-full h-full border-0"
                        src={`https://drive.google.com/file/d/${currentVideo.videoUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] || currentVideo.videoUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1]}/preview`}
                        allowFullScreen
                        title={currentVideo.title}
                        onLoad={() => {
                          startGoogleDriveProgressTracking();
                        }}
                        allow="autoplay; encrypted-media"
                        sandbox="allow-same-origin allow-scripts allow-presentation"
                      />
                    </div>
                  ) : (
                    // Regular video files
                    <video
                      key={currentVideo._id}
                      className="w-full h-full"
                      controls
                      onEnded={() => handleVideoComplete(currentVideo._id)}
                      onLoadedMetadata={handleVideoLoadedMetadata}
                      onError={handleVideoError}
                      onLoadStart={handleVideoLoadStart}
                      onCanPlay={handleVideoCanPlay}
                      onTimeUpdate={handleVideoTimeUpdate}
                      onPlay={handleVideoPlay}
                      onPause={handleVideoPause}
                      poster={currentVideo.thumbnailUrl}
                    >
                      <source src={getVideoUrl(currentVideo.videoUrl)} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  )}

                </div>
                <div className="p-4 sm:p-5 md:p-6">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2">
                    {currentVideo.title}
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">{currentVideo.description}</p>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs sm:text-sm text-gray-500 gap-2 sm:gap-0">
                    <span>
                      Video {currentVideo.sequenceNumber} of {videos.length}
                    </span>
                    <span>Duration: {formatDuration(currentVideo.duration)}</span>
                  </div>
                </div>
              </Card>

              {/* Video Comments */}
              {currentVideo && (
                <div className="mt-6 sm:mt-8">
                  <VideoComments
                    videoId={currentVideo._id}
                    courseId={courseId || ''}
                  />
                </div>
              )}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-10 md:py-12">
                <p className="text-gray-500 text-base sm:text-lg">No videos available for this course.</p>
              </div>
            )}

          </div>

          {/* Course Content Timeline - Right Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <div className="p-3 sm:p-4 border-b border-gray-200">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                  Course Content
                </h3>
              </div>
              <div className="p-3 sm:p-4 max-h-80 sm:max-h-96 overflow-y-auto">
                {timelineItems.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {timelineItems.map((item, index) => {
                      const isLocked = isContentLocked(item, index);
                      const isCurrentItem = item.type === 'video' && currentVideo && item.id === currentVideo._id;

                      return (
                        <div
                          key={item.id}
                          className={`p-2 sm:p-3 rounded-lg border-2 transition-all duration-200 ${
                            isCurrentItem
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : isLocked
                              ? 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
                              : 'border-gray-200 bg-white hover:border-gray-300 cursor-pointer'
                          }`}
                          onClick={() => handleContentSelect(item, index)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                              {/* Content Type Icon */}
                              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 ${
                                item.type === 'video'
                                  ? 'bg-blue-100 text-blue-600'
                                  : item.type === 'quiz'
                                  ? 'bg-green-100 text-green-600'
                                  : 'bg-purple-100 text-purple-600'
                              }`}>
                                {item.type === 'video' ? 'V' : item.type === 'quiz' ? 'Q' : 'R'}
                              </div>

                              {/* Content Info */}
                              <div className="flex-1 min-w-0">
                                <h4 className={`text-xs sm:text-sm font-medium truncate ${
                                  isLocked ? 'text-gray-500' : 'text-gray-900'
                                }`}>
                                  {(item.data as any).title}
                                </h4>
                                <p className={`text-xs mt-1 ${
                                  isLocked ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  {item.type === 'video'
                                    ? `Video • ${formatDuration((item.data as Video).duration)}`
                                    : item.type === 'quiz'
                                    ? `${(item.data as Quiz).type.charAt(0).toUpperCase() + (item.data as Quiz).type.slice(1)} • ${(item.data as Quiz).questions.length} questions`
                                    : `${(item.data as Resource).type.charAt(0).toUpperCase() + (item.data as Resource).type.slice(1)} • ${(item.data as Resource).fileName}`
                                  }
                                </p>
                              </div>
                            </div>
                            
                            {/* Lock/Progress/Complete Status */}
                            <div className="flex items-center space-x-2">
                              {isLocked ? (
                                <div className="text-gray-400 text-xs">Locked</div>
                              ) : isCompletedCourse ? (
                                // Show checkmark for all content when course is completed
                                <div className="text-green-500 text-xs">Done</div>
                              ) : item.type === 'video' && watchedVideos.has(item.id) ? (
                                <div className="text-green-500 text-xs">Done</div>
                              ) : item.type === 'quiz' && completedQuizzes.has(item.id) ? (
                                <div className="text-green-500 text-xs">Done</div>
                              ) : item.type === 'video' && videoProgress[item.id] ? (
                                <div className="text-blue-500 text-xs">
                                  {Math.round(videoProgress[item.id])}%
                                </div>
                              ) : (
                                <div className="text-gray-400 text-xs">○</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No content available</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Resource Modal */}
      {showResourceModal && selectedResource && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowResourceModal(false);
            }
          }}
        >
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                  <span className="text-lg sm:text-xl md:text-2xl font-bold flex-shrink-0">
                    {selectedResource.type === 'document' ? 'DOC' :
                     selectedResource.type === 'audio' ? 'AUD' :
                     selectedResource.type === 'image' ? 'IMG' :
                     selectedResource.type === 'video' ? 'VID' : 'FILE'}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg md:text-xl font-bold truncate">{selectedResource.title}</h3>
                    <p className="text-purple-100 text-xs sm:text-sm truncate">{selectedResource.fileName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowResourceModal(false)}
                  className="text-white hover:text-purple-200 transition-colors text-2xl sm:text-3xl font-bold p-2 flex-shrink-0"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-auto max-h-[calc(90vh-200px)]">
              {selectedResource.description && (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm sm:text-base text-gray-700">{selectedResource.description}</p>
                </div>
              )}

              {/* Resource Content */}
              <div className="mb-6">
                {selectedResource.type === 'image' && (
                  <div className="text-center">
                    <img
                      src={`${process.env.REACT_APP_API_URL || 'http://localhost:5005'}/api/resources/${selectedResource._id}/view`}
                      alt={selectedResource.title}
                      className="max-w-full h-auto rounded-lg shadow-md"
                    />
                  </div>
                )}
                
                {selectedResource.type === 'audio' && (
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6 md:p-8">
                    <div className="text-center mb-4">
                      <h4 className="text-base sm:text-lg font-semibold">{selectedResource.title}</h4>
                    </div>
                    <audio
                      controls
                      className="w-full"
                      src={`${process.env.REACT_APP_API_URL || 'http://localhost:5005'}/api/resources/${selectedResource._id}/view`}
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
                
                {selectedResource.type === 'video' && (
                  <div className="bg-black rounded-lg overflow-hidden">
                    <video
                      controls
                      className="w-full h-auto"
                      src={`${process.env.REACT_APP_API_URL || 'http://localhost:5005'}/api/resources/${selectedResource._id}/view`}
                    >
                      Your browser does not support the video element.
                    </video>
                  </div>
                )}
                
                {selectedResource.type === 'document' && selectedResource.mimeType === 'application/pdf' && (
                  <div className="border rounded-lg overflow-hidden" style={{ height: '500px' }}>
                    <iframe
                      src={`${process.env.REACT_APP_API_URL || 'http://localhost:5005'}/api/resources/${selectedResource._id}/view`}
                      className="w-full h-full"
                      title={selectedResource.title}
                    />
                  </div>
                )}
                
                {selectedResource.type === 'document' && selectedResource.mimeType === 'text/plain' && (
                  <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '400px' }}>
                    <iframe
                      src={`${process.env.REACT_APP_API_URL || 'http://localhost:5005'}/api/resources/${selectedResource._id}/view`}
                      className="w-full h-full"
                      title={selectedResource.title}
                    />
                  </div>
                )}

                {/* Fallback for non-viewable resources */}
                {!selectedResource.isViewableInline && (
                  <div className="text-center py-8 sm:py-10 md:py-12 bg-gray-50 rounded-lg">
                    <h4 className="text-base sm:text-lg font-semibold mb-2">Preview not available</h4>
                    <p className="text-sm sm:text-base text-gray-600 mb-4">This file type cannot be previewed inline.</p>
                    <p className="text-xs sm:text-sm text-gray-500">Use the download button below to view the file.</p>
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="font-semibold text-gray-600">File Type:</span>
                    <p className="text-gray-800 capitalize">{selectedResource.type}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600">Size:</span>
                    <p className="text-gray-800">{formatFileSize(selectedResource.fileSize)}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600">Category:</span>
                    <p className="text-gray-800 capitalize">{selectedResource.category}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600">Downloads:</span>
                    <p className="text-gray-800">{selectedResource.downloadCount}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    window.open(`${process.env.REACT_APP_API_URL || 'http://localhost:5005'}/api/resources/${selectedResource._id}/download`, '_blank');
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 sm:px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base min-h-[44px]"
                >
                  Download
                </button>

                {user?.role === 'Student' && (
                  <button
                    onClick={async () => {
                      try {
                        const token = sessionStorage.getItem('accessToken');
                        await fetch(`${process.env.REACT_APP_API_URL}/resources/${selectedResource._id}/complete`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({ timeSpent: 60 })
                        });
                        setShowResourceModal(false);
                        fetchResources(); // Refresh to update progress
                        fetchEnrollmentStatus(); // Update overall progress
                      } catch (error) {
                        console.error('Error marking resource as completed:', error);
                      }
                    }}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-4 sm:px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base min-h-[44px]"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseVideos;
