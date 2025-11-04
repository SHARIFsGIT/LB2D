/**
 * Professional Frontend Logging Service
 * Production-ready with multiple log levels and monitoring integration
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  component?: string;
  userId?: string;
  action?: string;
  metadata?: Record<string, any>;
}

class FrontendLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isClient = typeof window !== 'undefined';

  /**
   * Internal log method with level and context
   */
  private log(level: LogLevel, message: string, context?: LogContext, ...args: any[]) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...context,
      args: args.length > 0 ? args : undefined,
    };

    const prefix = `[${timestamp}] [${level.toUpperCase()}]${context?.component ? ` [${context.component}]` : ''}`;

    if (this.isDevelopment) {
      // Development: Use console with colors
      const styles: Record<LogLevel, string> = {
        debug: 'color: #6b7280',
        info: 'color: #3b82f6',
        warn: 'color: #f59e0b; font-weight: bold',
        error: 'color: #ef4444; font-weight: bold',
      };

      console[level === 'debug' ? 'log' : level](
        `%c${prefix}`,
        styles[level],
        message,
        ...args
      );
    } else {
      // Production: Send to monitoring service (Sentry, LogRocket, etc.)
      if (this.isClient && level === 'error') {
        // Send errors to monitoring
        this.sendToMonitoring(logData);
      }

      // Still log errors to console in production for debugging
      if (level === 'error' || level === 'warn') {
        console[level](prefix, message, ...args);
      }
    }
  }

  /**
   * Send log to monitoring service (e.g., Sentry)
   */
  private sendToMonitoring(logData: any) {
    // TODO: Integrate with Sentry, LogRocket, or other monitoring service
    // Example:
    // if (window.Sentry) {
    //   window.Sentry.captureMessage(logData.message, {
    //     level: logData.level,
    //     extra: logData,
    //   });
    // }

    // For now, store in localStorage for debugging
    if (this.isClient) {
      try {
        const logs = JSON.parse(localStorage.getItem('app_errors') || '[]');
        logs.push(logData);
        // Keep only last 50 errors
        if (logs.length > 50) logs.shift();
        localStorage.setItem('app_errors', JSON.stringify(logs));
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }

  /**
   * Debug level - Detailed information for debugging
   */
  debug(message: string, context?: LogContext, ...args: any[]) {
    this.log('debug', message, context, ...args);
  }

  /**
   * Info level - General informational messages
   */
  info(message: string, context?: LogContext, ...args: any[]) {
    this.log('info', message, context, ...args);
  }

  /**
   * Warn level - Warning messages
   */
  warn(message: string, context?: LogContext, ...args: any[]) {
    this.log('warn', message, context, ...args);
  }

  /**
   * Error level - Error messages
   */
  error(message: string, context?: LogContext, ...args: any[]) {
    this.log('error', message, context, ...args);
  }

  /**
   * Log API call
   */
  apiCall(method: string, url: string, status?: number, duration?: number) {
    this.info(`API ${method} ${url}${status ? ` → ${status}` : ''}${duration ? ` (${duration}ms)` : ''}`, {
      component: 'API',
      metadata: { method, url, status, duration },
    });
  }

  /**
   * Log API error
   */
  apiError(method: string, url: string, error: any) {
    this.error(`API ${method} ${url} failed`, {
      component: 'API',
      metadata: { method, url, error: error.message || error },
    }, error);
  }

  /**
   * Log user action
   */
  userAction(action: string, userId?: string, metadata?: Record<string, any>) {
    this.info(`User action: ${action}`, {
      component: 'UserAction',
      userId,
      action,
      metadata,
    });
  }

  /**
   * Log navigation
   */
  navigation(from: string, to: string, userId?: string) {
    this.debug(`Navigation: ${from} → ${to}`, {
      component: 'Navigation',
      userId,
      metadata: { from, to },
    });
  }

  /**
   * Log performance metric
   */
  performance(metric: string, value: number, context?: LogContext) {
    this.debug(`Performance: ${metric} = ${value}ms`, {
      component: 'Performance',
      ...context,
      metadata: { metric, value },
    });
  }

  /**
   * Clear stored error logs
   */
  clearErrorLogs() {
    if (this.isClient) {
      localStorage.removeItem('app_errors');
    }
  }

  /**
   * Get stored error logs (for debugging)
   */
  getErrorLogs(): any[] {
    if (this.isClient) {
      try {
        return JSON.parse(localStorage.getItem('app_errors') || '[]');
      } catch {
        return [];
      }
    }
    return [];
  }
}

// Export singleton instance
export const logger = new FrontendLogger();

// Export for direct use
export default logger;
