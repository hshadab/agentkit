#!/bin/bash
set -e

echo "🚀 Starting servers with auto cache-busting..."

# Kill any existing servers
echo "🔄 Stopping existing servers..."
pkill -f "python3 -m http.server 8000" 2>/dev/null || true
pkill -f "python3 services/chat_service.py" 2>/dev/null || true

# Wait a moment for processes to stop
sleep 1

# Run cache buster
echo "🔄 Updating cache busters..."
python3 update_cache_busters.py

# Start static file server
echo "🌐 Starting static file server on port 8000..."
python3 -m http.server 8000 --directory static &
STATIC_PID=$!

# Start API server  
echo "🔗 Starting API server on port 8002..."
python3 services/chat_service.py &
API_PID=$!

# Give servers time to start
sleep 2

echo "✅ Servers started!"
echo "📁 Static files: http://localhost:8000"
echo "🔗 API server: http://localhost:8002"
echo "💾 Cache buster applied: $(cat static/.cache-buster)"
echo ""
echo "🔧 To stop servers: pkill -f 'python3 -m http.server' && pkill -f 'chat_service.py'"
echo ""
echo "⚡ Auto-cache busting is now active - every restart gets fresh cache!"

# Keep script running to show server status
wait