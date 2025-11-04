'use client';

import React from 'react';
import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';

export default function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { showSuccess } = useNotification();

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: () => apiClient.get(`/users/${userId}/public-profile`),
  });

  const { data: followStatusData } = useQuery({
    queryKey: ['follow-status', userId],
    queryFn: () => apiClient.get(`/social/follow/${userId}/is-following`),
    enabled: !!currentUser && currentUser.id !== userId,
  });

  const followMutation = useMutation({
    mutationFn: () => apiClient.post(`/social/follow/${userId}`),
    onSuccess: () => {
      showSuccess('Now following user');
      queryClient.invalidateQueries({ queryKey: ['follow-status', userId] });
      queryClient.invalidateQueries({ queryKey: ['public-profile', userId] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => apiClient.delete(`/social/follow/${userId}`),
    onSuccess: () => {
      showSuccess('Unfollowed user');
      queryClient.invalidateQueries({ queryKey: ['follow-status', userId] });
      queryClient.invalidateQueries({ queryKey: ['public-profile', userId] });
    },
  });

  const profile = profileData?.data?.data;
  const isFollowing = followStatusData?.data?.data?.isFollowing;

  if (isLoading || !profile) {
    return <div className="min-h-screen bg-gray-50 py-12 px-4">Loading profile...</div>;
  }

  const { user: profileUser, stats } = profile;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-green-600 flex items-center justify-center text-white text-3xl font-bold">
                {profileUser.firstName[0]}{profileUser.lastName[0]}
              </div>

              {/* Info */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {profileUser.firstName} {profileUser.lastName}
                </h1>
                <p className="text-gray-600 mb-2">
                  {profileUser.role.charAt(0) + profileUser.role.slice(1).toLowerCase()}
                </p>
                <p className="text-sm text-gray-500">
                  Member since {new Date(profileUser.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Follow Button */}
            {currentUser && currentUser.id !== userId && (
              <button
                onClick={() =>
                  isFollowing ? unfollowMutation.mutate() : followMutation.mutate()
                }
                disabled={followMutation.isPending || unfollowMutation.isPending}
                className={`px-6 py-2 rounded-lg font-medium ${
                  isFollowing
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.coursesCompleted}</p>
            <p className="text-sm text-gray-600">Courses Completed</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.reviewsWritten}</p>
            <p className="text-sm text-gray-600">Reviews Written</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-3xl font-bold text-purple-600">{stats.topicsCreated}</p>
            <p className="text-sm text-gray-600">Topics Created</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-3xl font-bold text-yellow-600">{stats.followers}</p>
            <p className="text-sm text-gray-600">Followers</p>
          </div>
        </div>

        {/* Activity Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          <p className="text-gray-500">Activity feed coming soon...</p>
        </div>
      </div>
    </div>
  );
}
