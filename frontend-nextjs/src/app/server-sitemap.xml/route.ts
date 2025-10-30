/**
 * Dynamic Server Sitemap Route
 * Generates sitemap for dynamic content (courses, blog posts, etc.)
 * Enterprise-grade SEO implementation with ISR
 */

import { getServerSideSitemap } from 'next-sitemap';

interface Course {
  _id?: string;
  id?: string;
  title: string;
  level: string;
  updatedAt?: string;
}

export async function GET(request: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://learnbanglatodeutsch.com';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  try {
    // Fetch dynamic courses from API
    const coursesResponse = await fetch(`${apiUrl}/courses`, {
      next: { revalidate: 3600 }, // ISR: Revalidate every hour
      headers: {
        'Content-Type': 'application/json',
      },
    });

    let courses: Course[] = [];
    if (coursesResponse.ok) {
      const data = await coursesResponse.json();
      courses = Array.isArray(data.data) ? data.data : Array.isArray(data.courses) ? data.courses : [];
    }

    // Generate sitemap fields for dynamic course pages
    const courseFields = courses.map((course) => {
      const courseId = course._id || course.id || '';
      return {
        loc: `${siteUrl}/enroll/${courseId}`,
        lastmod: course.updatedAt || new Date().toISOString(),
        changefreq: 'weekly' as const,
        priority: 0.8,
        // Multi-language alternate URLs for international SEO
        alternateRefs: [
          {
            href: `${siteUrl}/enroll/${courseId}`,
            hreflang: 'en',
          },
          {
            href: `${siteUrl}/de/enroll/${courseId}`,
            hreflang: 'de',
          },
          {
            href: `${siteUrl}/bn/enroll/${courseId}`,
            hreflang: 'bn',
          },
          {
            href: `${siteUrl}/enroll/${courseId}`,
            hreflang: 'x-default',
          },
        ],
      };
    });

    // Additional static pages that need dynamic sitemap entries
    const additionalFields = [
      {
        loc: `${siteUrl}/courses`,
        lastmod: new Date().toISOString(),
        changefreq: 'daily' as const,
        priority: 0.9,
      },
    ];

    const allFields = [...courseFields, ...additionalFields];

    return getServerSideSitemap(allFields);
  } catch (error) {
    console.error('Error generating server sitemap:', error);

    // Return minimal sitemap on error to prevent 500 errors
    return getServerSideSitemap([
      {
        loc: `${siteUrl}/courses`,
        lastmod: new Date().toISOString(),
        changefreq: 'daily' as const,
        priority: 0.9,
      },
    ]);
  }
}

// Disable static generation for this route
export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour
