#!/bin/bash

# Web Terminal V2 - Start Server Script
# This script starts the Node.js server and opens the URL in your default browser

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to the script directory
cd "$SCRIPT_DIR"

# Define server URL (matches the PORT in server.js)
SERVER_URL="http://localhost:3000"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Dependencies not found. Installing..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install dependencies."
        exit 1
    fi
fi

# Check if port 3000 is already in use
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Port 3000 is already in use."
    echo "Killing existing process on port 3000..."
    lsof -ti :3000 | xargs kill -9 2>/dev/null
    sleep 1
fi

echo "Starting Web Terminal V2 server..."
echo "Server will be available at: $SERVER_URL"
echo ""

# Start the server in the background
node server.js &
SERVER_PID=$!

# Wait a moment for the server to start
sleep 2

# Check if server started successfully
if ps -p $SERVER_PID > /dev/null; then
    echo "Server started successfully (PID: $SERVER_PID)"
    
    # Open the URL in the default browser (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$SERVER_URL"
    else
        echo "Please open $SERVER_URL in your browser"
    fi
    
    echo ""
    echo "Press Ctrl+C to stop the server"
    
    # Wait for server process
    wait $SERVER_PID
else
    echo "Error: Failed to start server"
    exit 1
fi
