#!/usr/bin/env python3
import asyncio
import websockets
import json
import sys

async def test_backend():
    uri = "ws://localhost:8001/ws"
    try:
        print(f"🔌 Connecting to {uri}...")
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to backend WebSocket")
            
            # Send a test message
            test_message = {"message": "prove device location in San Francisco"}
            await websocket.send(json.dumps(test_message))
            print(f"📤 Sent: {test_message}")
            
            # Wait for response with timeout
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                print(f"📥 Received: {response}")
                
                # Try to parse the response
                try:
                    data = json.loads(response)
                    print(f"📊 Parsed response type: {data.get('type', 'unknown')}")
                    if 'content' in data:
                        print(f"📝 Content: {data['content'][:100]}...")
                except json.JSONDecodeError:
                    print("⚠️  Response is not valid JSON")
                    
            except asyncio.TimeoutError:
                print("⏰ Timeout waiting for response")
                
    except ConnectionRefusedError:
        print("❌ Connection refused - is the Rust backend running on port 8001?")
    except Exception as e:
        print(f"❌ Backend test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_backend())
