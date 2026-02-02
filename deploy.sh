#!/bin/bash
#
# Deploy Breakitdown (and authme) to Kloudtastic via SSH.
#
# 1. Pushes breakitdown and authme to GitHub from this machine.
# 2. SSHs to tkelley@kloudtastic and runs deploy-on-server.sh:
#    - Ensures ~/cloudtastic/ai/breakitdown and ~/cloudtastic/ai/authme exist (clone/pull from GitHub).
#    - Runs docker compose up -d --build from breakitdown (build context = parent so authme is included).
#
# Run from breakitdown repo root. If authme is at ../authme, it will be pushed to GitHub too.
# Usage: ./deploy.sh [server]   e.g. ./deploy.sh tkelley@kloudtastic

set -e

SERVER="${1:-tkelley@kloudtastic}"
BREAKITDOWN_REPO='https://github.com/TerranceKelley/breakitdown.git'
AUTHME_REPO='https://github.com/TerranceKelley/authme.git'

echo "🚀 Deploying to $SERVER"

if [ ! -d .git ]; then
    echo "❌ Error: Run from breakitdown repo root"
    exit 1
fi

if ! git remote get-url origin &>/dev/null; then
    echo "❌ Error: No git remote 'origin'"
    exit 1
fi

echo "📤 Pushing breakitdown to GitHub..."
git push origin main || { echo "⚠️  Push breakitdown failed"; exit 1; }

if [ -d ../authme/.git ]; then
    echo "📤 Pushing authme to GitHub..."
    (cd ../authme && git push origin main) || { echo "⚠️  Push authme failed"; exit 1; }
else
    echo "ℹ️  ../authme not found or not a git repo; server will use authme from GitHub."
fi

echo "🔌 Running deploy on server (clone/pull breakitdown + authme, then docker compose)..."
# Use single quotes so ~ expands on the server to the server user's home
ssh "$SERVER" 'mkdir -p ~/cloudtastic/ai && cd ~/cloudtastic/ai && (test -d breakitdown || git clone https://github.com/TerranceKelley/breakitdown.git breakitdown) && cd breakitdown && git pull origin main && bash deploy-on-server.sh'

echo ""
echo "✅ Deploy finished."
