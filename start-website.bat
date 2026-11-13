@echo off
title BQ Printers - Launch Platform
echo ===================================================
echo   BQ PRINTERS - Starting Demand Analytics Platform
echo ===================================================
echo.
echo Starting Backend in a new window...
start "BQ Printers Backend" cmd /c "%~dp0backend\run.bat"
timeout /t 2 /nobreak >nul
echo Starting Frontend in a new window...
start "BQ Printers Frontend" cmd /c "%~dp0frontend\run.bat"
echo.
echo Both servers are launching!
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.
timeout /t 3 /nobreak >nul
start http://localhost:3000
exit
