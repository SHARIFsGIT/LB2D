'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';

export default function ActivityFeedPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: () => apiClient.get('/social/activity/feed'),
    enabled: !!user,
  });

  const activities = data?.data?.data || [];

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      COURSE_ENROLLED: '📚',
      COURSE_COMPLETED: '🎓',
      VIDEO_WATCHED: '🎥',
      QUIZ_COMPLETED: '✅',
      ACHIEVEMENT_EARNED: '🏆',
      REVIEW_POSTED: '⭐',
      DISCUSSION_STARTED: '💬',
      ANSWER_POSTED: '💡',
      LEVEL_UP: '⬆️',
    };
    return icons[type] || '📌';
  };

  const getActivityText = (activity: any) => {
    const name = `${activity.user.firstName} ${activity.user.lastName}`;

    switch (activity.activityType) {
      case 'COURSE_ENROLLED':
        return `${name} enrolled in a course`;
      case 'COURSE_COMPLETED':
        return `${name} completed a course`;
      case 'VIDEO_WATCHED':
        return `${name} watched a video`;
      case 'ACHIEVEMENT_EARNED':
        return `${name} earned an achievement`;
      case 'REVIEW_POSTED':
        return `${name} posted a review`;
      case 'DISCUSSION_STARTED':
        return `${name} started a discussion`;
      case 'LEVEL_UP':
        return `${name} leveled up!`;
      default:
        return `${name} performed an action`;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Activity Feed</h1>
          <p className="text-gray-600">Please log in to view your activity feed</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Activity Feed</h1>

        {isLoading ? (
          <div className="text-center py-12">Loading activities...</div>
        ) : activities.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">No activities yet. Follow users to see their activity!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity: any) => (
              <div
                key={activity.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start gap-4">
                  {/* Activity Icon */}
                  <div className="text-3xl">{getActivityIcon(activity.activityType)}</div>

                  <div className="flex-1">
                    {/* User */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-semibold">
                        {activity.user.firstName[0]}{activity.user.lastName[0]}
                      </div>
                      <span className="font-medium text-gray-900">
                        {activity.user.firstName} {activity.user.lastName}
                      </span>
                    </div>

                    {/* Activity Text */}
                    <p className="text-gray-700 mb-1">{getActivityText(activity)}</p>

                    {/* Timestamp */}
                    <p className="text-sm text-gray-500">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
