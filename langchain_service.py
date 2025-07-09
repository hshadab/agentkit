#!/usr/bin/env python3

import os
from dotenv import load_dotenv
load_dotenv()
import subprocess
import json
import asyncio
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import re  # Import regex module at the top
import openai
from typing import Optional, List, Dict, Any
from openai import AsyncOpenAI

app = FastAPI(title="Verifiable Agent Kit v4.1 - Real zkEngine Only")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

class ChatRequest(BaseModel):
    message: str

class WorkflowRequest(BaseModel):
    command: str

def is_zkengine_command(message):
    """Detect if this is any zkEngine-related command"""
    zkengine_patterns = [
        # Multi-step workflows
        r'\s+then\s+',
        r'\s+if\s+.+verified',
        r'\s+if\s+.+compliant', 
        r'\s+after\s+that\s+',
        r'\s+followed\s+by\s+',
        r'\s+and\s+then\s+',
        r';\s*',
        
        # Single proof generation
        r'^(generate|create|prove)\s+(kyc|ai\s+content|location|prime|collatz|digital\s+root)',
        r'^prove\s+.*authenticity',
        r'^prove\s+.*location',
        r'^generate\s+.*proof',
        r'^create\s+.*proof',
        
        # Verification commands  
        r'^verify\s+proof',
        r'^verify\s+[a-zA-Z0-9_-]+',
        r'^verification\s+',
        
        # List/history commands
        r'^(list|show)\s+(proofs?|verifications?)',
        r'^proof\s+history',
        r'^verification\s+history',
        r'^workflow\s+history',
        
        # Transfer commands
        r'send\s+.*usdc',
        r'transfer\s+.*usdc',
    ]
    
    message_lower = message.lower().strip()
    return any(re.search(pattern, message_lower) for pattern in zkengine_patterns)

async def get_openai_response(message: str) -> str:
    """Get pure OpenAI response for natural language queries"""
    try:
        if not openai.api_key:
            return "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
        
        # Use the newer OpenAI client syntax
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=openai.api_key)
        
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant. Answer questions naturally and conversationally. Keep responses concise but informative."},
                {"role": "user", "content": message}
            ],
            max_tokens=150,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        print(f"[ERROR] OpenAI API error: {str(e)}")
        return f"I encountered an error processing your question: {str(e)}. Please check your OpenAI API key and try again."

def parse_proof_metadata(message):
    """Parse proof command - send function names that Rust server expects"""
    message_lower = message.lower()
    
    # Default metadata
    metadata = {
        "function": "prove_kyc",  # Rust server expects these names
        "arguments": [],
        "step_size": 50,
        "explanation": "Zero-knowledge proof generation",
        "additional_context": None
    }
    
    # Handle verification commands
    if 'verify' in message_lower:
        verify_match = re.search(r'verify\s+(?:proof\s+)?([a-zA-Z0-9_-]+)', message_lower)
        if verify_match:
            proof_id = verify_match.group(1)
            metadata["function"] = "verify_proof"
            metadata["arguments"] = [proof_id]
            metadata["explanation"] = "Proof verification"
            return metadata
    
    # Send function names that Rust server expects
    if 'kyc' in message_lower:
        metadata["function"] = "prove_kyc"  # Rust server maps this to kyc_compliance.wasm
        # KYC proof expects wallet_hash and kyc_approved parameters
        wallet_hash = "12345"  # Hash of wallet address
        kyc_approved = "1"     # 1 = approved, 0 = rejected
        metadata["arguments"] = [wallet_hash, kyc_approved]
        print(f"[DEBUG] KYC proof function: prove_kyc with args: {metadata['arguments']}")
    elif 'location' in message_lower:
        metadata["function"] = "prove_location"  # Rust server maps this to depin_location.wasm
        # Extract coordinates if present
        coord_match = re.search(r'(\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)', message)
        if coord_match:
            lat, lon = float(coord_match.group(1)), float(coord_match.group(2))
            # Convert to normalized 0-255 scale and pack into 32-bit integer
            # This matches the WASM expectation: lat(8bits) | lon(8bits) | deviceId(16bits)
            lat_norm = int((lat + 90) * 255 / 180)  # -90 to 90 -> 0 to 255
            lon_norm = int((lon + 180) * 255 / 360) # -180 to 180 -> 0 to 255
            device_id = 5000  # Valid device ID
            packed_input = ((lat_norm & 0xFF) << 24) | ((lon_norm & 0xFF) << 16) | (device_id & 0xFFFF)
            metadata["arguments"] = [str(packed_input)]
            print(f"[DEBUG] Location proof: lat={lat}, lon={lon} -> packed={packed_input}")
        else:
            # NYC default: 40.7128, -74.0060 
            lat_norm = 103  # ~40.7°N normalized
            lon_norm = 182  # ~-74.0°W normalized
            device_id = 5000
            packed_input = ((lat_norm & 0xFF) << 24) | ((lon_norm & 0xFF) << 16) | (device_id & 0xFFFF)
            metadata["arguments"] = [str(packed_input)]
            print(f"[DEBUG] Location proof (NYC default): packed={packed_input}")
        print(f"[DEBUG] Location proof function: prove_location")
    elif 'ai content' in message_lower or 'ai' in message_lower:
        metadata["function"] = "prove_ai_content"  # Rust server maps this to ai_content_verification.wasm
        
        # Extract hash if present - CONVERT TO NUMERIC
        hash_match = re.search(r'hash\s+(\w+)', message_lower)
        if hash_match:
            hash_str = hash_match.group(1)
            # Convert string hash to numeric value
            if hash_str.isdigit():
                hash_val = hash_str
            else:
                # Convert string to numeric hash (simple sum of character codes)
                hash_val = str(sum(ord(c) for c in hash_str) % 1000000)
        else:
            hash_val = "12345"  # Default numeric hash
            
        provider = "1000"  # OpenAI
        metadata["arguments"] = [hash_val, provider]
        print(f"[DEBUG] AI content proof function: prove_ai_content with numeric hash: {hash_val}")
    
    return metadata

def is_workflow_command(message: str) -> bool:
    """Detect if a command should be processed as a workflow."""
    message_lower = message.lower()
    
    # Multi-step indicators
    if ' then ' in message_lower:
        return True
    
    # Conditional transfers
    if ('send' in message_lower or 'transfer' in message_lower):
        if any(word in message_lower for word in ['if', 'when', 'after', 'compliant', 'verified']):
            return True
    
    return False

def is_complex_workflow(message: str) -> bool:
    """Determine if a workflow is complex enough to require OpenAI parsing."""
    message_lower = message.lower()
    
    # Multiple conditional transfers with "and"
    if " and " in message_lower and message_lower.count("if") > 1:
        return True
    
    # Complex natural language patterns that regex struggles with
    complex_patterns = [
        r'if\s+\w+\s+(?:is|has|was)\s+.+\s+(?:then\s+)?(?:also\s+)?send',
        r'send\s+.+\s+to\s+\w+\s+(?:only\s+)?if',
        r'transfer\s+.+\s+but\s+only\s+if',
        r'when\s+\w+\s+(?:is|becomes)\s+.+\s+send',
    ]
    
    for pattern in complex_patterns:
        if re.search(pattern, message_lower):
            return True
    
    # Multiple recipients with different conditions
    if message_lower.count("send") > 1 or message_lower.count("transfer") > 1:
        if "if" in message_lower or "when" in message_lower:
            return True
    
    return False

async def parse_workflow_with_openai(message: str) -> Dict[str, Any]:
    """Parse complex workflows using OpenAI for better natural language understanding."""
    print(f"[DEBUG] parse_workflow_with_openai called with: {message}")
    try:
        if not openai.api_key:
            print(f"[ERROR] OpenAI API key not configured")
            raise ValueError("OpenAI API key not configured")
        
        print(f"[DEBUG] Creating OpenAI client...")
        client = AsyncOpenAI(api_key=openai.api_key)
        
        # Create a system prompt that guides OpenAI to parse workflows correctly
        system_prompt = """You are a workflow parser for a blockchain system that handles conditional transfers and proof generation.

Parse the user's command into a structured workflow with steps. Each step should be one of:
1. Proof generation (kyc_proof, location_proof, ai_content_proof)
2. Verification (verify a specific proof)
3. Transfer (send USDC to someone on ETH or SOL blockchain)

For conditional transfers like "If Alice is KYC verified send her 0.05 USDC on Solana", break it into:
1. Generate KYC proof for Alice (type: "kyc_proof")
2. Verify the KYC proof for Alice (type: "verification")
3. Transfer 0.05 USDC to Alice on SOL (type: "transfer")

Return the result as a JSON object with this structure:
{
  "description": "original command",
  "steps": [
    {
      "index": 0,
      "type": "kyc_proof|location_proof|ai_content_proof|verification|transfer",
      "proofType": "kyc|location|ai content" (for proof steps),
      "verificationType": "kyc|location|ai content" (for verification steps),
      "description": "human readable description",
      "person": "alice|bob|etc" (if applicable),
      "amount": "0.05" (for transfers),
      "recipient": "alice|bob|etc" (for transfers),
      "blockchain": "ETH|SOL" (for transfers, default ETH),
      "requiresProof": true (for conditional transfers),
      "requiredProofTypes": ["kyc"] (for conditional transfers),
      "conditions": [{"type": "kyc", "description": "KYC verified"}] (for conditional transfers)
    }
  ],
  "requiresProofs": true (if any transfers require proofs)
}

Important rules:
- For "and" between multiple conditional transfers, create separate proof/verify/transfer sequences
- Always include verification steps after proof generation if the transfer is conditional
- Use exact recipient names from the command
- Default blockchain is ETH unless specified
- Parse amounts carefully (e.g., "0.05", "1", "0.5")"""

        # Parse the command
        print(f"[DEBUG] Calling OpenAI API...")
        response = await asyncio.wait_for(
            client.chat.completions.create(
                model="gpt-3.5-turbo",  # Using GPT-3.5-turbo for compatibility
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Parse this workflow command: {message}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=1000
            ),
            timeout=30.0  # 30 second timeout
        )
        print(f"[DEBUG] OpenAI API response received")
        
        result = json.loads(response.choices[0].message.content)
        print(f"[DEBUG] Parsed result: {json.dumps(result, indent=2)}")
        
        # Validate and clean up the result
        if "steps" not in result:
            result["steps"] = []
        
        # Ensure all steps have required fields and normalize data
        for i, step in enumerate(result["steps"]):
            step["index"] = i
            if "description" not in step:
                step["description"] = f"{step.get('type', 'unknown')} operation"
            
            # Normalize person/recipient names to lowercase
            if "person" in step:
                step["person"] = step["person"].lower()
            if "recipient" in step:
                step["recipient"] = step["recipient"].lower()
                
            # Add required fields for proof steps
            if step["type"] == "kyc_proof" and "parameters" not in step:
                step["parameters"] = {}
            if step["type"] == "verification" and "proofId" not in step:
                step["proofId"] = None
        
        print(f"[DEBUG] Returning parsed workflow with {len(result['steps'])} steps")
        return result
        
    except asyncio.TimeoutError:
        print(f"[ERROR] OpenAI API timeout")
        # Fall back to a simple structure
        return {
            "description": message,
            "steps": [],
            "requiresProofs": False,
            "error": "OpenAI API timeout"
        }
    except Exception as e:
        print(f"[ERROR] OpenAI workflow parsing error: {str(e)}")
        import traceback
        traceback.print_exc()
        # Fall back to a simple structure
        return {
            "description": message,
            "steps": [],
            "requiresProofs": False,
            "error": str(e)
        }

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Smart routing: zkEngine operations vs pure OpenAI responses"""
    try:
        message = request.message.strip()
        
        # Log all incoming chat requests for debugging
        request_time = datetime.now()
        print(f"[CHAT_REQUEST] Time: {request_time.isoformat()}")
        print(f"[CHAT_REQUEST] Message: {message}")
        
        # Block empty messages and common greeting loops
        if not message or message.lower() in ['hello', 'hello!', 'hi', 'hi!', '']:
            print(f"[DEBUG] Blocking potential loop message: '{message}'")
            return {
                "intent": "blocked",
                "response": "",
            }
        
        print(f"[DEBUG] chat endpoint: {message}")
        
        # Add detailed logging for empty or suspicious messages
        if not message or message.lower() in ['hello', 'hello!', 'hi']:
            print(f"[WARNING] Received potentially problematic message: '{message}' (empty: {not message})")
            print(f"[DEBUG] Full request data: {request}")
            import traceback
            traceback.print_stack()
            
            # Return empty response for empty messages to prevent loops
            if not message:
                return {
                    "intent": "empty",
                    "response": "",
                }
        
        # Special history commands
        if message.lower() == 'workflow history':
            print(f"[DEBUG] Workflow history request")
            return {
                "intent": "workflow_history",
                "response": "Fetching workflow history...",
            }
        
        # Check if this is a workflow FIRST (including conditional transfers)
        if " if " in message.lower() and ("send" in message.lower() or "transfer" in message.lower()) and "usdc" in message.lower():
            print(f"[DEBUG] Conditional transfer detected as workflow")
            # Execute the workflow directly instead of returning workflow intent
            workflow_request = WorkflowRequest(command=message)
            workflow_result = await execute_workflow(workflow_request)
            
            return {
                "intent": "workflow_executed",
                "command": message,
                "response": "I'll execute this multi-step workflow for you.",
                "workflow_result": workflow_result
            }

        # Check if this is any zkEngine-related command
        if is_zkengine_command(message):
            # Check for list/history commands FIRST
            if any(keyword in message.lower() for keyword in ["history", "list proofs", "show proofs", "proof history"]):
                print(f"[DEBUG] List/History command → Rust server")
                proof_metadata = {
                    "function": "list_proofs",
                    "arguments": ["proofs"] if "verification" not in message.lower() else ["verifications"],
                    "step_size": 50,
                    "explanation": "Listing proof history",
                    "additional_context": None
                }
                
                return {
                    "intent": proof_metadata,
                    "command": message,
                    "response": "Fetching proof history...",
                    "metadata": {
                        "proof_id": f"list_{int(datetime.now().timestamp() * 1000)}",
                        "type": "list_operation"
                    }
                }
            
            # Check multi-step workflows
            if any(re.search(pattern, message.lower()) for pattern in [r'\s+then\s+', r'\s+if\s+.+verified']):
                print(f"[DEBUG] Multi-step workflow → executing directly")
                # Execute the workflow directly
                workflow_request = WorkflowRequest(command=message)
                workflow_result = await execute_workflow(workflow_request)
                
                return {
                    "intent": "workflow_executed",
                    "command": message,
                    "response": "I'll execute this multi-step workflow for you.",
                    "workflow_result": workflow_result
                }
            
            # Single proof generation OR verification → Rust server
            print(f"[DEBUG] zkEngine command (proof/verification) → Rust server")
            proof_metadata = parse_proof_metadata(message)
            
            # Generate appropriate proof ID
            function_name = proof_metadata['function']
            if function_name == 'prove_kyc':
                proof_type = 'kyc'
            elif function_name == 'prove_location':
                proof_type = 'location'
            elif function_name == 'prove_ai_content':
                proof_type = 'ai_content'
            elif function_name == 'verify_proof':
                proof_type = 'verification'
            else:
                proof_type = function_name.replace('prove_', '')
            
            proof_id = f"proof_{proof_type}_{int(datetime.now().timestamp() * 1000)}"
            
            # Determine response message
            if 'verify' in message.lower():
                response = "Verifying proof with zkEngine..."
            else:
                response = "Generating zero-knowledge proof with zkEngine..."
            
            return {
                "intent": proof_metadata,
                "command": message,
                "response": response,
                "metadata": {
                    "proof_id": proof_id,
                    "type": "proof_generation"
                }
            }
        
        # Pure natural language → OpenAI
        print(f"[DEBUG] Natural language query → OpenAI")
        
        # Additional check to prevent generating responses for suspicious queries
        if message.lower() in ['hello', 'hello!', 'hi']:
            print(f"[WARNING] Blocking potential loop-causing message: {message}")
            return {
                "intent": "blocked",
                "response": "",
            }
        
        openai_response = await get_openai_response(message)
        
        return {
            "intent": "openai_chat",
            "response": openai_response,
        }
        
    except Exception as e:
        print(f"[ERROR] Chat endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

import asyncio
import aiohttp

async def send_workflow_update(message):
    """Send workflow update to Rust WebSocket server"""
    try:
        async with aiohttp.ClientSession() as session:
            # Send to a special endpoint on the Rust server
            async with session.post('http://localhost:8001/workflow_update', 
                                  json=message,
                                  headers={'Content-Type': 'application/json'}) as resp:
                if resp.status != 200:
                    print(f"[WARNING] Failed to send workflow update: {resp.status}")
    except Exception as e:
        print(f"[WARNING] Error sending workflow update: {e}")

@app.post("/execute_workflow") 
async def execute_workflow(request: WorkflowRequest):
    """Execute multi-step workflows with REAL zkEngine ONLY - NO SIMULATION"""
    try:
        command = request.command.strip()
        request_time = datetime.now()
        workflow_id = f"wf_{int(request_time.timestamp())}"
        
        # Log request details for debugging duplicate workflows
        print(f"[WORKFLOW_REQUEST] Time: {request_time.isoformat()}")
        print(f"[WORKFLOW_REQUEST] Command: {command}")
        print(f"[WORKFLOW_REQUEST] Workflow ID: {workflow_id}")
        
        # Check if this is a complex workflow that needs OpenAI parsing
        use_openai_parser = is_complex_workflow(command) and openai.api_key is not None
        print(f"[DEBUG] Command: {command}")
        print(f"[DEBUG] Is complex workflow: {is_complex_workflow(command)}")
        print(f"[DEBUG] OpenAI API key available: {openai.api_key is not None}")
        print(f"[DEBUG] Will use OpenAI parser: {use_openai_parser}")
        print(f"[DEBUG] Has 'and': {' and ' in command.lower()}")
        print(f"[DEBUG] Count 'if': {command.lower().count('if')}")
        
        workflow_data = None
        steps = []
        parsed_workflow_file = None
        
        if use_openai_parser:
            print(f"[DEBUG] Using OpenAI parser for complex workflow")
            try:
                workflow_data = await asyncio.wait_for(
                    parse_workflow_with_openai(command),
                    timeout=35.0  # Slightly longer than the internal timeout
                )
                
                # Check if OpenAI parsing failed or returned no steps
                if workflow_data.get('error') or not workflow_data.get('steps'):
                    print(f"[WARNING] OpenAI parsing failed or returned no steps, falling back to regex parser")
                    print(f"[WARNING] Error: {workflow_data.get('error', 'No steps returned')}")
                    use_openai_parser = False  # Fall back to regex parser
                else:
                    print(f"[DEBUG] OpenAI parsing successful with {len(workflow_data.get('steps', []))} steps")
            except Exception as e:
                print(f"[ERROR] OpenAI parser exception: {str(e)}")
                import traceback
                traceback.print_exc()
                use_openai_parser = False  # Fall back to regex parser
                workflow_data = None
        
        if use_openai_parser and workflow_data and not workflow_data.get('error'):
            # Save the parsed workflow to a temporary file for the executor
            parsed_workflow_file = os.path.join(os.path.expanduser("~/agentkit/circle"), f"parsed_workflow_{workflow_id}.json")
            with open(parsed_workflow_file, 'w') as f:
                json.dump(workflow_data, f, indent=2)
            
            # Create step structure for UI from OpenAI parsed data
            for i, step in enumerate(workflow_data.get('steps', [])):
                step_id = f"step_{i+1}"
                action = step.get('type', '')
                description = step.get('description', '')
                
                ui_step = {
                    "id": step_id,
                    "action": action,
                    "description": description,
                    "status": "pending"
                }
                
                if 'kyc' in action.lower() or 'kyc' in description.lower():
                    ui_step["proofType"] = "kyc"
                elif 'location' in action.lower() or 'location' in description.lower():
                    ui_step["proofType"] = "location"
                elif 'ai' in action.lower() or 'ai' in description.lower():
                    ui_step["proofType"] = "ai_content"
                
                steps.append(ui_step)
        
        if not use_openai_parser or not parsed_workflow_file:
            print(f"[DEBUG] Using standard regex parser")
            # Parse the workflow first to get steps
            parser_result = subprocess.run(
                ['node', 'workflowParser_generic_final.js', command],
                capture_output=True,
                text=True,
                cwd=os.path.expanduser("~/agentkit/circle"),
            )
            
            if parser_result.returncode == 0:
                try:
                    workflow_data = json.loads(parser_result.stdout)
                    # Create step structure for UI
                    for i, step in enumerate(workflow_data.get('steps', [])):
                        step_id = f"step_{i+1}"
                        action = step.get('action', '')
                        description = step.get('description', '')
                        
                        ui_step = {
                            "id": step_id,
                            "action": action,
                            "description": description,
                            "status": "pending"
                        }
                        
                        if 'kyc' in action.lower() or 'kyc' in description.lower():
                            ui_step["proofType"] = "kyc"
                        
                        steps.append(ui_step)
                except:
                    pass
        
        # Workflow started will be sent by executor when it connects
        
        # DISABLED - This preprocessing breaks the parser's ability to handle multi-person conditionals
        # The parser already handles "and" correctly when it's not preprocessed
        # # Handle multiple conditional transfers with "and"
        # if " and " in command and command.count("if") > 1:
        #     # Use regex module properly
        #     parts = re.split(r' and ', command, flags=re.IGNORECASE)
        #     transfer_parts = []
        #     
        #     for part in parts:
        #         part_lower = part.lower()
        #         if ("send" in part_lower or "transfer" in part_lower) and "if" in part_lower:
        #             transfer_parts.append(part.strip())
        #     
        #     if len(transfer_parts) > 1:
        #         command = " then ".join(transfer_parts)
        #         print(f"[DEBUG] Preprocessed multi-condition: {command}")

        print(f"[DEBUG] execute_workflow: {command}")
        
        # Configure environment for REAL zkEngine ONLY
        env = os.environ.copy()
        env.update({
            'ZKENGINE_BINARY': os.getenv('ZKENGINE_BINARY', './zkengine_binary/zkEngine'),
            'WASM_DIR': os.getenv('WASM_DIR', './zkengine_binary'),
            'PROOFS_DIR': os.getenv('PROOFS_DIR', './proofs')
        })
        
        # Remove ALL simulation-related environment variables
        simulation_vars = [
            'USE_REAL_ZKENGINE', 'FALLBACK_MODE', 'TEST_MODE'
        ]
        for var in simulation_vars:
            env.pop(var, None)
        
        print(f"[DEBUG] Environment: REAL zkEngine ONLY")
        print(f"  ZKENGINE_BINARY: {env.get('ZKENGINE_BINARY')}")
        
        # Workflow started will be sent by executor when it connects
        # This prevents duplicate workflow cards in the UI
        
        # Use the appropriate workflow executor based on parser type
        if use_openai_parser and parsed_workflow_file:
            # For OpenAI-parsed workflows, pass the parsed file to the executor
            print(f"[DEBUG] Executing with parsed file: {parsed_workflow_file}")
            result = subprocess.run(
                ['node', 'workflowCLI_generic.js', '--parsed-file', parsed_workflow_file],
                capture_output=True,
                text=True,
                cwd=os.path.expanduser("~/agentkit/circle"),
                env=env,
                timeout=300,
            )
        else:
            # Use the original workflow executor with command
            print(f"[DEBUG] Executing with direct command: {command}")
            result = subprocess.run(
                ['node', 'workflowCLI_generic.js', command],
                capture_output=True,
                text=True,
                cwd=os.path.expanduser("~/agentkit/circle"),
                env=env,
                timeout=300,
            )
        
        print(f"[DEBUG] CLI return code: {result.returncode}")
        print(f"[DEBUG] CLI stdout: {result.stdout[-500:]}")
        if result.stderr:
            print(f"[DEBUG] CLI stderr: {result.stderr}")
        
        if result.returncode == 0:
            transfer_ids = []
            transfer_patterns = [
                r'Transfer ID: ([a-f0-9\-]{36})',
                r'transferId["\']?: ["\']?([a-f0-9\-]{36})',
            ]
            
            for pattern in transfer_patterns:
                matches = re.findall(pattern, result.stdout, re.IGNORECASE)
                transfer_ids.extend(matches)
            
            # Extract proof information
            proof_summary = {}
            proof_pattern = r'(kyc|location|ai_content): ✅ (verified|generated) \(([^)]+)\)'
            proof_matches = re.findall(proof_pattern, result.stdout, re.IGNORECASE)
            
            for proof_type, status, proof_id in proof_matches:
                proof_summary[proof_type] = {
                    "status": status,
                    "proofId": proof_id
                }
            
            # Clean up temporary parsed workflow file if it exists
            if use_openai_parser and parsed_workflow_file:
                try:
                    os.remove(parsed_workflow_file)
                except:
                    pass
                    
            return {
                "success": True,
                "workflowId": f"wf_{int(datetime.now().timestamp())}",
                "transferIds": list(set(transfer_ids)),
                "proofSummary": proof_summary,
                "message": "Workflow executed successfully",
                "executionLog": result.stdout[-1000:]
            }
        else:
            # Clean up temporary parsed workflow file if it exists
            if use_openai_parser and parsed_workflow_file:
                try:
                    os.remove(parsed_workflow_file)
                except:
                    pass
                    
            return {
                "success": False,
                "error": result.stderr or result.stdout or "Workflow execution failed",
                "stderr": result.stderr,
                "stdout": result.stdout
            }
        
    except Exception as e:
        print(f"[ERROR] Workflow execution error: {str(e)}")
        
        # Clean up temporary parsed workflow file if it exists
        if 'use_openai_parser' in locals() and use_openai_parser and 'parsed_workflow_file' in locals() and parsed_workflow_file:
            try:
                os.remove(parsed_workflow_file)
            except:
                pass
                
        return {
            "success": False,
            "error": str(e),
        }

@app.get("/workflow_history")
async def workflow_history():
    """Get workflow execution history"""
    try:
        workflow_history_path = os.path.expanduser("~/agentkit/workflow_history.json")
        if os.path.exists(workflow_history_path):
            with open(workflow_history_path, 'r') as f:
                history = json.load(f)
            
            workflows = history.get("workflows", [])
            workflows.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
            
            for wf in workflows:
                wf["stepCount"] = len(wf.get("steps", []))
            
            return {
                "success": True,
                "workflows": workflows[:20]
            }
        else:
            return {"success": True, "workflows": []}
            
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/check_transfer_status")
async def check_transfer_status(request: dict):
    """Check Circle transfer status"""
    try:
        transfer_id = request.get("transferId")
        if not transfer_id:
            return {"success": False, "error": "Transfer ID required"}
        
        env = os.environ.copy()
        result = subprocess.run(
            ['node', 'check-transfer-status.js', transfer_id],
            capture_output=True,
            text=True,
            cwd=os.path.expanduser("~/agentkit/circle"),
            env=env,
            timeout=300,
        )
        
        if result.returncode == 0:
            status_match = re.search(r'Status: (\w+)', result.stdout)
            hash_match = re.search(r'Transaction Hash: ([a-fA-F0-9x]+)', result.stdout)
            
            return {
                "success": True,
                "status": status_match.group(1) if status_match else "unknown",
                "transactionHash": hash_match.group(1) if hash_match else "pending",
                "rawOutput": result.stdout
            }
        else:
            return {
                "success": False,
                "error": result.stderr or "Failed to check transfer status"
            }
            
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/poll_transfer")
async def poll_transfer(request: dict):
    """Poll Circle transfer status"""
    try:
        transfer_id = request.get("transferId")
        blockchain = request.get("blockchain", "ETH")
        if not transfer_id:
            return {"success": False, "error": "Transfer ID required"}
        
        env = os.environ.copy()
        
        # Call the check-transfer-status.js script
        result = subprocess.run(
            ['node', 'check-transfer-status.js', transfer_id],
            capture_output=True,
            text=True,
            cwd=os.path.expanduser("~/agentkit/circle"),
            env=env,
            timeout=10,
        )
        
        if result.returncode == 0:
            # Parse the output to extract status
            output = result.stdout
            print(f"[DEBUG] Transfer check output for {blockchain}: {output[:500]}")
            
            status = "pending"
            transaction_hash = None
            explorer_link = None
            
            # Try to parse JSON output
            try:
                # Find ALL JSON objects in the output (there might be multiple)
                json_objects = []
                temp = output
                while True:
                    json_start = temp.find('{')
                    if json_start == -1:
                        break
                    json_end = temp.find('\n\n', json_start)
                    if json_end == -1:
                        json_end = len(temp)
                    
                    # Try to find matching closing brace
                    brace_count = 0
                    for i in range(json_start, min(json_end, len(temp))):
                        if temp[i] == '{':
                            brace_count += 1
                        elif temp[i] == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                json_end = i + 1
                                break
                    
                    if brace_count == 0:
                        try:
                            json_str = temp[json_start:json_end]
                            obj = json.loads(json_str)
                            json_objects.append(obj)
                        except:
                            pass
                    
                    temp = temp[json_end:]
                
                # Look for the most complete JSON object (one with status field)
                transfer_data = {}
                for obj in json_objects:
                    if 'status' in obj:
                        transfer_data = obj
                        break
                
                if not transfer_data and json_objects:
                    transfer_data = json_objects[0]
                
                # Extract status
                status = transfer_data.get('status', 'pending')
                print(f"[DEBUG] Parsed status from Circle API: {status}")
                
                # Extract transaction hash - handle different field names and nested structure
                transaction_hash = transfer_data.get('transactionHash') or transfer_data.get('txHash')
                
                # Check nested structure for transaction hash
                if not transaction_hash and 'blockchainLocation' in transfer_data:
                    transaction_hash = transfer_data['blockchainLocation'].get('txHash')
                
                # For Solana, check if we need to look in a different field
                if not transaction_hash and blockchain == 'SOL' and 'transactionId' in transfer_data:
                    transaction_hash = transfer_data.get('transactionId')
                
                # Build explorer link if we have hash and chain
                destination = transfer_data.get('destination', {})
                if transaction_hash and destination:
                    chain = destination.get('chain', blockchain)
                    if chain == 'ETH':
                        explorer_link = f"https://sepolia.etherscan.io/tx/{transaction_hash}"
                    elif chain == 'SOL':
                        explorer_link = f"https://explorer.solana.com/tx/{transaction_hash}?cluster=devnet"
                        
                # For completed Solana transfers without hash, provide transfer ID link
                elif status == 'complete' and blockchain == 'SOL' and not transaction_hash:
                    print(f"[WARNING] Solana transfer complete but no tx hash. Transfer ID: {transfer_id}")
                    # Provide a message about Solana finality
                    explorer_link = f"Transfer ID: {transfer_id} (Solana tx pending finality)"
                            
            except json.JSONDecodeError:
                print(f"[WARNING] Could not parse JSON from transfer status output")
                # Fallback to regex parsing
                import re
                hash_match = re.search(r'"transactionHash":\s*"([^"]+)"', output)
                if hash_match:
                    transaction_hash = hash_match.group(1)
                    
                # Extract explorer link
                link_match = re.search(r'View on Explorer:\s*(https://[^\s]+)', output)
                if link_match:
                    explorer_link = link_match.group(1)
            
            return {
                "success": True,
                "status": status,
                "transactionHash": transaction_hash,
                "explorerLink": explorer_link,
                "blockchain": blockchain
            }
        else:
            return {
                "success": False,
                "status": "pending",
                "error": result.stderr
            }
            
    except Exception as e:
        print(f"[ERROR] poll_transfer error: {str(e)}")
        return {
            "success": False,
            "status": "pending",
            "error": str(e)
        }

if __name__ == "__main__":
    print("🚀 Starting Verifiable Agent Kit v4.1 - REAL zkEngine ONLY")
    print("📋 Configuration:")
    print("   • NO SIMULATION MODE - Real zkEngine or failure")
    print("   • Proof Generation → Real zkEngine via Rust WebSocket")
    print("   • Proof Verification → Real zkEngine via Rust WebSocket")
    print("   • Multi-step Workflows → Real zkEngine execution") 
    print("   • Natural Language → OpenAI API")
    print("🔗 Listening on http://localhost:8002")
    
    uvicorn.run(app, host="0.0.0.0", port=8002, log_level="info")
