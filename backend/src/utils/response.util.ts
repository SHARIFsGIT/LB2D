import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: { [key: string]: string };
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  timestamp: string;
  requestId?: string;
}

export class ResponseUtil {
  private static generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  public static success<T>(
    res: Response,
    message: string = 'Success',
    data?: T,
    statusCode: number = 200,
    pagination?: ApiResponse['pagination']
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId()
    };

    if (pagination) {
      response.pagination = pagination;
    }

    return res.status(statusCode).json(response);
  }

  public static error(
    res: Response,
    message: string = 'An error occurred',
    statusCode: number = 500,
    error?: string,
    errors?: { [key: string]: string }
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId()
    };

    if (error) {
      response.error = error;
    }

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  public static validationError(
    res: Response,
    message: string = 'Validation failed',
    errors: { [key: string]: string }
  ): Response {
    return this.error(res, message, 422, undefined, errors);
  }

  public static unauthorized(
    res: Response,
    message: string = 'Unauthorized access'
  ): Response {
    return this.error(res, message, 401);
  }

  public static forbidden(
    res: Response,
    message: string = 'Forbidden access'
  ): Response {
    return this.error(res, message, 403);
  }

  public static notFound(
    res: Response,
    message: string = 'Resource not found'
  ): Response {
    return this.error(res, message, 404);
  }

  public static conflict(
    res: Response,
    message: string = 'Resource conflict'
  ): Response {
    return this.error(res, message, 409);
  }

  public static tooManyRequests(
    res: Response,
    message: string = 'Too many requests'
  ): Response {
    return this.error(res, message, 429);
  }

  public static created<T>(
    res: Response,
    message: string = 'Resource created successfully',
    data?: T
  ): Response {
    return this.success(res, message, data, 201);
  }

  public static noContent(res: Response): Response {
    return res.status(204).send();
  }
}

// Helper function for pagination
export const createPagination = (
  currentPage: number,
  totalItems: number,
  itemsPerPage: number = 10
): ApiResponse['pagination'] => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  return {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage
  };
};