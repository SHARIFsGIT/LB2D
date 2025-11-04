'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function BookmarksPage() {
  const { user } = useAuth();
  const [selectedCollection, setSelectedCollection] = React.useState<string | null>(null);

  const { data: bookmarksData, isLoading } = useQuery({
    queryKey: ['bookmarks', selectedCollection],
    queryFn: () =>
      apiClient.get('/bookmarks', {
        params: selectedCollection ? { collection: selectedCollection } : undefined,
      }),
    enabled: !!user,
  });

  const { data: collectionsData } = useQuery({
    queryKey: ['bookmark-collections'],
    queryFn: () => apiClient.get('/bookmarks/collections'),
    enabled: !!user,
  });

  const bookmarks = bookmarksData?.data?.data || [];
  const collections = collectionsData?.data?.data || [];

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Bookmarks</h1>
          <p className="text-gray-600">Please log in to view your bookmarks</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookmarks</h1>
          <p className="text-gray-600">Quick access to your saved content</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Collections */}
          <div className="col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-4">Collections</h2>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCollection(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    !selectedCollection
                      ? 'bg-green-100 text-green-800'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  All Bookmarks
                </button>
                {collections.map((collection: string) => (
                  <button
                    key={collection}
                    onClick={() => setSelectedCollection(collection)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedCollection === collection
                        ? 'bg-green-100 text-green-800'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {collection}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            {isLoading ? (
              <div className="text-center py-12">Loading bookmarks...</div>
            ) : bookmarks.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-500">No bookmarks yet. Start saving your favorite content!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookmarks.map((bookmark: any) => (
                  <div
                    key={bookmark.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                  >
                    {/* Course Bookmark */}
                    {bookmark.course && (
                      <Link href={`/courses/${bookmark.course.id}`}>
                        <h3 className="text-lg font-semibold text-gray-900 hover:text-green-600">
                          📚 {bookmark.course.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">{bookmark.course.level}</p>
                      </Link>
                    )}

                    {/* Video Bookmark */}
                    {bookmark.video && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          🎥 {bookmark.video.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {Math.floor(bookmark.video.duration / 60)} minutes
                        </p>
                      </div>
                    )}

                    {/* Topic Bookmark */}
                    {bookmark.topic && (
                      <Link href={`/discussions/category/${bookmark.topic.slug}`}>
                        <h3 className="text-lg font-semibold text-gray-900 hover:text-green-600">
                          💬 {bookmark.topic.title}
                        </h3>
                      </Link>
                    )}

                    {bookmark.note && (
                      <p className="text-gray-600 mt-2 italic">&ldquo;{bookmark.note}&rdquo;</p>
                    )}

                    {bookmark.collection && (
                      <p className="text-xs text-gray-500 mt-2">
                        Collection: {bookmark.collection}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
