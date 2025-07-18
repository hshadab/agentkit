#!/usr/bin/env python3

import os
import sys
from pathlib import Path

# Try to load .env from multiple locations
def load_env_from_multiple_locations():
    """Load .env file from multiple possible locations"""
    possible_paths = [
        Path.cwd() / '.env',  # Current directory (should be ~/agentkit)
        Path.cwd().parent / '.env',  # Parent directory
        Path.home() / '.env',  # Home directory (fallback)
    ]
    
    env_loaded = False
    for env_path in possible_paths:
        if env_path.exists():
            print(f"[INFO] Loading environment from: {env_path}")
            from dotenv import load_dotenv
            load_dotenv(env_path)
            
            # Check if OpenAI key was loaded
            api_key = os.getenv('OPENAI_API_KEY')
            if api_key and api_key != 'your-openai-api-key-here':
                print(f"[INFO] OpenAI API key loaded successfully from {env_path}")
                env_loaded = True
                break
            else:
                print(f"[WARNING] Found .env at {env_path} but no valid OpenAI key")
    
    if not env_loaded:
        print("[WARNING] No valid OpenAI API key found in any .env file")
        print("[INFO] Checked locations:")
        for path in possible_paths:
            print(f"  - {path}")
    
    return env_loaded

# Load environment variables
load_env_from_multiple_locations()

import subprocess
import json
import asyncio
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
# Regex removed - all prompts go through OpenAI
import openai
from typing import Optional, List, Dict, Any
from openai import AsyncOpenAI
# Force reload of the module to pick up changes
import importlib
import parsers.workflow.openaiWorkflowParserEnhanced as openai_workflow_parser_enhanced
importlib.reload(openai_workflow_parser_enhanced)
from parsers.workflow.openaiWorkflowParserEnhanced import EnhancedOpenAIWorkflowParser
from scripts.utils.simple_workflow_parser import SimpleWorkflowParser

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
if not openai.api_key or openai.api_key == 'your-openai-api-key-here':
    print("[ERROR] OpenAI API key not properly configured!")
    print("[INFO] Please ensure a valid API key is in one of these locations:")
    print("  - ~/agentkit/.env (recommended)")
    print("  - ~/.env")
    print("[INFO] The key should be in format: OPENAI_API_KEY=sk-...")
else:
    print(f"[INFO] OpenAI API key configured (ending in ...{openai.api_key[-4:]})")

class ChatRequest(BaseModel):
    message: str

class WorkflowRequest(BaseModel):
    command: str

# Removed - all commands now go through OpenAI

async def get_openai_response(message: str) -> str:
    """Get pure OpenAI response for natural language queries"""
    try:
        if not openai.api_key:
            return "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
        
        # Use the newer OpenAI client syntax
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

async def process_with_ai(request: str, context: str, proof_summary: Dict[str, Any], original_command: str) -> str:
    """Process any AI request in the context of zkp operations"""
    try:
        if not openai.api_key:
            return "OpenAI API key not configured."
        
        client = AsyncOpenAI(api_key=openai.api_key)
        
        # Build context from proof summary
        context_info = f"The user requested: '{original_command}'\n"
        if proof_summary:
            context_info += "Operations completed:\n"
            for proof_type, info in proof_summary.items():
                context_info += f"- {proof_type} proof: {info['status']} (ID: {info['proofId']})\n"
        
        # Handle different types of requests
        if "explain" in request.lower():
            system_prompt = "You are an expert in zero-knowledge proofs. Explain concepts clearly."
            user_prompt = f"{context_info}\n\nPlease {request} in the context of what was just executed."
        elif "joke" in request.lower() or "funny" in request.lower():
            system_prompt = "You are a witty comedian who understands cryptography and zero-knowledge proofs."
            user_prompt = f"{context_info}\n\n{request.capitalize()} about what just happened with the zero-knowledge proof."
        elif "spanish" in request.lower() or "french" in request.lower() or "chinese" in request.lower():
            language = "Spanish" if "spanish" in request.lower() else "French" if "french" in request.lower() else "Chinese"
            system_prompt = f"You are a translator. Respond only in {language}."
            user_prompt = f"{context_info}\n\nTranslate this information to {language} and provide a brief summary."
        elif "analyze" in request.lower():
            system_prompt = "You are a security analyst specializing in cryptographic protocols."
            user_prompt = f"{context_info}\n\nProvide a technical analysis of the security implications of this operation."
        elif "simple" in request.lower() or "eli5" in request.lower():
            system_prompt = "You are great at explaining complex topics to a 5-year-old."
            user_prompt = f"{context_info}\n\nExplain what just happened in very simple terms that a child could understand."
        else:
            # Generic request
            system_prompt = "You are a helpful assistant with expertise in zero-knowledge proofs and cryptography."
            user_prompt = f"{context_info}\n\n{request}"
        
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=300,
            temperature=0.8 if "joke" in request.lower() or "funny" in request.lower() else 0.7
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        print(f"[ERROR] OpenAI processing error: {str(e)}")
        return "Unable to process AI request at this time."

# Removed - all parsing now done by OpenAI

# Removed - all commands go through OpenAI

# Removed - all parsing now done by OpenAI

# Function removed - we now use OpenAI for all workflow parsing

async def parse_workflow_with_openai(message: str) -> Dict[str, Any]:
    """Parse complex workflows using OpenAI for better natural language understanding."""
    print(f"[DEBUG] parse_workflow_with_openai called with: {message}")
    try:
        if not openai.api_key:
            print(f"[ERROR] OpenAI API key not configured")
            raise ValueError("OpenAI API key not configured")
        
        print(f"[DEBUG] Creating enhanced OpenAI parser...")
        parser = EnhancedOpenAIWorkflowParser(api_key=openai.api_key)
        
        # Use the enhanced parser which supports blockchain verification steps
        result = parser.parse_workflow(message)
        
        # Validate the workflow
        if parser.validate_workflow(result):
            print(f"[DEBUG] Workflow validation passed")
        else:
            print(f"[WARNING] Workflow validation failed, but continuing")
        
        print(f"[DEBUG] Parsed result: {json.dumps(result, indent=2)}")
        print(f"[DEBUG] Returning parsed workflow with {len(result.get('steps', []))} steps")
        
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
    """All prompts go through OpenAI - no regex or pattern matching"""
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
        
        # ALL commands now go through workflow processing with OpenAI
        print(f"[DEBUG] Processing with OpenAI workflow parser")
        
        # Execute as workflow - OpenAI will determine what type of command it is
        workflow_request = WorkflowRequest(command=message)
        workflow_result = await execute_workflow(workflow_request)
        
        # Build response based on workflow result
        if workflow_result.get('success'):
            response = "I'll process that for you."
            
            # Add AI response if available
            if workflow_result.get('ai_response'):
                response = workflow_result['ai_response']
            
            return {
                "intent": "workflow_executed", 
                "command": message,
                "response": response,
                "workflow_result": workflow_result
            }
        else:
            # If workflow parsing fails, use OpenAI for natural language response
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
    """Execute all operations as workflows - unified system"""
    try:
        command = request.command.strip()
        request_time = datetime.now()
        workflow_id = f"wf_{int(request_time.timestamp())}"
        
        # Log request details for debugging duplicate workflows
        print(f"[WORKFLOW_REQUEST] Time: {request_time.isoformat()}")
        print(f"[WORKFLOW_REQUEST] Command: {command}")
        print(f"[WORKFLOW_REQUEST] Workflow ID: {workflow_id}")
        
        workflow_data = None
        steps = []
        parsed_workflow_file = None
        
        # Always use OpenAI for all commands - unified system
        if openai.api_key is not None:
            print(f"[DEBUG] Using OpenAI parser for workflow")
            try:
                workflow_data = await asyncio.wait_for(
                    parse_workflow_with_openai(command),
                    timeout=35.0  # Slightly longer than the internal timeout
                )
                print(f"[DEBUG] OpenAI returned workflow_data: {json.dumps(workflow_data, indent=2) if workflow_data else 'None'}")
                
                # Check if OpenAI parsing failed or returned no steps
                if workflow_data.get('error') or not workflow_data.get('steps'):
                    print(f"[ERROR] OpenAI parsing failed or returned no steps")
                    print(f"[ERROR] Details: {workflow_data.get('error', 'No steps returned')}")
                    return {
                        "success": False,
                        "error": workflow_data.get('error', 'OpenAI returned no workflow steps'),
                        "details": "Failed to parse workflow. Please check command syntax."
                    }
                else:
                    print(f"[DEBUG] OpenAI parsing successful with {len(workflow_data.get('steps', []))} steps")
            except Exception as e:
                print(f"[ERROR] OpenAI parser exception: {str(e)}")
                import traceback
                traceback.print_exc()
                # No fallback - OpenAI is required
                return {
                    "success": False,
                    "error": f"OpenAI parsing error: {str(e)}",
                    "details": "Failed to parse workflow with OpenAI. Please check command syntax."
                }
        
        # Check conditions separately for better debugging
        print(f"[DEBUG] Checking parsed file creation conditions:")
        print(f"[DEBUG]   workflow_data exists: {workflow_data is not None}")
        if workflow_data:
            print(f"[DEBUG]   workflow_data has error: {workflow_data.get('error', False)}")
            print(f"[DEBUG]   workflow_data has steps: {len(workflow_data.get('steps', []))}")
            print(f"[DEBUG]   workflow_data is simple: {workflow_data.get('simple', False)}")
        
        if workflow_data and not workflow_data.get('error'):
            # Save the parsed workflow to a temporary file for the executor
            parsed_workflow_file = os.path.join(os.path.expanduser("~/agentkit/circle"), f"parsed_workflow_{workflow_id}.json")
            print(f"[DEBUG] Saving parsed workflow to: {parsed_workflow_file}")
            with open(parsed_workflow_file, 'w') as f:
                json.dump(workflow_data, f, indent=2)
            print(f"[DEBUG] Parsed workflow saved successfully")
        else:
            print(f"[DEBUG] NOT creating parsed file because conditions not met")
        
        if workflow_data and not workflow_data.get('error'):
            # Create step structure for UI from parsed data
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
        
        if not workflow_data or not parsed_workflow_file:
            print(f"[ERROR] Failed to parse workflow")
            return {
                "success": False,
                "error": "Failed to parse workflow. Please check the command syntax.",
                "details": "Could not parse command as a workflow."
            }
        
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
        
        # Check if we have a parsed workflow file
        if not parsed_workflow_file:
            print(f"[ERROR] No parsed workflow file created")
            print(f"[ERROR] use_openai_parser: {use_openai_parser}")
            print(f"[ERROR] workflow_data exists: {workflow_data is not None}")
            if workflow_data:
                print(f"[ERROR] workflow_data has error: {workflow_data.get('error', 'No error field')}")
                print(f"[ERROR] workflow_data has steps: {len(workflow_data.get('steps', []))}")
            return {
                "success": False,
                "error": "Failed to create parsed workflow file. OpenAI parsing may have failed.",
                "details": "Check that the command syntax is correct and OpenAI API is working."
            }
        
        # Execute with the parsed file
        print(f"[DEBUG] Executing with parsed file: {parsed_workflow_file}")
        result = subprocess.run(
            ['node', '../parsers/workflow/workflowCLI.js', '--parsed-file', parsed_workflow_file],
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
            # Simple string search instead of regex for transfer IDs
            stdout_lines = result.stdout.split('\n')
            for line in stdout_lines:
                if 'Transfer ID:' in line:
                    parts = line.split('Transfer ID:')
                    if len(parts) > 1:
                        tid = parts[1].strip()
                        if len(tid) == 36 and '-' in tid:  # UUID format
                            transfer_ids.append(tid)
                elif 'transferId' in line:
                    # Try to extract from JSON-like format
                    if ':' in line:
                        parts = line.split(':')
                        if len(parts) > 1:
                            tid = parts[1].strip().strip('"').strip("'")
                            if len(tid) == 36 and '-' in tid:
                                transfer_ids.append(tid)
            
            # Extract proof information with simple string parsing
            proof_summary = {}
            for line in stdout_lines:
                line_lower = line.lower()
                if '✅' in line and ('verified' in line_lower or 'generated' in line_lower):
                    # Parse proof type
                    if 'kyc:' in line_lower:
                        proof_type = 'kyc'
                    elif 'location:' in line_lower:
                        proof_type = 'location'
                    elif 'ai_content:' in line_lower:
                        proof_type = 'ai_content'
                    else:
                        continue
                    
                    # Extract proof ID from parentheses
                    if '(' in line and ')' in line:
                        start = line.find('(')
                        end = line.find(')')
                        if start < end:
                            proof_id = line[start+1:end].strip()
                            status = 'verified' if 'verified' in line_lower else 'generated'
                            proof_summary[proof_type] = {
                                "status": status,
                                "proofId": proof_id
                            }
            
            # Clean up temporary parsed workflow file if it exists
            if parsed_workflow_file:
                try:
                    os.remove(parsed_workflow_file)
                except:
                    pass
                    
            # Check if any step requested AI processing
            needs_ai_processing = False
            ai_request = None
            ai_context = None
            if workflow_data and workflow_data.get('steps'):
                for step in workflow_data['steps']:
                    if step.get('type') == 'process_with_ai':
                        needs_ai_processing = True
                        ai_request = step.get('request', 'process')
                        ai_context = step.get('context', 'zero-knowledge proofs')
                        break
            
            response_data = {
                "success": True,
                "workflowId": f"wf_{int(datetime.now().timestamp())}",
                "transferIds": list(set(transfer_ids)),
                "proofSummary": proof_summary,
                "message": "Workflow executed successfully",
                "executionLog": result.stdout[-1000:]
            }
            
            # Add AI processing if requested
            if needs_ai_processing:
                ai_response = await process_with_ai(ai_request, ai_context, proof_summary, command)
                response_data["ai_response"] = ai_response
            
            return response_data
        else:
            # Clean up temporary parsed workflow file if it exists
            if parsed_workflow_file:
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

@app.post("/test_parser")
async def test_parser(request: dict):
    """Test endpoint to debug OpenAI parser"""
    command = request.get("command", "Generate KYC proof then send 0.1 USDC to Alice")
    
    try:
        result = await parse_workflow_with_openai(command)
        return {
            "success": True,
            "command": command,
            "parsed_result": result
        }
    except Exception as e:
        return {
            "success": False,
            "command": command,
            "error": str(e)
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
            # Simple string parsing instead of regex
            status = "unknown"
            transaction_hash = "pending"
            
            stdout_lines = result.stdout.split('\n')
            for line in stdout_lines:
                if 'Status:' in line:
                    parts = line.split('Status:')
                    if len(parts) > 1:
                        status = parts[1].strip().split()[0]  # Get first word after Status:
                elif 'Transaction Hash:' in line:
                    parts = line.split('Transaction Hash:')
                    if len(parts) > 1:
                        transaction_hash = parts[1].strip().split()[0]  # Get first word (hash)
            
            return {
                "success": True,
                "status": status,
                "transactionHash": transaction_hash,
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
                # Fallback to simple string parsing
                for line in output.split('\n'):
                    if '"transactionHash"' in line and ':' in line:
                        parts = line.split(':')
                        if len(parts) > 1:
                            hash_part = parts[1].strip().strip('"').strip(',')
                            if hash_part:
                                transaction_hash = hash_part
                    elif 'View on Explorer:' in line:
                        parts = line.split('View on Explorer:')
                        if len(parts) > 1:
                            link = parts[1].strip().split()[0]  # Get first word (URL)
                            if link.startswith('https://'):
                                explorer_link = link
            
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
