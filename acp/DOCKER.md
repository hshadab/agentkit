# Docker Setup Guide

Run the complete ACP × GPT-5 × zkML stack with a single command.

## Quick Start

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Add your API keys to .env
nano .env  # or use your favorite editor

# 3. Start all services
docker-compose up -d

# 4. Check status
docker-compose ps

# 5. View logs
docker-compose logs -f

# 6. Open UI
open http://localhost:8000
```

**That's it!** All services running in containers.

---

## Services

The stack includes 5 services:

| Service | Container Name | Port | Purpose |
|---------|----------------|------|---------|
| gpt5-parser | acp-gpt5-parser | 9005 | Parses natural language spending rules |
| proof-service | acp-proof-service | 9001 | Generates zkML authorization proofs |
| acp-server | acp-openai-server | 9006 | Main ACP API server |
| groth16-verifier | acp-groth16-verifier | 3004 | On-chain proof verification |
| web-ui | acp-web-ui | 8000 | Static file server for UI |

### Optional Services

Start with production profile:
```bash
docker-compose --profile production up -d
```

Includes:
- **nginx**: Reverse proxy with TLS (port 80/443)

---

## Configuration

### Required Environment Variables

Edit `.env` file:

```bash
# OpenAI (required for GPT-5 parsing)
OPENAI_API_KEY=sk-...

# Stripe (required for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Ethereum (required for on-chain verification)
GROTH16_PRIVATE_KEY=0x...
```

### Optional Variables

```bash
# OpenAI Model (defaults to GPT-5)
OPENAI_MODEL=gpt-5-2025-08-07

# Ethereum RPC (defaults to public endpoint)
ETH_RPC=https://eth-sepolia.public.blastapi.io

# Contract Address (defaults to deployed verifier)
GROTH16_VERIFIER_ADDRESS=0xDCBbFCDE276cBEf449D8Fc35FFe5f51cf7dD9944

# Environment
NODE_ENV=development
```

---

## Usage

### Start Services

```bash
# Start all services in background
docker-compose up -d

# Start with logs visible
docker-compose up

# Start specific services only
docker-compose up gpt5-parser acp-server
```

### Stop Services

```bash
# Stop all services
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop, remove, and delete volumes
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f acp-server

# Last 100 lines
docker-compose logs --tail=100
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart acp-server
```

---

## Health Checks

All services include health checks:

```bash
# Check service status
docker-compose ps

# Healthy services show:
#   STATE: Up (healthy)
```

### Manual Health Checks

```bash
# GPT-5 Parser
curl http://localhost:9005/health

# Proof Service
curl http://localhost:9001/health

# ACP Server
curl http://localhost:9006/health

# Groth16 Verifier
curl http://localhost:3004/health
```

---

## Development Workflow

### Live Code Reloading

Services use volume mounts for live reloading:

```yaml
volumes:
  - .:/app          # Mount current directory
  - /app/node_modules  # Preserve node_modules
```

**To reload after code changes**:
```bash
docker-compose restart <service-name>
```

### Install New Dependencies

```bash
# Install on host
npm install <package>

# Rebuild containers
docker-compose build
docker-compose up -d
```

### Access Container Shell

```bash
# Interactive shell
docker-compose exec acp-server sh

# Run command in container
docker-compose exec acp-server node --version
```

---

## Networking

Services communicate via internal network:

```
acp-network (bridge)
├── gpt5-parser:9005
├── proof-service:9001
├── acp-server:9006
├── groth16-verifier:3004
└── web-ui:8000
```

**From inside containers**:
- GPT-5 Parser: `http://gpt5-parser:9005`
- Proof Service: `http://proof-service:9001`
- ACP Server: `http://acp-server:9006`

**From host machine**:
- Use `localhost` instead of service names
- Ports are mapped in docker-compose.yml

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs for errors
docker-compose logs <service-name>

# Common issues:
# 1. Port already in use
sudo lsof -i :9006
docker-compose down

# 2. Missing environment variables
cat .env

# 3. Old containers running
docker-compose down -v
docker-compose up -d
```

### Health Check Failing

```bash
# Check service logs
docker-compose logs <service-name>

# Restart service
docker-compose restart <service-name>

# Rebuild if code changed
docker-compose up -d --build <service-name>
```

### Can't Connect to Service

```bash
# Verify service is running
docker-compose ps

# Check network connectivity
docker-compose exec acp-server ping gpt5-parser

# Verify port mapping
docker-compose port acp-server 9006
```

### Slow Performance

```bash
# Check resource usage
docker stats

# Increase Docker resources:
# Docker Desktop → Preferences → Resources
# - CPUs: 4+
# - Memory: 8GB+
# - Disk: 20GB+
```

---

## Production Deployment

### Using Nginx Reverse Proxy

1. Create SSL certificates:
```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/private.key \
  -out nginx/ssl/certificate.crt
```

2. Create nginx config:
```bash
mkdir -p nginx
nano nginx/nginx.conf
```

3. Start with production profile:
```bash
docker-compose --profile production up -d
```

### Using External Database

For production, use external services:

```yaml
environment:
  - OPENAI_API_KEY=${OPENAI_API_KEY}
  - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
  - REDIS_URL=redis://redis:6379
  - DATABASE_URL=postgresql://user:pass@db:5432/acp
```

### Monitoring

Add monitoring services to docker-compose.yml:

```yaml
prometheus:
  image: prom/prometheus
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml

grafana:
  image: grafana/grafana
  ports:
    - "3000:3000"
  depends_on:
    - prometheus
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Docker Build

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Build images
        run: docker-compose build

      - name: Run tests
        run: |
          docker-compose up -d
          sleep 10
          npm test
          docker-compose down
```

### Deployment

```bash
# Build for production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Push to registry
docker-compose push

# Deploy on server
ssh user@server 'cd /app && docker-compose pull && docker-compose up -d'
```

---

## Resource Requirements

### Minimum

- **CPU**: 2 cores
- **RAM**: 4GB
- **Disk**: 10GB

### Recommended

- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Disk**: 20GB+

### Production

- **CPU**: 8+ cores
- **RAM**: 16GB+
- **Disk**: 50GB+
- **Network**: 1Gbps+

---

## Security Best Practices

1. **Never commit .env file**
   ```bash
   echo ".env" >> .gitignore
   ```

2. **Use secrets management**
   - Docker Swarm secrets
   - Kubernetes secrets
   - AWS Secrets Manager
   - HashiCorp Vault

3. **Run as non-root user**
   ```dockerfile
   USER node
   ```

4. **Limit container resources**
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2'
         memory: 4G
   ```

5. **Use read-only volumes where possible**
   ```yaml
   volumes:
     - ./static:/app:ro
   ```

---

## Backup & Recovery

### Backup Data

```bash
# Backup volumes
docker run --rm --volumes-from acp-server \
  -v $(pwd):/backup \
  alpine tar czf /backup/acp-backup.tar.gz /app/data

# Backup database
docker-compose exec postgres pg_dump -U user db > backup.sql
```

### Restore Data

```bash
# Restore from backup
docker run --rm --volumes-from acp-server \
  -v $(pwd):/backup \
  alpine tar xzf /backup/acp-backup.tar.gz

# Restore database
docker-compose exec -T postgres psql -U user db < backup.sql
```

---

## FAQ

### Why Docker?

- **Consistency**: Same environment everywhere
- **Isolation**: No conflicts with host system
- **Portability**: Run anywhere Docker runs
- **Scalability**: Easy to add more services

### Can I use Podman instead?

Yes! Podman is Docker-compatible:
```bash
alias docker=podman
alias docker-compose=podman-compose
```

### How do I update to latest version?

```bash
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Can I run individual services without Docker?

Yes! See QUICKSTART.md for manual setup.

---

**Last Updated**: 2025-09-30
**Docker Compose Version**: 3.8
**Compatible With**: Docker 20.10+, Docker Compose 1.29+