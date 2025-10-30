import { createApi } from '@reduxjs/toolkit/query/react';
import axios from 'axios';

const axiosBaseQuery = ({ baseUrl }: { baseUrl: string }) => async ({
  url,
  method,
  data,
  params,
}: any) => {
  try {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;

    const result = await axios({
      url: baseUrl + url,
      method,
      data,
      params,
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
      withCredentials: true,
    });

    return { data: result.data };
  } catch (axiosError: any) {
    const err = axiosError;
    return {
      error: {
        status: err.response?.status,
        data: err.response?.data || err.message,
      },
    };
  }
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery({ baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api' }),
  tagTypes: ['User', 'Test', 'Question', 'Stats', 'Admin'],
  endpoints: (builder) => ({
    // ============= AUTH ENDPOINTS =============
    /**
     * @param credentials
     */
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        data: credentials,
      }),
    }),

    /**
     * @param userData
     */
    register: builder.mutation({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        data: userData,
      }),
    }),

    logout: builder.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),

    verifyEmail: builder.query({
      query: (token) => ({
        url: '/auth/verify-email',
        method: 'GET',
        params: { token },
      }),
    }),

    requestOTP: builder.mutation({
      query: (email) => ({
        url: '/auth/request-otp',
        method: 'POST',
        data: { email },
      }),
    }),

    verifyOTP: builder.mutation({
      query: (data) => ({
        url: '/auth/verify-otp',
        method: 'POST',
        data,
      }),
    }),

    validateToken: builder.query({
      query: () => ({
        url: '/auth/validate',
        method: 'GET',
      }),
    }),

    // ============= ADMIN ENDPOINTS =============
    /**
     * @param params - page, limit, role, verified
     */
    getAllUsers: builder.query({
      query: (params) => ({
        url: '/admin/users',
        method: 'GET',
        params,
      }),
      providesTags: ['User'],
    }),

    getUser: builder.query({
      query: (userId) => ({
        url: `/admin/users/${userId}`,
        method: 'GET',
      }),
      providesTags: ['User'],
    }),

    updateUser: builder.mutation({
      query: ({ userId, ...data }) => ({
        url: `/admin/users/${userId}`,
        method: 'PUT',
        data,
      }),
      invalidatesTags: ['User', 'Stats'],
    }),

    deleteUser: builder.mutation({
      query: (userId) => ({
        url: `/admin/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User', 'Stats'],
    }),

    getUserStats: builder.query({
      query: () => ({
        url: '/admin/stats',
        method: 'GET',
      }),
      providesTags: ['Stats'],
    }),

    // ============= TEST ENDPOINTS =============
    startTest: builder.mutation({
      query: (step) => ({
        url: '/tests/start',
        method: 'POST',
        data: { step },
      }),
      invalidatesTags: ['Test'],
    }),

    submitTest: builder.mutation({
      query: (data) => ({
        url: '/tests/submit',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Test'],
    }),

    getTestResults: builder.query({
      query: (testId) => ({
        url: `/tests/results/${testId}`,
        method: 'GET',
      }),
      providesTags: ['Test'],
    }),

    getTestHistory: builder.query({
      query: () => ({
        url: '/tests/history',
        method: 'GET',
      }),
      providesTags: ['Test'],
    }),

    getUserRankings: builder.query({
      query: () => ({
        url: '/tests/rankings',
        method: 'GET',
      }),
      providesTags: ['Test'],
    }),

    downloadCertificate: builder.query({
      query: (testId) => ({
        url: `/tests/certificate/${testId}`,
        method: 'GET',
      }),
    }),

    getTestAnalytics: builder.query({
      query: (params) => ({
        url: '/admin/analytics',
        method: 'GET',
        params,
      }),
      providesTags: ['Admin'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useVerifyEmailQuery,
  useRequestOTPMutation,
  useVerifyOTPMutation,
  useValidateTokenQuery,

  // Admin hooks
  useGetAllUsersQuery,
  useGetUserQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetUserStatsQuery,

  // Test hooks
  useStartTestMutation,
  useSubmitTestMutation,
  useGetTestResultsQuery,
  useGetTestHistoryQuery,
  useGetUserRankingsQuery,
  useDownloadCertificateQuery,
  useGetTestAnalyticsQuery,
} = api;
