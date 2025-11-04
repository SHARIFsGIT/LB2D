import React from 'react';

interface ReviewStructuredDataProps {
  reviews: Array<{
    id: string;
    rating: number;
    title?: string;
    content: string;
    createdAt: string;
    user: {
      firstName: string;
      lastName: string;
    };
  }>;
  course: {
    title: string;
    averageRating?: number;
    totalRatings: number;
  };
}

export function ReviewStructuredData({ reviews, course }: ReviewStructuredDataProps) {
  if (reviews.length === 0) return null;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: course.title,
    aggregateRating: course.averageRating && course.totalRatings > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: course.averageRating,
      reviewCount: course.totalRatings,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
    review: reviews.slice(0, 10).map(review => ({
      '@type': 'Review',
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
      author: {
        '@type': 'Person',
        name: `${review.user.firstName} ${review.user.lastName}`,
      },
      datePublished: review.createdAt,
      reviewBody: review.content,
      ...(review.title && { headline: review.title }),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
