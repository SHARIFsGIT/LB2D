import { apiClient } from './client';

export const learningPathsApi = {
  getAll: (params?: { page?: number; limit?: number; level?: string; isOfficial?: boolean }) =>
    apiClient.get('/learning-paths', { params }),

  getOne: (slug: string) =>
    apiClient.get(`/learning-paths/${slug}`),

  getMyPaths: () =>
    apiClient.get('/learning-paths/my-paths'),

  getStats: (id: string) =>
    apiClient.get(`/learning-paths/${id}/stats`),

  enroll: (id: string) =>
    apiClient.post(`/learning-paths/${id}/enroll`),

  updateProgress: (enrollmentId: string, data: { currentStepIndex: number; progress: number }) =>
    apiClient.put(`/learning-paths/enrollments/${enrollmentId}/progress`, data),

  create: (data: any) =>
    apiClient.post('/learning-paths', data),

  addStep: (pathId: string, data: any) =>
    apiClient.post(`/learning-paths/${pathId}/steps`, data),

  removeStep: (pathId: string, stepId: string) =>
    apiClient.delete(`/learning-paths/${pathId}/steps/${stepId}`),
};
