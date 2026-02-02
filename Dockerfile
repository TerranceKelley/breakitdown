# Build context must be the parent directory containing both breakitdown/ and authme/.
# Run from parent: docker build -f breakitdown/Dockerfile .

# Build stage
FROM node:20-alpine AS builder

WORKDIR /workspace

# Copy authme (sibling of breakitdown) so file:../authme resolves
COPY authme ./authme

# Copy breakitdown package files first for better layer caching
COPY breakitdown/package*.json ./breakitdown/

# Install dependencies (npm install so file:../authme resolves in this context; npm ci can use lockfile paths that break in Docker)
WORKDIR /workspace/breakitdown
RUN npm install

# Copy breakitdown source (after install so authme link is correct)
COPY breakitdown ./

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy authme so file:../authme resolves when installing
COPY --from=builder /workspace/authme /authme

# Copy package files and install production deps
COPY --from=builder /workspace/breakitdown/package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built application from builder
COPY --from=builder /workspace/breakitdown/.output ./.output

# Expose port
EXPOSE 3000

ENV NODE_ENV=production
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- --timeout=5 http://localhost:3000/api/health | grep -q '"status":"healthy"' || exit 1

CMD ["node", ".output/server/index.mjs"]
