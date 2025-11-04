@echo off
REM LB2D v2.0 - Automated Setup Script for Windows

echo ╔═══════════════════════════════════════════════════════╗
echo ║                                                       ║
echo ║     LB2D v2.0 - Enterprise Setup Script              ║
echo ║                                                       ║
echo ╚═══════════════════════════════════════════════════════╝
echo.

REM Check if pnpm is installed
where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo 📦 Installing pnpm...
    call npm install -g pnpm@latest
)

echo ✅ pnpm installed
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call pnpm install
echo ✅ Dependencies installed
echo.

REM Start Docker containers
echo 🐳 Starting Docker containers...
docker-compose up -d
echo ✅ Docker containers started
echo.

REM Wait for PostgreSQL
echo ⏳ Waiting for PostgreSQL to be ready...
timeout /t 10 /nobreak >nul
echo ✅ PostgreSQL ready
echo.

REM Setup API
echo 🔧 Setting up API...
cd apps\api

if not exist .env (
    echo 📝 Creating .env file...
    copy .env.example .env
    echo ✅ .env file created (please update with your values)
)

REM Generate Prisma Client
echo 🔨 Generating Prisma Client...
call pnpm prisma:generate
echo ✅ Prisma Client generated
echo.

REM Run migrations
echo 🗄️  Running database migrations...
call pnpm prisma:migrate dev --name init
echo ✅ Database migrated
echo.

REM Seed database
echo 🌱 Seeding database with sample data...
call pnpm prisma:seed
echo ✅ Database seeded
echo.

cd ..\..

echo ╔═══════════════════════════════════════════════════════╗
echo ║                                                       ║
echo ║     ✅ Setup Complete!                                ║
echo ║                                                       ║
echo ╚═══════════════════════════════════════════════════════╝
echo.
echo 🎯 Next steps:
echo.
echo   1. Update apps\api\.env with your actual values
echo   2. Start the API server:
echo      cd apps\api ^&^& pnpm dev
echo.
echo   3. Access services:
echo      📡 API: http://localhost:3001
echo      📚 API Docs: http://localhost:3001/api/docs
echo      🗄️  PgAdmin: http://localhost:5050 (admin@lb2d.com / admin)
echo      🔴 Redis Commander: http://localhost:8081
echo.
echo   4. Test credentials:
echo      👤 Admin: admin@lb2d.com / Admin123!
echo      👤 Supervisor: supervisor@lb2d.com / Super123!
echo      👤 Student: student@lb2d.com / Student123!
echo.
echo Happy coding! 🚀
pause
