'use client';

import React from 'react';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { discussionsApi } from '@/lib/api/discussions';
import Link from 'next/link';

export default function CategoryPage({ params }: { params: Promise<{ categorySlug: string }> }) {
  const { categorySlug } = use(params);

  const { data: categoryData } = useQuery({
    queryKey: ['category', categorySlug],
    queryFn: () => discussionsApi.categories.getOne(categorySlug),
  });

  const { data: topicsData, isLoading } = useQuery({
    queryKey: ['category-topics', categorySlug],
    queryFn: () => discussionsApi.topics.getAll({ categorySlug }),
  });

  const category = categoryData?.data?.data;
  const topics = topicsData?.data?.data || [];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <nav className="text-sm mb-4">
            <Link href="/discussions" className="text-green-600 hover:underline">
              Forums
            </Link>
            {' > '}
            <span className="text-gray-600">{category?.name}</span>
          </nav>

          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{category?.icon || '💬'}</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{category?.name}</h1>
              {category?.description && (
                <p className="text-gray-600">{category.description}</p>
              )}
            </div>
          </div>

          <Link
            href="/discussions/new"
            className="inline-block bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700"
          >
            New Topic
          </Link>
        </div>

        {/* Topics List */}
        {isLoading ? (
          <div className="text-center py-12">Loading topics...</div>
        ) : topics.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">No topics yet. Be the first to start a discussion!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topics.map((topic: any) => (
              <Link
                key={topic.id}
                href={`/discussions/${categorySlug}/${topic.slug}`}
                className="block bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {topic.type === 'QUESTION' && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Question
                        </span>
                      )}
                      {topic.isPinned && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          📌 Pinned
                        </span>
                      )}
                      {topic.bestAnswerId && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          ✓ Answered
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      {topic.title}
                    </h2>

                    <p className="text-gray-600 mb-3 line-clamp-2">{topic.content}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        by {topic.user.firstName} {topic.user.lastName}
                      </span>
                      <span>•</span>
                      <span>{topic.replyCount} replies</span>
                      <span>•</span>
                      <span>{topic.viewCount} views</span>
                      <span>•</span>
                      <span>{topic.likeCount} likes</span>
                    </div>

                    {topic.tags && topic.tags.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {topic.tags.slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
