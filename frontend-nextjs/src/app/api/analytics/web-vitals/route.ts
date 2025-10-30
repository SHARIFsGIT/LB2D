/**
 * Web Vitals Analytics API Route
 * Collects Core Web Vitals data for performance monitoring
 */

import { NextRequest, NextResponse } from 'next/server';

interface WebVital {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  timestamp: number;
}

export async function POST(request: NextRequest) {
  try {
    const vital: WebVital = await request.json();

    // Log web vital
    console.log('[Web Vital]', {
      metric: vital.name,
      value: vital.value,
      rating: vital.rating,
      timestamp: new Date(vital.timestamp).toISOString(),
    });

    // In production, send to analytics service
    // Examples:
    // - AWS CloudWatch
    // - Google Analytics
    // - Custom database
    // - Vercel Analytics
    // await sendToCloudWatch(vital);

    return NextResponse.json(
      { success: true, message: 'Web vital recorded' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to record web vital:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record web vital' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
