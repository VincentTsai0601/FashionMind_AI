#!/bin/bash

# Kill any existing processes on these ports
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null

sleep 1

# Start backend server on port 3001
echo "Starting backend server on port 3001..."
npm run server &
BACKEND_PID=$!

# Give backend a moment to start
sleep 3

# Start frontend on port 3000
echo "Starting frontend on port 3000..."
npm run dev

# Kill backend when frontend exits
kill $BACKEND_PID 2>/dev/null
