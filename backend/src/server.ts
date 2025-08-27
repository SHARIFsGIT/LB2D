import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, Request, Response } from 'express';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { WebSocketServer } from 'ws';
import { errorHandler } from './middleware/error.middleware';
import adminRoutes from './routes/admin.routes';
import analyticsRoutes from './routes/analytics.routes';
import authRoutes from './routes/auth.routes';
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
import webSocketService from './services/websocket.service';
import { verifyAccessToken } from './utils/jwt.utils';
import User from './models/User.model';


dotenv.config();

const app: Application = express();

// Middleware
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003' // Add additional port for frontend
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept-Ranges']
}));
// Increase body size limits for file uploads
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Serve uploaded files statically with proper headers for video streaming
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path, stat) => {
    // Add proper headers for video files
    if (path.endsWith('.mp4')) {
      res.set('Accept-Ranges', 'bytes');
      res.set('Content-Type', 'video/mp4');
    } else if (path.endsWith('.webm')) {
      res.set('Accept-Ranges', 'bytes');
      res.set('Content-Type', 'video/webm');
    } else if (path.endsWith('.mov')) {
      res.set('Accept-Ranges', 'bytes');
      res.set('Content-Type', 'video/quicktime');
    } else if (path.endsWith('.avi')) {
      res.set('Accept-Ranges', 'bytes');
      res.set('Content-Type', 'video/x-msvideo');
    }
    // Add CORS headers for video streaming
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Range');
  }
}));

// Health check route
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Test email route
app.get('/test-email/:email', async (req: Request, res: Response) => {
  try {
    const emailService = require('./services/email.service').default;
    const testEmail = req.params.email;
    // console.log('Testing email to:', testEmail);
    
    await emailService.sendVerificationEmail(
      testEmail,
      'test-token-123',
      'Test User'
    );
    
    res.status(200).json({ 
      success: true, 
      message: `Test email sent to ${testEmail}. Check your inbox and spam folder.` 
    });
  } catch (error: any) {
    // console.error('Email test failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send email',
      error: error.message,
      details: error.response || error.code
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);

// User routes
app.use('/api/users', userRoutes);

// Contact routes
app.use('/api/contact', contactRoutes);

// Course routes
app.use('/api/courses', courseRoutes);

// Payment routes
app.use('/api/payments', paymentRoutes);

// Test routes
app.use('/api/tests', testRoutes);

// Quiz routes
app.use('/api/quizzes', quizRoutes);

// Resource routes
app.use('/api/resources', resourceRoutes);

// Video routes
app.use('/api/videos', videoRoutes);

// Video comment routes
app.use('/api/video-comments', videoCommentRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Analytics routes
app.use('/api/analytics', analyticsRoutes);

// Webhook routes (must be before other middlewares)
app.use('/api/webhooks', webhookRoutes);

// 404 handler
app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school-assessment');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  
  // Create HTTP server
  const server = createServer(app);
  
  // Create WebSocket server
  const wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection established');
    
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
                  message: 'Authentication successful'
                }));
                
                console.log(`WebSocket authenticated: ${user.email} (${user.role})`);
              }
            } else {
              ws.send(JSON.stringify({
                type: 'auth_error',
                message: 'User not found'
              }));
            }
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'auth_error',
              message: 'Invalid token'
            }));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    // Handle connection close
    ws.on('close', () => {
      if (userId) {
        webSocketService.removeClient(userId);
      }
      console.log('WebSocket connection closed');
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (userId) {
        webSocketService.removeClient(userId);
      }
    });
  });
  
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();

export default app;