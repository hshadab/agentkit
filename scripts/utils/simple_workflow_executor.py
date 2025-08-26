#!/usr/bin/env python3
import asyncio
import websockets
import json
import time
import sys

async def execute_simple_workflow(command):
    # For now, just handle simple KYC proof generation
    if "generate kyc proof" in command.lower():
        uri = "ws://localhost:8001/ws"
        async with websockets.connect(uri) as websocket:
            proof_id = f"proof_kyc_{int(time.time() * 1000)}"
            
            # Send proof request
            request = {
                "message": "Generate KYC proof",
                "proof_id": proof_id,
                "metadata": {
                    "function": "prove_kyc",
                    "arguments": ["12345", "1"],
                    "step_size": 50,
                    "explanation": "Zero-knowledge proof generation",
                    "additional_context": None
                }
            }
            
            await websocket.send(json.dumps(request))
            
            # Wait for completion
            async for message in websocket:
                data = json.loads(message)
                if data.get('type') == 'proof_complete' and data.get('proof_id') == proof_id:
                    return {
                        "success": True,
                        "proofId": proof_id,
                        "message": "Workflow completed successfully"
                    }
                elif data.get('type') == 'proof_error':
                    return {
                        "success": False,
                        "error": data.get('error', 'Unknown error')
                    }
    
    return {"success": False, "error": "Unsupported command"}

if __name__ == "__main__":
    command = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "Generate KYC proof"
    result = asyncio.run(execute_simple_workflow(command))
    print(json.dumps(result))
