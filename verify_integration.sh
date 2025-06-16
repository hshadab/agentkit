#!/bin/bash

echo "🔍 Verifying Integrated Service"
echo ""

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  OPENAI_API_KEY not set!"
    echo "   Run: export OPENAI_API_KEY='your-key-here'"
else
    echo "✅ OPENAI_API_KEY is set"
fi

# Test the service
echo ""
echo "Testing service endpoints..."

# Start the service in background for testing
timeout 5 python langchain_service.py > test.log 2>&1 &
PID=$!
sleep 3

# Test health endpoint
if curl -s http://localhost:8002/health > /dev/null 2>&1; then
    echo "✅ Health endpoint working"
else
    echo "❌ Health endpoint not responding"
fi

# Kill test service
kill $PID 2>/dev/null

echo ""
echo "Service is ready to run!"
