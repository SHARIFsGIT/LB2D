# Environment Variables Reference

Quick reference for all environment variables needed for deployment.

---

## Backend (Render) - 16 Variables

### Required Variables

| Variable | Example Value | Where to Get | Notes |
|----------|---------------|--------------|-------|
| `NODE_ENV` | `production` | Set manually | Always "production" for Render |
| `PORT` | `5000` | Set manually | Default port |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/db` | MongoDB Atlas | Connection string with password |
| `JWT_ACCESS_SECRET` | `abc123...` (32+ chars) | Generate randomly | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | `xyz789...` (32+ chars) | Generate randomly | Different from ACCESS_SECRET |
| `EMAIL_HOST` | `smtp.gmail.com` | Gmail | Use Gmail SMTP |
| `EMAIL_PORT` | `587` | Gmail | Standard SMTP port |
| `EMAIL_USER` | `your@gmail.com` | Your Gmail | Your Gmail address |
| `EMAIL_PASS` | `abcd efgh ijkl mnop` | Gmail App Passwords | 16-char app password |
| `CLIENT_URL` | `https://yourapp.vercel.app` | Vercel | Your frontend URL |

### Optional Variables (for features)

| Variable | Example Value | Where to Get | Notes |
|----------|---------------|--------------|-------|
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Set manually | Token expiry (default: 15m) |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Set manually | Refresh token expiry (default: 7d) |
| `EMAIL_FROM` | `"LB2D <noreply@lb2d.com>"` | Set manually | Display name for emails |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Stripe Dashboard | For payments (optional) |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Stripe Dashboard | For payments (optional) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe Dashboard | For payment webhooks (optional) |
| `MAX_FILE_SIZE` | `104857600` | Set manually | 100MB in bytes |
| `UPLOAD_PATH` | `uploads` | Set manually | Directory for uploads |

---

## Frontend (Vercel) - 3-5 Variables

### Required Variables

| Variable | Example Value | Where to Get | Notes |
|----------|---------------|--------------|-------|
| `REACT_APP_API_URL` | `https://lb2d-backend.onrender.com/api` | Render | Your backend URL + /api |
| `REACT_APP_WS_URL` | `wss://lb2d-backend.onrender.com` | Render | Your backend URL with wss:// |

### Optional Variables

| Variable | Example Value | Where to Get | Notes |
|----------|---------------|--------------|-------|
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Stripe Dashboard | For payments (optional) |
| `REACT_APP_ENABLE_ANALYTICS` | `true` | Set manually | Enable analytics (optional) |
| `REACT_APP_ENABLE_WEBSOCKET` | `true` | Set manually | Enable WebSocket (optional) |
| `REACT_APP_DEBUG_MODE` | `false` | Set manually | Debug mode (optional) |

---

## How to Get Each Credential

### 1. MongoDB Connection String

1. Login to [MongoDB Atlas](https://cloud.mongodb.com)
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your actual password
6. Add database name: `/lb2d-production`

**Final format:**
```
mongodb+srv://username:password@cluster.mongodb.net/lb2d-production?retryWrites=true&w=majority
```

### 2. JWT Secrets (2 different ones needed)

Run this command in terminal **twice** to get 2 different secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Gmail App Password

1. Enable 2FA: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Select "Mail" and "Other (Custom name)"
4. Copy the 16-character password (format: `abcd efgh ijkl mnop`)

### 4. Stripe Keys (Optional)

1. Login to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to Developers → API Keys
3. Copy:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)
4. For webhook secret: Developers → Webhooks → Add endpoint

### 5. Vercel/Render URLs

- **Render Backend URL:** Get after deploying backend (e.g., `https://lb2d-backend.onrender.com`)
- **Vercel Frontend URL:** Get after deploying frontend (e.g., `https://lb2d-platform.vercel.app`)

---

## Setting Variables in Render

1. Go to your service dashboard
2. Click "Environment" tab
3. Click "Add Environment Variable"
4. Enter Key and Value
5. Click "Save Changes"
6. Service will auto-redeploy

---

## Setting Variables in Vercel

1. Go to your project dashboard
2. Click "Settings" → "Environment Variables"
3. Enter Name and Value
4. Select environments: Production, Preview, Development
5. Click "Save"
6. Redeploy for changes to take effect

---

## Deployment Order

Follow this sequence:

1. ✅ Setup MongoDB Atlas (get connection string)
2. ✅ Setup Gmail App Password
3. ✅ Deploy Backend to Render (with all env vars)
4. ✅ Get Backend URL from Render
5. ✅ Deploy Frontend to Vercel (use Backend URL)
6. ✅ Get Frontend URL from Vercel
7. ✅ Update CLIENT_URL in Render backend
8. ✅ Test everything!

---

## Security Checklist

- ✅ Never commit .env files to Git
- ✅ Use strong, random JWT secrets (32+ characters)
- ✅ Use Gmail App Password, not your actual password
- ✅ Keep Stripe keys secure
- ✅ Use `wss://` (not `ws://`) for WebSocket in production
- ✅ Verify MongoDB IP whitelist allows connections
- ✅ Change default admin password after first login

---

## Testing Variables

### Test Backend Variables

```bash
# Visit this URL (replace with your Render URL)
https://your-backend.onrender.com/health

# Should return:
{
  "success": true,
  "message": "Server is running",
  "data": {
    "database": "connected"
  }
}
```

### Test Frontend Variables

1. Open browser console on your Vercel site
2. Check Network tab
3. API calls should go to your Render backend
4. No CORS errors should appear

### Test Email

In development, use the test endpoint:
```
https://your-backend.onrender.com/test-email/your@email.com
```

---

## Troubleshooting

### Backend can't connect to MongoDB
- ✅ Check MONGODB_URI format
- ✅ Verify password has no special characters that need encoding
- ✅ Check MongoDB Network Access allows 0.0.0.0/0

### Frontend can't reach backend
- ✅ Verify REACT_APP_API_URL ends with `/api`
- ✅ Check backend CLIENT_URL matches frontend URL
- ✅ Ensure backend is running (check Render logs)

### Emails not sending
- ✅ Verify EMAIL_PASS is 16-char app password
- ✅ Check 2FA is enabled on Gmail
- ✅ Confirm EMAIL_USER is correct Gmail address

### WebSocket errors
- ✅ Ensure REACT_APP_WS_URL uses `wss://` not `ws://`
- ✅ Check backend is deployed and running
- ✅ Verify no firewall blocking WebSocket connections

---

## Quick Copy Templates

### Render Environment Variables (Copy & Paste)

```
NODE_ENV=production
PORT=5000
MONGODB_URI=<your-mongodb-connection-string>
JWT_ACCESS_SECRET=<generate-with-crypto>
JWT_REFRESH_SECRET=<generate-with-crypto>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<your-gmail@gmail.com>
EMAIL_PASS=<16-char-app-password>
EMAIL_FROM="LB2D Platform <noreply@lb2d.com>"
CLIENT_URL=<your-vercel-url>
MAX_FILE_SIZE=104857600
UPLOAD_PATH=uploads
```

### Vercel Environment Variables (Copy & Paste)

```
REACT_APP_API_URL=<your-render-url>/api
REACT_APP_WS_URL=wss://<your-render-domain>
REACT_APP_STRIPE_PUBLISHABLE_KEY=<optional>
```

---

**Remember:** After changing environment variables, both platforms will automatically redeploy your application!
