#!/bin/bash

echo "🧪 Testing workflow fixes..."

# Check if Rust server is running
if ! curl -s http://localhost:8001/test > /dev/null; then
    echo "❌ Rust server not running on port 8001"
    echo "Please start it with: cargo run"
    exit 1
fi

# Check if Python service is running
if ! curl -s http://localhost:8002/docs > /dev/null; then
    echo "❌ Python service not running on port 8002"
    echo "Please start it with: python chat_service.py"
    exit 1
fi

echo "✅ Services are running"

# Test workflow
echo "📤 Sending test workflow..."
curl -s -X POST http://localhost:8002/execute_workflow \
  -H "Content-Type: application/json" \
  -d '{"command": "Generate KYC proof then send 0.1 USDC to Alice on Solana if KYC compliant"}' | jq '.'

echo "✅ Test complete - check browser console for WebSocket messages"
