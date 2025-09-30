#!/bin/bash

# Start all ACP × JOLT-Atlas services
# Usage: ./start-all-services.sh

set -e

echo "🚀 Starting ACP × JOLT-Atlas Services"
echo "======================================"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please update it with your configuration."
fi

echo ""
echo "Starting services:"
echo "  - Proof Service (Port 9001)"
echo "  - ACP Service (Port 9002)"
echo "  - Verification Service (Port 9003)"
echo "  - Demo UI (Port 9000)"
echo ""

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3 to run the demo UI."
    exit 1
fi

# Kill any existing processes on these ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:9001 | xargs kill -9 2>/dev/null || true
lsof -ti:9002 | xargs kill -9 2>/dev/null || true
lsof -ti:9003 | xargs kill -9 2>/dev/null || true
lsof -ti:9000 | xargs kill -9 2>/dev/null || true

# Start services in background
echo ""
echo "🔥 Starting services..."

# Start proof service
node services/proof-service.js > logs/proof-service.log 2>&1 &
PROOF_PID=$!
echo "✅ Proof Service started (PID: $PROOF_PID)"

# Wait a bit for proof service to initialize
sleep 2

# Start ACP service
node services/acp-service.js > logs/acp-service.log 2>&1 &
ACP_PID=$!
echo "✅ ACP Service started (PID: $ACP_PID)"

# Start verification service
node services/verification-service.js > logs/verification-service.log 2>&1 &
VERIFY_PID=$!
echo "✅ Verification Service started (PID: $VERIFY_PID)"

# Start demo UI
python3 scripts/serve-demo.py > logs/demo-ui.log 2>&1 &
UI_PID=$!
echo "✅ Demo UI started (PID: $UI_PID)"

# Save PIDs for cleanup
mkdir -p .pids
echo $PROOF_PID > .pids/proof-service.pid
echo $ACP_PID > .pids/acp-service.pid
echo $VERIFY_PID > .pids/verification-service.pid
echo $UI_PID > .pids/demo-ui.pid

echo ""
echo "✨ All services started successfully!"
echo ""
echo "📊 Service URLs:"
echo "  - Proof Service:        http://localhost:9001/health"
echo "  - ACP Service:          http://localhost:9002/health"
echo "  - Verification Service: http://localhost:9003/health"
echo "  - Demo UI:              http://localhost:9000/index.html"
echo ""
echo "📝 Logs:"
echo "  - tail -f logs/proof-service.log"
echo "  - tail -f logs/acp-service.log"
echo "  - tail -f logs/verification-service.log"
echo "  - tail -f logs/demo-ui.log"
echo ""
echo "🛑 To stop all services: ./stop-all-services.sh"
echo ""

# Wait a bit to check if services are running
sleep 3

# Check if services are still running
if ! ps -p $PROOF_PID > /dev/null; then
    echo "❌ Proof Service failed to start. Check logs/proof-service.log"
    exit 1
fi

if ! ps -p $ACP_PID > /dev/null; then
    echo "❌ ACP Service failed to start. Check logs/acp-service.log"
    exit 1
fi

if ! ps -p $VERIFY_PID > /dev/null; then
    echo "❌ Verification Service failed to start. Check logs/verification-service.log"
    exit 1
fi

if ! ps -p $UI_PID > /dev/null; then
    echo "❌ Demo UI failed to start. Check logs/demo-ui.log"
    exit 1
fi

echo "🎉 All services are healthy and running!"
echo ""
echo "🔗 Open demo: http://localhost:9000/index.html"
echo ""