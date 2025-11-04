import { apiClient } from './client';

export const gamificationApi = {
  achievements: {
    getAll: () => apiClient.get('/achievements'),
    getMy: () => apiClient.get('/achievements/my-achievements'),
  },

  points: {
    getMy: () => apiClient.get('/points/my-points'),
    logActivity: (activityType: string, entityId: string) =>
      apiClient.post('/points/activity', { activityType, entityId }),
    getStreak: () => apiClient.get('/points/streak'),
  },

  leaderboard: {
    getAllTime: (params?: { page?: number; limit?: number }) =>
      apiClient.get('/leaderboard/all-time', { params }),
    getMonthly: (params?: { page?: number; limit?: number }) =>
      apiClient.get('/leaderboard/monthly', { params }),
    getWeekly: (params?: { page?: number; limit?: number }) =>
      apiClient.get('/leaderboard/weekly', { params }),
    getMyRank: (period?: string) =>
      apiClient.get('/leaderboard/my-rank', { params: { period } }),
  },
};
