# LinkLibrary MCP Server Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the LinkLibrary MCP Server in various environments, from local development to production.

## Prerequisites

### System Requirements

- **Python**: 3.11 or higher
- **Memory**: Minimum 512MB RAM (2GB recommended for production)
- **Storage**: 1GB free space
- **Network**: Internet access for API communication

### Dependencies

- **PostgreSQL**: 15 or higher (for session storage and metadata)
- **LinkLibrary Backend**: Running instance with API access

## Environment Setup

### 1. Local Development

#### Step 1: Clone and Setup
```bash
# Clone the repository
git clone <repository-url>
cd linklibrary-mcp

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### Step 2: Environment Configuration
Create a `.env` file in the project root:

```env
# MCP Server Configuration
MCP_SERVER_NAME=linklibrary-mcp
MCP_SERVER_VERSION=1.0.0

# LinkLibrary API Configuration
LINKLIBRARY_API_URL=http://localhost:8000
LINKLIBRARY_API_KEY=your_api_key_here

# Authentication
JWT_SECRET_KEY=your_jwt_secret_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database (for caching and sessions)
DATABASE_URL=postgresql://user:password@localhost:5432/linklibrary_mcp

# Redis Cache
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=3600

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=%(asctime)s - %(name)s - %(levelname)s - %(message)s

# Security
CORS_ORIGINS=["*"]
ALLOWED_HOSTS=["*"]
```

#### Step 3: Database Setup
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE linklibrary_mcp;
CREATE USER linklibrary_mcp_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE linklibrary_mcp TO linklibrary_mcp_user;
\q

# No additional services required for caching (using in-memory cache)
```

#### Step 4: Run the Server
```bash
# Start the MCP server
python -m src.main

# Or using the development script
python scripts/dev_server.py
```

### 2. Docker Deployment

#### Step 1: Docker Setup
Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  linklibrary-mcp:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://linklibrary_mcp_user:password@db:5432/linklibrary_mcp
      - LINKLIBRARY_API_URL=${LINKLIBRARY_API_URL}
      - LINKLIBRARY_API_KEY=${LINKLIBRARY_API_KEY}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - LOG_LEVEL=INFO
    depends_on:
      - db
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:8000/health')"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=linklibrary_mcp
      - POSTGRES_USER=linklibrary_mcp_user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U linklibrary_mcp_user -d linklibrary_mcp"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

#### Step 2: Build and Run
```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f linklibrary-mcp

# Stop services
docker-compose down
```

### 3. Production Deployment

#### Step 1: Server Preparation

**Ubuntu/Debian Server Setup:**
```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install required packages
sudo apt-get install -y python3.11 python3.11-venv python3.11-dev
sudo apt-get install -y postgresql postgresql-contrib
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo apt-get install -y git curl wget

# Create application user
sudo useradd -m -s /bin/bash linklibrary
sudo usermod -aG sudo linklibrary
```

#### Step 2: Application Deployment
```bash
# Switch to application user
sudo su - linklibrary

# Clone repository
git clone <repository-url> /home/linklibrary/linklibrary-mcp
cd /home/linklibrary/linklibrary-mcp

# Setup virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create necessary directories
mkdir -p logs data
```

#### Step 3: Systemd Service
Create `/etc/systemd/system/linklibrary-mcp.service`:

```ini
[Unit]
Description=LinkLibrary MCP Server
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=linklibrary
Group=linklibrary
WorkingDirectory=/home/linklibrary/linklibrary-mcp
Environment=PATH=/home/linklibrary/linklibrary-mcp/venv/bin
ExecStart=/home/linklibrary/linklibrary-mcp/venv/bin/python -m src.main
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/home/linklibrary/linklibrary-mcp/logs

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=linklibrary-mcp

[Install]
WantedBy=multi-user.target
```

#### Step 4: Nginx Configuration
Create `/etc/nginx/sites-available/linklibrary-mcp`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy to MCP server
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        access_log off;
    }

    # Static files (if any)
    location /static/ {
        alias /home/linklibrary/linklibrary-mcp/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Step 5: SSL Certificate
```bash
# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

#### Step 6: Start Services
```bash
# Enable and start services
sudo systemctl enable linklibrary-mcp
sudo systemctl start linklibrary-mcp
sudo systemctl enable nginx
sudo systemctl start nginx

# Check status
sudo systemctl status linklibrary-mcp
sudo systemctl status nginx
```

### 4. Kubernetes Deployment

#### Step 1: Namespace and ConfigMap
Create `k8s/namespace.yaml`:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: linklibrary-mcp
```

Create `k8s/configmap.yaml`:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: linklibrary-mcp-config
  namespace: linklibrary-mcp
data:
  LOG_LEVEL: "INFO"
  CACHE_TTL: "3600"
  RATE_LIMIT_REQUESTS: "100"
  RATE_LIMIT_WINDOW: "3600"
```

#### Step 2: Secrets
Create `k8s/secrets.yaml`:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: linklibrary-mcp-secrets
  namespace: linklibrary-mcp
type: Opaque
data:
  LINKLIBRARY_API_KEY: <base64-encoded-api-key>
  JWT_SECRET_KEY: <base64-encoded-jwt-secret>
  DATABASE_URL: <base64-encoded-database-url>
  REDIS_URL: <base64-encoded-redis-url>
```

#### Step 3: Deployment
Create `k8s/deployment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: linklibrary-mcp
  namespace: linklibrary-mcp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: linklibrary-mcp
  template:
    metadata:
      labels:
        app: linklibrary-mcp
    spec:
      containers:
      - name: linklibrary-mcp
        image: linklibrary-mcp:latest
        ports:
        - containerPort: 8000
        envFrom:
        - configMapRef:
            name: linklibrary-mcp-config
        - secretRef:
            name: linklibrary-mcp-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        emptyDir: {}
```

#### Step 4: Service
Create `k8s/service.yaml`:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: linklibrary-mcp-service
  namespace: linklibrary-mcp
spec:
  selector:
    app: linklibrary-mcp
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: ClusterIP
```

#### Step 5: Ingress
Create `k8s/ingress.yaml`:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: linklibrary-mcp-ingress
  namespace: linklibrary-mcp
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: linklibrary-mcp-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: linklibrary-mcp-service
            port:
              number: 80
```

#### Step 6: Deploy to Kubernetes
```bash
# Apply all configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n linklibrary-mcp
kubectl get services -n linklibrary-mcp
kubectl get ingress -n linklibrary-mcp
```

## Monitoring and Logging

### 1. Application Logging
The MCP server uses structured logging with rotation:

```python
# Log configuration in config/logging.py
import logging
from logging.handlers import RotatingFileHandler

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            RotatingFileHandler(
                'logs/linklibrary-mcp.log',
                maxBytes=10*1024*1024,  # 10MB
                backupCount=5
            ),
            logging.StreamHandler()
        ]
    )
```

### 2. Health Checks
The server provides health check endpoints:

```bash
# Basic health check
curl http://localhost:8000/health

# Detailed health check
curl http://localhost:8000/health/detailed
```

### 3. Metrics Collection
For production monitoring, integrate with Prometheus:

```python
# Add to requirements.txt
prometheus-client==0.17.1

# Metrics configuration
from prometheus_client import Counter, Histogram, generate_latest

# Define metrics
REQUEST_COUNT = Counter('mcp_requests_total', 'Total requests', ['method', 'endpoint'])
REQUEST_DURATION = Histogram('mcp_request_duration_seconds', 'Request duration')

# Expose metrics endpoint
@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

### 4. Alerting
Set up alerts for critical metrics:

```yaml
# prometheus-alerts.yaml
groups:
- name: linklibrary-mcp
  rules:
  - alert: HighErrorRate
    expr: rate(mcp_requests_total{status=~"5.."}[5m]) > 0.1
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }} errors per second"

  - alert: HighResponseTime
    expr: histogram_quantile(0.95, mcp_request_duration_seconds) > 2
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High response time detected"
      description: "95th percentile response time is {{ $value }} seconds"
```

## Security Considerations

### 1. Network Security
- Use HTTPS/TLS for all communications
- Implement proper firewall rules
- Use VPN for internal communications
- Regular security updates

### 2. Application Security
- Input validation and sanitization
- Rate limiting and DDoS protection
- Secure session management
- Regular security audits

### 3. Data Security
- Encrypt sensitive data at rest
- Use secure database connections
- Implement proper access controls
- Regular backup and recovery testing

### 4. Monitoring Security
- Monitor for suspicious activities
- Implement intrusion detection
- Regular vulnerability scanning
- Security incident response plan

## Backup and Recovery

### 1. Database Backup
```bash
# PostgreSQL backup script
#!/bin/bash
BACKUP_DIR="/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="linklibrary_mcp"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
pg_dump -h localhost -U linklibrary_mcp_user $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

### 2. Application Backup
```bash
# Application backup script
#!/bin/bash
APP_DIR="/home/linklibrary/linklibrary-mcp"
BACKUP_DIR="/backups/application"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C $APP_DIR .

# Clean old backups
find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +7 -delete
```

### 3. Recovery Procedures
```bash
# Database recovery
pg_restore -h localhost -U linklibrary_mcp_user -d linklibrary_mcp backup_20240115_120000.sql

# Application recovery
tar -xzf app_backup_20240115_120000.tar.gz -C /home/linklibrary/linklibrary-mcp/
```

## Performance Optimization

### 1. Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX idx_links_user_id ON links(user_id);
CREATE INDEX idx_links_created_at ON links(created_at);
CREATE INDEX idx_links_collection_id ON links(collection_id);

-- Analyze table statistics
ANALYZE links;
ANALYZE collections;
ANALYZE tags;
```

### 2. Caching Strategy
```python
# In-memory caching configuration
CACHE_CONFIG = {
    'default': {
        'BACKEND': 'core.cache.InMemoryCache',
        'MAX_SIZE': 1000,
        'TTL': 3600,
    }
}
```

### 3. Load Balancing
For high-traffic deployments, use load balancers:

```nginx
# Nginx load balancer configuration
upstream linklibrary_mcp {
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
    server 127.0.0.1:8003;
}

server {
    listen 80;
    location / {
        proxy_pass http://linklibrary_mcp;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### Common Issues

#### 1. Connection Issues
```bash
# Check if services are running
sudo systemctl status linklibrary-mcp
sudo systemctl status postgresql

# Check network connectivity
curl -I http://localhost:8000/health
telnet localhost 5432
```

#### 2. Database Issues
```bash
# Check database connection
psql -h localhost -U linklibrary_mcp_user -d linklibrary_mcp -c "SELECT 1;"

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Check cache status (in-memory cache)
# The cache is managed internally by the application
```

#### 3. Memory Issues
```bash
# Check memory usage
free -h
ps aux | grep linklibrary-mcp

# Check for memory leaks
valgrind --tool=memcheck python -m src.main
```

#### 4. Performance Issues
```bash
# Check CPU usage
top -p $(pgrep -f linklibrary-mcp)

# Check disk I/O
iotop -p $(pgrep -f linklibrary-mcp)

# Check network usage
iftop -i eth0
```

## Maintenance

### 1. Regular Maintenance Tasks
```bash
# Daily tasks
- Check application logs for errors
- Monitor system resources
- Verify backup completion

# Weekly tasks
- Update system packages
- Analyze performance metrics
- Review security logs

# Monthly tasks
- Security audit
- Performance optimization
- Capacity planning
```

### 2. Update Procedures
```bash
# Application update
cd /home/linklibrary/linklibrary-mcp
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart linklibrary-mcp

# Database migration
python -m alembic upgrade head
```

### 3. Scaling Procedures
```bash
# Horizontal scaling (add more instances)
# Update load balancer configuration
# Update monitoring configuration

# Vertical scaling (increase resources)
# Update systemd service limits
# Update database connection pool
# Restart services
```

## Support and Documentation

### 1. Documentation
- Architecture documentation
- API documentation
- Deployment guides
- Troubleshooting guides

### 2. Monitoring
- Application metrics
- System metrics
- Business metrics
- Alert configuration

### 3. Support Channels
- Technical documentation
- Community forums
- Issue tracking
- Email support

This deployment guide provides a comprehensive approach to deploying the LinkLibrary MCP Server in various environments. Follow the appropriate section based on your deployment requirements and ensure all security and performance considerations are addressed. 