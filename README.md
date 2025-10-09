# LB2D - Learn Bangla to Deutsch Platform

A comprehensive language learning platform for Bengali speakers learning German, built with modern web technologies and production-ready architecture. Features a clean, professional design with real-time notifications and comprehensive user management.

## 🚀 Features

### For Students
- **Interactive Courses**: Structured German learning modules with CEFR-aligned assessments
- **Assessments & Quizzes**: Progress tracking and evaluation with instant results
- **Video Content**: Multimedia learning resources with progress tracking
- **Certificate System**: Download professional PDF certificates for completed assessments
- **Real-time Notifications**: Bidirectional WebSocket notifications for instant updates
- **Payment Integration**: Secure course enrollment via Stripe
- **Progress Dashboard**: Clean, informative dashboard tracking learning journey

### For Supervisors
- **Student Management**: Monitor student progress with detailed analytics
- **Video Management**: Upload, manage, and track video content
- **Content Analytics**: View completion rates and student engagement
- **Real-time Notifications**: Instant updates on student activities and system events
- **Professional Dashboard**: Clean interface for managing educational content

### For Admins
- **Full Platform Control**: Complete administrative access with comprehensive tools
- **User Role Management**: Approve and manage user roles with security controls
- **System Analytics**: Platform-wide performance metrics and user statistics
- **Content Moderation**: Review and approve courses, videos, and resources
- **Database Management**: Built-in tools for database reset and maintenance
- **Security Dashboard**: Monitor system health and security events

## 🛠 Technology Stack

### Backend
- **Node.js** with **TypeScript** for type safety
- **Express.js** with production-ready middleware
- **MongoDB** with **Mongoose** ODM
- **JWT** authentication with refresh tokens
- **WebSocket** for real-time communication
- **Stripe** for payment processing
- **Nodemailer** for email services
- **Winston** for logging
- **PM2** for process management

### Frontend
- **React 19** with **TypeScript**
- **Redux Toolkit** for state management
- **React Router** for navigation
- **Axios** for API communication
- **Tailwind CSS** for styling
- **WebSocket** client for real-time features

### Security Features
- **Rate limiting** and **brute force protection**
- **Input sanitization** and **validation**
- **CORS** configuration
- **Security headers** (XSS, CSRF protection)
- **JWT** with secure token rotation
- **Password hashing** with bcrypt

## 📦 Quick Start

### Prerequisites
- Node.js >= 16.0.0
- MongoDB >= 4.4 (or MongoDB Atlas account)
- npm or yarn

### Clone Repository
```bash
git clone <repository-url>
cd LB2D
```

### Installation

#### 1. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

#### 2. Configure Environment
```bash
# Copy environment template
cd ../backend
cp .env.example .env

# Edit .env with your configuration (MongoDB URI, JWT secrets, email, Stripe keys)
```

#### 3. Initialize Database
```bash
# Reset database and create admin user
cd backend
npm run reset-db

# Or create admin manually
npm run create-admin
```

**Default Admin Credentials:**
- Email: `admin@learnbangla2deutsch.com`
- Password: `Admin@123456`

⚠️ **Change password after first login!**

#### 4. Start Application
```bash
# Start backend (in one terminal)
cd backend
npm run dev

# Start frontend (in another terminal)
cd frontend
npm start
```

**Application URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

## 🔧 Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/lb2d-development

# JWT Secrets (Generate secure keys!)
JWT_ACCESS_SECRET=your-secure-secret
JWT_REFRESH_SECRET=your-secure-refresh-secret

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Database Setup
1. Install MongoDB locally or use MongoDB Atlas
2. Update `MONGODB_URI` in your `.env` file
3. Run `npm run reset-db` to initialize the database with an admin user
4. The application will automatically create collections on first use

## 🛠️ Useful Commands

### Database Management
```bash
cd backend

# Reset entire database (drops all collections, clears uploads, creates admin)
npm run reset-db

# Create new admin user
npm run create-admin

# Fix admin password if you forgot it
npm run fix-admin
```

### Development
```bash
# Backend
cd backend
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm start            # Run production build

# Frontend
cd frontend
npm start            # Start development server
npm run build        # Build for production
```

### Full Rebuild (if having issues)
```bash
# From project root
npm run clean:all    # Remove all node_modules and builds
npm run install:all  # Reinstall all dependencies
npm run build:all    # Build backend and frontend
```

### Process Management (Production)
```bash
# Using PM2
pm2 start ecosystem.config.js --env production
pm2 stop lb2d-backend
pm2 restart lb2d-backend
pm2 logs lb2d-backend
pm2 monit
```

## 🚀 Deployment

### Production Deployment
```bash
# Make deployment script executable
chmod +x backend/scripts/production-deploy.sh

# Run deployment
cd backend && ./scripts/production-deploy.sh
```

### Using PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js --env production

# Monitor processes
pm2 monit

# View logs
pm2 logs
```

### Docker (Optional)
```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 📊 Project Structure

```
LB2D/
├── backend/
│   ├── src/
│   │   ├── config/           # Configuration management
│   │   ├── controllers/      # Route controllers
│   │   ├── middleware/       # Custom middleware
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Helper utilities
│   │   ├── validators/      # Input validation
│   │   └── server.ts        # Application entry point
│   ├── scripts/             # Deployment and utility scripts
│   └── uploads/             # File uploads
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── hooks/           # Custom hooks
│   │   ├── pages/           # Page components
│   │   ├── store/           # Redux store
│   │   ├── utils/           # Frontend utilities
│   │   └── App.tsx          # Main application
│   └── public/              # Static assets
└── ecosystem.config.js      # PM2 configuration
```

## 🔐 Security Features

- **Authentication**: JWT with refresh token rotation
- **Authorization**: Role-based access control (RBAC)
- **Rate Limiting**: API and user-specific rate limits
- **Input Validation**: Comprehensive input sanitization
- **Security Headers**: XSS, CSRF, and clickjacking protection
- **Password Security**: Bcrypt hashing with salt rounds
- **Brute Force Protection**: Login attempt limiting
- **CORS**: Configured for secure cross-origin requests

## 📱 API Documentation

### Authentication Endpoints
```
POST /api/auth/register           # User registration
POST /api/auth/login              # User login
POST /api/auth/logout             # User logout
POST /api/auth/refresh            # Refresh access token
GET  /api/auth/verify-email       # Email verification
POST /api/auth/forgot-password    # Password reset request
POST /api/auth/reset-password     # Password reset
GET  /api/auth/me                 # Get current user profile
```

### Course Endpoints
```
GET    /api/courses               # List all courses
GET    /api/courses/:id           # Get course details
POST   /api/courses               # Create course (Admin/Supervisor)
PUT    /api/courses/:id           # Update course (Admin/Supervisor)
DELETE /api/courses/:id           # Delete course (Admin)
POST   /api/courses/:id/enroll    # Enroll in course
GET    /api/courses/:id/progress  # Get course progress
```

### Assessment & Certificate Endpoints
```
GET  /api/tests                   # List available tests
GET  /api/tests/:id               # Get test details
POST /api/tests/:id/submit        # Submit test answers
GET  /api/tests/:id/results       # Get test results
GET  /api/tests/history           # Get user's test history
GET  /api/tests/certificate/:id   # Download certificate PDF
```

### Video Endpoints
```
GET    /api/videos                # List all videos
GET    /api/videos/:id            # Get video details
POST   /api/videos                # Upload video (Supervisor)
PUT    /api/videos/:id            # Update video (Supervisor)
DELETE /api/videos/:id            # Delete video (Supervisor/Admin)
POST   /api/videos/:id/progress   # Update video progress
GET    /api/videos/:id/comments   # Get video comments
POST   /api/videos/:id/comments   # Add comment
```

### Notification Endpoints
```
GET    /api/notifications         # Get user notifications
PUT    /api/notifications/:id/read # Mark notification as read
PUT    /api/notifications/read-all # Mark all as read
DELETE /api/notifications/:id     # Delete notification
```

### Admin Endpoints
```
GET    /api/admin/users           # List all users
GET    /api/admin/stats           # Platform statistics
PUT    /api/admin/users/:id       # Update user role/status
POST   /api/admin/approve-role    # Approve role request
DELETE /api/admin/users/:id       # Delete user
```

### WebSocket Events
```
connect                           # Client connects
authenticate                      # Authenticate WebSocket connection
notification                      # Receive real-time notification
notification:read                 # Mark notification as read
disconnect                        # Client disconnects
```

## 🧪 Testing

```bash
# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# Run E2E tests
npm run test:e2e
```

## 📈 Monitoring & Logs

### Application Logs
```bash
# View combined logs
tail -f backend/logs/combined.log

# View error logs only
tail -f backend/logs/error.log

# PM2 logs
pm2 logs lb2d-backend
```

### Health Checks
```bash
# Check server health
curl http://localhost:5000/health

# Check API status
curl http://localhost:5000/api
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Use conventional commit messages
- Maintain code documentation
- Follow the existing code style

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check MongoDB is running
   sudo systemctl status mongod  # Linux
   brew services list           # macOS

   # Verify connection string in .env
   cat backend/.env | grep MONGODB_URI

   # Test connection
   cd backend && npm run dev
   ```

2. **Cannot Login / Admin Password Issues**
   ```bash
   # Reset admin password
   cd backend
   npm run fix-admin

   # Or reset entire database
   npm run reset-db
   ```

3. **Email Not Sending**
   ```bash
   # Check email configuration in backend/.env
   # For Gmail, use App Password (not regular password)
   # Enable "Less secure app access" or use App Passwords

   # Test email endpoint
   curl http://localhost:5000/test-email/your-email@example.com
   ```

4. **Port Already in Use**
   ```bash
   # Find process using port 5000 (backend)
   lsof -i :5000        # macOS/Linux
   netstat -ano | findstr :5000  # Windows

   # Kill process
   kill -9 <PID>        # macOS/Linux
   taskkill /PID <PID> /F  # Windows

   # Or change port in backend/.env
   PORT=5001
   ```

5. **Build Failures / TypeScript Errors**
   ```bash
   # Clear everything and reinstall
   rm -rf node_modules package-lock.json
   npm install

   # Rebuild TypeScript
   npm run build

   # From project root (full cleanup)
   npm run clean:all
   npm run install:all
   npm run build:all
   ```

6. **WebSocket Connection Failed**
   ```bash
   # Check if backend is running
   curl http://localhost:5000/health

   # Check CORS settings in backend/.env
   # Make sure FRONTEND_URL matches your frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

7. **File Upload Issues**
   ```bash
   # Check uploads directory exists and has permissions
   mkdir -p backend/uploads/videos
   mkdir -p backend/uploads/resources
   chmod -R 755 backend/uploads
   ```

8. **Fresh Start Needed**
   ```bash
   # Complete database reset (removes all data!)
   cd backend
   npm run reset-db

   # This will:
   # - Drop all collections
   # - Clear uploaded files
   # - Clear log files
   # - Create fresh admin user
   ```

### Performance Optimization

- **Enable Gzip**: Configure nginx/Apache for compression
- **Use CDN**: Serve static assets from CDN
- **Database Indexing**: Add indexes for frequently queried fields
- **Caching**: Implement Redis for session storage
- **Load Balancing**: Use PM2 cluster mode

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check existing documentation
- Review the troubleshooting guide

## 🎨 Design Philosophy

This project follows a **clean, professional design approach**:
- ❌ No unnecessary emojis or decorative icons
- ❌ No excessive animations or effects
- ✅ Clean, informative interfaces
- ✅ Professional color schemes and layouts
- ✅ Focus on functionality and user experience
- ✅ Accessible and responsive design
- ✅ Fast loading times and optimized performance

## 🎯 Roadmap

### Recently Completed ✅
- [x] Bidirectional real-time notifications (WebSocket)
- [x] Clean, professional UI redesign
- [x] Certificate download system
- [x] Database reset and management tools
- [x] Comprehensive security middleware
- [x] Video progress tracking
- [x] Student analytics dashboard

### In Progress 🚧
- [ ] Payment integration testing
- [ ] Advanced course analytics
- [ ] Email notification templates

### Future Plans 🔮
- [ ] Mobile application (React Native)
- [ ] Multi-language support (beyond German)
- [ ] AI-powered learning recommendations
- [ ] Offline learning capabilities
- [ ] Voice recognition for pronunciation
- [ ] Progressive Web App (PWA)
- [ ] Live video sessions
- [ ] Peer-to-peer learning features
- [ ] Gamification system
- [ ] Integration with external language APIs

## 🔄 Recent Updates

**October 2025:**
- Implemented bidirectional WebSocket notifications
- Removed all console.log statements across codebase
- Redesigned Certificates page (1177 → 473 lines)
- Cleaned up SupervisorDashboard video cards
- Updated student profile modals
- Improved database management tools

## 📊 Project Status

- **Current Version**: 1.0.0
- **Status**: Active Development
- **Production Ready**: Yes (with proper environment configuration)
- **Last Updated**: October 2025
- **Contributors**: Development Team

---

Built with ❤️ for language learners worldwide

**For detailed setup instructions, see [FRESH_START.md](FRESH_START.md)**