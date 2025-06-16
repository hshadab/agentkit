#!/bin/bash
echo "🔍 Checking service status..."

# Check if Rust backend is running
if curl -s http://localhost:8001/api/health > /dev/null; then
    echo "✅ Rust backend (port 8001) is running"
else
    echo "❌ Rust backend (port 8001) is not responding"
fi

# Check if LangChain service is running  
if curl -s http://localhost:8002/health > /dev/null; then
    echo "✅ LangChain service (port 8002) is running"
else
    echo "❌ LangChain service (port 8002) is not responding"
fi

# Check WebSocket endpoint
echo "🔌 Testing WebSocket connection..."
python3 -c "
import asyncio
import websockets

async def test():
    try:
        async with websockets.connect('ws://localhost:8001/ws') as ws:
            print('✅ WebSocket connection successful')
    except Exception as e:
        print(f'❌ WebSocket connection failed: {e}')

asyncio.run(test())
"
