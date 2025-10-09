import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';

// Import configurations and utilities
import config from './config/app.config';
import databaseConfig from './config/database.config';
import logger from './utils/logger';
import { ResponseUtil } from './utils/response.util';

// Import middleware
import { 
  errorHandler, 
  handleUnhandledRejection, 
  handleUncaughtException, 
  gracefulShutdown 
} from './middleware/errorHandler.middleware';
import { 
  securityHeaders, 
  sanitizeRequest, 
  apiRateLimit,
  requestSizeLimit 
} from './middleware/security.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import analyticsRoutes from './routes/analytics.routes';
import contactRoutes from './routes/contact.routes';
import courseRoutes from './routes/course.routes';
import paymentRoutes from './routes/payment.routes';
import quizRoutes from './routes/quiz.routes';
import resourceRoutes from './routes/resource.routes';
import testRoutes from './routes/test.routes';
import userRoutes from './routes/user.routes';
import videoRoutes from './routes/video.routes';
import videoCommentRoutes from './routes/videoComment.routes';
import webhookRoutes from './routes/webhook.routes';
import notificationRoutes from './routes/notification.routes';

// Import services
import webSocketService from './services/websocket.service';
import { verifyAccessToken } from './utils/jwt.utils';
import User from './models/User.model';

// Handle uncaught exceptions and unhandled rejections
handleUncaughtException();
handleUnhandledRejection();

class Server {
  private app: Application;
  private server: any;
  private wss: WebSocketServer | null = null;

  constructor() {
    this.app = express();
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  private configureMiddleware(): void {
    // Trust proxy (important for getting correct IP behind load balancers)
    this.app.set('trust proxy', 1);

    // Security middleware
    this.app.use(securityHeaders);
    this.app.use(sanitizeRequest);

    // Request size limiting (skip for video upload routes as multer handles this)
    this.app.use((req, res, next) => {
      // Skip size limit for video upload endpoint - multer handles this
      if (req.path === '/api/videos/upload') {
        return next();
      }
      return requestSizeLimit(config.get('MAX_FILE_SIZE'))(req, res, next);
    });

    // CORS configuration
    this.app.use(cors({
      origin: [
        config.get('CLIENT_URL'),
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept-Ranges']
    }));

    // Body parsing with size limits (increased for video uploads)
    this.app.use(express.json({ limit: '100mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '100mb' }));

    // Rate limiting for API endpoints
    this.app.use('/api', apiRateLimit);

    // Static file serving with proper headers for video streaming
    this.app.use('/uploads', express.static(path.join(__dirname, '..', config.get('UPLOAD_PATH')), {
      setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        
        // Set appropriate headers for video files
        if (['.mp4', '.webm', '.mov', '.avi'].includes(ext)) {
          res.set({
            'Accept-Ranges': 'bytes',
            'Content-Type': `video/${ext.substring(1) === 'mov' ? 'quicktime' : ext.substring(1)}`,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Range'
          });
        }
      }
    }));
  }

  private configureRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      ResponseUtil.success(res, 'Server is running', {
        uptime: process.uptime(),
        environment: config.get('NODE_ENV'),
        timestamp: new Date().toISOString(),
        database: databaseConfig.getConnectionStatus() ? 'connected' : 'disconnected'
      });
    });

    // API version endpoint
    this.app.get('/api', (req: Request, res: Response) => {
      ResponseUtil.success(res, 'LB2D API v1.0', {
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: {
          auth: '/api/auth',
          users: '/api/users',
          courses: '/api/courses',
          payments: '/api/payments',
          tests: '/api/tests',
          quizzes: '/api/quizzes',
          resources: '/api/resources',
          videos: '/api/videos',
          analytics: '/api/analytics',
          admin: '/api/admin'
        }
      });
    });

    // Test email endpoint (only in development)
    if (config.isDevelopment()) {
      this.app.get('/test-email/:email', async (req: Request, res: Response) => {
        try {
          const emailService = require('./services/email.service').default;
          const testEmail = req.params.email;
          
          await emailService.sendVerificationEmail(
            testEmail,
            'test-token-123',
            'Test User'
          );
          
          ResponseUtil.success(res, `Test email sent to ${testEmail}. Check your inbox and spam folder.`);
        } catch (error: any) {
          logger.error('Email test failed:', error);
          ResponseUtil.error(res, 'Failed to send email', 500, error.message);
        }
      });
    }

    // API Routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/contact', contactRoutes);
    this.app.use('/api/courses', courseRoutes);
    this.app.use('/api/payments', paymentRoutes);
    this.app.use('/api/tests', testRoutes);
    this.app.use('/api/quizzes', quizRoutes);
    this.app.use('/api/resources', resourceRoutes);
    this.app.use('/api/videos', videoRoutes);
    this.app.use('/api/video-comments', videoCommentRoutes);
    this.app.use('/api/admin', adminRoutes);
    this.app.use('/api/analytics', analyticsRoutes);
    this.app.use('/api/webhooks', webhookRoutes);
    this.app.use('/api/notifications', notificationRoutes);

    // 404 handler for undefined routes
    this.app.use('*', (req: Request, res: Response) => {
      ResponseUtil.notFound(res, `Route ${req.originalUrl} not found`);
    });
  }

  private configureErrorHandling(): void {
    // Global error handler (must be last middleware)
    this.app.use(errorHandler);
  }

  private configureWebSocket(): void {
    this.wss = new WebSocketServer({ server: this.server });
    
    this.wss.on('connection', (ws, req) => {
      logger.info('New WebSocket connection established', {
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      });
      
      let userId: string | null = null;
      let userRole: string | null = null;
      
      // Handle WebSocket messages
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'auth' && message.token) {
            try {
              const decoded = verifyAccessToken(message.token);
              const user = await User.findById(decoded.userId);
              
              if (user) {
                userId = user._id?.toString() || '';
                userRole = user.role;
                
                if (userId && userRole) {
                  webSocketService.addClient(userId, ws, userRole);
                  
                  ws.send(JSON.stringify({
                    type: 'auth_success',
                    message: 'Authentication successful',
                    data: { userId, role: userRole }
                  }));
                  
                  logger.info(`WebSocket authenticated: ${user.email} (${user.role})`);
                }
              } else {
                ws.send(JSON.stringify({
                  type: 'auth_error',
                  message: 'User not found'
                }));
              }
            } catch (error) {
              logger.warn('Invalid WebSocket token', { error: error instanceof Error ? error.message : error });
              ws.send(JSON.stringify({
                type: 'auth_error',
                message: 'Invalid token'
              }));
            }
          }
        } catch (error) {
          logger.error('WebSocket message error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });
      
      // Handle connection close
      ws.on('close', (code, reason) => {
        if (userId) {
          webSocketService.removeClient(userId);
        }
        logger.info('WebSocket connection closed', { code, reason: reason.toString() });
      });
      
      // Handle errors
      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
        if (userId) {
          webSocketService.removeClient(userId);
        }
      });
    });

    logger.info('WebSocket server configured');
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await databaseConfig.connect();
      
      // Create HTTP server
      this.server = createServer(this.app);
      
      // Configure WebSocket
      this.configureWebSocket();
      
      // Setup graceful shutdown
      gracefulShutdown(this.server);
      
      // Start server
      const PORT = config.get('PORT');

      // Set timeout for large file uploads (10 minutes)
      this.server.timeout = 600000; // 10 minutes in milliseconds

      this.server.listen(PORT, () => {
        logger.info(`🚀 Server started successfully`, {
          port: PORT,
          environment: config.get('NODE_ENV'),
          pid: process.pid,
          nodeVersion: process.version,
          platform: process.platform,
          memory: process.memoryUsage()
        });
        
        logger.info(`📊 WebSocket server running on port ${PORT}`);
        logger.info(`🌐 API documentation available at http://localhost:${PORT}/api`);
        
        if (config.isDevelopment()) {
          logger.info(`🧪 Test email endpoint: http://localhost:${PORT}/test-email/:email`);
        }
      });

      this.server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.syscall !== 'listen') {
          throw error;
        }

        switch (error.code) {
          case 'EACCES':
            logger.error(`Port ${PORT} requires elevated privileges`);
            process.exit(1);
            break;
          case 'EADDRINUSE':
            logger.error(`Port ${PORT} is already in use`);
            process.exit(1);
            break;
          default:
            throw error;
        }
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    logger.info('Stopping server...');
    
    if (this.wss) {
      this.wss.close();
      logger.info('WebSocket server closed');
    }
    
    if (this.server) {
      this.server.close();
      logger.info('HTTP server closed');
    }
    
    await databaseConfig.disconnect();
    logger.info('Database disconnected');
  }
}

// Create and start server
const server = new Server();

// Handle process termination
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

// Start the server
server.start().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});

export default server;