/**
 * SEO Metadata Utilities
 * Generate metadata for Next.js pages with SEO optimization
 */

import { Metadata } from 'next';
import { appConfig } from '@/config/app.config';
import { SEOProps } from '@/types';

/**
 * Generate metadata for a page
 */
export function generateMetadata(seo: SEOProps): Metadata {
  const {
    title,
    description,
    keywords = [],
    canonical,
    ogImage,
    ogType = 'website',
    twitterCard = 'summary_large_image',
    noindex = false,
    nofollow = false,
  } = seo;

  const fullTitle = title.includes('|') ? title : `${title} | ${appConfig.app.name}`;
  const url = canonical || appConfig.app.siteUrl;
  const image = ogImage || `${appConfig.app.siteUrl}/images/og-image.jpg`;

  const allKeywords = [...new Set([...appConfig.seo.defaultKeywords, ...keywords])];

  const metadata: Metadata = {
    title: fullTitle,
    description,
    keywords: allKeywords.join(', '),
    authors: [{ name: appConfig.app.name }],
    creator: appConfig.app.name,
    publisher: appConfig.app.name,
    robots: {
      index: !noindex,
      follow: !nofollow,
      googleBot: {
        index: !noindex,
        follow: !nofollow,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: ogType,
      locale: 'en_US',
      alternateLocale: ['de_DE', 'bn_BD'],
      url,
      title: fullTitle,
      description,
      siteName: appConfig.app.name,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: twitterCard,
      title: fullTitle,
      description,
      images: [image],
      creator: appConfig.seo.twitterHandle,
    },
    alternates: {
      canonical: url,
    },
  };

  // Only add verification if values exist
  if (process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || process.env.NEXT_PUBLIC_YANDEX_VERIFICATION) {
    metadata.verification = {
      ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }),
      ...(process.env.NEXT_PUBLIC_YANDEX_VERIFICATION && { yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION }),
    };
  }

  return metadata;
}

/**
 * Generate JSON-LD structured data
 */
export function generateJsonLd(type: string, data: Record<string, any>) {
  const baseData = {
    '@context': 'https://schema.org',
    '@type': type,
  };

  return {
    ...baseData,
    ...data,
  };
}

/**
 * Generate Organization JSON-LD
 */
export function generateOrganizationJsonLd() {
  return generateJsonLd('Organization', {
    name: appConfig.app.name,
    description: appConfig.app.description,
    url: appConfig.app.siteUrl,
    logo: `${appConfig.app.siteUrl}/images/logo.png`,
    contactPoint: {
      '@type': 'ContactPoint',
      email: appConfig.app.contactEmail,
      contactType: 'customer service',
    },
    sameAs: Object.values(appConfig.social),
  });
}

/**
 * Generate Course JSON-LD
 */
export function generateCourseJsonLd(course: {
  name: string;
  description: string;
  provider: string;
  url: string;
  image?: string;
  price?: number;
  currency?: string;
}) {
  return generateJsonLd('Course', {
    name: course.name,
    description: course.description,
    provider: {
      '@type': 'Organization',
      name: course.provider,
      sameAs: appConfig.app.siteUrl,
    },
    url: course.url,
    image: course.image,
    offers: course.price
      ? {
          '@type': 'Offer',
          price: course.price,
          priceCurrency: course.currency || 'EUR',
        }
      : undefined,
  });
}

/**
 * Generate FAQ JSON-LD
 */
export function generateFaqJsonLd(faqs: Array<{ question: string; answer: string }>) {
  return generateJsonLd('FAQPage', {
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  });
}

/**
 * Generate Breadcrumb JSON-LD
 */
export function generateBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>
) {
  return generateJsonLd('BreadcrumbList', {
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  });
}

/**
 * Generate Article JSON-LD
 */
export function generateArticleJsonLd(article: {
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author: string;
}) {
  return generateJsonLd('Article', {
    headline: article.headline,
    description: article.description,
    image: article.image,
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    author: {
      '@type': 'Person',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: appConfig.app.name,
      logo: {
        '@type': 'ImageObject',
        url: `${appConfig.app.siteUrl}/images/logo.png`,
      },
    },
  });
}
