@echo off
title BQ Printers - Frontend (Next.js)
cd /d "%~dp0"
echo Starting Next.js Dev Server on http://localhost:3000...
npm run dev -- -p 3000
pause

