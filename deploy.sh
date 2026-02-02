#!/bin/bash

# Deploy Breakitdown (and authme) to server.
# Requires: breakitdown and authme as siblings locally (authme at ../authme).
# Usage: ./deploy.sh [server_user@server_host]

set -e

SERVER="${1:-tkelley@kloudtastic}"
PARENT_DIR="~/cloudtastic/ai"
BREAKITDOWN_DIR="${PARENT_DIR}/breakitdown"
AUTHME_DIR="${PARENT_DIR}/authme"

echo "🚀 Deploying Breakitdown to $SERVER"

if [ ! -d .git ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

if ! git remote get-url origin &>/dev/null; then
    echo "❌ Error: No git remote 'origin' found"
    exit 1
fi

echo "📤 Pushing breakitdown to GitHub..."
git push origin main || {
    echo "⚠️  Warning: Failed to push. Continuing anyway..."
}

# Ensure parent dir exists on server, then sync authme
ssh $SERVER "mkdir -p $PARENT_DIR"

if [ -d ../authme ]; then
    echo "📤 Syncing authme to server..."
    rsync -avz --delete ../authme/ "$SERVER:${PARENT_DIR}/authme/" || true
else
    echo "⚠️  ../authme not found. Server must have authme at ${PARENT_DIR}/authme."
fi

echo "🔌 Connecting to server..."
ssh $SERVER bash -s "$PARENT_DIR" "$BREAKITDOWN_DIR" "$AUTHME_DIR" << 'ENDSSH'
    set -e
    PARENT_DIR="$1"
    BREAKITDOWN_DIR="$2"
    AUTHME_DIR="$3"

    mkdir -p "$PARENT_DIR"
    cd "$PARENT_DIR"

    # Clone or pull breakitdown
    if [ ! -d breakitdown ]; then
        echo "📥 Cloning breakitdown..."
        git clone https://github.com/TerranceKelley/breakitdown.git breakitdown || exit 1
    else
        echo "📥 Pulling breakitdown..."
        (cd breakitdown && git pull origin main) || true
    fi

    if [ ! -f authme/package.json ]; then
        echo "⚠️  authme not found at $AUTHME_DIR (no authme/package.json)"
        echo "   From your machine run: rsync -avz ../authme/ $SERVER:$AUTHME_DIR/"
        exit 1
    fi

    cd breakitdown

    if [ ! -f .env ]; then
        echo "⚠️  .env not found. Copy from .env.example and configure."
        cp -n .env.example .env 2>/dev/null || true
    fi

    echo "🐳 Building and starting containers (context = parent so authme is included)..."
    docker compose down 2>/dev/null || true
    docker compose up -d --build

    echo "✅ Deployment complete!"
    docker compose ps
    echo ""
    echo "📝 Logs: docker compose logs -f"
ENDSSH

echo ""
echo "✅ Done. If authme was missing on server, sync it first:"
echo "   rsync -avz ../authme/ $SERVER:$AUTHME_DIR/"