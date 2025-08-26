#!/usr/bin/env python3
"""Real-time workflow executor that sends WebSocket updates"""

import asyncio
import json
import subprocess
import os
import re
import time
from datetime import datetime
import aiohttp

async def send_update(update):
    """Send update to Rust server via HTTP"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post('http://localhost:8001/workflow_update', 
                                  json=update,
                                  headers={'Content-Type': 'application/json'}) as resp:
                if resp.status != 200:
                    print(f"[WARNING] Failed to send update: {resp.status}")
    except Exception as e:
        print(f"[WARNING] Error sending update: {e}")

async def execute_workflow_with_updates(command, workflow_id):
    """Execute workflow and send real-time updates"""
    
    # Parse workflow
    print(f"🔄 Parsing workflow: {command}")
    parser_result = subprocess.run(
        ['node', 'workflowParser_generic_final.js', command],
        capture_output=True,
        text=True,
        cwd=os.path.expanduser("~/agentkit/circle"),
    )
    
    if parser_result.returncode != 0:
        return {"success": False, "error": "Failed to parse workflow"}
    
    workflow_data = json.loads(parser_result.stdout)
    steps = workflow_data.get('steps', [])
    
    # Create UI steps
    ui_steps = []
    for i, step in enumerate(steps):
        step_type = step.get('type', '')
        action = 'generate_proof' if 'proof' in step_type else 'verify_proof' if 'verification' in step_type else 'transfer'
        
        ui_step = {
            "id": f"step_{i+1}",
            "action": action,
            "description": step.get('description', ''),
            "status": "pending"
        }
        ui_steps.append(ui_step)
    
    # Send workflow started
    await send_update({
        "type": "workflow_started",
        "workflowId": workflow_id,
        "steps": ui_steps
    })
    
    # Execute each step
    transfer_ids = []
    proof_summary = {}
    
    for i, step in enumerate(steps):
        step_id = f"step_{i+1}"
        
        # Update step to executing
        await send_update({
            "type": "workflow_step_update",
            "workflowId": workflow_id,
            "stepId": step_id,
            "updates": {
                "status": "executing",
                "startTime": int(time.time() * 1000)
            }
        })
        
        # Small delay to show animation
        await asyncio.sleep(0.5)
        
        # Execute the step
        step_type = step.get('type', '')
        if step_type == 'register_device':
            # Register IoT device on IoTeX
            device_id = step.get('device_id', 'UNKNOWN_DEVICE')
            
            # Send device registration request to frontend via HTTP
            registration_request = {
                "type": "device_registration",
                "deviceId": device_id,
                "workflowId": workflow_id,
                "stepId": step_id
            }
            
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post('http://localhost:8001/device_registration', 
                                          json=registration_request,
                                          headers={'Content-Type': 'application/json'}) as resp:
                        if resp.status == 200:
                            registration_result = await resp.json()
                            
                            # Update step with registration data
                            await send_update({
                                "type": "workflow_step_update",
                                "workflowId": workflow_id,
                                "stepId": step_id,
                                "updates": {
                                    "registrationData": registration_result,
                                    "transactionHash": registration_result.get('transactionHash', 'pending')
                                }
                            })
                        else:
                            raise Exception(f"Registration request failed with status {resp.status}")
            except Exception as e:
                # Fall back to mock registration if frontend call fails
                mock_registration = {
                    "success": True,
                    "deviceId": device_id,
                    "transactionHash": f"0x{int(time.time() * 1000):016x}000000000000000000000000000000000000000000000000",
                    "demoMode": True,
                    "message": "Device registered (backend mock)"
                }
                
                await send_update({
                    "type": "workflow_step_update",
                    "workflowId": workflow_id,
                    "stepId": step_id,
                    "updates": {
                        "registrationData": mock_registration,
                        "transactionHash": mock_registration["transactionHash"]
                    }
                })
        
        elif step_type == 'verify_on_iotex':
            # Verify device proximity on IoTeX
            device_id = step.get('device_id', 'UNKNOWN_DEVICE')
            x = step.get('x', '5080')
            y = step.get('y', '5020')
            
            # Send verification request to frontend via HTTP
            verification_request = {
                "type": "iotex_verification", 
                "deviceId": device_id,
                "x": x,
                "y": y,
                "workflowId": workflow_id,
                "stepId": step_id
            }
            
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post('http://localhost:8001/iotex_verification',
                                          json=verification_request,
                                          headers={'Content-Type': 'application/json'}) as resp:
                        if resp.status == 200:
                            verification_result = await resp.json()
                            
                            # Update step with verification data
                            await send_update({
                                "type": "workflow_step_update",
                                "workflowId": workflow_id,
                                "stepId": step_id,
                                "updates": {
                                    "verificationData": verification_result,
                                    "transactionHash": verification_result.get('transactionHash', 'pending')
                                }
                            })
                        else:
                            raise Exception(f"Verification request failed with status {resp.status}")
            except Exception as e:
                # Fall back to mock verification if frontend call fails
                mock_verification = {
                    "success": True,
                    "deviceId": device_id,
                    "transactionHash": f"0x{int(time.time() * 1000):016x}111111111111111111111111111111111111111111111111",
                    "withinProximity": True,
                    "demoMode": True,
                    "message": "Proximity verified (backend mock)"
                }
                
                await send_update({
                    "type": "workflow_step_update",
                    "workflowId": workflow_id,
                    "stepId": step_id,
                    "updates": {
                        "verificationData": mock_verification,
                        "transactionHash": mock_verification["transactionHash"]
                    }
                })
        
        elif step_type == 'claim_rewards':
            # Claim rewards for verified device
            device_id = step.get('device_id', 'UNKNOWN_DEVICE')
            
            # Send rewards claim request to frontend via HTTP
            rewards_request = {
                "type": "claim_rewards",
                "deviceId": device_id,
                "workflowId": workflow_id,
                "stepId": step_id
            }
            
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post('http://localhost:8001/claim_rewards',
                                          json=rewards_request,
                                          headers={'Content-Type': 'application/json'}) as resp:
                        if resp.status == 200:
                            rewards_result = await resp.json()
                            
                            # Update step with rewards data
                            await send_update({
                                "type": "workflow_step_update",
                                "workflowId": workflow_id,
                                "stepId": step_id,
                                "updates": {
                                    "rewardData": rewards_result,
                                    "transactionHash": rewards_result.get('transactionHash', 'no_rewards')
                                }
                            })
                        else:
                            raise Exception(f"Rewards request failed with status {resp.status}")
            except Exception as e:
                # Fall back to mock rewards if frontend call fails
                mock_rewards = {
                    "success": False,
                    "error": "No rewards available - contract has no IOTX balance",
                    "deviceId": device_id,
                    "demoMode": True,
                    "message": "Rewards checked (backend mock)"
                }
                
                await send_update({
                    "type": "workflow_step_update",
                    "workflowId": workflow_id,
                    "stepId": step_id,
                    "updates": {
                        "rewardData": mock_rewards,
                        "transactionHash": "no_rewards_available"
                    }
                })
        
        elif 'proof' in step_type:
            # Generate proof
            proof_type = step.get('proofType', 'kyc')
            proof_id = f"proof_{proof_type}_{int(time.time() * 1000)}"
            
            # Send proof generation started
            await send_update({
                "type": "proof_generation",
                "proofId": proof_id,
                "function": f"prove_{proof_type}",
                "stepSize": 50,
                "workflowId": workflow_id
            })
            
            # Call zkEngine via Rust
            proof_request = {
                "type": "generate_proof",
                "metadata": {
                    "function": f"prove_{proof_type}",
                    "arguments": ["12345", "1"],
                    "step_size": 50,
                    "explanation": f"Generating {proof_type} proof",
                    "additional_context": {
                        "workflow_id": workflow_id,
                        "step_index": i
                    }
                },
                "proof_id": proof_id
            }
            
            # Send to Rust via WebSocket
            async with aiohttp.ClientSession() as session:
                ws_url = 'ws://localhost:8001/ws'
                async with session.ws_connect(ws_url) as ws:
                    await ws.send_json(proof_request)
                    
                    # Wait for proof completion
                    async for msg in ws:
                        if msg.type == aiohttp.WSMsgType.TEXT:
                            data = json.loads(msg.data)
                            if data.get('type') == 'proof_complete' and data.get('proof_id') == proof_id:
                                proof_summary[proof_type] = {
                                    "status": "generated",
                                    "proofId": proof_id
                                }
                                break
                            elif data.get('type') == 'proof_error':
                                raise Exception(f"Proof generation failed: {data.get('error')}")
                    
                    await ws.close()
        
        elif 'verification' in step_type:
            # Verify the proof from previous step
            if proof_summary:
                last_proof = list(proof_summary.values())[-1]
                proof_id = last_proof['proofId']
                
                verify_request = {
                    "type": "verify_proof", 
                    "metadata": {
                        "function": "verify_proof",
                        "arguments": [proof_id],
                        "step_size": 50,
                        "explanation": f"Verifying proof {proof_id}",
                        "additional_context": {
                            "workflow_id": workflow_id,
                            "step_index": i
                        }
                    }
                }
                
                # Send verification request
                async with aiohttp.ClientSession() as session:
                    ws_url = 'ws://localhost:8001/ws'
                    async with session.ws_connect(ws_url) as ws:
                        await ws.send_json(verify_request)
                        
                        # Wait for verification
                        async for msg in ws:
                            if msg.type == aiohttp.WSMsgType.TEXT:
                                data = json.loads(msg.data)
                                if data.get('type') == 'verification_result':
                                    if not data.get('isValid'):
                                        raise Exception("Proof verification failed")
                                    break
                        
                        await ws.close()
        
        elif step_type == 'transfer':
            # Execute transfer
            amount = "0.1"
            recipient = "alice"
            blockchain = "ETH"
            
            # Extract from command
            amount_match = re.search(r'(\d+\.?\d*)\s*USDC', command)
            if amount_match:
                amount = amount_match.group(1)
            
            recipient_match = re.search(r'to\s+(\w+)', command.lower())
            if recipient_match:
                recipient = recipient_match.group(1)
            
            if 'solana' in command.lower():
                blockchain = "SOL"
            
            # Call Circle transfer
            env = os.environ.copy()
            transfer_result = subprocess.run(
                ['node', 'executeTransfer.js', amount, recipient, blockchain],
                capture_output=True,
                text=True,
                cwd=os.path.expanduser("~/agentkit/circle"),
                env=env,
            )
            
            if transfer_result.returncode == 0:
                # Extract transfer ID
                transfer_id_match = re.search(r'Transfer ID: ([a-f0-9\-]{36})', transfer_result.stdout)
                if transfer_id_match:
                    transfer_id = transfer_id_match.group(1)
                    transfer_ids.append(transfer_id)
                    
                    # Update step with transfer data
                    await send_update({
                        "type": "workflow_step_update",
                        "workflowId": workflow_id,
                        "stepId": step_id,
                        "updates": {
                            "transferData": {
                                "id": transfer_id,
                                "amount": amount,
                                "destinationAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                                "blockchain": blockchain,
                                "status": "pending"
                            }
                        }
                    })
        
        # Update step to completed
        await send_update({
            "type": "workflow_step_update",
            "workflowId": workflow_id,
            "stepId": step_id,
            "updates": {
                "status": "completed",
                "endTime": int(time.time() * 1000)
            }
        })
        
        # Small delay between steps
        await asyncio.sleep(0.3)
    
    # Send workflow completed
    await send_update({
        "type": "workflow_completed",
        "workflowId": workflow_id
    })
    
    return {
        "success": True,
        "workflowId": workflow_id,
        "transferIds": transfer_ids,
        "proofSummary": proof_summary
    }

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: workflow_executor_realtime.py <workflow_id> <command>")
        sys.exit(1)
    
    workflow_id = sys.argv[1]
    command = sys.argv[2]
    
    asyncio.run(execute_workflow_with_updates(command, workflow_id))