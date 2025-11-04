# Database Reset Script

This script allows you to reset your database to a clean state with only one admin user.

## Features

- ✅ Deletes ALL data from the database
- ✅ Creates only ONE admin user
- ✅ Configurable admin credentials (NOT hardcoded)
- ✅ Can use environment variables or interactive prompts
- ✅ Secure password hashing
- ✅ Safety confirmation before deletion

## Usage

### Option 1: Interactive Mode (Recommended)

Run the script and it will prompt you for admin credentials:

```bash
cd LB2D-v2/apps/api
pnpm prisma:reset
```

You'll be asked to:
1. Confirm the database reset (type "yes")
2. Enter admin email
3. Enter admin password

### Option 2: Using Environment Variables

Set environment variables before running the script:

```bash
# Linux/Mac
export ADMIN_EMAIL="sharifaiub15@gmail.com"
export ADMIN_PASSWORD="YourSecurePassword123!"
export ADMIN_FIRST_NAME="Sharif"
export ADMIN_LAST_NAME="Ahmed"

# Windows (PowerShell)
$env:ADMIN_EMAIL="sharifaiub15@gmail.com"
$env:ADMIN_PASSWORD="YourSecurePassword123!"
$env:ADMIN_FIRST_NAME="Sharif"
$env:ADMIN_LAST_NAME="Ahmed"

# Windows (CMD)
set ADMIN_EMAIL=sharifaiub15@gmail.com
set ADMIN_PASSWORD=YourSecurePassword123!
set ADMIN_FIRST_NAME=Sharif
set ADMIN_LAST_NAME=Ahmed

# Then run the reset
pnpm prisma:reset
```

### Option 3: One-liner with Environment Variables

```bash
ADMIN_EMAIL="sharifaiub15@gmail.com" ADMIN_PASSWORD="YourPass123!" pnpm prisma:reset
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ADMIN_EMAIL` | No* | Prompt | Admin user's email address |
| `ADMIN_PASSWORD` | No* | Prompt | Admin user's password (min 8 chars) |
| `ADMIN_FIRST_NAME` | No | "Admin" | Admin user's first name |
| `ADMIN_LAST_NAME` | No | "User" | Admin user's last name |

\* If not provided via environment variable, the script will prompt for input interactively.

## Security Notes

- ⚠️ **Never commit** your admin credentials to version control
- ⚠️ Use strong passwords (minimum 8 characters)
- ⚠️ The password is securely hashed using bcrypt before storing
- ⚠️ In production, use strong, unique passwords from a password manager

## What Gets Deleted?

The script deletes ALL data from these tables:
- Users (all roles)
- Courses
- Videos & Video Progress
- Quizzes & Quiz Attempts
- Tests & Test Attempts
- Enrollments
- Payments
- Certificates
- Notifications
- Course Reviews
- Discussions & Posts
- Learning Paths
- Achievements
- And all other data...

## What Gets Created?

After deletion, only ONE user is created:
- Role: ADMIN
- Email: (your configured email)
- Password: (your configured password, hashed)
- Email Verified: true
- Active: true

## Example Workflow

1. **Reset database and create admin with your email:**
   ```bash
   cd LB2D-v2/apps/api
   pnpm prisma:reset
   ```

2. **When prompted, enter:**
   - Email: `sharifaiub15@gmail.com`
   - Password: `YourSecurePassword123!`

3. **Login to your application with these credentials**

## Troubleshooting

### "Error resetting database"
- Make sure your database is running
- Check your `DATABASE_URL` in `.env` file
- Ensure you have the latest Prisma migrations applied

### "Password must be at least 8 characters long"
- Use a stronger password with at least 8 characters

### Permission errors
- Make sure you're in the correct directory (`LB2D-v2/apps/api`)
- Ensure you have write permissions to the database

## Alternative: Using Direct Script

If you want to run the script directly:

```bash
cd LB2D-v2/apps/api
npx ts-node prisma/reset-db.ts
```

## After Reset

After running this script:
1. Your database will be completely clean
2. Only one admin user will exist
3. You can login with the credentials you provided
4. You can then create courses, users, and other content as needed

## Need Sample Data?

If you want to populate the database with sample data after reset, run:

```bash
pnpm prisma:seed
```

This will create sample users, courses, videos, etc. for testing purposes.
