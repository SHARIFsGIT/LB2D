# LB2D - Learn Bangla to Deutsch

**Enterprise E-Learning Platform for Teaching German to Bengali Speakers**

A production-ready, scalable e-learning platform built with NestJS, Next.js, and modern cloud infrastructure.

---

## ⚠️ SECURITY NOTICE - READ BEFORE DEPLOYING

**IMPORTANT: This project contains demo/development credentials. Before deploying to production or pushing to public GitHub:**

1. **Never commit .env files** - They are gitignored and should never be pushed
2. **Change all demo passwords** - Default credentials (Admin123!, etc.) are for development only
3. **Rotate all API keys** - Replace with your production keys:
   - Resend/SendGrid API keys
   - AWS credentials
   - Stripe keys
   - JWT secrets
4. **Remove example credentials** - Check `.env.example` files for placeholder values
5. **Use strong passwords** - Generate random, secure passwords for production

**Demo Credentials (DEVELOPMENT ONLY):**
- Admin: `admin@lb2d.com` / `Admin123!`
- Supervisor: `supervisor@lb2d.com` / `Super123!`
- Student: `student@lb2d.com` / `Student123!`

---

## Quick Start

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker Desktop
- PostgreSQL 16 & Redis 7 (via Docker)

### Installation

```bash
# Install dependencies
pnpm install

# Setup environment files
cd apps/api && cp .env.example .env
cd ../web && cp .env.local.example .env.local

# Start infrastructure
docker-compose up -d

# Setup database
cd apps/api
pnpm prisma:generate
pnpm prisma:migrate dev

# Start development servers
pnpm dev  # Run from root (starts both API and web)
```

### Access Points
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Documentation: http://localhost:3001/api/docs

### Default Admin Credentials
```
Email: admin@lb2d.com
Password: Admin123!
```

---

## Project Structure

```
LB2D-v2/
├── apps/
│   ├── api/              # NestJS Backend (Port 3001)
│   │   ├── src/
│   │   │   ├── modules/  # Feature modules (auth, users, courses, etc.)
│   │   │   ├── common/   # Shared services (email, storage, cache)
│   │   │   └── main.ts   # Application entry point
│   │   ├── prisma/       # Database schema and migrations
│   │   └── package.json
│   │
│   └── web/              # Next.js Frontend (Port 3000)
│       ├── src/
│       │   ├── app/      # Next.js App Router pages
│       │   ├── components/ # React components
│       │   ├── store/    # Zustand state management
│       │   ├── lib/      # Utilities (API client)
│       │   └── hooks/    # Custom React hooks
│       └── package.json
│
├── packages/
│   └── tsconfig/         # Shared TypeScript configs
│
├── infrastructure/
│   ├── docker/           # Docker configurations
│   └── terraform/        # AWS infrastructure as code
│
└── tools/                # Development utilities (gitignored)
```

---

## Tech Stack

### Backend
- **Framework**: NestJS 10.x (Node.js + TypeScript)
- **Database**: PostgreSQL 16 with Prisma ORM
- **Cache**: Redis 7
- **Storage**: AWS S3 + CloudFront CDN
- **Authentication**: JWT with Passport.js (max 3 devices)
- **Payments**: Stripe + Bangladesh Mobile Banking (bKash, Nagad, Rocket)
- **Email**: Resend API (primary), SendGrid (backup), Gmail SMTP (fallback)
- **WebSocket**: Socket.IO for real-time notifications

### Frontend
- **Framework**: Next.js 15 (React 18, App Router)
- **Language**: TypeScript 5.3
- **Styling**: TailwindCSS 3.4
- **State**: Zustand + TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **UI**: Radix UI primitives
- **HTTP**: Axios with auto token refresh

### Infrastructure
- **Monorepo**: Turborepo + pnpm workspaces
- **Containers**: Docker + Docker Compose
- **Cloud**: AWS (ECS Fargate, RDS, S3, CloudFront, Route 53)
- **CI/CD**: GitHub Actions

---

## Core Features

### Authentication & User Management
- JWT authentication with refresh tokens (15min access, 7 day refresh)
- Device session tracking (max 3 concurrent devices)
- Email verification and password reset with phone verification
- Role-based access control (ADMIN, SUPERVISOR, STUDENT, PENDING)
- Role change approval workflow

### Course Management
- Multi-level courses (BEGINNER, INTERMEDIATE, ADVANCED, EXPERT)
- SEO-optimized with slugs, meta tags, structured data
- Pricing with discount support
- Course reviews and ratings (5-star system)
- Learning paths (curated course sequences)
- Tag-based organization

### Video Platform
- AWS S3 upload and streaming via CloudFront
- Video approval workflow (PENDING, APPROVED, REJECTED)
- Progress tracking (percentage, current time)
- Nested comments system
- Bookmarks and timestamped notes

### Assessment System
- 5 question types: MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, ESSAY, FILL_IN_BLANK
- Automatic scoring with passing score configuration
- Attempt history with max attempts limit
- Duration limits
- Certificate generation upon completion

### Payment Integration
- Stripe for international payments
- Bangladesh mobile banking (bKash, Nagad, Rocket)
- Payment history and invoicing
- Automatic enrollment on payment success

### Social Learning & Gamification
- Discussion forums with Q&A support and best answer marking
- Follow system (students and instructors)
- Activity feed (social timeline)
- Achievement system (8+ achievements with rarity levels)
- Points, XP, and level progression
- Daily streaks and habit tracking
- Leaderboards (all-time, monthly, weekly)

### Analytics & Reporting
- Role-specific dashboards (Admin, Supervisor, Student)
- Enrollment statistics
- Revenue tracking
- Progress metrics
- User activity analytics
- Review analytics and moderation

---

## API Overview

### 17 Core Modules

1. **Authentication** (`/api/auth/*`)
   - Register, Login, Logout, Token Refresh
   - Email Verification, Password Reset
   - Device Session Management

2. **Users** (`/api/users/*`)
   - Profile CRUD, Role Management
   - User Statistics, Ban/Unban

3. **Courses** (`/api/courses/*`)
   - Course CRUD, Enrollment, Progress

4. **Videos** (`/api/videos/*`)
   - Upload, Streaming, Approval, Comments

5. **Resources** (`/api/resources/*`)
   - File Upload, Approval, Progress

6. **Quizzes** (`/api/quizzes/*`)
   - Quiz CRUD, Submissions, Attempts

7. **Payments** (`/api/payments/*`)
   - Payment Intent, Confirmation, History

8. **Certificates** (`/api/certificates/*`)
   - Generation, Verification, Delivery

9. **Notifications** (`/api/notifications/*`)
   - Real-time Notifications, Read Status

10. **Analytics** (`/api/analytics/*`)
    - Admin/Supervisor/Student Dashboards

11. **Reviews** (`/api/reviews/*`)
    - Course Reviews, Ratings, Moderation

12. **Discussions** (`/api/discussions/*`)
    - Forums, Topics, Posts, Voting

13. **Learning Paths** (`/api/learning-paths/*`)
    - Path Management, Enrollment, Progress

14. **Gamification** (`/api/gamification/*`)
    - Achievements, Leaderboards, Stats

15. **Bookmarks** (`/api/bookmarks/*`)
    - Bookmarks, Collections, Tags

16. **Social** (`/api/social/*`)
    - Follow, Activity Feed, Shared Notes

17. **Contact** (`/api/contact/*`)
    - Contact Form, Messages, Responses

Full API documentation available at: http://localhost:3001/api/docs

---

## Environment Configuration

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/lb2d_v2
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Email (Resend - Recommended)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@lb2d.com

# Email (Gmail SMTP - Fallback)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# AWS S3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=lb2d-assets
AWS_CLOUDFRONT_URL=https://cdn.lb2d.com

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# App
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

### Frontend (.env.local)
```env
# API
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Optional
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://...
```

---

## Email Setup

### Option 1: Resend API (Recommended)
1. Sign up at https://resend.com
2. Get API key (starts with `re_`)
3. Add to `.env`: `RESEND_API_KEY=re_xxxxx`
4. Test: `cd apps/api && pnpm test:email`

### Option 2: Gmail SMTP (Fallback)
1. Enable 2FA on Google account
2. Generate App Password at https://myaccount.google.com/apppasswords
3. Add to `.env`:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=16-char-app-password
   ```
4. Test: `cd apps/api && pnpm test:email`

---

## Database Management

### Migrations
```bash
# Create migration
pnpm prisma:migrate dev --name migration_name

# Deploy migrations (production)
pnpm prisma:migrate deploy

# Reset database
pnpm prisma:migrate reset
```

### Prisma Studio
```bash
pnpm prisma:studio  # Opens at http://localhost:5555
```

### Seed Data
```bash
pnpm prisma:seed
```

### Admin Management
```bash
# Create initial admin (interactive)
cd tools/prisma-utils
npx ts-node create-initial-admin.ts

# Verify admin email
npx ts-node verify-admin-email.ts
```

---

## Deployment

### AWS Production Setup

#### Infrastructure (Terraform)
```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

Creates:
- VPC with subnets
- RDS PostgreSQL (Multi-AZ)
- ElastiCache Redis
- S3 buckets
- CloudFront CDN
- ECS Fargate cluster
- Application Load Balancer
- Security groups & IAM roles

#### Backend Deployment (ECS)
```bash
# Build Docker image
docker build -t lb2d-api -f infrastructure/docker/Dockerfile.api .

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker tag lb2d-api:latest <account>.dkr.ecr.us-east-1.amazonaws.com/lb2d-api:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/lb2d-api:latest

# Update ECS service
aws ecs update-service --cluster lb2d-cluster --service lb2d-api-service --force-new-deployment
```

#### Frontend Deployment (Vercel)
```bash
npm i -g vercel
cd apps/web
vercel --prod
```

### DNS Configuration (Route 53)
```
lb2d.com          → CloudFront (Frontend)
api.lb2d.com      → ALB (Backend)
www.lb2d.com      → Redirect to lb2d.com
```

---

## Security

### Authentication
- JWT with short-lived access tokens (15min)
- Refresh tokens (7 days)
- Device fingerprinting (max 3 devices)
- Email verification required

### Data Protection
- Bcrypt password hashing (12 rounds)
- SQL injection prevention (Prisma ORM)
- XSS protection (input sanitization)
- CSRF protection (origin validation)
- Rate limiting (3/sec, 20/10sec, 100/min)
- Helmet security headers

### OWASP Top 10 Compliant
- Implemented security middleware
- Content Security Policy
- Strict Transport Security
- X-Content-Type-Options
- X-Frame-Options

---

## Performance Optimization

- **Caching**: Redis for sessions and API responses
- **CDN**: CloudFront for static assets and media
- **Database**: Indexed queries, connection pooling
- **Frontend**: Code splitting, image optimization, lazy loading
- **Scaling**: Horizontal scaling, load balancing, database replication

---

## Testing

```bash
# Backend tests
cd apps/api
pnpm test
pnpm test:watch
pnpm test:cov

# Frontend tests
cd apps/web
pnpm test
pnpm test:watch

# E2E tests
pnpm test:e2e

# Build verification
pnpm build
```

---

## Available Scripts

### Root Level
```bash
pnpm install        # Install all dependencies
pnpm dev            # Start both API and web in dev mode
pnpm build          # Build all apps
pnpm test           # Run all tests
pnpm lint           # Lint all apps
pnpm format         # Format code with Prettier
```

### API (apps/api)
```bash
pnpm dev            # Start API dev server
pnpm build          # Build for production
pnpm start          # Start production server
pnpm prisma:generate  # Generate Prisma client
pnpm prisma:migrate   # Run migrations
pnpm prisma:studio    # Open Prisma Studio
pnpm test:email       # Test email configuration
```

### Web (apps/web)
```bash
pnpm dev            # Start Next.js dev server
pnpm build          # Build for production
pnpm start          # Start production server
pnpm lint           # Run ESLint
```

---

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Verify PostgreSQL is running: `docker-compose ps`
- Check DATABASE_URL in .env
- Restart Docker: `docker-compose restart`

**Email Not Sending**
- Run email test: `cd apps/api && pnpm test:email`
- Check RESEND_API_KEY or Gmail app password
- Verify EMAIL_FROM matches your domain

**API 401 Errors**
- Clear browser storage/cookies
- Check JWT_SECRET is set
- Verify token hasn't expired

**Build Errors**
- Clear caches: `rm -rf node_modules .next dist`
- Reinstall: `pnpm install`
- Regenerate Prisma: `cd apps/api && pnpm prisma:generate`

**Port Already in Use**
- Kill process: `npx kill-port 3000` or `npx kill-port 3001`
- Change port in .env or package.json

---

## Project Statistics

- **Backend**: 17 modules, 74+ API endpoints
- **Frontend**: 25+ pages, 50+ components
- **Features**: 220+ implemented features
- **Database**: 34 Prisma models
- **Code Quality**: TypeScript strict mode, ESLint, Prettier

---

## License

Copyright © 2025 LB2D. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## Support

- **API Documentation**: http://localhost:3001/api/docs
- **Issues**: Report via internal issue tracking system
- **Email Test**: `cd apps/api && pnpm test:email`

---

**LB2D v2.0 - Built for Scale, Performance, and Security**
