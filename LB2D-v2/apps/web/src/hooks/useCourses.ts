'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import toast from 'react-hot-toast';

export function useCourses(params?: any) {
  return useQuery({
    queryKey: ['courses', params],
    queryFn: async () => {
      const response = await api.courses.getAll(params);
      return response.data?.data || response.data;
    },
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      const response = await api.courses.getById(id);
      return response.data?.data || response.data;
    },
    enabled: !!id,
  });
}

export function useEnrollCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      paymentIntentId,
    }: {
      courseId: string;
      paymentIntentId?: string;
    }) => {
      const response = await api.courses.enroll(courseId, paymentIntentId);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success('Successfully enrolled in course!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Enrollment failed';
      toast.error(message);
    },
  });
}

export function useMyEnrollments() {
  return useQuery({
    queryKey: ['enrollments'],
    queryFn: async () => {
      const response = await api.courses.getMyEnrollments();
      return response.data?.data || response.data;
    },
  });
}

export function useMyCourses() {
  return useQuery({
    queryKey: ['my-courses'],
    queryFn: async () => {
      const response = await api.courses.getMyCourses();
      return response.data?.data || response.data;
    },
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.courses.create(data);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['my-courses'] });
      toast.success('Course created successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create course';
      toast.error(message);
    },
  });
}
