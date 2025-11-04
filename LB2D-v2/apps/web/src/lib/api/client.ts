// Re-export apiClient and all individual API modules from the main api-client module
export {
  apiClient,
  api,
  authApi,
  userApi,
  courseApi,
  videoApi,
  resourceApi,
  quizApi,
  paymentApi,
  certificateApi,
  notificationApi,
  analyticsApi
} from '../api-client';
