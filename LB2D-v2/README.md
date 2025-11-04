# LB2D - Learn Bangla to Deutsch

**Enterprise E-Learning Platform**

A production-ready, scalable e-learning platform built with modern technologies and cloud-native architecture. Designed for deployment on AWS infrastructure with enterprise-grade security, performance, and SEO optimization.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.0-black)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10+-red)](https://nestjs.com/)
[![License](https://img.shields.io/badge/License-Proprietary-yellow)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Performance](#performance)
- [License](#license)

---

## Overview

LB2D is an enterprise-grade e-learning platform specifically designed for teaching German language to Bengali speakers. The platform supports multiple user roles (students, supervisors, administrators) with comprehensive course management, video streaming, interactive quizzes, and integrated payment processing.

### Key Characteristics

- **Microservices-ready**: Modular architecture with clear separation of concerns
- **Cloud-native**: Designed for AWS deployment (ECS, RDS, S3, CloudFront)
- **Scalable**: Horizontal scaling support with Redis caching and CDN integration
- **SEO-optimized**: Server-side rendering, dynamic sitemaps, structured data
- **Enterprise security**: OWASP Top 10 compliant, JWT authentication, device tracking

---

## Architecture

### System Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Next.js App   │────▶ │   NestJS API     │────▶ │   PostgreSQL    │
│   (Frontend)    │      │   (Backend)      │      │   (Database)    │
└─────────────────┘      └──────────────────┘      └─────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐      ┌──────────────────┐
│   CloudFront    │      │   Redis Cache    │
│   (CDN)         │      │   (Sessions)     │
└─────────────────┘      └──────────────────┘
         │
         ▼
┌─────────────────┐
│   AWS S3        │
│   (Storage)     │
└─────────────────┘
```

### Monorepo Structure

```
lb2d-v2/
├── apps/
│   ├── api/          # NestJS backend API
│   └── web/          # Next.js frontend application
├── packages/
│   └── tsconfig/     # Shared TypeScript configurations
├── infrastructure/
│   ├── docker/       # Docker configurations
│   └── terraform/    # Infrastructure as Code
└── scripts/          # Automation scripts
```

---

## Tech Stack

### Backend

- **Framework**: NestJS 10.x (Node.js, TypeScript)
- **Database**: PostgreSQL 16 with Prisma ORM
- **Cache**: Redis 7
- **Storage**: AWS S3 + CloudFront CDN
- **Authentication**: JWT with Passport.js
- **Payments**: Stripe API + Mobile Banking Integration
- **Email**: Resend API with SendGrid fallback
- **Real-time**: Socket.IO WebSocket

### Frontend

- **Framework**: Next.js 15 (React 18, App Router)
- **Language**: TypeScript 5.3
- **Styling**: TailwindCSS 3.4 with custom design system
- **State Management**: Zustand + TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **UI Components**: Radix UI primitives
- **HTTP Client**: Axios with interceptors

### Infrastructure

- **Orchestration**: Turborepo (monorepo management)
- **Package Manager**: pnpm 8.x
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Cloud**: AWS (ECS Fargate, RDS, S3, CloudFront, Route 53)

---

## Features

### Course Management
- Create, update, and delete courses with rich metadata
- Multi-level course structure (Beginner, Intermediate, Advanced, Expert)
- Course pricing with discount support
- SEO-optimized course pages with schema markup
- **NEW:** Course reviews and ratings (5-star system)
- **NEW:** Learning paths and course sequences
- **NEW:** Tag-based organization and discovery

### Video Platform
- AWS S3 video upload and streaming
- Progress tracking per video
- Comment system with moderation
- Supervisor approval workflow
- **NEW:** Video bookmarks and timestamped notes
- **NEW:** Course-specific discussions

### Assessment System
- Interactive quizzes with multiple question types
- Automatic scoring and feedback
- Progress tracking and attempt history
- Certificate generation upon completion
- **NEW:** Achievement system with badges and points

### Social Learning
- **NEW:** Discussion forums with Q&A support
- **NEW:** Follow system (follow students and instructors)
- **NEW:** Activity feed (social timeline)
- **NEW:** User profiles with public activity
- **NEW:** Review helpfulness voting

### Gamification & Engagement
- **NEW:** Achievement and badge system (8+ achievements)
- **NEW:** Points, XP, and level progression
- **NEW:** Daily streaks and habit tracking
- **NEW:** Leaderboards (all-time, monthly, weekly)
- **NEW:** Progress visualization and milestones

### Content Discovery
- **NEW:** Tag-based filtering and search
- **NEW:** Bookmarks and collections
- **NEW:** Learning paths (curated course sequences)
- **NEW:** Course recommendations
- Advanced search with filters

### Payment Integration
- Stripe payment processing
- Mobile banking support (bKash, Nagad, Rocket)
- Payment history and invoicing
- Automated enrollment upon payment

### User Management
- Role-based access control (Student, Supervisor, Admin)
- Profile management with avatar support
- Device session tracking (max 3 concurrent devices)
- Email verification and password reset

### Analytics & Reporting
- Student progress dashboards
- Supervisor revenue analytics
- Admin platform statistics
- **NEW:** Review analytics and moderation
- **NEW:** Engagement metrics and leaderboards
- Export capabilities

---

## Getting Started

### Prerequisites

- **Node.js**: >= 20.0.0
- **pnpm**: >= 8.0.0
- **Docker Desktop**: Latest version
- **PostgreSQL**: 16.x (via Docker)
- **Redis**: 7.x (via Docker)

### Local Development Setup

#### 1. Clone and Install Dependencies

```bash
# Clone repository
git clone <repository-url>
cd LB2D-v2

# Install dependencies using pnpm workspaces
pnpm install
```

#### 2. Environment Configuration

**Backend (.env):**
```bash
cd apps/api
cp .env.example .env
# Edit .env with your configuration
```

**Frontend (.env.local):**
```bash
cd apps/web
cp .env.local.example .env.local
# Configure API URL and other environment variables
```

#### 3. Start Infrastructure Services

```bash
# Start PostgreSQL and Redis using Docker Compose
docker-compose up -d

# Verify services are running
docker-compose ps
```

#### 4. Database Setup

```bash
cd apps/api

# Generate Prisma Client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate dev

# Seed database with sample data
pnpm prisma:seed
```

#### 5. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd apps/api
pnpm dev
```

**Terminal 2 - Frontend:**
```bash
cd apps/web
pnpm dev
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | See test accounts below |
| Backend API | http://localhost:3001 | - |
| API Documentation | http://localhost:3001/api/docs | - |
| PgAdmin | http://localhost:5050 | admin@lb2d.com / admin |
| Redis Commander | http://localhost:8081 | - |

### Test Accounts

```bash
# Administrator
Email: admin@lb2d.com
Password: Admin123!

# Supervisor
Email: supervisor@lb2d.com
Password: Super123!

# Student
Email: student@lb2d.com
Password: Student123!
```

---

## Deployment

### Production Deployment Guide

For complete deployment instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

### AWS Infrastructure

The platform is designed for deployment on AWS using the following services:

- **Compute**: ECS Fargate (containerized API)
- **Database**: RDS PostgreSQL (Multi-AZ for high availability)
- **Cache**: ElastiCache Redis (for sessions and caching)
- **Storage**: S3 (video and resource files)
- **CDN**: CloudFront (global content delivery)
- **DNS**: Route 53 (domain management)
- **Email**: SES (transactional emails)

### Frontend Deployment

**Recommended**: Deploy to Vercel for optimal Next.js performance

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
cd apps/web
vercel --prod
```

**Alternative**: Deploy to AWS Amplify or any Node.js hosting platform

### Backend Deployment

Build and deploy Docker container to AWS ECS:

```bash
# Build Docker image
cd apps/api
docker build -t lb2d-api:latest -f ../../infrastructure/docker/Dockerfile.api .

# Tag and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ecr-url>
docker tag lb2d-api:latest <ecr-url>/lb2d-api:latest
docker push <ecr-url>/lb2d-api:latest
```

---

## API Documentation

The API is fully documented using OpenAPI (Swagger) specification.

- **Local**: http://localhost:3001/api/docs
- **Production**: https://api.yourdomain.com/api/docs

### API Modules

1. **Authentication** (`/api/auth/*`)
   - Login, Register, Email Verification
   - Password Reset, Refresh Tokens
   - Device Session Management

2. **Users** (`/api/users/*`)
   - Profile Management
   - Role Changes
   - Device Management

3. **Courses** (`/api/courses/*`)
   - Course CRUD Operations
   - Enrollment Management
   - Progress Tracking

4. **Videos** (`/api/videos/*`)
   - Video Upload & Streaming
   - Progress Tracking
   - Comments & Reactions

5. **Quizzes** (`/api/quizzes/*`)
   - Quiz Creation & Management
   - Submission & Scoring
   - Attempt History

6. **Payments** (`/api/payments/*`)
   - Stripe Integration
   - Mobile Banking
   - Payment History

7. **Analytics** (`/api/analytics/*`)
   - Dashboard Statistics
   - Progress Reports
   - Revenue Analytics

---

## Security

### Authentication & Authorization

- **JWT Tokens**: Short-lived access tokens (15 minutes)
- **Refresh Tokens**: Long-lived refresh tokens (7 days)
- **Device Tracking**: Maximum 3 concurrent sessions per user
- **Role-Based Access**: Fine-grained permissions (Student, Supervisor, Admin)

### Data Security

- **Encryption**: Bcrypt password hashing (12 rounds)
- **SQL Injection**: Parameterized queries via Prisma ORM
- **XSS Protection**: Input sanitization and output encoding
- **CSRF Protection**: Token-based protection for state-changing operations
- **Rate Limiting**: Multi-tier rate limiting (global, IP, user)

### Compliance

- OWASP Top 10 security best practices
- GDPR-ready data handling
- SOC 2 Type II compatible architecture

---

## Performance

### Optimization Strategies

- **Caching**: Redis for session storage and API responses
- **CDN**: CloudFront for static assets and media files
- **Database Indexing**: Optimized indexes on frequently queried fields
- **Connection Pooling**: Prisma connection pooling for database efficiency
- **Code Splitting**: Next.js automatic code splitting
- **Image Optimization**: Next.js Image component with automatic optimization

### Scalability

- **Horizontal Scaling**: Stateless API design supports multiple instances
- **Load Balancing**: Application Load Balancer distributes traffic
- **Database Replication**: Read replicas for read-heavy operations
- **Async Processing**: Background jobs for heavy operations (email, certificates)

---

## Testing

For comprehensive testing instructions, see [TESTING_GUIDE_LOCAL.md](./TESTING_GUIDE_LOCAL.md).

### Test Coverage

```bash
# Run backend tests
cd apps/api
pnpm test

# Run frontend tests
cd apps/web
pnpm test

# Run end-to-end tests
pnpm test:e2e
```

---

## Contributing

This is a proprietary project. For internal contributions:

1. Create a feature branch from `main`
2. Follow the established code style and conventions
3. Write tests for new features
4. Submit a pull request with clear description
5. Ensure CI/CD pipeline passes

### Code Style

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with Airbnb configuration
- **Formatting**: Prettier with predefined rules
- **Commits**: Conventional Commits specification

---

## License

Copyright © 2025 LB2D. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use of this software is strictly prohibited.

---

## Support

- **Documentation**: See `TESTING_GUIDE_LOCAL.md` and `DEPLOYMENT_GUIDE.md`
- **API Reference**: http://localhost:3001/api/docs
- **Issues**: Report via internal issue tracking system

---

**LB2D v2.0 - Enterprise E-Learning Platform**

Built with modern technologies for scale, performance, and security.
