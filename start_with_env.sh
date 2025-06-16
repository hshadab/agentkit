#!/bin/bash
# Auto-generated startup script with correct environment

export ZKENGINE_BINARY=/home/hshadab/agentkit/zkengine/zkEngine_dev/wasm_file
export WASM_DIR=/home/hshadab/agentkit/zkengine/example_wasms
export PROOFS_DIR=/home/hshadab/agentkit/proofs
export PORT=8001
export LANGCHAIN_SERVICE_URL=http://localhost:8002

echo "🌍 Environment variables set:"
echo "ZKENGINE_BINARY=$ZKENGINE_BINARY"
echo "WASM_DIR=$WASM_DIR" 
echo "PROOFS_DIR=$PROOFS_DIR"
echo ""

# Kill existing processes
echo "🔄 Killing existing processes..."
sudo lsof -ti:8001 | xargs kill -9 2>/dev/null || true
sudo lsof -ti:8002 | xargs kill -9 2>/dev/null || true

echo "🚀 Starting Rust backend..."
cargo run &

echo "🐍 Starting Python service..."
source langchain_env/bin/activate && python langchain_service.py &

echo ""
echo "🎉 Services started with correct environment!"
echo "📱 Access: http://localhost:8001"
echo "🧪 Test with: 'prove ai content authenticity'"
