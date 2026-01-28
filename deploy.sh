#!/bin/bash

# Deployment script for Breakitdown
# Usage: ./deploy.sh [server_user@server_host]

set -e

SERVER="${1:-tkelley@kloudtastic}"
APP_DIR="~/breakitdown"

echo "🚀 Deploying Breakitdown to $SERVER"

# Check if we're in a git repo
if [ ! -d .git ]; then
    echo "❌ Error: Not in a git repository"
    echo "Please initialize git and push to GitHub first"
    exit 1
fi

# Check if remote is set
if ! git remote get-url origin &>/dev/null; then
    echo "❌ Error: No git remote 'origin' found"
    echo "Please set up your GitHub remote first"
    exit 1
fi

echo "📦 Building Docker image locally (optional test)..."
echo "   (Skipping - will build on server)"

echo "📤 Pushing to GitHub..."
git push origin main || {
    echo "⚠️  Warning: Failed to push to GitHub. Continuing anyway..."
}

echo "🔌 Connecting to server..."
ssh $SERVER << 'ENDSSH'
    set -e
    
    # Navigate to app directory or clone if it doesn't exist
    if [ ! -d ~/breakitdown ]; then
        echo "📥 Cloning repository..."
        cd ~
        git clone https://github.com/TerranceKelley/breakitdown.git || {
            echo "❌ Failed to clone repository"
            exit 1
        }
        cd breakitdown
    else
        echo "📥 Pulling latest changes..."
        cd ~/breakitdown
        git pull origin main || {
            echo "⚠️  Warning: Failed to pull. Continuing with existing code..."
        }
    fi
    
    # Check if .env exists
    if [ ! -f .env ]; then
        echo "⚠️  Warning: .env file not found!"
        echo "   Please create .env file with your configuration"
        echo "   You can copy from .env.example: cp .env.example .env"
    fi
    
    # Build and start with docker-compose
    echo "🐳 Building and starting Docker containers..."
    docker-compose down 2>/dev/null || true
    docker-compose up -d --build
    
    echo "✅ Deployment complete!"
    echo ""
    echo "📊 Container status:"
    docker-compose ps
    
    echo ""
    echo "📝 View logs with: docker-compose logs -f"
    echo "🌐 Application should be available at: http://$(hostname -I | awk '{print $1}'):3000"
ENDSSH

echo ""
echo "✅ Deployment script completed!"
echo "🌐 Check your application at: http://kloudtastic:3000"
