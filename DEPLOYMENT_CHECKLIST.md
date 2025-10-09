# Deployment Checklist

Quick checklist to deploy LB2D to Render + Vercel

---

## Pre-Deployment Setup

- [ ] Create GitHub account
- [ ] Create MongoDB Atlas account
- [ ] Create Render account
- [ ] Create Vercel account
- [ ] Gmail with 2FA enabled

---

## Step 1: MongoDB Setup (10 mins)

- [ ] Login to [MongoDB Atlas](https://cloud.mongodb.com)
- [ ] Create free cluster (M0)
- [ ] Create database user with password
- [ ] Allow access from anywhere (0.0.0.0/0)
- [ ] Copy connection string
- [ ] Replace `<password>` in connection string
- [ ] Add database name: `/lb2d-production`
- [ ] Save final connection string

**Connection String Format:**
```
mongodb+srv://username:password@cluster.mongodb.net/lb2d-production?retryWrites=true&w=majority
```

---

## Step 2: Gmail App Password (5 mins)

- [ ] Enable 2FA: https://myaccount.google.com/security
- [ ] Go to: https://myaccount.google.com/apppasswords
- [ ] Select "Mail" → "Other"
- [ ] Name it "LB2D Platform"
- [ ] Copy 16-character password
- [ ] Save the password

---

## Step 3: Generate JWT Secrets (2 mins)

Run this command **twice** to get 2 different secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- [ ] Generate JWT_ACCESS_SECRET
- [ ] Generate JWT_REFRESH_SECRET
- [ ] Save both secrets

---

## Step 4: Push to GitHub (5 mins)

- [ ] Create new repository on GitHub
- [ ] Name it `lb2d-platform`
- [ ] Make it Public

Run these commands:
```bash
git remote add origin https://github.com/YOUR_USERNAME/lb2d-platform.git
git branch -M main
git push -u origin main
```

- [ ] Verify code is on GitHub

---

## Step 5: Deploy Backend to Render (15 mins)

### Create Web Service

- [ ] Login to [Render](https://render.com)
- [ ] Click "New +" → "Web Service"
- [ ] Connect GitHub repository
- [ ] Select `lb2d-platform`

### Configure Service

- [ ] Name: `lb2d-backend`
- [ ] Region: (choose closest)
- [ ] Branch: `main`
- [ ] Root Directory: `backend`
- [ ] Runtime: `Node`
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `npm start`
- [ ] Health Check Path: `/health`

### Add Environment Variables (16 variables)

- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `5000`
- [ ] `MONGODB_URI` = `your-mongodb-connection-string`
- [ ] `JWT_ACCESS_SECRET` = `your-generated-secret-1`
- [ ] `JWT_REFRESH_SECRET` = `your-generated-secret-2`
- [ ] `JWT_ACCESS_EXPIRES_IN` = `15m`
- [ ] `JWT_REFRESH_EXPIRES_IN` = `7d`
- [ ] `EMAIL_HOST` = `smtp.gmail.com`
- [ ] `EMAIL_PORT` = `587`
- [ ] `EMAIL_USER` = `your-email@gmail.com`
- [ ] `EMAIL_PASS` = `your-16-char-app-password`
- [ ] `EMAIL_FROM` = `"LB2D Platform <noreply@lb2d.com>"`
- [ ] `CLIENT_URL` = `http://localhost:3000` (temporary)
- [ ] `MAX_FILE_SIZE` = `104857600`
- [ ] `UPLOAD_PATH` = `uploads`
- [ ] `STRIPE_SECRET_KEY` = (optional)

### Deploy

- [ ] Click "Create Web Service"
- [ ] Wait for deployment (5-10 mins)
- [ ] Copy your Render URL (e.g., `https://lb2d-backend.onrender.com`)
- [ ] Test: Visit `https://your-url.onrender.com/health`
- [ ] Should see: `{"success":true,"message":"Server is running"}`

### Initialize Database

- [ ] In Render dashboard, click "Shell" tab
- [ ] Run: `npm run reset-db`
- [ ] Admin user created!

---

## Step 6: Deploy Frontend to Vercel (10 mins)

### Create Project

- [ ] Login to [Vercel](https://vercel.com)
- [ ] Click "Add New..." → "Project"
- [ ] Import `lb2d-platform` repository
- [ ] Click "Import"

### Configure Project

- [ ] Framework: Create React App
- [ ] Root Directory: Click "Edit" → Select `frontend`
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `build`
- [ ] Install Command: `npm install`

### Add Environment Variables (2-3 variables)

- [ ] `REACT_APP_API_URL` = `https://your-render-url.onrender.com/api`
- [ ] `REACT_APP_WS_URL` = `wss://your-render-url.onrender.com`
- [ ] `REACT_APP_STRIPE_PUBLISHABLE_KEY` = (optional)

**Important:** Use your actual Render URL from Step 5!

### Deploy

- [ ] Click "Deploy"
- [ ] Wait for deployment (2-5 mins)
- [ ] Copy your Vercel URL (e.g., `https://lb2d-platform.vercel.app`)

---

## Step 7: Update Backend with Frontend URL (2 mins)

- [ ] Go back to Render dashboard
- [ ] Select backend service
- [ ] Click "Environment" tab
- [ ] Update `CLIENT_URL` = `https://your-vercel-url.vercel.app`
- [ ] Click "Save Changes"
- [ ] Service auto-redeploys

---

## Step 8: Test Deployment (10 mins)

### Test Backend

- [ ] Visit: `https://your-backend.onrender.com/health`
- [ ] Should see: Server is running message
- [ ] Check database status: "connected"

### Test Frontend

- [ ] Visit: `https://your-vercel-app.vercel.app`
- [ ] Landing page loads
- [ ] Click "Login"
- [ ] Login form appears

### Test Authentication

- [ ] Login with default admin:
  - Email: `admin@learnbangla2deutsch.com`
  - Password: `Admin@123456`
- [ ] Should redirect to admin dashboard
- [ ] Check if data loads correctly

### Change Admin Password

- [ ] Go to Profile
- [ ] Change password from default
- [ ] Test login with new password

### Test Features

- [ ] Create a test course
- [ ] Register a new student account
- [ ] Check email verification (may go to spam)
- [ ] Test WebSocket notifications

---

## Optional: Setup Stripe (15 mins)

- [ ] Create [Stripe account](https://stripe.com)
- [ ] Go to Developers → API Keys
- [ ] Copy Publishable Key (`pk_test_...`)
- [ ] Copy Secret Key (`sk_test_...`)
- [ ] Add to Render: `STRIPE_SECRET_KEY`
- [ ] Add to Render: `STRIPE_PUBLISHABLE_KEY`
- [ ] Add to Vercel: `REACT_APP_STRIPE_PUBLISHABLE_KEY`
- [ ] Redeploy both services
- [ ] Test payment flow

---

## Post-Deployment Tasks

- [ ] Change admin password
- [ ] Add real courses and content
- [ ] Test all features thoroughly
- [ ] Setup custom domain (optional)
- [ ] Configure email templates
- [ ] Setup monitoring/alerts
- [ ] Share with users!

---

## Troubleshooting

### Backend won't start
- Check Render logs: "Logs" tab
- Verify MongoDB connection string
- Check all environment variables are set

### Frontend shows errors
- Check Vercel deployment logs
- Verify API_URL is correct
- Check browser console for errors

### Database connection fails
- MongoDB Atlas IP whitelist: allow 0.0.0.0/0
- Check connection string password
- Verify database user permissions

### Emails not sending
- Use Gmail App Password (16 chars)
- Check 2FA is enabled
- Test with: `/test-email/your@email.com`

### Can't login
- Check backend logs in Render
- Verify admin user was created: `npm run reset-db`
- Try forgot password flow

---

## Important URLs to Save

| Service | URL | Notes |
|---------|-----|-------|
| MongoDB Atlas | https://cloud.mongodb.com | Database |
| Render Backend | https://your-backend.onrender.com | API |
| Vercel Frontend | https://your-app.vercel.app | Web App |
| Stripe Dashboard | https://dashboard.stripe.com | Payments |
| GitHub Repo | https://github.com/you/lb2d-platform | Code |

---

## Cost Summary (Free Tiers)

- MongoDB Atlas: $0 (512 MB)
- Render: $0 (sleeps after 15 min inactivity)
- Vercel: $0 (100 GB bandwidth)
- **Total: $0/month**

**Note:** Render free tier sleeps. First request takes ~30 sec to wake up.

---

## Upgrade When Needed

- Render Starter: $7/month (always on)
- MongoDB Shared: $9/month (more storage)
- Vercel Pro: $20/month (team features)

---

## Support Resources

- **Deployment Guide:** See `DEPLOYMENT_GUIDE.md`
- **Environment Variables:** See `ENV_VARIABLES_REFERENCE.md`
- **Project README:** See `README.md`
- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs

---

**Total Time: ~1-2 hours for complete deployment**

**Status: Ready for Production! 🚀**
