# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only (skip postinstall scripts)
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built application from builder (only .output is needed for runtime)
COPY --from=builder /app/.output ./.output

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0

# Start the application
CMD ["node", ".output/server/index.mjs"]
