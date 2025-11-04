import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Global exception filter for comprehensive error handling
 * Catches all unhandled exceptions and formats them consistently
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.getStatus(exception);
    const message = this.getMessage(exception);
    const errorType = this.getErrorType(exception);

    // Log error details for 500-level errors
    if (this.shouldLogDetails(status)) {
      this.logger.error(
        `HTTP ${status} Error: ${message}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception),
      );
    } else {
      this.logger.warn(`HTTP ${status}: ${message}`);
    }

    // Send formatted error response
    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
      error: errorType,
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception instanceof Error ? exception.stack : undefined,
        details: exception,
      }),
    });
  }

  /**
   * Get status code from exception
   */
  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle common Prisma errors
      switch (exception.code) {
        case 'P2002': // Unique constraint violation
          return HttpStatus.CONFLICT;
        case 'P2025': // Record not found
          return HttpStatus.NOT_FOUND;
        case 'P2003': // Foreign key constraint
          return HttpStatus.BAD_REQUEST;
        default:
          return HttpStatus.INTERNAL_SERVER_ERROR;
      }
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * Get error message from exception
   */
  private getMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      return typeof response === 'string' ? response : (response as any).message || exception.message;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.getPrismaErrorMessage(exception);
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Internal server error';
  }

  /**
   * Get user-friendly Prisma error messages
   */
  private getPrismaErrorMessage(error: Prisma.PrismaClientKnownRequestError): string {
    switch (error.code) {
      case 'P2002':
        const target = (error.meta?.target as string[]) || [];
        return `A record with this ${target.join(', ')} already exists`;
      case 'P2025':
        return 'Record not found';
      case 'P2003':
        return 'Related record not found';
      case 'P2014':
        return 'Invalid relationship';
      default:
        return 'Database operation failed';
    }
  }

  /**
   * Get error type name
   */
  private getErrorType(exception: unknown): string {
    if (exception instanceof HttpException) {
      return exception.constructor.name;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return `PrismaError_${exception.code}`;
    }

    if (exception instanceof Error) {
      return exception.constructor.name;
    }

    return 'UnknownError';
  }

  /**
   * Should log full error details
   */
  private shouldLogDetails(status: number): boolean {
    return status >= 500;
  }
}
