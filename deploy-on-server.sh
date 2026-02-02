#!/bin/bash
# Run this script ON THE SERVER from ~/cloudtastic/ai/breakitdown (e.g. cd breakitdown && bash deploy-on-server.sh).
# Pulls breakitdown + authme in parent dir, then runs docker compose up -d --build.

set -e

AUTHME_REPO="${1:-https://github.com/TerranceKelley/authme.git}"
BREAKITDOWN_REPO="${2:-https://github.com/TerranceKelley/breakitdown.git}"

# We're in breakitdown/; parent is ai/
PARENT_DIR="$(cd .. && pwd)"
cd "$PARENT_DIR"

if [ ! -d breakitdown ]; then
    echo "📥 Cloning breakitdown..."
    git clone "$BREAKITDOWN_REPO" breakitdown || exit 1
else
    echo "📥 Pulling breakitdown..."
    (cd breakitdown && git pull origin main) || true
fi

if [ ! -f authme/package.json ]; then
    echo "📥 Cloning authme..."
    git clone "$AUTHME_REPO" authme || exit 1
else
    echo "📥 Pulling authme..."
    (cd authme && git pull origin main) || true
fi

# Package authme first so Nuxt can load dist/module.js (Docker only copies, no tsc inside image)
echo "📦 Building authme (dist/)..."
(cd authme && npm install && npm run build) || exit 1

cd breakitdown

if [ ! -f .env ]; then
    echo "⚠️  .env not found. Copy from .env.example and configure."
    cp -n .env.example .env 2>/dev/null || true
fi

# Build context is parent (ai/); exclude node_modules so COPY breakitdown doesn't overwrite container's node_modules (with authme)
echo "breakitdown/node_modules
authme/node_modules
breakitdown/.nuxt
breakitdown/.output
authme/.git" > "$PARENT_DIR/.dockerignore"

echo "🐳 Building and starting containers..."
docker compose down 2>/dev/null || true
docker compose up -d --build

echo "✅ Deployment complete!"
docker compose ps
echo ""
echo "📝 Logs: docker compose logs -f"
