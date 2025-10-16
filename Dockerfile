# Multi-stage build for optimized deployment
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Backend stage
FROM node:18-alpine AS backend

# Install build dependencies for native modules (like bcrypt)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first
COPY backend/package*.json ./backend/

# Install dependencies (this will compile bcrypt for Alpine Linux)
RUN cd backend && npm ci --production

# Copy backend source files (node_modules excluded via .dockerignore)
COPY backend/*.js ./backend/
COPY backend/routes ./backend/routes
COPY backend/sockets ./backend/sockets
COPY backend/game ./backend/game
COPY backend/data ./backend/data
COPY backend/config ./backend/config
COPY backend/middleware ./backend/middleware
COPY backend/scripts ./backend/scripts
COPY backend/services ./backend/services

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port
EXPOSE 3001

# Set working directory to backend
WORKDIR /app/backend

# Start the server
CMD ["node", "server.js"]
