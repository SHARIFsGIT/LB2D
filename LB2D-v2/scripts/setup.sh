#!/bin/bash

# LB2D v2.0 - Automated Setup Script
# This script sets up the entire development environment

set -e  # Exit on error

echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║     LB2D v2.0 - Enterprise Setup Script              ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm@latest
fi

echo "✅ pnpm installed"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install
echo "✅ Dependencies installed"
echo ""

# Start Docker containers
echo "🐳 Starting Docker containers..."
docker-compose up -d
echo "✅ Docker containers started"
echo ""

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5
echo "✅ PostgreSQL ready"
echo ""

# Setup API
echo "🔧 Setting up API..."
cd apps/api

if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created (please update with your values)"
fi

# Generate Prisma Client
echo "🔨 Generating Prisma Client..."
pnpm prisma:generate
echo "✅ Prisma Client generated"
echo ""

# Run migrations
echo "🗄️  Running database migrations..."
pnpm prisma:migrate dev --name init
echo "✅ Database migrated"
echo ""

# Seed database
echo "🌱 Seeding database with sample data..."
pnpm prisma:seed
echo "✅ Database seeded"
echo ""

cd ../..

echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║     ✅ Setup Complete!                                ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "🎯 Next steps:"
echo ""
echo "  1. Update apps/api/.env with your actual values"
echo "  2. Start the API server:"
echo "     cd apps/api && pnpm dev"
echo ""
echo "  3. Access services:"
echo "     📡 API: http://localhost:3001"
echo "     📚 API Docs: http://localhost:3001/api/docs"
echo "     🗄️  PgAdmin: http://localhost:5050 (admin@lb2d.com / admin)"
echo "     🔴 Redis Commander: http://localhost:8081"
echo ""
echo "  4. Test credentials:"
echo "     👤 Admin: admin@lb2d.com / Admin123!"
echo "     👤 Supervisor: supervisor@lb2d.com / Super123!"
echo "     👤 Student: student@lb2d.com / Student123!"
echo ""
echo "Happy coding! 🚀"
