'use client';

/**
 * Google Analytics Component
 * Enterprise-grade analytics integration with Google Analytics 4 and Google Tag Manager
 * Tracks page views, events, conversions, and e-commerce data
 */

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

interface GoogleAnalyticsProps {
  gaId?: string;
  gtmId?: string;
}

/**
 * Google Analytics Component
 * Add this to your root layout
 */
export function GoogleAnalytics({ gaId, gtmId }: GoogleAnalyticsProps) {
  const GA_ID = gaId || process.env.NEXT_PUBLIC_GA_ID;
  const GTM_ID = gtmId || process.env.NEXT_PUBLIC_GTM_ID;

  if (!GA_ID && !GTM_ID) {
    // Google Analytics not configured - this is fine for development
    return null;
  }

  return (
    <>
      {/* Google Tag Manager */}
      {GTM_ID && (
        <>
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${GTM_ID}');
              `,
            }}
          />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        </>
      )}

      {/* Google Analytics 4 */}
      {GA_ID && !GTM_ID && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          />
          <Script
            id="ga-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', {
                  page_path: window.location.pathname,
                  send_page_view: true,
                  cookie_flags: 'SameSite=None;Secure'
                });
              `,
            }}
          />
        </>
      )}

      {/* Page View Tracker */}
      <PageViewTracker />
    </>
  );
}

/**
 * Tracks page views when route changes
 */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      pageview(pathname);
    }
  }, [pathname, searchParams]);

  return null;
}

/**
 * Track page view
 */
export function pageview(url: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
      page_path: url,
    });
  }
}

/**
 * Track custom event
 */
export function event({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}

/**
 * Track e-commerce purchase
 */
export function trackPurchase({
  transactionId,
  value,
  currency = 'EUR',
  items,
}: {
  transactionId: string;
  value: number;
  currency?: string;
  items: Array<{
    id: string;
    name: string;
    category?: string;
    price: number;
    quantity: number;
  }>;
}) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'purchase', {
      transaction_id: transactionId,
      value: value,
      currency: currency,
      items: items,
    });
  }
}

/**
 * Track course enrollment
 */
export function trackEnrollment({
  courseId,
  courseName,
  courseLevel,
  price,
}: {
  courseId: string;
  courseName: string;
  courseLevel: string;
  price: number;
}) {
  event({
    action: 'course_enrollment',
    category: 'Courses',
    label: `${courseName} - ${courseLevel}`,
    value: price,
  });

  // Also track as conversion
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'conversion', {
      send_to: `${process.env.NEXT_PUBLIC_GA_ID}/enrollment`,
      value: price,
      currency: 'EUR',
      course_id: courseId,
      course_name: courseName,
      course_level: courseLevel,
    });
  }
}

/**
 * Track quiz completion
 */
export function trackQuizCompletion({
  quizId,
  score,
  totalQuestions,
  timeSpent,
}: {
  quizId: string;
  score: number;
  totalQuestions: number;
  timeSpent: number;
}) {
  event({
    action: 'quiz_completed',
    category: 'Assessment',
    label: quizId,
    value: score,
  });

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'quiz_completed', {
      quiz_id: quizId,
      score: score,
      total_questions: totalQuestions,
      time_spent: timeSpent,
      percentage: (score / totalQuestions) * 100,
    });
  }
}

/**
 * Track user registration
 */
export function trackRegistration(method: string = 'email') {
  event({
    action: 'sign_up',
    category: 'Authentication',
    label: method,
  });

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'sign_up', {
      method: method,
    });
  }
}

/**
 * Track user login
 */
export function trackLogin(method: string = 'email') {
  event({
    action: 'login',
    category: 'Authentication',
    label: method,
  });

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'login', {
      method: method,
    });
  }
}

/**
 * Track search
 */
export function trackSearch(searchTerm: string, resultsCount?: number) {
  event({
    action: 'search',
    category: 'Search',
    label: searchTerm,
    value: resultsCount,
  });

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'search', {
      search_term: searchTerm,
      ...(resultsCount !== undefined && { results_count: resultsCount }),
    });
  }
}

/**
 * Track contact form submission
 */
export function trackContactFormSubmission(formType: string = 'general') {
  event({
    action: 'form_submission',
    category: 'Contact',
    label: formType,
  });

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'generate_lead', {
      form_type: formType,
    });
  }
}

export default GoogleAnalytics;
