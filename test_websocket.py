import asyncio
import websockets
import json

async def test():
    ports = [8001, 9999]
    
    for port in ports:
        try:
            uri = f"ws://localhost:{port}/ws"
            print(f"\n🔍 Testing {uri}...")
            
            async with websockets.connect(uri, timeout=2) as websocket:
                print(f"✅ Connected to port {port}!")
                
                # Send a test message
                await websocket.send(json.dumps({"message": "help"}))
                
                # Wait for response
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                print(f"📨 Response: {response[:100]}...")
                
        except asyncio.TimeoutError:
            print(f"⏱️  Port {port}: Connected but no response")
        except Exception as e:
            print(f"❌ Port {port}: {type(e).__name__}: {str(e)}")

asyncio.run(test())
