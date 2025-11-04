import { apiClient } from './client';

export interface CreateReviewDto {
  courseId: string;
  rating: number;
  title?: string;
  content: string;
}

export interface UpdateReviewDto {
  rating?: number;
  title?: string;
  content?: string;
}

export interface ModerateReviewDto {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';
  moderationNote?: string;
}

export const reviewsApi = {
  // Create a review
  create: (data: CreateReviewDto) =>
    apiClient.post('/reviews', data),

  // Get all reviews
  getAll: (params?: { courseId?: string; page?: number; limit?: number }) =>
    apiClient.get('/reviews', { params }),

  // Get my reviews
  getMyReviews: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/reviews/my-reviews', { params }),

  // Get pending reviews (admin)
  getPending: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/reviews/pending', { params }),

  // Get single review
  getOne: (id: string) =>
    apiClient.get(`/reviews/${id}`),

  // Update review
  update: (id: string, data: UpdateReviewDto) =>
    apiClient.put(`/reviews/${id}`, data),

  // Delete review
  delete: (id: string) =>
    apiClient.delete(`/reviews/${id}`),

  // Mark review as helpful
  markHelpful: (id: string, isHelpful: boolean) =>
    apiClient.post(`/reviews/${id}/helpful`, { isHelpful }),

  // Moderate review (admin)
  moderate: (id: string, data: ModerateReviewDto) =>
    apiClient.patch(`/reviews/${id}/moderate`, data),

  // Get course reviews
  getCourseReviews: (courseId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get(`/courses/${courseId}/reviews`, { params }),

  // Get course review stats
  getCourseStats: (courseId: string) =>
    apiClient.get(`/courses/${courseId}/reviews/stats`),
};
