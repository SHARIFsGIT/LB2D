# 📋 LB2D Deployment Checklist

Use this checklist to ensure all services are properly configured for production deployment.

## 🔧 Render (Backend) Configuration

### Environment Variables Set
- [ ] `NODE_ENV=production`
- [ ] `PORT=5000`
- [ ] `MONGODB_URI` (MongoDB Atlas connection string)
- [ ] `JWT_ACCESS_SECRET`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `JWT_ACCESS_EXPIRES_IN=6h`
- [ ] `JWT_REFRESH_EXPIRES_IN=7d`
- [ ] `SENDGRID_API_KEY` ⚠️ CRITICAL
- [ ] `SENDGRID_FROM_EMAIL=learnbangla2deutsch@gmail.com` ⚠️ CRITICAL
- [ ] `RESEND_API_KEY`
- [ ] `EMAIL_HOST=smtp.gmail.com`
- [ ] `EMAIL_PORT=587`
- [ ] `EMAIL_USER=learnbangla2deutsch@gmail.com`
- [ ] `EMAIL_PASS` (Gmail app password)
- [ ] `CLIENT_URL=https://lb2d.vercel.app` ⚠️ CRITICAL FOR CORS
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `MAX_FILE_SIZE=10485760`
- [ ] `MAX_VIDEO_SIZE=104857600`
- [ ] `UPLOAD_PATH=uploads`
- [ ] `ALLOWED_VIDEO_TYPES=mp4,avi,mov,wmv`
- [ ] `ADMIN_EMAIL=admin@learnbangla2deutsch.com`
- [ ] `BCRYPT_SALT_ROUNDS=12`
- [ ] `PAYMENT_TEST_MODE=false`

### Render Service Settings
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `npm start` or `node dist/server.js`
- [ ] Auto-Deploy: Enabled
- [ ] Health Check Path: `/health`
- [ ] Service is running (green status)

### Render Logs Check
- [ ] No error messages in logs
- [ ] See "✓ Database connected successfully"
- [ ] See "🚀 Server started successfully"
- [ ] See "📊 WebSocket server running"

---

## 🌐 Vercel (Frontend) Configuration

### Environment Variables Set
- [ ] `REACT_APP_API_URL=https://lb2d-backend.onrender.com/api` ⚠️ CRITICAL
- [ ] `REACT_APP_WS_URL=wss://lb2d-backend.onrender.com` ⚠️ CRITICAL
- [ ] `REACT_APP_STRIPE_PUBLISHABLE_KEY`
- [ ] `REACT_APP_ENABLE_ANALYTICS=true`
- [ ] `REACT_APP_ENABLE_WEBSOCKET=true`
- [ ] `REACT_APP_DEBUG_MODE=false`

### Vercel Project Settings
- [ ] Framework: Create React App
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `build`
- [ ] Install Command: `npm install`
- [ ] Node Version: 18.x or higher
- [ ] Root Directory: `frontend`

### After Setting Environment Variables
- [ ] Redeployed from Deployments tab (REQUIRED!)
- [ ] Latest deployment shows "Ready" status
- [ ] No build errors in deployment logs

---

## 📧 SendGrid Configuration

⚠️ **CRITICAL**: Without this, emails won't work!

- [ ] Created SendGrid account at https://sendgrid.com
- [ ] Generated API key from https://app.sendgrid.com/settings/api_keys
- [ ] Added API key to Render as `SENDGRID_API_KEY`
- [ ] Went to https://app.sendgrid.com/settings/sender_auth/senders
- [ ] Clicked "Create New Sender"
- [ ] Used email: `learnbangla2deutsch@gmail.com`
- [ ] Verified sender email (checked Gmail for verification link)
- [ ] Sender status shows "Verified" ✅
- [ ] Added `SENDGRID_FROM_EMAIL=learnbangla2deutsch@gmail.com` to Render

---

## 💳 Stripe Configuration

### Stripe Dashboard
- [ ] Created Stripe account at https://dashboard.stripe.com
- [ ] Using Test Mode (toggle in top right)
- [ ] Copied Secret Key from Developers → API Keys
- [ ] Copied Publishable Key from Developers → API Keys
- [ ] Both keys start with same account ID (`sk_test_51Rxt4N...` and `pk_test_51Rxt4N...`)

### Webhook Configuration
- [ ] Go to https://dashboard.stripe.com/test/webhooks
- [ ] Click "Add endpoint"
- [ ] Endpoint URL: `https://lb2d-backend.onrender.com/api/webhooks/stripe`
- [ ] Select events:
  - [x] `checkout.session.completed`
  - [x] `payment_intent.succeeded`
  - [x] `payment_intent.payment_failed`
- [ ] Copy Signing Secret (starts with `whsec_`)
- [ ] Add to Render as `STRIPE_WEBHOOK_SECRET`

---

## 🗄️ MongoDB Atlas Configuration

- [ ] Created MongoDB Atlas account
- [ ] Created cluster
- [ ] Database user created with read/write permissions
- [ ] Network Access: Added `0.0.0.0/0` (allow all IPs) ⚠️ REQUIRED FOR RENDER
- [ ] Connection string copied
- [ ] Added to Render as `MONGODB_URI`
- [ ] Database name: `learn-bangla-to-deutsch`

---

## ✅ Functional Testing

### Registration & Authentication
- [ ] Visit https://lb2d.vercel.app/register
- [ ] Register new user
- [ ] Verification email arrives in inbox ⚠️ CRITICAL TEST
- [ ] Click verification link in email
- [ ] Email verification successful
- [ ] Can login with verified account

### Email Services
- [ ] Registration sends verification email ✅
- [ ] Password reset sends reset link email ✅
- [ ] Course creation sends email to supervisor ✅
- [ ] Course creation sends email to ALL students ✅
- [ ] Role rejection sends email to user ✅
- [ ] All emails come from `learnbangla2deutsch@gmail.com`

### WebSocket & Real-time Features
- [ ] Login and check browser console (F12)
- [ ] See "WebSocket connected" or similar message
- [ ] Create course as admin
- [ ] Supervisor receives real-time notification
- [ ] Students receive real-time notification
- [ ] No WebSocket errors in console

### Payment Flow
- [ ] Select a course
- [ ] Click "Enroll Now"
- [ ] Redirects to Stripe checkout
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Expiry: Any future date
- [ ] CVC: Any 3 digits
- [ ] Payment succeeds
- [ ] Redirects back to success page
- [ ] Enrollment confirmed in database
- [ ] Enrollment email received

### File Uploads
- [ ] Upload profile photo
- [ ] Photo appears in profile
- [ ] Supervisor uploads video
- [ ] Video appears in course (after admin approval)
- [ ] Video plays without errors
- [ ] No CORS errors for video playback

### Device Management
- [ ] Login from Chrome (Device 1)
- [ ] Login from Firefox (Device 2)
- [ ] Check Settings → Active Devices
- [ ] See 2 devices listed
- [ ] Try login from 3rd device
- [ ] See "Maximum device limit reached" error
- [ ] Logout from Device 1
- [ ] Device 1 removed from Active Devices
- [ ] Can now login from 3rd device

### Role Management
- [ ] Register new user with "Supervisor" role
- [ ] Admin receives email notification
- [ ] Admin receives WebSocket notification
- [ ] Admin approves role
- [ ] User receives approval email ✅
- [ ] User role changed to "Supervisor"
- [ ] User can access supervisor features

- [ ] Register another user requesting "Admin" role
- [ ] Admin rejects with reason
- [ ] User receives rejection email ✅
- [ ] User can re-register with same email

### Course Management
- [ ] Admin creates new course
- [ ] Supervisor receives email ✅
- [ ] ALL students receive email ✅
- [ ] Supervisor receives WebSocket notification
- [ ] Students receive WebSocket notification
- [ ] Course appears in course list
- [ ] Can enroll in course

---

## 🐛 Error Checks

### Browser Console (F12)
- [ ] No CORS errors
- [ ] No 404 errors (failed API calls)
- [ ] No 500 errors (server errors)
- [ ] WebSocket connected successfully
- [ ] No JavaScript errors

### Render Logs
- [ ] No database connection errors
- [ ] No email sending errors
- [ ] No Stripe errors
- [ ] No file upload errors
- [ ] Server restart successful after deployment

### Network Tab (Browser F12 → Network)
- [ ] API calls go to `https://lb2d-backend.onrender.com/api`
- [ ] All API calls return 200 or 201 (success)
- [ ] No 401 Unauthorized errors (unless expected)
- [ ] No 500 Internal Server errors

---

## 🎯 Final Verification

### All Services Working
- [x] ✅ User registration
- [x] ✅ Email verification
- [x] ✅ User login
- [x] ✅ Password reset
- [x] ✅ Course creation
- [x] ✅ Course enrollment
- [x] ✅ Stripe payments
- [x] ✅ Video upload
- [x] ✅ Video playback
- [x] ✅ Quiz creation
- [x] ✅ Quiz taking
- [x] ✅ Resource upload
- [x] ✅ WebSocket notifications
- [x] ✅ Device management
- [x] ✅ Role approval
- [x] ✅ Role rejection
- [x] ✅ Supervisor email notifications
- [x] ✅ Student email notifications

### Performance
- [ ] Frontend loads in < 3 seconds
- [ ] API responses in < 1 second
- [ ] Video streaming works smoothly
- [ ] No memory leaks (check Render metrics)
- [ ] No excessive CPU usage

### Security
- [ ] All API calls use HTTPS
- [ ] WebSocket uses WSS (secure)
- [ ] Passwords are hashed (bcrypt)
- [ ] JWT tokens expire correctly
- [ ] CORS only allows lb2d.vercel.app
- [ ] No sensitive data in browser console
- [ ] Environment variables not exposed in frontend

---

## 📞 Support Resources

If something isn't working:

1. **Check Deployment Guide**: `DEPLOYMENT_GUIDE.md`
2. **Check Render Logs**: Render Dashboard → lb2d-backend → Logs
3. **Check Vercel Logs**: Vercel Dashboard → Deployments → Latest → View Logs
4. **Check Browser Console**: F12 on https://lb2d.vercel.app
5. **Re-verify SendGrid**: Most common issue is unverified sender email

---

## ✅ Deployment Complete!

Once all checkboxes are checked:
- Your production deployment matches localhost functionality ✅
- All services are working correctly ✅
- Users can register, login, enroll, and learn ✅

**Deployment Status**:
- Frontend: https://lb2d.vercel.app
- Backend: https://lb2d-backend.onrender.com
- Status: [ ] Not Started | [ ] In Progress | [ ] Complete ✅

---

**Last Updated**: 2025-01-11
**Next Review**: After each deployment
