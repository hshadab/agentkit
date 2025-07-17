#!/usr/bin/env python3
"""
Test script to diagnose duplicate workflow issue
"""

import asyncio
import websockets
import json
import time
from datetime import datetime

async def test_conditional_transfer():
    uri = "ws://localhost:8001/ws"
    
    print(f"[TEST] Connecting to {uri}")
    
    async with websockets.connect(uri) as websocket:
        print(f"[TEST] Connected at {datetime.now().isoformat()}")
        
        # Test message
        test_message = "Send 0.1 USDC to Alice on Ethereum if KYC compliant"
        
        # Send the message
        message = {
            "type": "query",
            "content": test_message,
            "timestamp": int(time.time() * 1000)
        }
        
        print(f"[TEST] Sending: {json.dumps(message, indent=2)}")
        await websocket.send(json.dumps(message))
        
        # Collect responses for 30 seconds
        workflow_ids = set()
        responses = []
        
        try:
            start_time = time.time()
            while time.time() - start_time < 30:
                response = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                data = json.loads(response)
                timestamp = datetime.now().isoformat()
                
                responses.append((timestamp, data))
                
                # Track workflow IDs
                if data.get('type') == 'workflow_started':
                    workflow_id = data.get('workflowId')
                    if workflow_id:
                        workflow_ids.add(workflow_id)
                        print(f"[TEST] {timestamp} - Workflow started: {workflow_id}")
                
                # Log key events
                if data.get('type') in ['chat_response', 'proof_generation', 'proof_status']:
                    print(f"[TEST] {timestamp} - {data.get('type')}")
                    if data.get('type') == 'proof_generation':
                        print(f"  Proof ID: {data.get('proofId')}")
                        if 'metadata' in data and 'additional_context' in data['metadata']:
                            wf_id = data['metadata']['additional_context'].get('workflow_id')
                            if wf_id:
                                print(f"  Part of workflow: {wf_id}")
                
        except asyncio.TimeoutError:
            pass
        
        print(f"\n[TEST] Analysis:")
        print(f"Total responses received: {len(responses)}")
        print(f"Unique workflow IDs: {len(workflow_ids)}")
        
        if len(workflow_ids) > 1:
            print(f"\n[WARNING] Multiple workflows detected!")
            for wf_id in workflow_ids:
                print(f"  - {wf_id}")
        
        # Analyze timing
        print(f"\n[TEST] Response timeline:")
        for timestamp, data in responses[:20]:  # First 20 responses
            msg_type = data.get('type', 'unknown')
            print(f"  {timestamp} - {msg_type}")

if __name__ == "__main__":
    asyncio.run(test_conditional_transfer())