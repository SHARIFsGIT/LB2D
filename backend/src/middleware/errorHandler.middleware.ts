import { Request, Response, NextFunction } from 'express';
import { MongoError } from 'mongodb';
import { ValidationError } from 'mongoose';
import logger from '../utils/logger';
import { ResponseUtil } from '../utils/response.util';
import config from '../config/app.config';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string | number;
  keyValue?: { [key: string]: string };
  errors?: { [key: string]: any };
  path?: string;
  value?: any;
}

export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export const createError = (message: string, statusCode: number = 500): CustomError => {
  return new CustomError(message, statusCode);
};

// Handle specific error types
const handleCastErrorDB = (err: any): CustomError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new CustomError(message, 400);
};

const handleDuplicateFieldsDB = (err: any): CustomError => {
  const value = err.keyValue ? Object.values(err.keyValue)[0] : 'unknown';
  const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'field';
  const message = `${field} '${value}' already exists. Please use another value.`;
  return new CustomError(message, 409);
};

const handleValidationErrorDB = (err: ValidationError): CustomError => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new CustomError(message, 422);
};

const handleJWTError = (): CustomError => {
  return new CustomError('Invalid token. Please log in again!', 401);
};

const handleJWTExpiredError = (): CustomError => {
  return new CustomError('Your token has expired! Please log in again.', 401);
};

const sendErrorDev = (err: AppError, req: Request, res: Response): void => {
  // API Error
  logger.error('ERROR 💥', {
    error: err,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  ResponseUtil.error(
    res,
    err.message,
    err.statusCode || 500,
    config.isDevelopment() ? err.stack : undefined,
    (err as any).validationErrors || err.errors
  );
};

const sendErrorProd = (err: AppError, req: Request, res: Response): void => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    logger.warn('Operational error:', {
      message: err.message,
      statusCode: err.statusCode,
      url: req.url,
      method: req.method,
      ip: req.ip
    });

    ResponseUtil.error(
      res,
      err.message,
      err.statusCode || 500,
      undefined,
      (err as any).validationErrors || err.errors
    );
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('Programming error:', {
      error: err,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    ResponseUtil.error(
      res,
      'Something went wrong!',
      500
    );
  }
};

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.isOperational = err.isOperational ?? false;

  if (config.isDevelopment()) {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error as ValidationError);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};

// Async error handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Handle unhandled promise rejections
export const handleUnhandledRejection = (): void => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection at:', {
      promise,
      reason: reason.stack || reason
    });
    // Close server gracefully
    process.exit(1);
  });
};

// Handle uncaught exceptions
export const handleUncaughtException = (): void => {
  process.on('uncaughtException', (err: Error) => {
    logger.error('Uncaught Exception:', {
      error: err.message,
      stack: err.stack
    });
    process.exit(1);
  });
};

// Graceful shutdown
export const gracefulShutdown = (server: any): void => {
  const shutdown = (signal: string) => {
    process.on(signal, () => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    });
  };

  shutdown('SIGTERM');
  shutdown('SIGINT');
};