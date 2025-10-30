/**
 * Web Vitals Monitoring
 * Enterprise-grade Core Web Vitals tracking for SEO and performance optimization
 * Tracks: LCP, FID, CLS, TTFB, FCP, INP
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, Metric } from 'web-vitals';

// Metric thresholds (Google's recommendations)
export const METRIC_THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  INP: { good: 200, needsImprovement: 500 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  TTFB: { good: 800, needsImprovement: 1800 },
  FCP: { good: 1800, needsImprovement: 3000 },
} as const;

type MetricName = 'LCP' | 'INP' | 'CLS' | 'TTFB' | 'FCP';

interface AnalyticsEvent {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  timestamp: number;
}

/**
 * Determine metric rating based on thresholds
 */
function getMetricRating(name: MetricName, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = METRIC_THRESHOLDS[name as keyof typeof METRIC_THRESHOLDS];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Send metric to analytics endpoint
 */
async function sendToAnalytics(metric: Metric) {
  const analyticsEvent: AnalyticsEvent = {
    name: metric.name,
    value: metric.value,
    rating: getMetricRating(metric.name as MetricName, metric.value),
    delta: metric.delta,
    id: metric.id,
    timestamp: Date.now(),
  };

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vital]', analyticsEvent);
  }

  // Send to Google Analytics 4
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      metric_id: metric.id,
      metric_value: metric.value,
      metric_delta: metric.delta,
      metric_rating: analyticsEvent.rating,
    });
  }

  // Send to custom analytics endpoint
  try {
    if (process.env.NODE_ENV === 'production') {
      await fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analyticsEvent),
        keepalive: true, // Ensure request completes even if page is unloading
      });
    }
  } catch (error) {
    // Fail silently in production
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to send web vital:', error);
    }
  }
}

/**
 * Initialize Web Vitals tracking
 * Call this once in your app's entry point
 */
export function initWebVitals() {
  if (typeof window === 'undefined') return;

  try {
    // Largest Contentful Paint
    onLCP(sendToAnalytics, { reportAllChanges: false });

    // Interaction to Next Paint (replaces FID in web-vitals v4)
    onINP(sendToAnalytics);

    // Cumulative Layout Shift
    onCLS(sendToAnalytics, { reportAllChanges: false });

    // Time to First Byte
    onTTFB(sendToAnalytics);

    // First Contentful Paint
    onFCP(sendToAnalytics);

    // Log initialization in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Web Vitals] Tracking initialized');
    }
  } catch (error) {
    console.error('Failed to initialize Web Vitals:', error);
  }
}

/**
 * Report custom performance metrics
 */
export function reportCustomMetric(name: string, value: number, metadata?: Record<string, any>) {
  if (typeof window === 'undefined') return;

  const event = {
    name: `custom_${name}`,
    value,
    metadata,
    timestamp: Date.now(),
  };

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Custom Metric]', event);
  }

  // Send to Google Analytics
  if ((window as any).gtag) {
    (window as any).gtag('event', name, {
      value,
      ...metadata,
    });
  }

  // Send to custom endpoint
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/analytics/custom-metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => {
      // Fail silently
    });
  }
}

/**
 * Monitor specific component performance
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();

  start(name: string) {
    this.marks.set(name, performance.now());
  }

  end(name: string) {
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`Performance mark "${name}" not found`);
      return;
    }

    const duration = performance.now() - startTime;
    this.marks.delete(name);

    reportCustomMetric(name, duration);
    return duration;
  }

  measure(name: string, callback: () => void | Promise<void>) {
    this.start(name);
    const result = callback();

    if (result instanceof Promise) {
      return result.finally(() => this.end(name));
    }

    this.end(name);
    return result;
  }
}

/**
 * Monitor resource loading performance
 */
export function monitorResourceLoading() {
  if (typeof window === 'undefined' || !window.PerformanceObserver) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;

          // Track slow resources (> 3 seconds)
          if (resourceEntry.duration > 3000) {
            reportCustomMetric('slow_resource', resourceEntry.duration, {
              name: resourceEntry.name,
              type: resourceEntry.initiatorType,
            });
          }
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  } catch (error) {
    console.error('Failed to monitor resource loading:', error);
  }
}

/**
 * Monitor long tasks (blocking main thread)
 */
export function monitorLongTasks() {
  if (typeof window === 'undefined' || !window.PerformanceObserver) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Long tasks are > 50ms
        if (entry.duration > 50) {
          reportCustomMetric('long_task', entry.duration, {
            startTime: entry.startTime,
          });
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
  } catch (error) {
    // PerformanceLongTaskTiming may not be supported
    if (process.env.NODE_ENV === 'development') {
      console.log('[Web Vitals] Long task monitoring not supported');
    }
  }
}

/**
 * Initialize all performance monitoring
 */
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  initWebVitals();
  monitorResourceLoading();
  monitorLongTasks();

  // Report page load time
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (perfData) {
        reportCustomMetric('page_load_time', perfData.loadEventEnd - perfData.fetchStart);
        reportCustomMetric('dom_interactive_time', perfData.domInteractive - perfData.fetchStart);
      }
    }, 0);
  });
}

export default initPerformanceMonitoring;
