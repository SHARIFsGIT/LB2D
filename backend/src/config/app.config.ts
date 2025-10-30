import dotenv from 'dotenv';
import logger from '../utils/logger';

// Load environment variables
dotenv.config();

interface AppConfig {
  PORT: number;
  NODE_ENV: string;
  
  // Database
  MONGODB_URI: string;
  
  // JWT
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  
  // Email
  EMAIL_HOST: string;
  EMAIL_PORT: number;
  EMAIL_USER: string;
  EMAIL_PASS: string;
  EMAIL_FROM: string;
  
  // Client
  CLIENT_URL: string;
  
  // Stripe
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  
  // File Upload
  MAX_FILE_SIZE: number;
  UPLOAD_PATH: string;
}

class ConfigService {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  private loadConfig(): AppConfig {
    return {
      PORT: parseInt(process.env.PORT || '5000', 10),
      NODE_ENV: process.env.NODE_ENV || 'development',
      
      MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/school-assessment',
      
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'your-access-secret',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      
      EMAIL_HOST: process.env.EMAIL_HOST || '',
      EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587', 10),
      EMAIL_USER: process.env.EMAIL_USER || '',
      EMAIL_PASS: process.env.EMAIL_PASS || '',
      EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@example.com',
      
      CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
      
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
      STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
      
      MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
      UPLOAD_PATH: process.env.UPLOAD_PATH || 'uploads'
    };
  }

  private validateConfig(): void {
    const requiredVars = [
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET'
    ];

    const missingVars = requiredVars.filter(varName => !this.config[varName as keyof AppConfig]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Warn about missing optional but important variables
    const importantVars = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS', 'STRIPE_SECRET_KEY'];
    const missingImportant = importantVars.filter(varName => !this.config[varName as keyof AppConfig]);
    
    if (missingImportant.length > 0 && this.config.NODE_ENV === 'production') {
      logger.warn(`Warning: Missing important environment variables for production: ${missingImportant.join(', ')}`);
    }
  }

  public get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  public getAll(): AppConfig {
    return { ...this.config };
  }

  public isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  public isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  public isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }
}

export default new ConfigService();