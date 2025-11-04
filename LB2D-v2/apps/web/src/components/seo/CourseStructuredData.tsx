import React from 'react';

interface CourseStructuredDataProps {
  course: {
    id: string;
    title: string;
    description: string;
    thumbnailUrl?: string;
    price: number;
    discountPrice?: number;
    averageRating?: number;
    totalRatings: number;
    level: string;
    supervisor: {
      firstName: string;
      lastName: string;
    };
  };
}

export function CourseStructuredData({ course }: CourseStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description,
    provider: {
      '@type': 'Organization',
      name: 'Learn Bangla to Deutsch',
      sameAs: process.env.NEXT_PUBLIC_APP_URL,
    },
    instructor: {
      '@type': 'Person',
      name: `${course.supervisor.firstName} ${course.supervisor.lastName}`,
    },
    ...(course.thumbnailUrl && {
      image: course.thumbnailUrl,
    }),
    offers: {
      '@type': 'Offer',
      price: course.discountPrice || course.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      ...(course.discountPrice && {
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }),
    },
    ...(course.averageRating && course.totalRatings > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: course.averageRating,
        ratingCount: course.totalRatings,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    educationalLevel: course.level,
    inLanguage: 'en',
    availableLanguage: ['en', 'de'],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
