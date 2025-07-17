#!/usr/bin/env python3
import asyncio
import websockets
import json
import time

async def test_ai_content_proof():
    uri = "ws://localhost:8001/ws"
    
    async with websockets.connect(uri) as websocket:
        # Send AI content proof request
        message = {
            "type": "prove",
            "command": "prove ai content with hash 12345 from provider OpenAI"
        }
        
        print(f"Sending: {json.dumps(message, indent=2)}")
        await websocket.send(json.dumps(message))
        
        # Listen for responses
        start_time = time.time()
        while True:
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                data = json.loads(response)
                print(f"\nReceived: {json.dumps(data, indent=2)}")
                
                if data.get("type") == "proof_complete":
                    print(f"\n✅ Proof generated successfully in {time.time() - start_time:.2f} seconds")
                    print(f"Proof ID: {data.get('proof_id')}")
                    return data.get('proof_id')
                elif data.get("type") == "proof_error":
                    print(f"\n❌ Error: {data.get('error')}")
                    return None
                    
            except asyncio.TimeoutError:
                elapsed = time.time() - start_time
                if elapsed > 30:
                    print(f"\n⏱️ Timeout after {elapsed:.2f} seconds")
                    return None

if __name__ == "__main__":
    proof_id = asyncio.run(test_ai_content_proof())
    if proof_id:
        print(f"\nYou can now test blockchain verification with proof ID: {proof_id}")