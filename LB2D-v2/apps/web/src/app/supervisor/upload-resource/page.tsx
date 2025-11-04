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

const uploadResourceSchema = z.object({
  courseId: z.string().min(1, 'Please select a course'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  order: z.number().min(1, 'Order must be at least 1'),
});

type UploadResourceFormData = z.infer<typeof uploadResourceSchema>;

export default function UploadResourcePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [courses, setCourses] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UploadResourceFormData>({
    resolver: zodResolver(uploadResourceSchema),
    defaultValues: {
      order: 1,
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

  useEffect(() => {
    loadCourses();
  }, []);

  const onSubmit = async (data: UploadResourceFormData) => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('courseId', data.courseId);
      formData.append('title', data.title);
      if (data.description) formData.append('description', data.description);
      formData.append('order', data.order.toString());
      formData.append('file', file);

      await api.resources.upload(formData);

      toast.success('Resource uploaded successfully! Pending admin approval.');
      router.push('/supervisor');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to upload resource';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Upload Resource</h1>
          <p className="text-gray-600">Upload study materials for your course</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resource Title *
              </label>
              <Input
                type="text"
                placeholder="e.g., Grammar Reference Sheet"
                {...register('title')}
                disabled={loading}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                rows={4}
                placeholder="Describe this resource..."
                {...register('description')}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resource File *
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                Accepted: PDF, DOC, DOCX, PPT, PPTX, XLSX, TXT (Max 50MB)
              </p>
              {file && (
                <p className="mt-2 text-sm text-green-600">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your resource will be pending admin approval after upload.
              </p>
            </div>

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
                disabled={loading || !file}
                className="px-8 bg-gradient-to-r from-purple-600 to-pink-600"
              >
                {loading ? 'Uploading...' : 'Upload Resource'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
