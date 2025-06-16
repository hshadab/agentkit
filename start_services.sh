#!/bin/bash

echo "Starting zkEngine Services..."
echo ""

# Kill any existing services
echo "Stopping existing services..."
pkill -f 'cargo run' 2>/dev/null
pkill -f langchain_service.py 2>/dev/null
pkill -f transform_service.py 2>/dev/null
sleep 2

# Start services
echo "Starting Rust backend..."
cd ~/agentkit
cargo run > rust.log 2>&1 &
echo "  Rust backend started (PID: $!)"

echo "Starting integrated service (LangChain + Transform)..."
python langchain_service.py > integrated.log 2>&1 &
echo "  Integrated service started (PID: $!)"

echo ""
echo "✅ All services started!"
echo ""
echo "Logs:"
echo "  - Rust backend: tail -f rust.log"
echo "  - Integrated service: tail -f integrated.log"
echo ""
echo "Open browser: http://localhost:8001"
echo ""
echo "To stop all services: pkill -f 'cargo run' && pkill -f langchain_service.py"
