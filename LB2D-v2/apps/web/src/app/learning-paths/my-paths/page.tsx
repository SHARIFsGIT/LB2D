'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { learningPathsApi } from '@/lib/api/learning-paths';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function MyPathsPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['my-learning-paths'],
    queryFn: () => learningPathsApi.getMyPaths(),
    enabled: !!user,
  });

  const enrollments = data?.data?.data || [];

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">My Learning Paths</h1>
          <p className="text-gray-600">Please log in to view your learning paths</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Learning Paths</h1>

        {isLoading ? (
          <div className="text-center py-12">Loading your paths...</div>
        ) : enrollments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 mb-4">You're not enrolled in any learning paths yet.</p>
            <Link
              href="/learning-paths"
              className="inline-block bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700"
            >
              Browse Learning Paths
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {enrollments.map((enrollment: any) => (
              <div
                key={enrollment.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <Link href={`/learning-paths/${enrollment.path.slug}`}>
                  <h2 className="text-xl font-bold text-gray-900 mb-2 hover:text-green-600">
                    {enrollment.path.title}
                  </h2>
                </Link>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{Math.round(enrollment.progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-600 h-3 rounded-full transition-all"
                      style={{ width: `${enrollment.progress}%` }}
                    />
                  </div>
                </div>

                {/* Current Step */}
                <div className="text-sm text-gray-600 mb-4">
                  <p>
                    Step {enrollment.currentStepIndex + 1} of {enrollment.path._count?.steps || 0}
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs px-3 py-1 rounded-full ${
                      enrollment.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {enrollment.status}
                  </span>

                  <Link
                    href={`/learning-paths/${enrollment.path.slug}`}
                    className="text-green-600 hover:text-green-700 font-medium text-sm"
                  >
                    Continue →
                  </Link>
                </div>

                {enrollment.completedAt && (
                  <p className="text-xs text-gray-500 mt-3">
                    Completed on {new Date(enrollment.completedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
