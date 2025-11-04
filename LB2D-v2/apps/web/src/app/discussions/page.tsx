'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { discussionsApi } from '@/lib/api/discussions';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { SearchBar } from '@/components/common/SearchBar';
import { Badge } from '@/components/common/Badge';
import { Tooltip } from '@/components/common/Tooltip';

export default function DiscussionsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'questions' | 'discussions'>('all');

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['discussion-categories'],
    queryFn: () => discussionsApi.categories.getAll(),
  });

  const { data: topicsData, isLoading: topicsLoading } = useQuery({
    queryKey: ['recent-topics', searchQuery, selectedFilter],
    queryFn: () =>
      discussionsApi.topics.getAll({
        limit: 20,
        search: searchQuery || undefined,
        type: selectedFilter === 'all' ? undefined : (selectedFilter === 'questions' ? 'QUESTION' : 'DISCUSSION'),
      }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['discussion-stats'],
    queryFn: () => discussionsApi.stats(),
  });

  const categories = categoriesData?.data?.data || [];
  const topics = topicsData?.data?.data || [];
  const stats = statsData?.data?.data;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Hero Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <div className="inline-block p-4 bg-white/20 rounded-2xl backdrop-blur-sm mb-6">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h1 className="text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100">
                Discussion Forums
              </h1>
              <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
                Connect with fellow learners, ask questions, and share your knowledge with the community
              </p>

              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-3xl font-bold">{stats.totalTopics?.toLocaleString() || 0}</p>
                    <p className="text-sm text-blue-100">Topics</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-3xl font-bold">{stats.totalPosts?.toLocaleString() || 0}</p>
                    <p className="text-sm text-blue-100">Posts</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-3xl font-bold">{stats.totalUsers?.toLocaleString() || 0}</p>
                    <p className="text-sm text-blue-100">Members</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-3xl font-bold">{stats.topicsToday?.toLocaleString() || 0}</p>
                    <p className="text-sm text-blue-100">Today</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-12">
          {/* Action Bar */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Search */}
              <div className="flex-1">
                <SearchBar
                  onSearch={setSearchQuery}
                  placeholder="Search discussions..."
                  className="w-full"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setSelectedFilter('all')}
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    selectedFilter === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedFilter('questions')}
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    selectedFilter === 'questions'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Questions
                </button>
                <button
                  onClick={() => setSelectedFilter('discussions')}
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    selectedFilter === 'discussions'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Discussions
                </button>
              </div>

              {/* Create Button */}
              <Link
                href="/discussions/new"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Start Discussion
              </Link>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Sidebar - Categories */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sticky top-4">
                <div className="flex items-center gap-2 mb-6">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <h2 className="text-xl font-bold text-gray-900">Categories</h2>
                </div>

                {categoriesLoading ? (
                  <LoadingSkeleton variant="list" count={5} />
                ) : categories.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No categories yet</p>
                ) : (
                  <div className="space-y-2">
                    {categories.map((category: any) => (
                      <Link
                        key={category.id}
                        href={`/discussions/${category.slug}`}
                        className="block p-4 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all border border-transparent hover:border-blue-200 group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-3xl group-hover:scale-110 transition-transform">
                            {category.icon || '💬'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                              {category.name}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {category._count?.topics || 0} topics
                            </p>
                          </div>
                          <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Main - Topics List */}
            <div className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedFilter === 'questions' ? 'Questions' : selectedFilter === 'discussions' ? 'Discussions' : 'Recent Activity'}
                </h2>
                {topics.length > 0 && (
                  <p className="text-sm text-gray-500">{topics.length} results</p>
                )}
              </div>

              {topicsLoading ? (
                <LoadingSkeleton variant="list" count={6} />
              ) : topics.length === 0 ? (
                <EmptyState
                  icon={searchQuery ? '🔍' : '💬'}
                  title={searchQuery ? 'No results found' : 'No discussions yet'}
                  description={
                    searchQuery
                      ? 'Try adjusting your search terms or filters'
                      : 'Be the first to start a discussion!'
                  }
                  action={{
                    label: 'Start Discussion',
                    href: '/discussions/new',
                  }}
                />
              ) : (
                <div className="space-y-4">
                  {topics.map((topic: any) => (
                    <Link
                      key={topic.id}
                      href={`/discussions/${topic.category.slug}/${topic.slug}`}
                      className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        {/* Author Avatar */}
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {topic.user.firstName[0]}{topic.user.lastName[0]}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Badges */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {topic.type === 'QUESTION' && (
                              <Badge variant="info" size="sm">❓ Question</Badge>
                            )}
                            {topic.isPinned && (
                              <Badge variant="warning" size="sm">📌 Pinned</Badge>
                            )}
                            {topic.isLocked && (
                              <Badge variant="secondary" size="sm">🔒 Locked</Badge>
                            )}
                            {topic.bestAnswerId && (
                              <Badge variant="success" size="sm">✅ Solved</Badge>
                            )}
                            <Badge variant="secondary" size="sm">
                              {topic.category.name}
                            </Badge>
                          </div>

                          {/* Title */}
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                            {topic.title}
                          </h3>

                          {/* Meta */}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {topic.user.firstName} {topic.user.lastName}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              {topic.replyCount || 0} replies
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              {topic.viewCount || 0} views
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {new Date(topic.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Tags */}
                          {topic.tags && topic.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {topic.tags.map((tag: string) => (
                                <span
                                  key={tag}
                                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md hover:bg-gray-200 transition-colors"
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
        </div>
      </div>
    </ErrorBoundary>
  );
}
