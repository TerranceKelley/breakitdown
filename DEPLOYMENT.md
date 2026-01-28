# Docker Deployment Guide

This guide explains how to deploy Breakitdown to your server using Docker.

## Prerequisites

- Docker and Docker Compose installed on your server
- SSH access to your server (`tkelley@kloudtastic`)

## Quick Start

### 1. Transfer Files to Server

**Recommended location:** `~/cloudtastic/ai/breakitdown/`

From your local machine, transfer the project to your server:

```bash
# From your local machine
rsync -avz --exclude 'node_modules' --exclude '.nuxt' --exclude '.output' \
  --exclude '.git' --exclude '.env' \
  ./ tkelley@kloudtastic:~/cloudtastic/ai/breakitdown/
```

Or use git (recommended):

```bash
# On your server
ssh tkelley@kloudtastic
cd ~/cloudtastic/ai
git clone https://github.com/TerranceKelley/breakitdown.git
cd breakitdown
```

**Note:** Breakitdown goes in `~/cloudtastic/ai/breakitdown/` to follow the Cloudtastic folder structure where AI applications live under `ai/`.

### 2. Create Environment File

On your server, create a `.env` file:

```bash
# On your server
cd ~/cloudtastic/ai/breakitdown
cp .env.example .env
nano .env  # or use your preferred editor
```

Configure your environment variables:

**Option A: Using OpenAI**
```env
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o
USE_OLLAMA=false
```

**Option B: Using Ollama (Local)**
```env
USE_OLLAMA=true
OLLAMA_URL=http://ollama:11434  # If Ollama is in another container
# OR
OLLAMA_URL=http://host.docker.internal:11434  # If Ollama is on host
OLLAMA_MODEL=gpt-oss:20b
```

### 3. Build and Run with Docker Compose

```bash
# Build and start the container
docker compose up -d --build

# View logs
docker compose logs -f

# Stop the container
docker compose down
```

### 4. Access the Application

The application will be available at:
- `http://kloudtastic:3000` (or your server's IP/domain)

## Manual Docker Commands

If you prefer not to use docker compose:

```bash
# Build the image
docker build -t breakitdown .

# Run the container
docker run -d \
  --name breakitdown \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  breakitdown

# View logs
docker logs -f breakitdown

# Stop and remove
docker stop breakitdown
docker rm breakitdown
```

## Using Ollama on the Same Server

If you're running Ollama on the same server, you have a few options:

### Option 1: Host Network Mode (Simplest)

Modify `compose.yml` (or `docker-compose.yml`):

```yaml
services:
  breakitdown:
    # ... other config ...
    network_mode: "host"
    environment:
      - OLLAMA_URL=http://localhost:11434
```

### Option 2: Docker Network

If Ollama is in another Docker container (already configured in Cloudtastic):

The `docker-compose.yml` is already configured to use the `proxy` network where Ollama runs.

### Option 3: Host Gateway

```yaml
services:
  breakitdown:
    # ... other config ...
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      - OLLAMA_URL=http://host.docker.internal:11434
```

## Updating the Application

When you push changes to GitHub:

```bash
# On your server
cd ~/cloudtastic/ai/breakitdown
git pull
docker compose up -d --build
```

## Troubleshooting

### Check Container Status
```bash
docker compose ps
docker compose logs breakitdown
```

### Rebuild After Changes
```bash
docker compose build --no-cache
docker compose up -d
```

### Access Container Shell
```bash
docker compose exec breakitdown sh
```

### Check Environment Variables
```bash
docker compose exec breakitdown env
```

## Production Considerations

1. **Reverse Proxy**: Consider using Nginx or Traefik as a reverse proxy
2. **HTTPS**: Set up SSL certificates (Let's Encrypt)
3. **Firewall**: Ensure port 3000 is accessible (or use reverse proxy)
4. **Monitoring**: Set up logging and monitoring
5. **Backups**: Backup your IndexedDB data if needed (client-side storage)

## Example Nginx Configuration

```nginx
server {
    listen 80;
    server_name breakitdown.yourdomain.com;

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
```
