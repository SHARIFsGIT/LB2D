# LB2D - Learn Bangla to Deutsch Platform

A comprehensive language learning platform for Bengali speakers learning German, built with modern web technologies and production-ready architecture.

## 🚀 Features

### For Students
- **Interactive Courses**: Structured German learning modules
- **Assessments & Quizzes**: Progress tracking and evaluation
- **Video Content**: Multimedia learning resources
- **Real-time Progress**: Track your learning journey
- **Certificate Generation**: Earn certificates upon completion
- **Payment Integration**: Secure course enrollment via Stripe

### For Supervisors
- **Student Management**: Monitor student progress
- **Analytics Dashboard**: Comprehensive learning analytics
- **Content Management**: Manage courses and resources
- **Real-time Notifications**: WebSocket-based updates

### For Admins
- **Full Platform Control**: Complete administrative access
- **User Role Management**: Approve and manage user roles
- **System Analytics**: Platform-wide performance metrics
- **Content Moderation**: Review and approve content

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

## 📦 Installation

### Prerequisites
- Node.js >= 16.0.0
- MongoDB >= 4.4
- npm or yarn

### Clone Repository
```bash
git clone <repository-url>
cd LB2D
```

### Backend Setup
```bash
cd backend
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your configuration

# Build the application
npm run build

# Start development server
npm run dev

# Or start production server
npm start
```

### Frontend Setup
```bash
cd frontend
npm install

# Start development server
npm start

# Build for production
npm run build
```

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
3. The application will automatically create collections

### Admin User Setup
```bash
cd backend
node create-admin.js
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
POST /api/auth/register     # User registration
POST /api/auth/login        # User login
POST /api/auth/logout       # User logout
GET  /api/auth/verify-email # Email verification
POST /api/auth/forgot-password # Password reset request
POST /api/auth/reset-password  # Password reset
```

### Course Endpoints
```
GET  /api/courses          # List courses
GET  /api/courses/:id      # Get course details
POST /api/courses          # Create course (Admin/Supervisor)
PUT  /api/courses/:id      # Update course (Admin/Supervisor)
DELETE /api/courses/:id    # Delete course (Admin)
POST /api/courses/:id/enroll # Enroll in course
```

### Assessment Endpoints
```
GET  /api/tests           # List tests
GET  /api/tests/:id       # Get test details
POST /api/tests/:id/submit # Submit test answers
GET  /api/tests/:id/results # Get test results
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
   sudo systemctl status mongod
   
   # Verify connection string
   echo $MONGODB_URI
   ```

2. **Email Not Sending**
   ```bash
   # Test email configuration
   curl http://localhost:5000/test-email/your-email@example.com
   ```

3. **Port Already in Use**
   ```bash
   # Find process using port 5000
   lsof -i :5000
   
   # Kill process
   kill -9 <PID>
   ```

4. **Build Failures**
   ```bash
   # Clear node modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
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

## 🎯 Roadmap

- [ ] Mobile application (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] AI-powered recommendations
- [ ] Offline learning capabilities
- [ ] Voice recognition features
- [ ] Progressive Web App (PWA)

---

Built with ❤️ for language learners worldwide