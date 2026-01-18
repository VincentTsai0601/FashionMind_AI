#!/bin/bash

# FashionMind AI - Ubuntu/Linux Development Server Startup Script

echo "🎨 FashionMind AI - Starting Development Servers"
echo "=================================================="

# Kill any existing processes on these ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null

sleep 1

# Start backend server on port 3001
echo "🚀 Starting Backend Server on port 3001..."
npm run server &
BACKEND_PID=$!

# Give backend a moment to start
sleep 3

# Start frontend on port 3000
echo "🎯 Starting Frontend on port 3000..."
npm run dev

# Kill backend when frontend exits
kill $BACKEND_PID 2>/dev/null

echo "👋 Development servers stopped."
