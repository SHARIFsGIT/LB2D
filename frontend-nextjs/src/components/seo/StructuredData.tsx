/**
 * Structured Data (JSON-LD) Component
 * Enterprise-grade Schema.org structured data implementation
 * Optimizes for Google Rich Results and search visibility
 */

import React from 'react';
import Script from 'next/script';

interface StructuredDataProps {
  data: Record<string, any>;
  type?: 'organization' | 'website' | 'course' | 'faq' | 'breadcrumb' | 'article' | 'custom';
}

/**
 * Generic Structured Data Component
 * Renders JSON-LD script for SEO
 */
export function StructuredData({ data, type = 'custom' }: StructuredDataProps) {
  const jsonLd = JSON.stringify(data, null, process.env.NODE_ENV === 'development' ? 2 : 0);

  return (
    <Script
      id={`structured-data-${type}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd }}
      strategy="beforeInteractive"
    />
  );
}

/**
 * Organization Structured Data
 * For homepage and about page
 */
interface OrganizationDataProps {
  name: string;
  description: string;
  url: string;
  logo: string;
  email: string;
  phone?: string;
  address?: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  socialProfiles?: string[];
}

export function OrganizationStructuredData(props: OrganizationDataProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: props.name,
    description: props.description,
    url: props.url,
    logo: {
      '@type': 'ImageObject',
      url: props.logo,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: props.email,
      ...(props.phone && { telephone: props.phone }),
      contactType: 'Customer Service',
      availableLanguage: ['English', 'German', 'Bengali'],
    },
    ...(props.address && {
      address: {
        '@type': 'PostalAddress',
        ...props.address,
      },
    }),
    ...(props.socialProfiles && { sameAs: props.socialProfiles }),
  };

  return <StructuredData data={data} type="organization" />;
}

/**
 * Educational Organization Structured Data
 * Specific for e-learning platforms
 */
export function EducationalOrganizationData(props: OrganizationDataProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: props.name,
    description: props.description,
    url: props.url,
    logo: props.logo,
    contactPoint: {
      '@type': 'ContactPoint',
      email: props.email,
      ...(props.phone && { telephone: props.phone }),
      contactType: 'Customer Service',
    },
    ...(props.socialProfiles && { sameAs: props.socialProfiles }),
  };

  return <StructuredData data={data} type="organization" />;
}

/**
 * Course Structured Data
 * For individual course pages
 */
interface CourseDataProps {
  name: string;
  description: string;
  provider: string;
  url: string;
  image?: string;
  price?: number;
  currency?: string;
  level?: string;
  duration?: string;
  language?: string;
}

export function CourseStructuredData(props: CourseDataProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: props.name,
    description: props.description,
    provider: {
      '@type': 'Organization',
      name: props.provider,
    },
    url: props.url,
    ...(props.image && {
      image: props.image,
    }),
    ...(props.price && {
      offers: {
        '@type': 'Offer',
        price: props.price,
        priceCurrency: props.currency || 'EUR',
        availability: 'https://schema.org/InStock',
      },
    }),
    ...(props.level && { coursePrerequisites: props.level }),
    ...(props.duration && { timeRequired: props.duration }),
    ...(props.language && { inLanguage: props.language }),
  };

  return <StructuredData data={data} type="course" />;
}

/**
 * FAQ Structured Data
 * For FAQ sections and contact pages
 */
interface FAQItem {
  question: string;
  answer: string;
}

interface FAQDataProps {
  faqs: FAQItem[];
}

export function FAQStructuredData({ faqs }: FAQDataProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return <StructuredData data={data} type="faq" />;
}

/**
 * Breadcrumb Structured Data
 * For navigation breadcrumbs
 */
interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbDataProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbStructuredData({ items }: BreadcrumbDataProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <StructuredData data={data} type="breadcrumb" />;
}

/**
 * Article Structured Data
 * For blog posts and articles
 */
interface ArticleDataProps {
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  publisher: string;
  publisherLogo: string;
}

export function ArticleStructuredData(props: ArticleDataProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: props.headline,
    description: props.description,
    image: props.image,
    datePublished: props.datePublished,
    dateModified: props.dateModified || props.datePublished,
    author: {
      '@type': 'Person',
      name: props.author,
    },
    publisher: {
      '@type': 'Organization',
      name: props.publisher,
      logo: {
        '@type': 'ImageObject',
        url: props.publisherLogo,
      },
    },
  };

  return <StructuredData data={data} type="article" />;
}

/**
 * Website Structured Data
 * For homepage
 */
interface WebsiteDataProps {
  name: string;
  url: string;
  description: string;
  searchUrl?: string;
}

export function WebsiteStructuredData(props: WebsiteDataProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: props.name,
    url: props.url,
    description: props.description,
    ...(props.searchUrl && {
      potentialAction: {
        '@type': 'SearchAction',
        target: `${props.searchUrl}?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    }),
  };

  return <StructuredData data={data} type="website" />;
}

/**
 * Video Structured Data
 * For video content
 */
interface VideoDataProps {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration?: string;
  contentUrl?: string;
  embedUrl?: string;
}

export function VideoStructuredData(props: VideoDataProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: props.name,
    description: props.description,
    thumbnailUrl: props.thumbnailUrl,
    uploadDate: props.uploadDate,
    ...(props.duration && { duration: props.duration }),
    ...(props.contentUrl && { contentUrl: props.contentUrl }),
    ...(props.embedUrl && { embedUrl: props.embedUrl }),
  };

  return <StructuredData data={data} type="custom" />;
}

export default StructuredData;
