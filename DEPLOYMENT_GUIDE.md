# 🚀 LB2D Deployment Guide

This guide ensures all services work in production (Vercel + Render) exactly like localhost.

## 📋 Table of Contents
1. [Backend Deployment (Render)](#backend-deployment-render)
2. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
3. [Verification Checklist](#verification-checklist)
4. [Troubleshooting](#troubleshooting)

---

## 🔧 Backend Deployment (Render)

### Environment Variables to Set on Render

Go to your Render dashboard → **lb2d-backend** → **Environment** tab and set:

```bash
# Server Configuration
NODE_ENV=production
PORT=5000

# Database Configuration
MONGODB_URI=mongodb+srv://sharifulb15_db_user:Kzcrs9mRaASDZ4nb@cluster0.bfoopao.mongodb.net/learn-bangla-to-deutsch?retryWrites=true&w=majority&appName=Cluster0

# JWT Configuration
JWT_ACCESS_SECRET=9041d909e526e93b20e8f7405e553fb26c8b58f3eacf1cdbcc4627cb8cca1c62
JWT_REFRESH_SECRET=cba08607d9f997f2e5de3e4f51420dc25c49fcc9f61a4b976de3aa1396608efa
JWT_ACCESS_EXPIRES_IN=6h
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration (SendGrid - Primary)
SENDGRID_API_KEY=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
SENDGRID_FROM_EMAIL=learnbangla2deutsch@gmail.com

# Email Configuration (Resend - Fallback)
RESEND_API_KEY=re_W1a8oiHJ_KiGNKmjwrd67opjgbKpLAAo1

# Email Configuration (Gmail SMTP - Fallback)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=learnbangla2deutsch@gmail.com
EMAIL_PASS=jynrzuctihthsffo
EMAIL_FROM=Learn Bangla to Deutsch <noreply@learnbangla2deutsch.com>

# Frontend URL (CRITICAL FOR CORS AND EMAIL LINKS)
CLIENT_URL=https://lb2d.vercel.app

# Stripe Payment Configuration
STRIPE_SECRET_KEY=sk_test_51Rxt4NLynRw7uvmjeHtOQtk8eflEOT8w6rSv1N7I25LhBul1DIQbiBYccqzPVzLL4SvzEfmXhhSRVJ94NfSGt54N00YzOhVm8U
STRIPE_PUBLISHABLE_KEY=pk_test_51Rxt4NLynRw7uvmjtBQBj7WANYIUX2A9SaQcsvWJZgG9XPYP8GolyCqBFlDni42JrdI023tUROqk76x4pC3XPDnx00HIs7R2Lk
STRIPE_WEBHOOK_SECRET=whsec_822107cb0576fe16dc7133c8103e88b06bea8d3795a6d9418920c2457412dad2

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=uploads

# Video Configuration
MAX_VIDEO_SIZE=104857600
ALLOWED_VIDEO_TYPES=mp4,avi,mov,wmv

# Admin Configuration
ADMIN_EMAIL=admin@learnbangla2deutsch.com

# Security Configuration
BCRYPT_SALT_ROUNDS=12
PAYMENT_TEST_MODE=false
```

### Important Render Settings

1. **Build Command**: `npm install && npm run build`
2. **Start Command**: `npm start` or `node dist/server.js`
3. **Auto-Deploy**: Enable (deploys on every git push)
4. **Health Check Path**: `/health`

### SendGrid Configuration (CRITICAL FOR EMAILS)

1. **Verify Sender Email**:
   - Go to https://app.sendgrid.com/settings/sender_auth/senders
   - Click "Create New Sender"
   - Use email: `learnbangla2deutsch@gmail.com`
   - Complete verification (check your email)

2. **Test Email Service**:
   ```bash
   curl https://lb2d-backend.onrender.com/health
   ```

---

## 🌐 Frontend Deployment (Vercel)

### Environment Variables to Set on Vercel

Go to your Vercel project → **Settings** → **Environment Variables** tab and add:

```bash
# API Configuration (PRODUCTION)
REACT_APP_API_URL=https://lb2d-backend.onrender.com/api
REACT_APP_WS_URL=wss://lb2d-backend.onrender.com

# Stripe Configuration (Frontend)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_51Rxt4NLynRw7uvmjtBQBj7WANYIUX2A9SaQcsvWJZgG9XPYP8GolyCqBFlDni42JrdI023tUROqk76x4pC3XPDnx00HIs7R2Lk

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_WEBSOCKET=true
REACT_APP_DEBUG_MODE=false
```

### Important Vercel Settings

1. **Framework Preset**: Create React App
2. **Build Command**: `npm run build`
3. **Output Directory**: `build`
4. **Install Command**: `npm install`
5. **Node Version**: 18.x or higher

### After Adding Environment Variables

**IMPORTANT**: After adding/changing environment variables:
1. Go to **Deployments** tab
2. Click the three dots (...) on the latest deployment
3. Click **Redeploy**
4. This ensures new environment variables are applied

---

## ✅ Verification Checklist

### Backend (Render) Verification

- [ ] **Health Check**: Visit `https://lb2d-backend.onrender.com/health`
  - Should return: `{ "success": true, "message": "Server is running" }`

- [ ] **API Endpoint**: Visit `https://lb2d-backend.onrender.com/api`
  - Should return API documentation

- [ ] **CORS Working**: From frontend, make any API call
  - Should NOT see CORS errors in browser console

- [ ] **Database Connection**: Check Render logs
  - Should see: `✓ Database connected successfully`

- [ ] **Email Service**: Test password reset
  - Should receive email from `learnbangla2deutsch@gmail.com`

- [ ] **WebSocket**: Check browser console when logged in
  - Should see: `WebSocket connection established`

### Frontend (Vercel) Verification

- [ ] **Homepage Loads**: Visit `https://lb2d.vercel.app`
  - Should load without errors

- [ ] **API Connection**: Login or register
  - Should work without errors

- [ ] **WebSocket Connection**: After login, check browser console
  - Should see: `WebSocket connected` or similar

- [ ] **Payments**: Test Stripe payment
  - Should redirect to Stripe and process payment

- [ ] **File Uploads**: Try uploading profile photo or video
  - Should upload successfully

- [ ] **Email Notifications**: Test registration or password reset
  - Should receive emails

### Services Verification

| Service | Localhost | Production | Status |
|---------|-----------|------------|--------|
| User Registration | ✅ | ? | Test on https://lb2d.vercel.app/register |
| User Login | ✅ | ? | Test on https://lb2d.vercel.app/login |
| Email Verification | ✅ | ? | Check email after registration |
| Password Reset | ✅ | ? | Test "Forgot Password" |
| Course Creation | ✅ | ? | Admin creates course |
| Course Enrollment | ✅ | ? | Student enrolls in course |
| Stripe Payment | ✅ | ? | Complete payment flow |
| Video Upload | ✅ | ? | Supervisor uploads video |
| Video Playback | ✅ | ? | Student watches video |
| Quiz Creation | ✅ | ? | Supervisor creates quiz |
| Quiz Taking | ✅ | ? | Student takes quiz |
| Resource Upload | ✅ | ? | Supervisor uploads resource |
| WebSocket Notifications | ✅ | ? | Real-time notifications |
| Device Management | ✅ | ? | Login from 2 devices |
| Role Approval/Rejection | ✅ | ? | Admin approves/rejects roles |

---

## 🐛 Troubleshooting

### Problem: CORS Errors

**Symptoms**: Frontend can't connect to backend, browser console shows CORS error

**Solution**:
1. Verify `CLIENT_URL` on Render is set to `https://lb2d.vercel.app`
2. Verify no trailing slash in `CLIENT_URL`
3. Check `REACT_APP_API_URL` on Vercel is `https://lb2d-backend.onrender.com/api`
4. Redeploy both backend and frontend

### Problem: Emails Not Sending

**Symptoms**: Password reset, verification emails not arriving

**Solution**:
1. **Verify SendGrid sender email**:
   - Go to https://app.sendgrid.com/settings/sender_auth/senders
   - Ensure `learnbangla2deutsch@gmail.com` is verified
   - Check for verification email in Gmail

2. **Check SendGrid API Key**:
   - Verify `SENDGRID_API_KEY` is correct on Render
   - Generate new key if needed: https://app.sendgrid.com/settings/api_keys

3. **Check Render logs**:
   ```bash
   # Look for email-related errors
   ```

4. **Test email manually**:
   - Visit: `https://lb2d-backend.onrender.com/test-email/your-email@example.com`
   - (Only works in development mode)

### Problem: WebSocket Not Connecting

**Symptoms**: Real-time notifications not working

**Solution**:
1. Check `REACT_APP_WS_URL` on Vercel is `wss://lb2d-backend.onrender.com` (note: `wss://` not `ws://`)
2. Check browser console for WebSocket errors
3. Verify JWT token is being sent with WebSocket connection
4. Check Render logs for WebSocket connection attempts

### Problem: Stripe Payment Failing

**Symptoms**: Payment doesn't complete, redirect fails

**Solution**:
1. Verify `STRIPE_SECRET_KEY` on Render matches account
2. Verify `REACT_APP_STRIPE_PUBLISHABLE_KEY` on Vercel matches account
3. Both keys must be from the **SAME** Stripe account
4. Check Stripe Dashboard → Developers → Webhooks
5. Webhook endpoint should be: `https://lb2d-backend.onrender.com/api/webhooks/stripe`

### Problem: Video Upload/Playback Failing

**Symptoms**: Videos don't upload or play

**Solution**:
1. Check Render disk space (free tier has limited storage)
2. Verify `MAX_VIDEO_SIZE` is set correctly
3. Check CORS headers for video files in `server.ts`
4. Ensure Render has enough memory (upgrade if needed)

### Problem: Database Connection Failing

**Symptoms**: All API requests fail, 500 errors

**Solution**:
1. Verify `MONGODB_URI` is correct on Render
2. Check MongoDB Atlas:
   - Network Access → Add `0.0.0.0/0` (allow all IPs)
   - Database Access → User has read/write permissions
3. Check Render logs for connection errors

### Problem: Environment Variables Not Applied

**Symptoms**: Changes don't take effect

**Solution**:
1. After adding/changing env vars on Vercel:
   - Go to Deployments → Latest → Redeploy
2. After adding/changing env vars on Render:
   - Render auto-deploys, wait 2-3 minutes
3. Clear browser cache and hard refresh (Ctrl+Shift+R)

---

## 🔍 Quick Diagnostic Commands

### Check Backend Health
```bash
curl https://lb2d-backend.onrender.com/health
```

### Check API Version
```bash
curl https://lb2d-backend.onrender.com/api
```

### Check Frontend Build
```bash
# On Vercel dashboard, check build logs
# Should say "Build completed successfully"
```

### Check WebSocket
```javascript
// In browser console on https://lb2d.vercel.app
const ws = new WebSocket('wss://lb2d-backend.onrender.com');
ws.onopen = () => console.log('WebSocket connected');
ws.onerror = (err) => console.error('WebSocket error:', err);
```

---

## 📝 Post-Deployment Checklist

After deploying both frontend and backend:

1. [ ] Test user registration flow completely
2. [ ] Check email arrives for verification
3. [ ] Test login with verified account
4. [ ] Test WebSocket notifications (create a course as admin)
5. [ ] Test file uploads (profile photo, video)
6. [ ] Test Stripe payment flow
7. [ ] Test all user roles (Student, Supervisor, Admin)
8. [ ] Test device management (login from 2 devices)
9. [ ] Test password reset flow
10. [ ] Monitor Render logs for errors

---

## 🎯 Common Production vs Localhost Differences

| Feature | Localhost | Production | Fix |
|---------|-----------|------------|-----|
| HTTP → HTTPS | `http://` | `https://` | Update all URLs |
| WebSocket | `ws://` | `wss://` | Use secure WebSocket |
| CORS | Permissive | Strict | Set CLIENT_URL correctly |
| Email | SMTP works | SMTP blocked | Use SendGrid |
| File Storage | Local disk | Limited | Use cloud storage (future) |
| Database | Local/Atlas | Atlas only | Use MongoDB Atlas |
| Environment | .env file | Dashboard vars | Set on Render/Vercel |

---

## 🆘 Still Having Issues?

1. **Check Render Logs**:
   - Go to Render dashboard → lb2d-backend → Logs
   - Look for errors or warnings

2. **Check Vercel Logs**:
   - Go to Vercel dashboard → Deployments → Latest → View Logs
   - Check build and runtime logs

3. **Check Browser Console**:
   - Press F12 on https://lb2d.vercel.app
   - Look for errors in Console and Network tabs

4. **Test Each Service Individually**:
   - Use the verification checklist above
   - Isolate which service is failing

---

## ✅ Success Indicators

Your deployment is successful when:
- ✅ Registration sends verification email
- ✅ Login works and shows dashboard
- ✅ WebSocket shows "Connected" in browser console
- ✅ Course creation sends email to supervisor AND all students
- ✅ Role rejection sends email to user
- ✅ Payments process successfully
- ✅ Videos upload and play smoothly
- ✅ Device management works (2 device limit)
- ✅ No CORS errors in browser console
- ✅ No 500 errors from backend

---

**Last Updated**: 2025-01-11
**Deployment URLs**:
- Frontend: https://lb2d.vercel.app
- Backend: https://lb2d-backend.onrender.com
