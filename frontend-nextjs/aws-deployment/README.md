# AWS Deployment Guide for LB2D Frontend

This guide provides comprehensive instructions for deploying the Learn Bangla to Deutsch (LB2D) Next.js application to AWS for production use.

## Table of Contents
1. [Deployment Options](#deployment-options)
2. [Prerequisites](#prerequisites)
3. [Option 1: AWS Amplify (Recommended for Easy Deployment)](#option-1-aws-amplify)
4. [Option 2: AWS ECS/Fargate with Docker](#option-2-aws-ecsfargate)
5. [Option 3: AWS EC2 with Docker](#option-3-aws-ec2)
6. [Option 4: AWS App Runner](#option-4-aws-app-runner)
7. [Post-Deployment Setup](#post-deployment-setup)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)

---

## Deployment Options

| Option | Complexity | Cost | Scalability | Best For |
|--------|-----------|------|-------------|----------|
| AWS Amplify | Low | $$ | Auto | Quick deployment, CI/CD |
| ECS/Fargate | Medium | $$$ | High | Production, microservices |
| EC2 + Docker | Medium | $$ | Medium | Full control, traditional |
| App Runner | Low | $$ | Auto | Container-based, managed |

---

## Prerequisites

### Required Tools
- AWS CLI installed and configured
- Docker and Docker Compose installed
- Node.js 18+ installed
- Git

### AWS Account Setup
1. Create an AWS account
2. Set up IAM user with appropriate permissions
3. Configure AWS CLI:
   ```bash
   aws configure
   ```

### Environment Variables
Create a `.env.production` file:
```env
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your-verification-code
NODE_ENV=production
```

---

## Option 1: AWS Amplify

AWS Amplify provides the easiest deployment with built-in CI/CD, CDN, and SSL.

### Step-by-Step Deployment

#### 1. Prepare Repository
```bash
# Ensure your code is in a Git repository (GitHub, GitLab, or Bitbucket)
git add .
git commit -m "Prepare for AWS Amplify deployment"
git push origin main
```

#### 2. Deploy via AWS Console

1. **Navigate to AWS Amplify Console**
   - Go to https://console.aws.amazon.com/amplify
   - Click "New app" ’ "Host web app"

2. **Connect Repository**
   - Select your Git provider (GitHub/GitLab/Bitbucket)
   - Authorize AWS Amplify
   - Select your repository and branch

3. **Configure Build Settings**
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

4. **Add Environment Variables**
   - In Amplify Console ’ App Settings ’ Environment variables
   - Add all variables from `.env.production`

5. **Deploy**
   - Click "Save and deploy"
   - Wait for build and deployment (5-10 minutes)

#### 3. Configure Custom Domain
1. In Amplify Console ’ Domain management
2. Click "Add domain"
3. Follow DNS configuration instructions
4. SSL certificate is automatically provisioned

### Cost Estimate (Amplify)
- Build minutes: ~$0.01/minute
- Hosting: ~$0.15/GB served + $0.023/GB stored
- Typical monthly cost: $15-50 for small-medium traffic

---

## Option 2: AWS ECS/Fargate

Best for production workloads requiring scalability and containerization.

### Architecture
- **ECR**: Docker image storage
- **ECS**: Container orchestration
- **Fargate**: Serverless compute
- **ALB**: Load balancer
- **CloudFront**: CDN
- **Route 53**: DNS management

### Step-by-Step Deployment

#### 1. Build and Push Docker Image

```bash
# Build Docker image
docker build -t lb2d-frontend:latest .

# Create ECR repository
aws ecr create-repository --repository-name lb2d-frontend --region us-east-1

# Get ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Tag image
docker tag lb2d-frontend:latest YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/lb2d-frontend:latest

# Push to ECR
docker push YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/lb2d-frontend:latest
```

#### 2. Create ECS Cluster

```bash
# Create cluster
aws ecs create-cluster --cluster-name lb2d-cluster --region us-east-1
```

#### 3. Create Task Definition

Create `task-definition.json`:
```json
{
  "family": "lb2d-frontend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "lb2d-frontend",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/lb2d-frontend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "NEXT_PUBLIC_API_URL", "value": "https://api.your-domain.com"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/lb2d-frontend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

Register task definition:
```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

#### 4. Create Application Load Balancer

```bash
# Create security group for ALB
aws ec2 create-security-group \
  --group-name lb2d-alb-sg \
  --description "Security group for LB2D ALB" \
  --vpc-id YOUR_VPC_ID

# Allow HTTP and HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id YOUR_ALB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id YOUR_ALB_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Create ALB
aws elbv2 create-load-balancer \
  --name lb2d-alb \
  --subnets SUBNET_ID_1 SUBNET_ID_2 \
  --security-groups YOUR_ALB_SG_ID \
  --scheme internet-facing
```

#### 5. Create ECS Service

```bash
aws ecs create-service \
  --cluster lb2d-cluster \
  --service-name lb2d-frontend-service \
  --task-definition lb2d-frontend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[SUBNET_ID_1,SUBNET_ID_2],securityGroups=[YOUR_ECS_SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=YOUR_TARGET_GROUP_ARN,containerName=lb2d-frontend,containerPort=3000"
```

#### 6. Configure Auto Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/lb2d-cluster/lb2d-frontend-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/lb2d-cluster/lb2d-frontend-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling-policy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

### Cost Estimate (ECS/Fargate)
- Fargate: ~$30-60/month per task (512 CPU, 1GB RAM)
- ALB: ~$16/month + $0.008/LCU-hour
- Data transfer: $0.09/GB
- Typical monthly cost: $100-300 for production

---

## Option 3: AWS EC2

Traditional VM-based deployment with full control.

### Step-by-Step Deployment

#### 1. Launch EC2 Instance

```bash
# Launch Ubuntu instance (t3.medium recommended)
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name YOUR_KEY_PAIR \
  --security-group-ids YOUR_SG_ID \
  --subnet-id YOUR_SUBNET_ID \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=LB2D-Frontend}]'
```

#### 2. Connect and Setup

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js (for PM2 alternative)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 3. Deploy Application

```bash
# Clone repository
git clone https://github.com/your-org/lb2d-frontend.git
cd lb2d-frontend

# Create .env file
nano .env.production

# Build and run with Docker
docker-compose -f docker-compose.prod.yml up -d

# OR build and run with PM2
npm ci --production
npm run build
npm install -g pm2
pm2 start npm --name "lb2d-frontend" -- start
pm2 save
pm2 startup
```

#### 4. Configure Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt-get update
sudo apt-get install -y nginx

# Configure Nginx
sudo nano /etc/nginx/sites-available/lb2d

# Add configuration:
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/lb2d /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 5. Install SSL Certificate

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is configured automatically
```

### Cost Estimate (EC2)
- t3.medium instance: ~$30/month (on-demand)
- EBS storage: ~$10/month (100GB)
- Data transfer: $0.09/GB
- Typical monthly cost: $50-100

---

## Option 4: AWS App Runner

Fully managed container service - easiest Docker deployment.

### Step-by-Step Deployment

```bash
# Create App Runner service
aws apprunner create-service \
  --service-name lb2d-frontend \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/lb2d-frontend:latest",
      "ImageConfiguration": {
        "Port": "3000",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "NEXT_PUBLIC_API_URL": "https://api.your-domain.com"
        }
      },
      "ImageRepositoryType": "ECR"
    },
    "AutoDeploymentsEnabled": true
  }' \
  --instance-configuration '{
    "Cpu": "1024",
    "Memory": "2048"
  }'
```

### Cost Estimate (App Runner)
- Compute: $0.064/vCPU-hour + $0.007/GB-hour
- Typical monthly cost: $40-80 for small-medium traffic

---

## Post-Deployment Setup

### 1. Configure CloudFront CDN

```bash
# Create CloudFront distribution
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

### 2. Set Up Route 53 DNS

```bash
# Create hosted zone
aws route53 create-hosted-zone --name your-domain.com --caller-reference $(date +%s)

# Create A record pointing to CloudFront
aws route53 change-resource-record-sets --hosted-zone-id YOUR_ZONE_ID --change-batch file://dns-record.json
```

### 3. Configure AWS CloudWatch

```bash
# Create log group
aws logs create-log-group --log-group-name /aws/lb2d-frontend

# Set up alarms
aws cloudwatch put-metric-alarm \
  --alarm-name lb2d-high-cpu \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --period 300 \
  --statistic Average \
  --threshold 80 \
  --alarm-actions YOUR_SNS_TOPIC_ARN
```

### 4. Enable AWS WAF (Optional)

```bash
# Create web ACL
aws wafv2 create-web-acl \
  --name lb2d-waf \
  --scope CLOUDFRONT \
  --default-action Allow={} \
  --rules file://waf-rules.json
```

---

## Monitoring and Maintenance

### CloudWatch Metrics to Monitor
- CPU Utilization
- Memory Utilization
- Request Count
- Error Rate (4xx, 5xx)
- Response Time

### Logs
- Application logs: `/aws/ecs/lb2d-frontend`
- Access logs: CloudFront access logs
- Error logs: CloudWatch Logs Insights

### Automated Backups
- Docker images in ECR
- Configuration in AWS Systems Manager Parameter Store
- Database snapshots (if applicable)

### CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy-aws.yml`:
```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Build Docker image
        run: docker build -t lb2d-frontend .

      - name: Push to ECR
        run: |
          aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com
          docker tag lb2d-frontend:latest ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com/lb2d-frontend:latest
          docker push ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com/lb2d-frontend:latest

      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster lb2d-cluster --service lb2d-frontend-service --force-new-deployment
```

---

## Troubleshooting

### Common Issues

1. **Container fails health check**
   - Check `/api/health` endpoint
   - Verify environment variables
   - Check CloudWatch logs

2. **High latency**
   - Enable CloudFront CDN
   - Optimize images
   - Check database connection

3. **Build failures**
   - Check Node.js version
   - Verify environment variables
   - Review build logs

### Support
For deployment issues, contact your DevOps team or AWS Support.

---

## Security Checklist

- [ ] Enable HTTPS/SSL
- [ ] Configure security groups properly
- [ ] Set up WAF rules
- [ ] Enable CloudWatch alarms
- [ ] Implement backup strategy
- [ ] Configure IAM roles with least privilege
- [ ] Enable AWS Config for compliance
- [ ] Set up AWS GuardDuty for threat detection

---

## Cost Optimization

1. **Use Reserved Instances** for predictable workloads
2. **Enable Auto Scaling** to match demand
3. **Use CloudFront** to reduce origin requests
4. **Compress assets** to reduce data transfer
5. **Monitor with Cost Explorer** and set budgets

---

## Next Steps

1. Deploy to staging environment first
2. Run load tests
3. Configure monitoring and alerts
4. Set up automated backups
5. Document runbooks
6. Train team on deployment process
7. Deploy to production
8. Monitor for 24-48 hours

**Recommended**: Start with **AWS Amplify** for quick deployment, then migrate to **ECS/Fargate** when you need more control and scalability.
