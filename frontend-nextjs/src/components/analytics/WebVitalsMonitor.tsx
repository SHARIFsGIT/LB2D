'use client';

import { useEffect } from 'react';
import { initPerformanceMonitoring } from '@/lib/performance/web-vitals';

/**
 * Web Vitals Monitor Component
 * Initializes performance monitoring on the client side
 */
export function WebVitalsMonitor() {
  useEffect(() => {
    // Initialize performance monitoring when component mounts
    if (typeof window !== 'undefined') {
      initPerformanceMonitoring();
    }
  }, []);

  return null; // This component doesn't render anything
}
