'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discussionsApi } from '@/lib/api/discussions';
import { useNotification } from '@/hooks/useNotification';
import Link from 'next/link';

export default function AdminDiscussionsPage() {
  const queryClient = useQueryClient();
  const { showSuccess } = useNotification();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['all-topics'],
    queryFn: () => discussionsApi.topics.getAll({ limit: 50 }),
  });

  const pinMutation = useMutation({
    mutationFn: (id: string) => discussionsApi.topics.pin(id),
    onSuccess: () => {
      showSuccess('Topic pinned');
      refetch();
    },
  });

  const lockMutation = useMutation({
    mutationFn: (id: string) => discussionsApi.topics.lock(id),
    onSuccess: () => {
      showSuccess('Topic locked');
      refetch();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => discussionsApi.topics.delete(id),
    onSuccess: () => {
      showSuccess('Topic deleted');
      refetch();
    },
  });

  const topics = data?.data?.data || [];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Discussion Moderation</h1>

        {isLoading ? (
          <div className="text-center py-12">Loading discussions...</div>
        ) : topics.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">No topics to moderate</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Topic
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topics.map((topic: any) => (
                  <tr key={topic.id}>
                    <td className="px-6 py-4">
                      <Link
                        href={`/discussions/${topic.category.slug}/${topic.slug}`}
                        className="text-green-600 hover:underline font-medium"
                      >
                        {topic.title}
                      </Link>
                      <p className="text-sm text-gray-500">
                        by {topic.user.firstName} {topic.user.lastName}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">{topic.category.icon} {topic.category.name}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {topic.replyCount} replies • {topic.viewCount} views
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {topic.isPinned && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            Pinned
                          </span>
                        )}
                        {topic.isLocked && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                            Locked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {!topic.isPinned && (
                          <button
                            onClick={() => pinMutation.mutate(topic.id)}
                            className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
                          >
                            Pin
                          </button>
                        )}
                        {!topic.isLocked && (
                          <button
                            onClick={() => lockMutation.mutate(topic.id)}
                            className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700"
                          >
                            Lock
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Delete this topic?')) {
                              deleteMutation.mutate(topic.id);
                            }
                          }}
                          className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
