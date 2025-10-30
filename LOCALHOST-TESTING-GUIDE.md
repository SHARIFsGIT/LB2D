# >ê Localhost Testing Guide - LB2D Platform

Complete guide to test the enterprise-grade Learn Bangla to Deutsch platform on your local machine.

---

## =Ë Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Testing Features](#testing-features)
6. [Troubleshooting](#troubleshooting)
7. [Testing Checklist](#testing-checklist)

---

##  Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   ```bash
   node --version  # Should be v18+
   ```

2. **npm** (v9 or higher)
   ```bash
   npm --version   # Should be v9+
   ```

3. **MongoDB** (Local or Cloud)
   - Local: MongoDB Community Server
   - Cloud: MongoDB Atlas (free tier)

4. **Git** (for version control)
   ```bash
   git --version
   ```

### Optional (for advanced testing)

- **Docker** & **Docker Compose** (for containerized testing)
- **Postman** or **Thunder Client** (for API testing)

---

## =€ Quick Start

### Option 1: Run Both Services (Recommended)

Open **TWO terminal windows** and run:

**Terminal 1 - Backend:**
```bash
cd P:/LB2D/backend
npm install
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd P:/LB2D/frontend-nextjs
npm install
npm run dev
```

Then open: **http://localhost:3000**

### Option 2: Step-by-Step Setup

Follow the detailed instructions below for each service.

---

## =' Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd P:/LB2D/backend
```

### Step 2: Install Dependencies

```bash
npm install
```

**Expected output:**
```
added 245 packages in 15s
```

### Step 3: Configure Environment Variables

Check if `.env` file exists:
```bash
cat .env
```

**Required variables:**
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/lb2d
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lb2d

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key

# Security
CORS_ORIGIN=http://localhost:3000

# Email (Optional for testing)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Stripe (Optional for payment testing)
STRIPE_SECRET_KEY=sk_test_your_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Step 4: Start MongoDB

**If using local MongoDB:**
```bash
# Windows
net start MongoDB

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

**If using MongoDB Atlas:**
- Ensure your connection string is in `.env`
- Whitelist your IP address in Atlas dashboard

### Step 5: Verify Database Connection

```bash
# Test MongoDB connection
mongo --eval "db.version()"

# Or if using MongoDB Atlas, the backend will connect automatically
```

### Step 6: Start Backend Server

```bash
npm run dev
```

**Expected output:**
```
Server running on port 5000
MongoDB connected successfully
```

**Test backend health:**
```bash
curl http://localhost:5000/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-29T...",
  "environment": "development"
}
```

### Optional: Create Admin User

```bash
npm run create-admin
```

**Default admin credentials:**
- Email: `admin@lb2d.com`
- Password: `Admin@123`

---

## <¨ Frontend Setup

### Step 1: Navigate to Frontend Directory

```bash
cd P:/LB2D/frontend-nextjs
```

### Step 2: Install Dependencies

```bash
npm install
```

**Expected output:**
```
added 1543 packages in 45s
```

### Step 3: Verify Environment Variables

Check `.env.local` file:
```bash
cat .env.local
```

**Key variables (already configured):**
```env
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
NEXT_PUBLIC_WS_URL="ws://localhost:5000"
```

### Step 4: Build (Optional - for production testing)

```bash
npm run build
```

**Expected output:**
```
 Compiled successfully
 Collecting page data
 Generating static pages
 Finalizing page optimization
```

### Step 5: Start Development Server

```bash
npm run dev
```

**Expected output:**
```
² Next.js 14.2.33
- Local:        http://localhost:3000
- Environments: .env.local

 Ready in 3.2s
```

### Step 6: Open in Browser

Visit: **http://localhost:3000**

You should see the **Learn Bangla to Deutsch** landing page! <‰

---

## >ê Testing Features

### 1. Test Landing Page

**URL:** http://localhost:3000

**Check:**
-  Hero section loads
-  Course cards display
-  Navigation works
-  Animations are smooth
-  Responsive on mobile (F12 ’ Toggle device toolbar)

### 2. Test Authentication

#### Register New User

1. Click **"Get Started"** or **"Register"**
2. Fill in the registration form:
   - First Name: Test
   - Last Name: User
   - Email: test@example.com
   - Password: Test@123
3. Click **"Register"**
4. Check for success message

#### Login

1. Go to **Login** page
2. Use credentials:
   - Email: test@example.com
   - Password: Test@123
3. Click **"Login"**
4. Should redirect to dashboard

#### Test Admin Login

1. Use admin credentials:
   - Email: admin@lb2d.com
   - Password: Admin@123
2. Should redirect to admin dashboard

### 3. Test SEO Features

#### View Page Source
```bash
# Right-click on page ’ "View Page Source"
```

**Check for:**
-  `<meta property="og:title">` - Open Graph tags
-  `<script type="application/ld+json">` - Structured data
-  `<meta name="description">` - Meta description
-  `<link rel="canonical">` - Canonical URL

#### Test Sitemap
Visit: http://localhost:3000/sitemap.xml

**Should show:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>http://localhost:3000</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ...
</urlset>
```

#### Test Robots.txt
Visit: http://localhost:3000/robots.txt

**Should show:**
```
User-agent: *
Allow: /
Disallow: /admin
...
```

### 4. Test Performance Features

#### Web Vitals Monitoring

1. Open browser console (F12)
2. Navigate pages
3. Check for Web Vitals logs:
   ```
   =Ê Web Vital: {name: "LCP", value: 1234, rating: "good"}
   ```

#### Check Core Web Vitals

1. Open Chrome DevTools (F12)
2. Go to **Lighthouse** tab
3. Click **"Generate report"**
4. Check scores:
   - Performance: Should be 90+
   - SEO: Should be 95+
   - Best Practices: Should be 90+
   - Accessibility: Should be 85+

### 5. Test Error Boundary

**Method 1: Trigger Error in Code**
```typescript
// Temporarily add this to any component:
throw new Error('Test error boundary');
```

**Should show:**
-   Error boundary fallback UI
- "Try Again" and "Go Home" buttons
- Error logged to console (in development)

**Method 2: Test 404 Page**
Visit: http://localhost:3000/this-page-does-not-exist

### 6. Test API Endpoints

#### Health Check
```bash
curl http://localhost:3000/api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-29T...",
  "uptime": 123.456,
  "memory": {...}
}
```

#### Web Vitals Endpoint
```bash
curl -X POST http://localhost:3000/api/analytics/web-vitals \
  -H "Content-Type: application/json" \
  -d '{"name":"LCP","value":1234,"rating":"good","delta":100,"id":"abc","timestamp":1234567890}'
```

### 7. Test Security Headers

```bash
curl -I http://localhost:3000
```

**Should include:**
```
X-DNS-Prefetch-Control: on
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; script-src...
```

### 8. Test Analytics (Optional)

If you have Google Analytics configured:

1. Add your GA_ID to `.env.local`:
   ```env
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```

2. Restart dev server

3. Check Network tab for GA requests:
   - Google Analytics ’ gtag/js
   - Events being sent

### 9. Test Courses Feature

1. **View Courses:** http://localhost:3000/courses
2. **Filter by level** (A1, A2, B1, B2, C1, C2)
3. **Click "Enroll Now"**
4. **Check enrollment page**

### 10. Test Dashboard

#### Student Dashboard
- URL: http://localhost:3000/dashboard
- Should show: Quick actions, rankings, stats

#### Supervisor Dashboard
- URL: http://localhost:3000/supervisor
- Should show: Student stats, course management

#### Admin Dashboard
- URL: http://localhost:3000/admin
- Should show: User management, system stats

### 11. Test Assessment System

1. Navigate to a course with quiz
2. Click "Take Quiz"
3. Answer questions (30s timer per question)
4. Submit quiz
5. Check results page

---

## = Troubleshooting

### Backend Issues

#### Port 5000 Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5000 | xargs kill -9
```

Or change port in `backend/.env`:
```env
PORT=5001
```

And update frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:5001/api"
```

#### MongoDB Connection Failed

**Error:**
```
MongoNetworkError: failed to connect to server
```

**Solutions:**

1. **Start MongoDB:**
   ```bash
   # Windows
   net start MongoDB

   # macOS
   brew services start mongodb-community

   # Linux
   sudo systemctl start mongod
   ```

2. **Check MongoDB status:**
   ```bash
   mongo --eval "db.version()"
   ```

3. **Use MongoDB Atlas** (cloud):
   - Sign up at mongodb.com/cloud/atlas
   - Create free cluster
   - Get connection string
   - Update `.env`

### Frontend Issues

#### Module Not Found

**Error:**
```
Module not found: Can't resolve '@/components/...'
```

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
rm package-lock.json
npm install
```

#### Port 3000 Already in Use

**Error:**
```
Port 3000 is already in use
```

**Solution:**
```bash
# Kill process on port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

#### Build Errors

**Error:**
```
Failed to compile
```

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next
npm run build

# Check for TypeScript errors
npm run type-check

# Check for linting errors
npm run lint
```

### Environment Variable Issues

**Problem:** Features not working (Analytics, API calls, etc.)

**Solution:**

1. Verify `.env.local` exists in `frontend-nextjs/`
2. Verify `.env` exists in `backend/`
3. Restart both servers after changing env variables
4. Check for typos in variable names (must start with `NEXT_PUBLIC_` for frontend)

### CORS Errors

**Error in Browser Console:**
```
Access to fetch at 'http://localhost:5000/api/...' from origin
'http://localhost:3000' has been blocked by CORS policy
```

**Solution:**

Check `backend/.env`:
```env
CORS_ORIGIN=http://localhost:3000
```

Ensure backend has CORS middleware configured.

---

##  Testing Checklist

### Basic Functionality

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Landing page loads
- [ ] Can register new user
- [ ] Can login with credentials
- [ ] Can logout
- [ ] Navigation works

### SEO Features

- [ ] Sitemap accessible at `/sitemap.xml`
- [ ] Robots.txt accessible at `/robots.txt`
- [ ] Page source shows structured data (JSON-LD)
- [ ] Meta tags present in page source
- [ ] Open Graph tags present

### Performance

- [ ] Lighthouse score > 90
- [ ] Web Vitals logs appear in console
- [ ] Images load optimally (WebP/AVIF)
- [ ] Pages load in < 3 seconds

### Security

- [ ] Security headers present (check with `curl -I`)
- [ ] CSP header configured
- [ ] HTTPS redirects work (in production)
- [ ] No console warnings about security

### Error Handling

- [ ] Error boundary catches errors
- [ ] 404 page shows for invalid routes
- [ ] API errors show user-friendly messages
- [ ] Error logging works

### Analytics

- [ ] Health endpoint responds: `/api/health`
- [ ] Web Vitals endpoint works: `/api/analytics/web-vitals`
- [ ] Google Analytics tracking (if configured)
- [ ] Events logged in console (development mode)

### Responsive Design

- [ ] Mobile view works (< 768px)
- [ ] Tablet view works (768px - 1024px)
- [ ] Desktop view works (> 1024px)
- [ ] Touch interactions work on mobile

---

## <¯ Quick Commands Reference

### Backend Commands

```bash
cd backend

# Install dependencies
npm install

# Start development server
npm run dev

# Create admin user
npm run create-admin

# Build for production
npm run build

# Start production server
npm start
```

### Frontend Commands

```bash
cd frontend-nextjs

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run type check
npm run type-check

# Run linter
npm run lint

# Analyze bundle
ANALYZE=true npm run build

# Generate sitemap
npm run postbuild
```

---

## =Ê Expected Performance Metrics

### Development Mode

- **Initial build:** 15-30 seconds
- **Hot reload:** < 2 seconds
- **Page load:** 1-3 seconds
- **API response:** < 500ms

### Production Build

- **Build time:** 2-5 minutes
- **Bundle size:** ~500KB (gzipped)
- **First load:** < 2 seconds
- **Subsequent loads:** < 1 second

---

## <“ Next Steps After Testing

Once everything works on localhost:

1.  **Fix any issues** found during testing
2. =Ý **Document** any custom configurations
3. =€ **Deploy to staging** environment
4. >ê **Run tests** in staging
5. < **Deploy to production**

---

## =Þ Need Help?

### Common Resources

1. **Project Documentation:**
   - `ENTERPRISE-TRANSFORMATION.md` - Feature documentation
   - `aws-deployment/README.md` - Deployment guide

2. **Next.js Documentation:**
   - https://nextjs.org/docs

3. **MongoDB Documentation:**
   - https://docs.mongodb.com/

4. **Check Logs:**
   ```bash
   # Backend logs
   cd backend && npm run dev

   # Frontend logs
   cd frontend-nextjs && npm run dev
   ```

### Debug Mode

Enable verbose logging:

**Backend:**
```env
DEBUG=*
LOG_LEVEL=debug
```

**Frontend:**
```env
NEXT_PUBLIC_DEBUG=true
```

---

## <‰ Success Indicators

You'll know everything is working when:

1.  Backend shows: `Server running on port 5000`
2.  Backend shows: `MongoDB connected successfully`
3.  Frontend shows: ` Ready in 3.2s`
4.  Browser opens: `http://localhost:3000`
5.  Landing page displays correctly
6.  Can register and login
7.  No errors in browser console
8.  No errors in terminal
9.  Lighthouse score > 90
10.  All features work as expected

---

**Happy Testing! =€**

If you encounter any issues not covered in this guide, check the error messages carefully and refer to the troubleshooting section.

---

**Last Updated:** October 29, 2025
**Version:** 2.0.0 Enterprise Edition
