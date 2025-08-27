# Clear Payment Records

This document provides multiple ways to clear all payment records from the database.

## ⚠️ WARNING
**This action will DELETE ALL payment records and cannot be undone!**

## Method 1: Using Node.js Script
```bash
cd backend/scripts
node clearPayments.js
```

## Method 2: Using Bash Script (Linux/Mac/WSL)
```bash
cd backend/scripts
chmod +x clearPayments.sh
./clearPayments.sh
```

## Method 3: Using cURL directly

Replace `YOUR_ADMIN_TOKEN` with your actual admin access token:

```bash
curl -X DELETE \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODlkY2NiYjU5NWYyZmU1YTI1MzhkNzEiLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTc1NTY4MzE0NSwiZXhwIjoxNzU2Mjg3OTQ1fQ.Wesxzld4nc01ORd-R-cSMZ3Gs60UMOS8a2AYnODGXfM" \
  -H "Content-Type: application/json" \
  http://localhost:5000/api/payments/admin/clear
```

## Method 4: Using PowerShell (Windows)
```powershell
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODlkY2NiYjU5NWYyZmU1YTI1MzhkNzEiLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTc1NTY4MzE0NSwiZXhwIjoxNzU2Mjg3OTQ1fQ.Wesxzld4nc01ORd-R-cSMZ3Gs60UMOS8a2AYnODGXfM"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/payments/admin/clear" -Method Delete -Headers $headers
```

## Getting Admin Token

1. Login as admin user through the frontend
2. Check browser developer tools → Application/Storage → Session Storage
3. Look for `accessToken` key
4. Copy the token value

## What happens after clearing?

- ✅ All old payment records are deleted
- ✅ Payment & Revenue Analysis dashboard shows 0 values
- ✅ New enrollment attempts will appear in Recent Payment Receipts
- ✅ Transaction IDs will be max 12 characters
- ✅ All payment statuses (pending, completed, failed) will be tracked

## Verification

After clearing, check the admin dashboard:
- Payment & Revenue Analysis should show all zeros
- Recent Payment Receipts should be empty
- Make a test enrollment to see new payments appear