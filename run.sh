#!/bin/bash

echo "========================================="
echo " Starting Smart Complaint System"
echo "========================================="

# Attempt to load nvm if installed to ensure node/npm are in PATH
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" 

echo "➜ Starting Backend Server..."
cd backend
node server.js &
BACKEND_PID=$!
cd ..

echo "➜ Starting Frontend Development Server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "========================================="
echo " Backend running at http://localhost:5000"
echo " Frontend running at http://localhost:5173"
echo "========================================="
echo "Press Ctrl+C to stop both servers"

# Catch termination signals to stop both background processes
trap "echo -e '\nStopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM EXIT

# Wait indefinitely until interrupted
wait
