# =============================================================================
# VidhiSetu Unified Multi-Stage Production Dockerfile
# Serves React 19 Frontend + Node.js Express Backend on a Single Container Port
# =============================================================================

# --- Stage 1: Frontend Build Stage ---
FROM node:22-alpine AS frontend-builder
WORKDIR /app

# Install root dependencies for Vite build
COPY package*.json ./
RUN npm ci

# Copy frontend source files and configuration
COPY index.html vite.config.js ./
COPY src/ ./src/
COPY public/ ./public/

# Build static production bundle into /app/dist
RUN npm run build

# --- Stage 2: Production Server Runtime ---
FROM node:22-alpine AS production-runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV VIDHISETU_UPLOAD_DIR=/data/uploads

# Install backend production dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy built frontend assets from builder stage
COPY --from=frontend-builder /app/dist ./dist

# Copy backend application source
COPY backend/ ./backend/

# Ensure persistent uploads directory exists
RUN mkdir -p /data/uploads

# Create volume mount point for persistent legal document storage
VOLUME ["/data/uploads"]

EXPOSE 5000

# Run migrations if database is ready, then start the central server
CMD ["sh", "-c", "node backend/src/db/migrate.js || true; node backend/src/server.js"]
