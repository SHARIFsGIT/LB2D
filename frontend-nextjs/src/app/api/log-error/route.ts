/**
 * Error Logging API Route
 * Collects client-side errors for monitoring and debugging
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json();

    // Log error (in production, send to logging service like CloudWatch, Sentry, etc.)
    console.error('[Client Error]', {
      timestamp: errorData.timestamp || new Date().toISOString(),
      message: errorData.message,
      stack: errorData.stack,
      componentStack: errorData.componentStack,
      url: errorData.url,
      userAgent: errorData.userAgent,
    });

    // In production, you would send this to your logging service
    // Example: await sendToCloudWatch(errorData);
    // Example: Sentry.captureException(new Error(errorData.message));

    return NextResponse.json(
      { success: true, message: 'Error logged successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to log client error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to log error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
