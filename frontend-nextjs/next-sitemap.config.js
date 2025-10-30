/**
 * Next.js Sitemap Configuration
 * Enterprise-grade SEO sitemap generation with multi-language support
 * @type {import('next-sitemap').IConfig}
 */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://learnbanglatodeutsch.com',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  sitemapSize: 7000,
  autoLastmod: true,
  outDir: './public',

  exclude: [
    '/api/*',
    '/admin',
    '/admin/*',
    '/supervisor',
    '/supervisor/*',
    '/dashboard',
    '/dashboard/*',
    '/profile',
    '/profile/*',
    '/my-courses',
    '/my-courses/*',
    '/assessment',
    '/assessment/*',
    '/certificates',
    '/certificates/*',
    '/server-sitemap.xml',
    '/_next/*',
    '/static/*',
  ],

  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          '/supervisor',
          '/dashboard',
          '/profile',
          '/my-courses',
          '/assessment',
          '/certificates',
          '/_next/',
          '/static/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          '/supervisor',
          '/dashboard',
          '/profile',
          '/my-courses',
          '/assessment',
          '/certificates',
        ],
        crawlDelay: 0,
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          '/supervisor',
          '/dashboard',
          '/profile',
          '/my-courses',
          '/assessment',
          '/certificates',
        ],
        crawlDelay: 0,
      },
    ],
    additionalSitemaps: [
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://learnbanglatodeutsch.com'}/server-sitemap.xml`,
    ],
  },

  transform: async (config, path) => {
    // Enterprise-grade priority and changefreq optimization
    let priority = 0.7;
    let changefreq = 'weekly';

    // Homepage - highest priority
    if (path === '/' || path === '/landing') {
      priority = 1.0;
      changefreq = 'daily';
    }
    // Course listing - very high priority (main conversion page)
    else if (path === '/courses') {
      priority = 0.9;
      changefreq = 'daily';
    }
    // Public pages - high priority
    else if (path === '/about' || path === '/contact') {
      priority = 0.8;
      changefreq = 'monthly';
    }
    // Dynamic course enrollment pages
    else if (path.startsWith('/enroll/')) {
      priority = 0.8;
      changefreq = 'weekly';
    }
    // Authentication pages - lower priority
    else if (path.includes('/login') || path.includes('/register')) {
      priority = 0.6;
      changefreq = 'yearly';
    }

    return {
      loc: path,
      changefreq,
      priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      // Multi-language SEO optimization
      alternateRefs: [
        {
          href: `${config.siteUrl}${path}`,
          hreflang: 'en',
        },
        {
          href: `${config.siteUrl}/de${path}`,
          hreflang: 'de',
        },
        {
          href: `${config.siteUrl}/bn${path}`,
          hreflang: 'bn',
        },
        {
          href: `${config.siteUrl}${path}`,
          hreflang: 'x-default',
        },
      ],
    };
  },
};
