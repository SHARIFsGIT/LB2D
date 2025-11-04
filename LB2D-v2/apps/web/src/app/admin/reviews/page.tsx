'use client';

import Link from "next/link";
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '@/lib/api/reviews';
import { StarRating } from '@/components/reviews/StarRating';
import { useNotification } from '@/hooks/useNotification';

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pending-reviews'],
    queryFn: () => reviewsApi.getPending(),
  });

  const moderateMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      reviewsApi.moderate(id, { status: status as any, moderationNote: note }),
    onSuccess: () => {
      showSuccess('Review moderated successfully');
      refetch();
    },
    onError: () => {
      showError('Moderation failed');
    },
  });

  const reviews = data?.data?.data || [];

  const handleModerate = (id: string, status: 'APPROVED' | 'REJECTED') => {
    const note = status === 'REJECTED' ? (prompt('Rejection reason:') || undefined) : undefined;
    if (status === 'REJECTED' && !note) return;

    moderateMutation.mutate({ id, status, note });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Review Moderation</h1>

        {isLoading ? (
          <div className="text-center py-12">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">No pending reviews. All caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review: any) => (
              <div key={review.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <StarRating rating={review.rating} readonly size="sm" />
                      {review.isVerified && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Verified Buyer
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      by {review.user.firstName} {review.user.lastName} •{' '}
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <Link href={`/courses/${review.course.id}`} className="text-sm text-green-600 hover:underline mb-2 block">
                  Course: {review.course.title}
                </Link>

                {review.title && (
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{review.title}</h3>
                )}

                <p className="text-gray-700 mb-4 whitespace-pre-wrap">{review.content}</p>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => handleModerate(review.id, 'APPROVED')}
                    disabled={moderateMutation.isPending}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleModerate(review.id, 'REJECTED')}
                    disabled={moderateMutation.isPending}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
