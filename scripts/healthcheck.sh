#!/bin/sh
# Health check script for Docker
# Returns 0 if healthy, 1 if unhealthy

HEALTH_URL="${HEALTH_URL:-http://localhost:3000/api/health}"
TIMEOUT="${TIMEOUT:-10}"

# Check if the health endpoint responds
response=$(wget -qO- --timeout=$TIMEOUT "$HEALTH_URL" 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "Health check failed: Could not reach $HEALTH_URL"
  exit 1
fi

# Check if status is healthy or degraded (but not unhealthy)
status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$status" = "healthy" ] || [ "$status" = "degraded" ]; then
  echo "Health check passed: status=$status"
  exit 0
else
  echo "Health check failed: status=$status"
  exit 1
fi
