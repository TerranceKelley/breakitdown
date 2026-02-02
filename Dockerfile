# Build context must be the parent directory containing both breakitdown/ and authme/.
# Run from parent: docker build -f breakitdown/Dockerfile .

# Build stage
FROM node:20-alpine AS builder

WORKDIR /workspace

# Copy authme explicitly (package files + src) so tsc always has inputs
COPY authme/package.json authme/package-lock.json authme/tsconfig.json ./authme/
COPY authme/src ./authme/src
COPY breakitdown/package*.json ./breakitdown/

# Fail fast if authme source is missing (e.g. bad clone on server)
RUN test -f /workspace/authme/src/module.ts || (echo "Missing authme/src - listing /workspace/authme:" && ls -la /workspace/authme && (ls -la /workspace/authme/src 2>/dev/null || true) && exit 1)

# Build authme to dist/ if not already (host may have pre-built; Node 20 in image)
RUN test -d /workspace/authme/dist || (cd /workspace/authme && npm install && npm run build)

WORKDIR /workspace/breakitdown

# Install deps (authme will fail to resolve from lockfile in Docker; we'll add it next)
RUN npm ci --ignore-scripts || true

# Put authme in node_modules so Nuxt can load it (file:../authme often breaks in Docker)
RUN rm -rf node_modules/authme && cp -r /workspace/authme node_modules/authme

# Copy breakitdown source (exclude node_modules via context .dockerignore)
COPY breakitdown ./

# Ensure authme is in node_modules (in case COPY overwrote it; .dockerignore should prevent that)
RUN rm -rf node_modules/authme && cp -r /workspace/authme node_modules/authme

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
