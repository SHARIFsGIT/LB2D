# Multi-stage Dockerfile for React frontend

# Development stage
FROM node:18-alpine AS development
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "start"]

# Build stage
FROM node:18-alpine AS build
WORKDIR /app

# Accept build arguments
ARG REACT_APP_API_URL
ARG REACT_APP_WS_URL
ARG REACT_APP_STRIPE_PUBLISHABLE_KEY
ARG REACT_APP_ENABLE_ANALYTICS=true
ARG REACT_APP_ENABLE_WEBSOCKET=true

# Set environment variables
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL
ENV REACT_APP_STRIPE_PUBLISHABLE_KEY=$REACT_APP_STRIPE_PUBLISHABLE_KEY
ENV REACT_APP_ENABLE_ANALYTICS=$REACT_APP_ENABLE_ANALYTICS
ENV REACT_APP_ENABLE_WEBSOCKET=$REACT_APP_ENABLE_WEBSOCKET

# Install dependencies
COPY package*.json ./
RUN npm ci --silent

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Create non-root user for security
RUN addgroup -g 1001 -S nginx_group
RUN adduser -S nginx_user -u 1001 -G nginx_group

# Set proper permissions
RUN chown -R nginx_user:nginx_group /usr/share/nginx/html
RUN chown -R nginx_user:nginx_group /var/cache/nginx
RUN chown -R nginx_user:nginx_group /var/log/nginx
RUN chown -R nginx_user:nginx_group /etc/nginx/conf.d

# Switch to non-root user
USER nginx_user

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]