'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { learningPathsApi } from '@/lib/api/learning-paths';
import Link from 'next/link';

export default function LearningPathsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['learning-paths'],
    queryFn: () => learningPathsApi.getAll(),
  });

  const paths = data?.data?.data || [];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Learning Paths</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Structured learning journeys designed to take you from beginner to expert.
            Follow curated course sequences and achieve your goals faster.
          </p>
        </div>

        {/* Paths Grid */}
        {isLoading ? (
          <div className="text-center py-12">Loading learning paths...</div>
        ) : paths.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">No learning paths available yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {paths.map((path: any) => (
              <Link
                key={path.id}
                href={`/learning-paths/${path.slug}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                {/* Path Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    {path.isOfficial && (
                      <span className="inline-block text-xs bg-green-100 text-green-800 px-2 py-1 rounded mb-2">
                        Official Path
                      </span>
                    )}
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {path.title}
                    </h2>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-600 mb-4 line-clamp-3">{path.description}</p>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                    {path._count?.steps || 0} courses
                  </span>
                  {path.estimatedHours && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      {path.estimatedHours} hours
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    {path.enrollmentCount} enrolled
                  </span>
                </div>

                {/* Level Badge */}
                <div className="inline-block">
                  <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                    {path.level}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
