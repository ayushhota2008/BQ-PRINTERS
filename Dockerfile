# ========================================================
# Stage 1: Build Next.js Frontend
# ========================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ========================================================
# Stage 2: Final Unified Production Container
# ========================================================
FROM python:3.12-slim
WORKDIR /app

# Install Node.js runtime for Next.js production server
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    npm \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy Backend application code
COPY backend/ ./backend/

# Copy Frontend pre-built code and dependencies
COPY --from=frontend-builder /app/frontend ./frontend

# Copy start runner
COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1

CMD ["./start.sh"]
