# Environment Configuration for Production Deployment

## ✅ Environment Files Updated
Your environment files have been updated with your production credentials.

---

### Backend Environment (✅ Updated)
- **Port**: `5000` (production ready)  
- **Environment**: `production`  
- **Database**: `learn-bangla-to-deutsch-production`  
- **JWT**: Secure production keys configured  
- **Email**: Updated to `your-email@example.com`  
- **Twilio**: Production credentials applied  

---

### Frontend Environment (✅ Updated)
- **API URL**: Points to port `5000` (matches backend)  
- **WebSocket**: Points to port `5000`  
- **Development Port**: `3001` (for local development)  

---

## 🚀 Deployment Instructions

### 🔹 Render.com (Backend)

Set the following environment variables in **Render Dashboard**:

```bash
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/learn-bangla-to-deutsch-production?retryWrites=true&w=majority

JWT_ACCESS_SECRET=your_jwt_access_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
JWT_ACCESS_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your_email_app_password_here
EMAIL_FROM=your-email@example.com

TWILIO_ACCOUNT_SID=your_twilio_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

CLIENT_URL=https://your-vercel-app.vercel.app
