import asyncio
import websockets
import json

async def test():
    uri = "ws://localhost:8001/ws"
    async with websockets.connect(uri) as websocket:
        # Wait for welcome message
        welcome = await websocket.recv()
        print(f"< {welcome}")
        
        # Send a simple proof request
        message = json.dumps({"message": "prove add 2 and 3"})
        await websocket.send(message)
        print(f"> {message}")
        
        # Listen for responses
        for _ in range(10):  # Listen for up to 10 messages
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"< {response}")
            except asyncio.TimeoutError:
                print("Timeout waiting for response")
                break

asyncio.run(test())
