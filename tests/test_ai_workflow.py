#!/usr/bin/env python3
import asyncio
import websockets
import json

async def test_ai_prediction():
    uri = "ws://localhost:8001/ws"
    async with websockets.connect(uri) as websocket:
        # Send the exact command
        message = {
            "type": "chat",
            "message": "Prove AI prediction commitment"
        }
        await websocket.send(json.dumps(message))
        print("Sent:", json.dumps(message, indent=2))
        
        # Listen for responses
        for _ in range(5):
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                data = json.loads(response)
                print("\nReceived:", json.dumps(data, indent=2))
                
                # Check if workflow has multiple steps
                if data.get("type") == "workflow_started":
                    steps = data.get("steps", [])
                    print(f"\nWorkflow has {len(steps)} steps:")
                    for i, step in enumerate(steps):
                        print(f"  {i+1}. {step.get('description', 'Unknown')}")
                    
                    if len(steps) > 1:
                        print("\nERROR: AI prediction should only have 1 step!")
                        
            except asyncio.TimeoutError:
                pass

if __name__ == "__main__":
    asyncio.run(test_ai_prediction())