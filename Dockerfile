# Multi-stage build for Next.js application

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies required for sharp
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies required for sharp
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy application code
COPY . .

# Set environment variable for build (can be overridden)
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install runtime dependencies for sharp
RUN apk add --no-cache libc6-compat

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy package.json and lock file
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# Copy production node_modules from deps stage
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built Next.js application
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000

# Start using regular Next.js start (not standalone)
CMD ["npm", "start"]

