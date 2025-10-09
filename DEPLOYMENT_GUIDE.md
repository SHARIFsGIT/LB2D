# Complete Deployment Guide - LB2D Platform

A beginner-friendly guide to deploy your LB2D platform to production using Render (backend) and Vercel (frontend).

---

## Prerequisites

Before starting, create accounts on these platforms:

1. **GitHub Account** - https://github.com (Free)
2. **MongoDB Atlas** - https://www.mongodb.com/cloud/atlas (Free tier available)
3. **Render Account** - https://render.com (Free tier available)
4. **Vercel Account** - https://vercel.com (Free tier available)
5. **Gmail Account** - For sending emails (you already have one)
6. **Stripe Account** - https://stripe.com (Optional, for payments)

---

## Part 1: Prepare Your Code

### Step 1: Push Code to GitHub

1. Go to https://github.com and create a new repository:
   - Click "New" button
   - Name it: `lb2d-platform`
   - Make it **Public** (easier for deployment)
   - Click "Create repository"

2. In your terminal (in the LB2D folder):
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/lb2d-platform.git
   git branch -M main
   git push -u origin main
   ```

3. Verify your code is on GitHub by visiting your repository URL

---

## Part 2: Setup MongoDB Atlas (Database)

### Step 1: Create MongoDB Cluster

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up or log in
3. Click "Build a Database"
4. Choose **FREE** tier (M0 Sandbox)
5. Select a cloud provider (AWS recommended) and region (closest to you)
6. Name your cluster: `lb2d-cluster`
7. Click "Create"

### Step 2: Create Database User

1. Go to "Database Access" (left sidebar)
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Username: `lb2d_admin`
5. Password: Click "Autogenerate Secure Password" and **SAVE THIS PASSWORD**
6. Database User Privileges: Select "Read and write to any database"
7. Click "Add User"

### Step 3: Allow Network Access

1. Go to "Network Access" (left sidebar)
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for now)
4. Click "Confirm"

### Step 4: Get Connection String

1. Go to "Database" (left sidebar)
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string (looks like):
   ```
   mongodb+srv://lb2d_admin:<password>@lb2d-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with the password you saved earlier
6. Add database name at the end:
   ```
   mongodb+srv://lb2d_admin:YOUR_PASSWORD@lb2d-cluster.xxxxx.mongodb.net/lb2d-production?retryWrites=true&w=majority
   ```
7. **SAVE THIS CONNECTION STRING** - you'll need it soon!

---

## Part 3: Setup Gmail App Password (For Emails)

### Step 1: Enable 2-Factor Authentication

1. Go to https://myaccount.google.com/security
2. Find "2-Step Verification" and turn it ON
3. Follow the setup process

### Step 2: Generate App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select app: "Mail"
3. Select device: "Other (Custom name)"
4. Type: "LB2D Platform"
5. Click "Generate"
6. **SAVE THE 16-CHARACTER PASSWORD** (looks like: `abcd efgh ijkl mnop`)
7. This is your EMAIL_PASS for the platform

---

## Part 4: Deploy Backend to Render

### Step 1: Create Web Service

1. Go to https://render.com and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub account (if not already connected)
4. Find and select your `lb2d-platform` repository
5. Click "Connect"

### Step 2: Configure Service

Fill in the following:

**Basic Settings:**
- **Name:** `lb2d-backend`
- **Region:** Choose closest to you (e.g., Oregon, Frankfurt)
- **Branch:** `main`
- **Root Directory:** `backend`
- **Runtime:** `Node`
- **Build Command:**
  ```
  npm install && npm run build
  ```
- **Start Command:**
  ```
  npm start
  ```

**Advanced Settings:**
- **Plan:** Free (or choose paid for better performance)
- **Health Check Path:** `/health`

### Step 3: Add Environment Variables

Click "Advanced" and add these environment variables one by one:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `MONGODB_URI` | `your-mongodb-connection-string-from-step-2` |
| `JWT_ACCESS_SECRET` | Generate random 32+ characters |
| `JWT_REFRESH_SECRET` | Generate random 32+ characters (different from above) |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_USER` | `your-email@gmail.com` |
| `EMAIL_PASS` | `your-16-char-app-password` |
| `EMAIL_FROM` | `"LB2D Platform <noreply@lb2d.com>"` |
| `CLIENT_URL` | `https://your-app.vercel.app` (we'll update this later) |
| `MAX_FILE_SIZE` | `104857600` |
| `UPLOAD_PATH` | `uploads` |

**To generate JWT secrets:**
```bash
# In your terminal, run this twice to get two different secrets:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Deploy

1. Click "Create Web Service"
2. Wait 5-10 minutes for deployment
3. Once deployed, you'll get a URL like: `https://lb2d-backend.onrender.com`
4. Test it by visiting: `https://lb2d-backend.onrender.com/health`
5. You should see: `{"success":true,"message":"Server is running"}`

### Step 5: Initialize Database

1. In Render dashboard, go to your service
2. Click "Shell" tab (at the top)
3. Run this command to create admin user:
   ```bash
   npm run reset-db
   ```
4. This creates the admin user with default credentials

---

## Part 5: Deploy Frontend to Vercel

### Step 1: Create Project

1. Go to https://vercel.com and sign up/login
2. Click "Add New..." → "Project"
3. Import your `lb2d-platform` repository
4. Click "Import"

### Step 2: Configure Project

**Framework Preset:** Create React App (should auto-detect)

**Root Directory:** Click "Edit" and select `frontend`

**Build Settings:**
- **Build Command:** `npm run build`
- **Output Directory:** `build`
- **Install Command:** `npm install`

### Step 3: Add Environment Variables

Click "Environment Variables" and add:

| Name | Value |
|------|-------|
| `REACT_APP_API_URL` | `https://lb2d-backend.onrender.com/api` |
| `REACT_APP_WS_URL` | `wss://lb2d-backend.onrender.com` |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` (if using Stripe) |

**Important:** Use your actual Render backend URL from Part 4!

### Step 4: Deploy

1. Click "Deploy"
2. Wait 2-5 minutes for deployment
3. You'll get a URL like: `https://lb2d-platform.vercel.app`
4. Click the URL to visit your site!

### Step 5: Update Backend with Frontend URL

1. Go back to Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Update `CLIENT_URL` with your Vercel URL:
   ```
   https://lb2d-platform.vercel.app
   ```
5. Click "Save Changes"
6. Service will redeploy automatically

---

## Part 6: Testing Your Deployment

### Test Backend

1. Visit: `https://your-backend.onrender.com/health`
2. Should see: Server is running message

### Test Frontend

1. Visit: `https://your-app.vercel.app`
2. You should see the landing page
3. Click "Login"
4. Use default admin credentials:
   - Email: `admin@learnbangla2deutsch.com`
   - Password: `Admin@123456`

### Test Complete Flow

1. Login as admin
2. Check dashboard loads
3. Try creating a test course
4. Check if email verification works (register new user)

---

## Part 7: Optional - Stripe Setup (For Payments)

### If you want to enable payments:

1. Go to https://stripe.com and sign up
2. Get your test API keys:
   - Go to Developers → API keys
   - Copy "Publishable key" (starts with `pk_test_`)
   - Copy "Secret key" (starts with `sk_test_`)

3. Add to Render (Backend):
   - `STRIPE_SECRET_KEY`: `sk_test_...`
   - `STRIPE_PUBLISHABLE_KEY`: `pk_test_...`

4. Add to Vercel (Frontend):
   - `REACT_APP_STRIPE_PUBLISHABLE_KEY`: `pk_test_...`

5. Redeploy both services

---

## Part 8: Custom Domain (Optional)

### For Vercel (Frontend):

1. Buy a domain (Namecheap, GoDaddy, etc.)
2. In Vercel dashboard, go to your project
3. Click "Settings" → "Domains"
4. Add your domain and follow DNS instructions

### For Render (Backend):

1. In Render dashboard, go to your service
2. Click "Settings" → "Custom Domain"
3. Add your API subdomain (e.g., `api.yourdomain.com`)
4. Follow DNS instructions

---

## Part 9: Monitoring & Maintenance

### View Logs

**Render (Backend):**
1. Go to your service dashboard
2. Click "Logs" tab
3. See real-time server logs

**Vercel (Frontend):**
1. Go to your project
2. Click "Deployments"
3. Click on a deployment → "Function Logs"

### Update Code

When you update your code:

1. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your update message"
   git push
   ```

2. Both Render and Vercel will auto-deploy!

### Manage Database

1. Go to MongoDB Atlas
2. Click "Browse Collections"
3. View/edit data directly

---

## Troubleshooting

### Backend won't deploy
- Check build logs in Render
- Verify all environment variables are set
- Ensure MongoDB connection string is correct

### Frontend shows API errors
- Verify `REACT_APP_API_URL` points to correct Render URL
- Check backend is running (visit `/health` endpoint)
- Verify CORS settings in backend (CLIENT_URL)

### Database connection fails
- Check MongoDB Atlas IP whitelist (allow 0.0.0.0/0)
- Verify connection string has correct password
- Check database user has read/write permissions

### Emails not sending
- Verify Gmail App Password is correct (16 characters)
- Check 2FA is enabled on Gmail
- Test with `/test-email/your@email.com` endpoint

### WebSocket not working
- Ensure `REACT_APP_WS_URL` uses `wss://` not `ws://`
- Check Render backend supports WebSocket (it does)
- Verify WebSocket code in frontend

---

## Important Security Notes

1. **Change Admin Password:** After first login, change the default admin password!
2. **JWT Secrets:** Use strong, random secrets in production
3. **MongoDB:** Create a dedicated database user, don't use cluster admin
4. **Email:** Use App Passwords, never your actual Gmail password
5. **Environment Variables:** Never commit .env files to GitHub
6. **Stripe:** Use test keys for testing, switch to live keys for production

---

## Cost Breakdown (Free Tiers)

- **MongoDB Atlas:** Free (512 MB storage)
- **Render:** Free (750 hours/month, sleeps after inactivity)
- **Vercel:** Free (100 GB bandwidth/month)
- **Total:** $0/month for small-scale usage!

**Note:** Render free tier may sleep after 15 minutes of inactivity. First request takes ~30 seconds to wake up.

---

## Upgrade Paths

When you need more:

1. **Render:** Upgrade to Starter ($7/month) for always-on service
2. **MongoDB Atlas:** Shared clusters start at $9/month
3. **Vercel:** Pro plan $20/month for team features

---

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Deploy frontend to Vercel
3. ✅ Test the application
4. ✅ Change admin password
5. ✅ Add real content (courses, videos)
6. 📧 Share with users!

---

## Support

If you encounter issues:
1. Check deployment logs
2. Verify all environment variables
3. Review this guide step-by-step
4. Check MongoDB Atlas dashboard
5. Test each component individually

---

**Congratulations! Your LB2D platform is now live! 🎉**
