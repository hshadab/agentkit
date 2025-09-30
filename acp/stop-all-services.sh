#!/bin/bash

# Stop all ACP × JOLT-Atlas services
# Usage: ./stop-all-services.sh

echo "🛑 Stopping ACP × JOLT-Atlas Services"
echo "======================================"

# Check if .pids directory exists
if [ ! -d ".pids" ]; then
    echo "⚠️  No PID files found. Trying to stop by port..."

    # Kill by port
    lsof -ti:9001 | xargs kill -9 2>/dev/null && echo "✅ Stopped service on port 9001" || echo "ℹ️  No service on port 9001"
    lsof -ti:9002 | xargs kill -9 2>/dev/null && echo "✅ Stopped service on port 9002" || echo "ℹ️  No service on port 9002"
    lsof -ti:9003 | xargs kill -9 2>/dev/null && echo "✅ Stopped service on port 9003" || echo "ℹ️  No service on port 9003"
    lsof -ti:9000 | xargs kill -9 2>/dev/null && echo "✅ Stopped service on port 9000" || echo "ℹ️  No service on port 9000"

    echo ""
    echo "✨ Cleanup complete"
    exit 0
fi

# Stop by PID
stopped=0

if [ -f ".pids/proof-service.pid" ]; then
    PID=$(cat .pids/proof-service.pid)
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID && echo "✅ Stopped Proof Service (PID: $PID)" && ((stopped++))
    fi
    rm -f .pids/proof-service.pid
fi

if [ -f ".pids/acp-service.pid" ]; then
    PID=$(cat .pids/acp-service.pid)
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID && echo "✅ Stopped ACP Service (PID: $PID)" && ((stopped++))
    fi
    rm -f .pids/acp-service.pid
fi

if [ -f ".pids/verification-service.pid" ]; then
    PID=$(cat .pids/verification-service.pid)
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID && echo "✅ Stopped Verification Service (PID: $PID)" && ((stopped++))
    fi
    rm -f .pids/verification-service.pid
fi

if [ -f ".pids/demo-ui.pid" ]; then
    PID=$(cat .pids/demo-ui.pid)
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID && echo "✅ Stopped Demo UI (PID: $PID)" && ((stopped++))
    fi
    rm -f .pids/demo-ui.pid
fi

# Remove .pids directory if empty
rmdir .pids 2>/dev/null || true

echo ""
if [ $stopped -eq 0 ]; then
    echo "ℹ️  No services were running"
else
    echo "✨ Stopped $stopped service(s)"
fi