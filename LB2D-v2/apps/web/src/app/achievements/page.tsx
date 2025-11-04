'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { gamificationApi } from '@/lib/api/gamification';
import { useAuth } from '@/hooks/useAuth';

export default function AchievementsPage() {
  const { user } = useAuth();

  const { data: achievementsData, isLoading } = useQuery({
    queryKey: ['my-achievements'],
    queryFn: () => gamificationApi.achievements.getMy(),
    enabled: !!user,
  });

  const achievements = achievementsData?.data?.data?.achievements || [];
  const summary = achievementsData?.data?.data?.summary;

  const rarityColors = {
    COMMON: 'bg-gray-100 text-gray-800 border-gray-300',
    UNCOMMON: 'bg-green-100 text-green-800 border-green-300',
    RARE: 'bg-blue-100 text-blue-800 border-blue-300',
    EPIC: 'bg-purple-100 text-purple-800 border-purple-300',
    LEGENDARY: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Achievements</h1>
          <p className="text-lg text-gray-600">
            Track your progress and unlock badges as you learn
          </p>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-3xl font-bold text-green-600">{summary.completed}</p>
              <p className="text-sm text-gray-600">Unlocked</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-3xl font-bold text-gray-900">{summary.total}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-3xl font-bold text-blue-600">{summary.totalPoints}</p>
              <p className="text-sm text-gray-600">Points Earned</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-3xl font-bold text-purple-600">{summary.completionRate}%</p>
              <p className="text-sm text-gray-600">Completion</p>
            </div>
          </div>
        )}

        {/* Achievements Grid */}
        {isLoading ? (
          <div className="text-center py-12">Loading achievements...</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievements.map((item: any) => (
              <div
                key={item.id}
                className={`bg-white rounded-lg shadow-sm border-2 p-6 ${
                  item.isCompleted ? rarityColors[item.achievement.rarity as keyof typeof rarityColors] : 'border-gray-200 opacity-60'
                }`}
              >
                {/* Icon */}
                <div className="text-5xl mb-4 text-center">{item.achievement.icon}</div>

                {/* Name */}
                <h3 className="text-lg font-bold text-center mb-2">
                  {item.achievement.name}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-600 text-center mb-4">
                  {item.achievement.description}
                </p>

                {/* Progress */}
                {!item.isCompleted && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>
                        {item.progress}/{item.achievement.requirement}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${(item.progress / item.achievement.requirement) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Points & Rarity */}
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-blue-600">
                    {item.achievement.points} points
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                    {item.achievement.rarity}
                  </span>
                </div>

                {item.isCompleted && item.completedAt && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Unlocked {new Date(item.completedAt).toLocaleDateString()}
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
