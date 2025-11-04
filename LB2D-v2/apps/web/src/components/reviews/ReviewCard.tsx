'use client';

import React from 'react';
import { StarRating } from './StarRating';
import { reviewsApi } from '@/lib/api/reviews';
import { useNotification } from '@/hooks/useNotification';

interface Review {
  id: string;
  rating: number;
  title?: string;
  content: string;
  createdAt: string;
  helpfulCount: number;
  notHelpfulCount: number;
  isVerified: boolean;
  user: {
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
}

interface ReviewCardProps {
  review: Review;
  onHelpfulVote?: () => void;
}

export function ReviewCard({ review, onHelpfulVote }: ReviewCardProps) {
  const { showSuccess, showError } = useNotification();
  const [isVoting, setIsVoting] = React.useState(false);

  const handleHelpful = async (isHelpful: boolean) => {
    setIsVoting(true);
    try {
      await reviewsApi.markHelpful(review.id, isHelpful);
      showSuccess('Thank you for your feedback!');
      onHelpfulVote?.();
    } catch (error) {
      showError('Failed to record vote');
    } finally {
      setIsVoting(false);
    }
  };

  const totalVotes = review.helpfulCount + review.notHelpfulCount;
  const helpfulPercentage = totalVotes > 0
    ? Math.round((review.helpfulCount / totalVotes) * 100)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold">
            {review.user.firstName[0]}{review.user.lastName[0]}
          </div>

          {/* User Info */}
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">
                {review.user.firstName} {review.user.lastName}
              </p>
              {review.isVerified && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                  Verified
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {new Date(review.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Rating */}
        <StarRating rating={review.rating} readonly size="sm" />
      </div>

      {/* Title */}
      {review.title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {review.title}
        </h3>
      )}

      {/* Content */}
      <p className="text-gray-700 mb-4 whitespace-pre-wrap">
        {review.content}
      </p>

      {/* Helpful Voting */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
        <p className="text-sm text-gray-600">Was this review helpful?</p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleHelpful(true)}
            disabled={isVoting}
            className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            👍 Yes ({review.helpfulCount})
          </button>

          <button
            onClick={() => handleHelpful(false)}
            disabled={isVoting}
            className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            👎 No ({review.notHelpfulCount})
          </button>
        </div>

        {totalVotes > 0 && (
          <p className="text-sm text-gray-500 ml-auto">
            {helpfulPercentage}% found this helpful
          </p>
        )}
      </div>
    </div>
  );
}
