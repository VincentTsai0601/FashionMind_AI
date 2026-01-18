@echo off
REM FashionMind AI - Windows Development Server Startup Script
REM This script starts both the backend and frontend servers

echo.
echo 🎨 FashionMind AI - Starting Development Servers
echo ==================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is not installed or not in PATH
    pause
    exit /b 1
)

echo ✅ Node.js and npm found

REM Kill any existing processes on ports 3000 and 3001
echo 🧹 Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /PID %%a /F 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3001" ^| find "LISTENING"') do taskkill /PID %%a /F 2>nul

timeout /t 1 /nobreak >nul

REM Start backend server on port 3001 in a new window
echo 🚀 Starting Backend Server on port 3001...
start "Backend Server" cmd /k "npm run server"

REM Give backend a moment to start
timeout /t 3 /nobreak >nul

REM Start frontend on port 3000
echo 🎯 Starting Frontend on port 3000...
echo.
echo 📱 Frontend will open at: http://localhost:3000
echo 🔧 Backend running at: http://localhost:3001
echo.
echo Press Ctrl+C to stop the frontend (backend will continue running)
echo.

npm run dev

echo.
echo 👋 Development servers stopped.
pause
