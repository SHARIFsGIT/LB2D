# ⚡ Quick Deployment Reference

## 🚀 Deploy in 5 Minutes

### Step 1: Set Render Environment Variables
Copy-paste this entire block into Render environment variables section:

```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://sharifulb15_db_user:Kzcrs9mRaASDZ4nb@cluster0.bfoopao.mongodb.net/learn-bangla-to-deutsch?retryWrites=true&w=majority&appName=Cluster0
JWT_ACCESS_SECRET=9041d909e526e93b20e8f7405e553fb26c8b58f3eacf1cdbcc4627cb8cca1c62
JWT_REFRESH_SECRET=cba08607d9f997f2e5de3e4f51420dc25c49fcc9f61a4b976de3aa1396608efa
JWT_ACCESS_EXPIRES_IN=6h
JWT_REFRESH_EXPIRES_IN=7d
SENDGRID_API_KEY=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
SENDGRID_FROM_EMAIL=learnbangla2deutsch@gmail.com
RESEND_API_KEY=re_W1a8oiHJ_KiGNKmjwrd67opjgbKpLAAo1
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=learnbangla2deutsch@gmail.com
EMAIL_PASS=jynrzuctihthsffo
CLIENT_URL=https://lb2d.vercel.app
STRIPE_SECRET_KEY=sk_test_51Rxt4NLynRw7uvmjeHtOQtk8eflEOT8w6rSv1N7I25LhBul1DIQbiBYccqzPVzLL4SvzEfmXhhSRVJ94NfSGt54N00YzOhVm8U
STRIPE_PUBLISHABLE_KEY=pk_test_51Rxt4NLynRw7uvmjtBQBj7WANYIUX2A9SaQcsvWJZgG9XPYP8GolyCqBFlDni42JrdI023tUROqk76x4pC3XPDnx00HIs7R2Lk
STRIPE_WEBHOOK_SECRET=whsec_822107cb0576fe16dc7133c8103e88b06bea8d3795a6d9418920c2457412dad2
MAX_FILE_SIZE=10485760
UPLOAD_PATH=uploads
MAX_VIDEO_SIZE=104857600
ALLOWED_VIDEO_TYPES=mp4,avi,mov,wmv
ADMIN_EMAIL=admin@learnbangla2deutsch.com
BCRYPT_SALT_ROUNDS=12
PAYMENT_TEST_MODE=false
```

### Step 2: Set Vercel Environment Variables
Go to Vercel project → Settings → Environment Variables → Add:

| Key | Value |
|-----|-------|
| `REACT_APP_API_URL` | `https://lb2d-backend.onrender.com/api` |
| `REACT_APP_WS_URL` | `wss://lb2d-backend.onrender.com` |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | `pk_test_51Rxt4NLynRw7uvmjtBQBj7WANYIUX2A9SaQcsvWJZgG9XPYP8GolyCqBFlDni42JrdI023tUROqk76x4pC3XPDnx00HIs7R2Lk` |
| `REACT_APP_ENABLE_ANALYTICS` | `true` |
| `REACT_APP_ENABLE_WEBSOCKET` | `true` |
| `REACT_APP_DEBUG_MODE` | `false` |

**OR** - Vercel will automatically read from `vercel.json` (already configured!)

### Step 3: Verify SendGrid Sender Email
⚠️ **CRITICAL - Must do this or emails won't work!**

1. Go to: https://app.sendgrid.com/settings/sender_auth/senders
2. Click "Create New Sender"
3. Fill in:
   - **From Name**: Learn Bangla to Deutsch
   - **From Email**: `learnbangla2deutsch@gmail.com`
   - **Reply To**: `learnbangla2deutsch@gmail.com`
   - **Company Address**: (your address)
   - **City, State, ZIP**: (your location)
   - **Country**: Bangladesh or Germany
4. Click "Create"
5. **Check your Gmail** for verification email
6. Click verification link
7. Return to SendGrid - status should show "Verified" ✅

### Step 4: Configure Stripe Webhook
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://lb2d-backend.onrender.com/api/webhooks/stripe`
4. Description: "LB2D Backend Webhooks"
5. Select events:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
6. Click "Add endpoint"
7. Click "Reveal" signing secret
8. Copy signing secret (starts with `whsec_`)
9. Update `STRIPE_WEBHOOK_SECRET` in Render with this value

### Step 5: Deploy!
- **Render**: Will auto-deploy when you push to Git
- **Vercel**: Will auto-deploy when you push to Git

**Manual Deploy**:
- Render: Click "Manual Deploy" → "Deploy latest commit"
- Vercel: Go to Deployments → Three dots → "Redeploy"

---

## ⚡ Quick Tests

### Test 1: Health Check
```bash
curl https://lb2d-backend.onrender.com/health
```
Expected: `{"success":true,"message":"Server is running"}`

### Test 2: Frontend Loads
Open: https://lb2d.vercel.app
Expected: Homepage loads without errors

### Test 3: Registration Works
1. Go to: https://lb2d.vercel.app/register
2. Fill in registration form
3. Submit
4. **Check email inbox** for verification email
5. If email arrives → ✅ Deployment successful!
6. If no email → Check SendGrid sender verification

### Test 4: WebSocket Works
1. Login at: https://lb2d.vercel.app/login
2. Open browser console (F12)
3. Look for "WebSocket connected" message
4. If you see it → ✅ WebSocket working!

### Test 5: All Services
Use `DEPLOYMENT_CHECKLIST.md` for complete testing

---

## 🐛 Common Issues & Quick Fixes

### ❌ CORS Error
**Fix**: Update `CLIENT_URL` in Render to `https://lb2d.vercel.app` (no trailing slash!)

### ❌ No Emails Sending
**Fix**: Verify sender email in SendGrid (Step 3 above)

### ❌ WebSocket Not Connecting
**Fix**:
1. Check `REACT_APP_WS_URL=wss://lb2d-backend.onrender.com` in Vercel
2. Note: `wss://` NOT `ws://`

### ❌ Payment Failing
**Fix**:
1. Verify webhook endpoint in Stripe (Step 4 above)
2. Check both Stripe keys are from SAME account

### ❌ Environment Variables Not Working
**Fix**:
1. After changing env vars in Vercel → Redeploy!
2. After changing env vars in Render → Wait 2 minutes for auto-redeploy

---

## 📊 Monitoring

### Render Logs
```
Render Dashboard → lb2d-backend → Logs
```
Look for:
- ✅ "✓ Database connected successfully"
- ✅ "🚀 Server started successfully"
- ✅ "📊 WebSocket server running"
- ❌ Any error messages

### Vercel Logs
```
Vercel Dashboard → Deployments → Latest → View Logs
```
Look for:
- ✅ "Build completed successfully"
- ❌ Any build errors

### Browser Console
```
https://lb2d.vercel.app → F12 → Console tab
```
Look for:
- ✅ "WebSocket connected"
- ❌ CORS errors
- ❌ 404 or 500 errors

---

## 🎯 Success Checklist

- [ ] Render backend is running (green status)
- [ ] Vercel frontend is deployed (Ready status)
- [ ] SendGrid sender email verified
- [ ] Registration sends verification email
- [ ] Can login after email verification
- [ ] WebSocket shows connected in console
- [ ] No CORS errors in browser
- [ ] Payment flow works with test card

---

## 📞 Need Help?

1. Check: `DEPLOYMENT_GUIDE.md` (detailed guide)
2. Check: `DEPLOYMENT_CHECKLIST.md` (complete checklist)
3. Check: Render logs for backend errors
4. Check: Browser console for frontend errors
5. Most common issue: SendGrid sender not verified!

---

**Deployment URLs**:
- 🌐 Frontend: https://lb2d.vercel.app
- 🔧 Backend: https://lb2d-backend.onrender.com
- 📊 Health: https://lb2d-backend.onrender.com/health
- 📚 API Docs: https://lb2d-backend.onrender.com/api
