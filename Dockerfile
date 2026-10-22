# ==========================================
# Multi-stage Dockerfile for Student Finance Tracker
# Stage 1: Build React Frontend
# Stage 2: Setup Python FastAPI & Serve Both
# ==========================================

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /build

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Production Backend
FROM python:3.11-slim AS production
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_ENV=production \
    DATABASE_URL=sqlite:///./data/finance.db \
    PORT=8000

# Install dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend app
COPY backend/app ./app

# Copy built frontend assets from Stage 1 into /dist for FastAPI to serve
COPY --from=frontend-builder /build/dist ./dist

# Create directory for SQLite database
RUN mkdir -p ./data

EXPOSE 8000

# Run uvicorn on dynamic port $PORT (Render / Railway assign PORT automatically)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
