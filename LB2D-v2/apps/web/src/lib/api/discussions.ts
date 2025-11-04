import { apiClient } from './client';

export interface CreateTopicDto {
  categorySlug: string;
  courseId?: string;
  title: string;
  content: string;
  type: 'DISCUSSION' | 'QUESTION' | 'ANNOUNCEMENT' | 'POLL';
  tags?: string[];
  metaDescription?: string;
}

export interface CreatePostDto {
  content: string;
  parentId?: string;
}

export const discussionsApi = {
  // Categories
  categories: {
    getAll: () => apiClient.get('/discussions/categories'),
    getOne: (slug: string) => apiClient.get(`/discussions/categories/${slug}`),
  },

  // Topics
  topics: {
    create: (data: CreateTopicDto) => apiClient.post('/discussions/topics', data),
    getAll: (params?: {
      categorySlug?: string;
      courseId?: string;
      page?: number;
      limit?: number;
      search?: string;
      type?: 'DISCUSSION' | 'QUESTION' | 'ANNOUNCEMENT' | 'POLL';
    }) => apiClient.get('/discussions/topics', { params }),
    getOne: (slug: string) => apiClient.get(`/discussions/topics/${slug}`),
    update: (id: string, data: Partial<CreateTopicDto>) =>
      apiClient.put(`/discussions/topics/${id}`, data),
    delete: (id: string) => apiClient.delete(`/discussions/topics/${id}`),
    pin: (id: string) => apiClient.patch(`/discussions/topics/${id}/pin`),
    lock: (id: string) => apiClient.patch(`/discussions/topics/${id}/lock`),
    like: (id: string) => apiClient.post(`/discussions/topics/${id}/like`),
    markBestAnswer: (topicId: string, postId: string) =>
      apiClient.post(`/discussions/topics/${topicId}/best-answer`, { postId }),
    search: (query: string, params?: { page?: number; limit?: number }) =>
      apiClient.get('/discussions/topics/search', { params: { q: query, ...params } }),
  },

  // Posts
  posts: {
    create: (topicId: string, data: CreatePostDto) =>
      apiClient.post(`/discussions/topics/${topicId}/posts`, data),
    getAll: (topicId: string, params?: { page?: number; limit?: number }) =>
      apiClient.get(`/discussions/topics/${topicId}/posts`, { params }),
    delete: (id: string) => apiClient.delete(`/discussions/posts/${id}`),
    like: (id: string) => apiClient.post(`/discussions/posts/${id}/like`),
  },

  // Stats
  stats: () => apiClient.get('/discussions/stats'),
};
