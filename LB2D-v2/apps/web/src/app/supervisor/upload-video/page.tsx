'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api-client';
import Button from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

const uploadVideoSchema = z.object({
  courseId: z.string().min(1, 'Please select a course'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  duration: z.number().min(1, 'Duration must be at least 1 second'),
  order: z.number().min(1, 'Order must be at least 1'),
});

type UploadVideoFormData = z.infer<typeof uploadVideoSchema>;

export default function UploadVideoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [courses, setCourses] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UploadVideoFormData>({
    resolver: zodResolver(uploadVideoSchema),
    defaultValues: {
      order: 1,
      duration: 600,
    },
  });

  const loadCourses = async () => {
    try {
      const response = await api.courses.getMyCourses();
      const data = response.data?.data || response.data;
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  };

  // Load supervisor's courses
  useEffect(() => {
    loadCourses();
  }, []);

  const onSubmit = async (data: UploadVideoFormData) => {
    if (!videoFile) {
      toast.error('Please select a video file');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('courseId', data.courseId);
      formData.append('title', data.title);
      if (data.description) formData.append('description', data.description);
      formData.append('duration', data.duration.toString());
      formData.append('order', data.order.toString());
      formData.append('video', videoFile);
      if (thumbnailFile) formData.append('thumbnail', thumbnailFile);

      await api.videos.upload(formData);

      toast.success('Video uploaded successfully! Pending admin approval.');
      router.push('/supervisor');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to upload video';
      toast.error(message);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Upload Video</h1>
          <p className="text-gray-600">Upload a new video to your course</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-md p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Course Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Course *
              </label>
              <select
                {...register('courseId')}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="">Choose a course...</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              {errors.courseId && (
                <p className="mt-1 text-sm text-red-600">{errors.courseId.message}</p>
              )}
            </div>

            {/* Video Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video Title *
              </label>
              <Input
                type="text"
                placeholder="e.g., Introduction to German Alphabet"
                {...register('title')}
                disabled={loading}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                rows={4}
                placeholder="Describe what this video covers..."
                {...register('description')}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Duration and Order */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (seconds) *
                </label>
                <Input
                  type="number"
                  placeholder="600"
                  {...register('duration', { valueAsNumber: true })}
                  disabled={loading}
                />
                {errors.duration && (
                  <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order in Course *
                </label>
                <Input
                  type="number"
                  placeholder="1"
                  {...register('order', { valueAsNumber: true })}
                  disabled={loading}
                />
                {errors.order && (
                  <p className="mt-1 text-sm text-red-600">{errors.order.message}</p>
                )}
              </div>
            </div>

            {/* Video File */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video File *
              </label>
              <input
                type="file"
                accept="video/mp4,video/webm,video/mov"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                Accepted formats: MP4, WebM, MOV (Max 500MB)
              </p>
              {videoFile && (
                <p className="mt-2 text-sm text-green-600">
                  Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Thumbnail */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thumbnail (Optional)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              {thumbnailFile && (
                <p className="mt-2 text-sm text-green-600">
                  Selected: {thumbnailFile.name}
                </p>
              )}
            </div>

            {/* Upload Progress */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2 text-center">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}

            {/* Info Note */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your video will be pending admin approval after upload. You'll be notified once it's approved.
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-4">
              <Button
                type="button"
                onClick={() => router.back()}
                variant="outline"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !videoFile}
                className="px-8 bg-gradient-to-r from-blue-600 to-purple-600"
              >
                {loading ? 'Uploading...' : 'Upload Video'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
