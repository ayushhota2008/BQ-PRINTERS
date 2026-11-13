@echo off
title BQ Printers - Backend API (FastAPI)
cd /d "%~dp0"
echo Starting BQ Printers FastAPI Backend on http://localhost:8000...

if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" run.py
) else (
    python run.py
)
pause

