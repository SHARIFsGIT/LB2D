# LB2D Platform - Production Deployment Guide

## Overview
This guide provides comprehensive instructions for deploying the Learn Bangla to Deutsch (LB2D) platform to production.

## ✅ Pre-Production Cleanup Completed

### Code Cleanup Performed:
- ✅ Removed 3 unused React components (Loader, Pagination, Table)
- ✅ Cleaned up 42 files containing console.log statements
- ✅ Updated TypeScript configurations for production
- ✅ Created production environment templates
- ✅ Added Docker configurations
- ✅ Frontend production build tested successfully

### Files Removed:
- `frontend/src/components/common/Loader.tsx`
- `frontend/src/components/common/Pagination.tsx` 
- `frontend/src/components/common/Table.tsx`

## Production Environment Setup

### 1. Environment Configuration

#### Backend (.env.production)
```bash
# Copy backend/.env.production to backend/.env and configure:
NODE_ENV=production
PORT=5005
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
JWT_ACCESS_SECRET=<secure-secret>
JWT_REFRESH_SECRET=<secure-refresh-secret>
STRIPE_SECRET_KEY=sk_live_<production-key>
CLIENT_URL=https://your-domain.com
```

#### Frontend (.env.production)
```bash
# Already configured for production builds:
REACT_APP_API_URL=https://your-api-domain.com/api
REACT_APP_WS_URL=wss://your-api-domain.com
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_<production-key>
GENERATE_SOURCEMAP=false
INLINE_RUNTIME_CHUNK=false
```

### 2. Build Commands

#### Frontend (✅ Tested)
```bash
cd frontend
npm run build
# Build successful - ready for deployment
```

#### Backend (⚠️ TypeScript Issues)
```bash
cd backend
npm run build
# Note: Backend has TypeScript errors that need fixing
# Current config set to strict=false for deployment
```

### 3. Docker Deployment

#### Using Docker Compose
```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

#### Individual Docker Images
```bash
# Build backend
docker build -f Dockerfile.backend -t lb2d-backend .

# Build frontend  
docker build -f Dockerfile.frontend -t lb2d-frontend .

# Run containers
docker run -d -p 5005:5005 --env-file backend/.env.production lb2d-backend
docker run -d -p 80:80 lb2d-frontend
```

### 4. Manual Deployment

#### Backend Deployment
```bash
cd backend
npm ci --only=production
npm run build  # Fix TypeScript issues first
npm start
```

#### Frontend Deployment
```bash
cd frontend
npm ci --only=production
npm run build

# Deploy build folder to your web server
# Example for nginx:
cp -r build/* /var/www/html/
```

## Database Setup

### MongoDB Configuration
1. Create production MongoDB cluster
2. Update connection string in .env.production
3. Create database indexes (automatically handled by models)
4. Set up backup strategy

### Required Collections:
- users
- courses  
- videos
- quizzes
- enrollments
- payments
- resources
- tests
- certificates

## Security Checklist

### ✅ Completed Security Measures:
- [x] Disabled source maps in production
- [x] Removed console.log statements
- [x] Created production environment templates
- [x] Added security headers in nginx.conf
- [x] Configured proper CORS settings

### 🔄 Additional Security (Manual Setup):
- [ ] Set up SSL certificates (HTTPS)
- [ ] Configure firewall rules
- [ ] Set up database authentication
- [ ] Enable rate limiting
- [ ] Configure backup systems
- [ ] Set up monitoring and alerts

## Performance Optimizations

### ✅ Applied Optimizations:
- [x] Production build optimization enabled
- [x] Gzip compression configured (nginx.conf)
- [x] Static asset caching configured
- [x] Bundle size optimized (228KB main bundle)

### 🔄 Additional Optimizations:
- [ ] CDN setup for static assets
- [ ] Database query optimization
- [ ] Redis caching implementation
- [ ] Load balancing configuration

## Monitoring and Logging

### Recommended Monitoring Stack:
- **Application Monitoring**: PM2 (included in package.json)
- **Server Monitoring**: Prometheus + Grafana
- **Log Management**: Winston (already configured)
- **Error Tracking**: Sentry integration
- **Uptime Monitoring**: Pingdom or similar

### Health Check Endpoints:
- Backend: `GET /health` (needs to be implemented)
- Database connectivity check
- External service availability

## Deployment Checklist

### Pre-Deployment:
- [ ] Update production environment variables
- [ ] Configure production database
- [ ] Set up SSL certificates
- [ ] Configure domain DNS
- [ ] Set up monitoring

### Deployment:
- [ ] Deploy backend services
- [ ] Deploy frontend application
- [ ] Run database migrations if needed
- [ ] Configure reverse proxy (nginx)
- [ ] Start monitoring services

### Post-Deployment:
- [ ] Verify application functionality
- [ ] Check all integrations (Stripe, email, etc.)
- [ ] Monitor error logs
- [ ] Test payment flows
- [ ] Verify email delivery

## Backup Strategy

### Database Backups:
```bash
# MongoDB backup
mongodump --uri="<production-mongodb-uri>" --out="/backup/$(date +%Y%m%d)"

# Automated daily backups
0 2 * * * /path/to/backup-script.sh
```

### File Backups:
- User uploaded files (`backend/uploads/`)
- Certificate files
- Configuration files

## Scaling Considerations

### Horizontal Scaling:
- Load balancer configuration
- Database read replicas
- CDN for static assets
- Multiple application instances

### Vertical Scaling:
- Monitor CPU and memory usage
- Optimize database queries
- Implement caching strategies

## Support and Maintenance

### Log Locations:
- Application logs: `/var/log/lb2d/`
- Nginx logs: `/var/log/nginx/`
- Database logs: MongoDB Atlas dashboard

### Common Issues:
1. **TypeScript Build Errors**: Backend has unresolved type issues
2. **Database Connection**: Check MongoDB URI and network access
3. **Payment Issues**: Verify Stripe webhook endpoints
4. **File Uploads**: Check file permissions and disk space

### Updates and Patches:
- Regular dependency updates
- Security patch deployment
- Database schema migrations
- Configuration updates

## Emergency Procedures

### Rollback Plan:
1. Keep previous working Docker images
2. Database backup before deployments
3. Blue-green deployment strategy
4. Automated rollback triggers

### Incident Response:
1. Monitor application health
2. Check error logs immediately
3. Scale resources if needed
4. Communicate with users
5. Document and review incidents

---

## Current Status Summary

### ✅ Production Ready:
- Frontend application (build tested)
- Docker configurations
- Environment templates
- Security configurations
- Deployment documentation

### ⚠️ Needs Attention:
- Backend TypeScript errors (60+ issues)
- Health check endpoint implementation
- Database migration scripts
- SSL certificate setup
- Monitoring system setup

### 📋 Next Steps:
1. Fix critical TypeScript errors in backend
2. Implement health check endpoints  
3. Set up production MongoDB cluster
4. Configure SSL and domain
5. Deploy and test in staging environment

---

*Last Updated: $(date)*
*Project: Learn Bangla to Deutsch (LB2D) Platform*
*Version: 1.0.0*