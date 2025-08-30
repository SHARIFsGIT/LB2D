#!/bin/bash

# Production Deployment Script for LB2D Backend
# This script automates the deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="LB2D Backend"
BUILD_DIR="dist"
BACKUP_DIR="backups"
LOG_FILE="deployment.log"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to create backup
create_backup() {
    print_status "Creating backup..."
    
    if [ -d "$BUILD_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
        cp -r "$BUILD_DIR" "$BACKUP_DIR/$BACKUP_NAME"
        print_success "Backup created: $BACKUP_DIR/$BACKUP_NAME"
    else
        print_warning "No existing build found, skipping backup"
    fi
}

# Function to restore from backup
restore_backup() {
    print_status "Restoring from backup..."
    
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -n1)
    if [ -n "$LATEST_BACKUP" ]; then
        rm -rf "$BUILD_DIR"
        cp -r "$BACKUP_DIR/$LATEST_BACKUP" "$BUILD_DIR"
        print_success "Restored from backup: $LATEST_BACKUP"
    else
        print_error "No backup found to restore from"
        exit 1
    fi
}

# Function to cleanup old backups
cleanup_backups() {
    print_status "Cleaning up old backups..."
    
    if [ -d "$BACKUP_DIR" ]; then
        # Keep only the 5 most recent backups
        cd "$BACKUP_DIR"
        ls -t | tail -n +6 | xargs rm -rf --
        cd ..
        print_success "Old backups cleaned up"
    fi
}

# Function to check environment
check_environment() {
    print_status "Checking environment..."
    
    # Check Node.js
    if ! command_exists node; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    print_success "Node.js version: $NODE_VERSION"
    
    # Check npm
    if ! command_exists npm; then
        print_error "npm is not installed"
        exit 1
    fi
    
    NPM_VERSION=$(npm --version)
    print_success "npm version: $NPM_VERSION"
    
    # Check if .env file exists
    if [ ! -f ".env" ] && [ ! -f ".env.production" ]; then
        print_warning "No environment file found (.env or .env.production)"
        print_warning "Make sure to configure environment variables"
    fi
    
    # Check TypeScript
    if ! command_exists tsc; then
        print_warning "TypeScript compiler not found globally, using local version"
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Use npm ci for faster, reliable installation in production
    if [ -f "package-lock.json" ]; then
        npm ci --only=production
    else
        npm install --only=production
    fi
    
    print_success "Dependencies installed"
}

# Function to run tests
run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        print_warning "Skipping tests (SKIP_TESTS=true)"
        return
    fi
    
    print_status "Running tests..."
    
    # Install dev dependencies for testing
    npm ci
    
    # Run tests if test script exists
    if npm run test --silent 2>/dev/null; then
        print_success "All tests passed"
    else
        print_warning "No tests found or tests failed"
        read -p "Continue deployment despite test issues? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Deployment cancelled due to test failures"
            exit 1
        fi
    fi
}

# Function to build application
build_application() {
    print_status "Building application..."
    
    # Clean previous build
    rm -rf "$BUILD_DIR"
    
    # Build the application
    npm run build
    
    if [ ! -d "$BUILD_DIR" ]; then
        print_error "Build failed - no dist directory created"
        exit 1
    fi
    
    print_success "Application built successfully"
}

# Function to validate build
validate_build() {
    print_status "Validating build..."
    
    # Check if main server file exists
    if [ ! -f "$BUILD_DIR/server.js" ]; then
        print_error "Build validation failed - server.js not found"
        return 1
    fi
    
    # Check if package.json exists (for production dependencies)
    if [ ! -f "package.json" ]; then
        print_error "Build validation failed - package.json not found"
        return 1
    fi
    
    print_success "Build validation passed"
    return 0
}

# Function to setup production environment
setup_production() {
    print_status "Setting up production environment..."
    
    # Set NODE_ENV to production
    export NODE_ENV=production
    
    # Install only production dependencies in build directory
    cd "$BUILD_DIR" 2>/dev/null || {
        # If we can't cd to dist, install in current directory
        npm ci --only=production
        print_success "Production dependencies installed"
        return
    }
    
    # Copy package files to build directory
    cp ../package*.json .
    npm ci --only=production
    
    cd ..
    print_success "Production environment setup complete"
}

# Function to start application
start_application() {
    print_status "Starting application..."
    
    # Check if PM2 is available for process management
    if command_exists pm2; then
        print_status "Starting with PM2..."
        pm2 start ecosystem.config.js --env production || pm2 start "$BUILD_DIR/server.js" --name "lb2d-backend"
        print_success "Application started with PM2"
    else
        print_warning "PM2 not found, starting with node directly"
        print_warning "For production, consider installing PM2: npm install -g pm2"
        cd "$BUILD_DIR"
        nohup node server.js > ../production.log 2>&1 &
        echo $! > ../app.pid
        cd ..
        print_success "Application started (PID: $(cat app.pid))"
    fi
}

# Function to run health check
health_check() {
    print_status "Running health check..."
    
    # Wait a moment for the server to start
    sleep 5
    
    # Check if the server is responding
    if command_exists curl; then
        if curl -f http://localhost:5000/health >/dev/null 2>&1; then
            print_success "Health check passed - server is responding"
        else
            print_error "Health check failed - server is not responding"
            return 1
        fi
    else
        print_warning "curl not available, skipping automated health check"
        print_warning "Please manually verify that the server is running at http://localhost:5000/health"
    fi
}

# Main deployment function
deploy() {
    print_status "Starting deployment of $PROJECT_NAME"
    
    # Start logging
    exec > >(tee -a "$LOG_FILE")
    exec 2>&1
    
    # Trap for error handling
    trap 'print_error "Deployment failed! Check $LOG_FILE for details."; restore_backup; exit 1' ERR
    
    check_environment
    create_backup
    install_dependencies
    run_tests
    build_application
    
    if ! validate_build; then
        print_error "Build validation failed, restoring backup"
        restore_backup
        exit 1
    fi
    
    setup_production
    
    # Stop existing application if running
    if [ -f "app.pid" ]; then
        OLD_PID=$(cat app.pid)
        if kill -0 "$OLD_PID" 2>/dev/null; then
            print_status "Stopping existing application (PID: $OLD_PID)"
            kill "$OLD_PID"
            sleep 3
        fi
        rm -f app.pid
    fi
    
    # If using PM2, stop existing processes
    if command_exists pm2; then
        pm2 stop lb2d-backend 2>/dev/null || true
        pm2 delete lb2d-backend 2>/dev/null || true
    fi
    
    start_application
    
    if ! health_check; then
        print_error "Health check failed, attempting rollback"
        restore_backup
        start_application
        exit 1
    fi
    
    cleanup_backups
    
    print_success "🎉 Deployment completed successfully!"
    print_success "Server is running and healthy"
    
    if command_exists pm2; then
        print_status "Use 'pm2 logs lb2d-backend' to view logs"
        print_status "Use 'pm2 monit' to monitor the application"
    else
        print_status "Logs are available in production.log"
        print_status "Use 'tail -f production.log' to follow logs"
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  --skip-tests     Skip running tests"
    echo "  --help          Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  SKIP_TESTS=true  Skip running tests"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS="true"
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Run deployment
deploy