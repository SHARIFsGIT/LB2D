'use client';

import React from 'react';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reviewsApi } from '@/lib/api/reviews';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { StarRating } from '@/components/reviews/StarRating';
import { useAuth } from '@/hooks/useAuth';

export default function CourseReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = use(params);
  const { user } = useAuth();
  const [showReviewForm, setShowReviewForm] = React.useState(false);

  // Fetch reviews
  const { data: reviewsData, isLoading, refetch } = useQuery({
    queryKey: ['course-reviews', courseId],
    queryFn: () => reviewsApi.getCourseReviews(courseId),
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['course-review-stats', courseId],
    queryFn: () => reviewsApi.getCourseStats(courseId),
  });

  const reviews = reviewsData?.data?.data || [];
  const stats = statsData?.data?.data;

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 py-12 px-4">Loading reviews...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Course Reviews</h1>
          <p className="text-gray-600">Read what students are saying about this course</p>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900">
                  {stats.averageRating?.toFixed(1) || 'N/A'}
                </div>
                <StarRating rating={stats.averageRating || 0} readonly size="sm" />
                <p className="text-sm text-gray-600 mt-1">
                  {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}
                </p>
              </div>

              {/* Rating Distribution */}
              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.distribution?.[star] || 0;
                  const percentage = stats.totalReviews > 0
                    ? (count / stats.totalReviews) * 100
                    : 0;

                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-sm w-12">{star} star</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-12">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Write Review Button */}
        {user && !showReviewForm && (
          <button
            onClick={() => setShowReviewForm(true)}
            className="mb-6 bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition-colors"
          >
            Write a Review
          </button>
        )}

        {/* Review Form */}
        {showReviewForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Write Your Review</h2>
            <ReviewForm
              courseId={courseId}
              onSuccess={() => {
                setShowReviewForm(false);
                refetch();
              }}
            />
          </div>
        )}

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No reviews yet. Be the first to review this course!</p>
            </div>
          ) : (
            reviews.map((review: any) => (
              <ReviewCard key={review.id} review={review} onHelpfulVote={() => refetch()} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
