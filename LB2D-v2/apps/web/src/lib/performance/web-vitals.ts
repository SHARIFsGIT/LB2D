// Web Vitals monitoring for performance tracking

export function reportWebVitals(metric: any) {
  // Log web vitals in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', metric);
  }

  // In production, send to analytics service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to your analytics endpoint
    // fetch('/api/analytics/web-vitals', {
    //   method: 'POST',
    //   body: JSON.stringify(metric),
    //   headers: { 'Content-Type': 'application/json' }
    // });
  }
}

export function trackPageView(url: string) {
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    // Track page views
    console.log('[Page View]', url);
  }
}

export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  // Initialize performance monitoring
  if (process.env.NODE_ENV === 'production') {
    // Use Next.js built-in reportWebVitals
    // This is typically called from _app.tsx or layout.tsx
    console.log('[Performance] Monitoring initialized');
  }
}
