'use client';

import React from 'react';
import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { learningPathsApi } from '@/lib/api/learning-paths';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import Link from 'next/link';

export default function LearningPathDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['learning-path', slug],
    queryFn: () => learningPathsApi.getOne(slug),
  });

  const enrollMutation = useMutation({
    mutationFn: (pathId: string) => learningPathsApi.enroll(pathId),
    onSuccess: () => {
      showNotification('success', 'Successfully enrolled in learning path!');
      queryClient.invalidateQueries({ queryKey: ['learning-path', slug] });
    },
    onError: (error: any) => {
      showNotification('error', error.response?.data?.message || 'Enrollment failed');
    },
  });

  const path = data?.data?.data;

  if (isLoading || !path) {
    return <div className="min-h-screen bg-gray-50 py-12 px-4">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          {path.isOfficial && (
            <span className="inline-block text-sm bg-green-100 text-green-800 px-3 py-1 rounded mb-4">
              Official Learning Path
            </span>
          )}

          <h1 className="text-4xl font-bold text-gray-900 mb-4">{path.title}</h1>
          <p className="text-lg text-gray-600 mb-6">{path.description}</p>

          <div className="flex items-center gap-6 text-gray-600 mb-6">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
              {path.steps?.length || 0} Courses
            </span>
            {path.estimatedHours && (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                {path.estimatedHours} hours
              </span>
            )}
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {path.enrollmentCount} enrolled
            </span>
          </div>

          {user && (
            <button
              onClick={() => enrollMutation.mutate(path.id)}
              disabled={enrollMutation.isPending}
              className="bg-green-600 text-white py-3 px-8 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {enrollMutation.isPending ? 'Enrolling...' : 'Enroll in Path'}
            </button>
          )}
        </div>

        {/* Course Steps */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Course Sequence</h2>

          {path.steps?.map((step: any, index: number) => (
            <div
              key={step.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start gap-4">
                {/* Step Number */}
                <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {index + 1}
                </div>

                {/* Course Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {step.course.title}
                      </h3>
                      {step.description && (
                        <p className="text-gray-600 mb-3">{step.description}</p>
                      )}
                      <p className="text-sm text-gray-500 mb-2">
                        {step.course.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{step.course.level}</span>
                        {step.estimatedHours && <span>{step.estimatedHours}h</span>}
                        {step.course.averageRating && (
                          <span>⭐ {step.course.averageRating.toFixed(1)}</span>
                        )}
                      </div>
                    </div>
                    {step.isOptional && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Optional
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/courses/${step.course.id}`}
                    className="inline-block mt-4 text-green-600 hover:text-green-700 font-medium"
                  >
                    View Course →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
