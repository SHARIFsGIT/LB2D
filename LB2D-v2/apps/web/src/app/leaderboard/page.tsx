'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { gamificationApi } from '@/lib/api/gamification';

export default function LeaderboardPage() {
  const [period, setPeriod] = React.useState<'ALL_TIME' | 'MONTHLY' | 'WEEKLY'>('ALL_TIME');

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => {
      if (period === 'ALL_TIME') return gamificationApi.leaderboard.getAllTime();
      if (period === 'MONTHLY') return gamificationApi.leaderboard.getMonthly();
      return gamificationApi.leaderboard.getWeekly();
    },
  });

  const leaders = data?.data?.data || [];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Leaderboard</h1>
          <p className="text-lg text-gray-600">
            See how you rank against other learners
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex justify-center gap-2 mb-8">
          {(['ALL_TIME', 'MONTHLY', 'WEEKLY'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                period === p
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {p === 'ALL_TIME' ? 'All Time' : p === 'MONTHLY' ? 'This Month' : 'This Week'}
            </button>
          ))}
        </div>

        {/* Leaderboard Table */}
        {isLoading ? (
          <div className="text-center py-12">Loading leaderboard...</div>
        ) : leaders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">No rankings yet for this period.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Courses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leaders.map((entry: any, index: number) => (
                  <tr key={entry.id} className={index < 3 ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {index < 3 ? (
                          <span className="text-2xl">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </span>
                        ) : (
                          <span className="text-lg font-semibold text-gray-700">
                            #{entry.rank}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold">
                          {entry.user.firstName[0]}{entry.user.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {entry.user.firstName} {entry.user.lastName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-bold text-green-600">
                        {entry.points.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {entry.coursesCompleted}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {entry.hoursLearned.toFixed(1)}h
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
