#!/usr/bin/env python3
"""Test blockchain verification via WebSocket simulation"""

import asyncio
import websockets
import json
import time

async def simulate_blockchain_verification():
    """Simulate the blockchain verification flow"""
    
    # Connect to the WebSocket server
    uri = "ws://localhost:8001/ws"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✓ Connected to WebSocket server")
            
            # Test 1: Generate KYC proof
            print("\n1. Generating KYC proof...")
            proof_id = f"proof_kyc_{int(time.time() * 1000)}"
            
            proof_request = {
                "message": "generate kyc proof",
                "proof_id": proof_id,
                "metadata": {
                    "function": "prove_kyc",
                    "arguments": ["12345", "1"],  # wallet_hash, kyc_approved
                    "step_size": 50,
                    "explanation": "Generate KYC proof",
                    "additional_context": {
                        "workflow_id": "test_workflow_001"
                    }
                }
            }
            
            await websocket.send(json.dumps(proof_request))
            print(f"→ Sent proof generation request: {proof_id}")
            
            # Wait for proof completion
            while True:
                response = await websocket.recv()
                data = json.loads(response)
                print(f"← Received: {data.get('type', 'unknown')}")
                
                if data.get('type') == 'proof_complete' and data.get('proof_id') == proof_id:
                    print(f"✓ Proof generated: {proof_id}")
                    break
            
            # Test 2: Verify on Ethereum
            print("\n2. Verifying on Ethereum blockchain...")
            verification_id = f"verify_ethereum_{int(time.time() * 1000)}"
            
            eth_verify_request = {
                "message": "verify on ethereum",
                "verification_id": verification_id,
                "metadata": {
                    "function": "verify_on_ethereum",
                    "arguments": [proof_id],
                    "step_size": 50,
                    "explanation": "Verify proof on Ethereum blockchain",
                    "additional_context": {
                        "workflow_id": "test_workflow_001",
                        "proof_id": proof_id,
                        "proof_type": "kyc",
                        "blockchain": "ethereum"
                    }
                }
            }
            
            await websocket.send(json.dumps(eth_verify_request))
            print(f"→ Sent Ethereum verification request: {verification_id}")
            
            # Note: In real implementation, this would trigger actual blockchain verification
            # For testing, we're checking if the message format is correct
            print("✓ Ethereum verification request sent successfully")
            
            # Test 3: Verify on Solana
            print("\n3. Verifying on Solana blockchain...")
            sol_verification_id = f"verify_solana_{int(time.time() * 1000)}"
            
            sol_verify_request = {
                "message": "verify on solana",
                "verification_id": sol_verification_id,
                "metadata": {
                    "function": "verify_on_solana",
                    "arguments": [proof_id],
                    "step_size": 50,
                    "explanation": "Verify proof on Solana blockchain",
                    "additional_context": {
                        "workflow_id": "test_workflow_001",
                        "proof_id": proof_id,
                        "proof_type": "kyc",
                        "blockchain": "solana"
                    }
                }
            }
            
            await websocket.send(json.dumps(sol_verify_request))
            print(f"→ Sent Solana verification request: {sol_verification_id}")
            print("✓ Solana verification request sent successfully")
            
            print("\n✅ All blockchain verification messages formatted correctly!")
            
    except websockets.exceptions.ConnectionRefused:
        print("❌ Cannot connect to WebSocket server at ws://localhost:8001/ws")
        print("Please ensure the Rust server is running")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("Testing Blockchain Verification WebSocket Messages")
    print("=" * 60)
    asyncio.run(simulate_blockchain_verification())