// PM2 Ecosystem Configuration
// This file configures PM2 process management for production deployment

module.exports = {
  apps: [
    {
      // Application configuration
      name: 'lb2d-backend',
      script: './backend/dist/server.js',
      
      // Environment configuration
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      
      // Process management
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      
      // Auto restart configuration
      autorestart: true,
      watch: false, // Don't watch files in production
      max_memory_restart: '1G',
      
      // Logging configuration
      log_file: './backend/logs/combined.log',
      out_file: './backend/logs/out.log',
      error_file: './backend/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Advanced configuration
      node_args: '--max-old-space-size=4096',
      max_restarts: 10,
      min_uptime: '10s',
      
      // Health monitoring
      health_check_http: {
        path: '/health',
        port: 5000
      },
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Source map support
      source_map_support: true,
      
      // Disable automatic restart on crash for first 10 attempts
      restart_delay: 4000
    },
    
    // Separate process for frontend (if serving from Node.js)
    {
      name: 'lb2d-frontend',
      script: 'serve',
      args: '-s ./frontend/build -l 3000',
      
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      
      // Logging
      log_file: './frontend/logs/combined.log',
      out_file: './frontend/logs/out.log',
      error_file: './frontend/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      // Server configuration
      user: 'node',
      host: 'your-production-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/lb2d.git',
      path: '/var/www/lb2d',
      
      // Deployment commands
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build:backend && npm run build:frontend && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      
      // Environment variables
      env: {
        NODE_ENV: 'production'
      }
    },
    
    staging: {
      user: 'node',
      host: 'your-staging-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/lb2d.git',
      path: '/var/www/lb2d-staging',
      
      'post-deploy': 'npm install && npm run build:backend && npm run build:frontend && pm2 reload ecosystem.config.js --env staging',
      
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};