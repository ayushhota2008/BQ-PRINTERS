#!/bin/sh
set -e

RAILWAY_PORT=${PORT:-3000}
BACKEND_PORT=8000

echo "[STARTUP] Starting BQ PRINTERS unified full-stack server..."
echo "[STARTUP] Launching FastAPI backend on 127.0.0.1:${BACKEND_PORT}..."

cd /app/backend
python -m uvicorn app.main:app --host 127.0.0.1 --port ${BACKEND_PORT} &
BACKEND_PID=$!

echo "[STARTUP] Backend running (PID ${BACKEND_PID})."
echo "[STARTUP] Launching Next.js frontend on 0.0.0.0:${RAILWAY_PORT}..."

cd /app/frontend
exec npm start -- -p ${RAILWAY_PORT} -H 0.0.0.0
