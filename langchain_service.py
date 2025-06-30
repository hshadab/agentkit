from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import os
import subprocess
import json
import re
from typing import Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client with API key
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# In-memory storage for conversation context
conversation_context = {
    "last_transfer": None,
    "last_proof_type": None,
    "conversation_history": []
}

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    metadata: dict

def extract_transfer_details(message: str, context: Dict[str, Any]) -> Dict[str, str]:
    """Extract transfer details from message with context awareness"""
    
    # Check for context-aware commands
    context_patterns = [
        r"do the same (?:but )?on (\w+)",
        r"same (?:transfer|thing) (?:but )?on (\w+)",
        r"now (?:do it )?on (\w+)",
        r"repeat (?:that )?on (\w+)"
    ]
    
    for pattern in context_patterns:
        match = re.search(pattern, message.lower())
        if match and context.get("last_transfer"):
            blockchain = match.group(1).lower()
            # Use previous transfer details but update blockchain
            previous = context["last_transfer"]
            return {
                "amount": previous["amount"],
                "recipient": previous["recipient"],
                "blockchain": "SOL" if "sol" in blockchain else "ETH"
            }
    
    # Standard extraction for new transfers
    amount_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:USDC|usdc)", message)
    amount = amount_match.group(1) if amount_match else "0.1"
    
    # Round to 2 decimal places for USDC
    try:
        amount = str(round(float(amount), 2))
    except:
        amount = "0.1"
    
    # Extract recipient
    recipient_patterns = [
        r"to\s+(\w+)",
        r"send\s+(?:\d+(?:\.\d+)?\s*USDC\s+)?to\s+(\w+)",
        r"transfer\s+(?:\d+(?:\.\d+)?\s*USDC\s+)?to\s+(\w+)"
    ]
    
    recipient = "alice"  # default
    for pattern in recipient_patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            recipient = match.group(1).lower()
            break
    
    # Determine blockchain
    blockchain = "SOL" if "solana" in message.lower() or "sol" in message.lower() else "ETH"
    
    return {
        "amount": amount,
        "recipient": recipient,
        "blockchain": blockchain
    }

def update_context(transfer_details: Dict[str, str], proof_type: str = None):
    """Update conversation context with latest transfer/proof details"""
    if transfer_details:
        conversation_context["last_transfer"] = transfer_details
    if proof_type:
        conversation_context["last_proof_type"] = proof_type

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        # Add to conversation history
        conversation_context["conversation_history"].append({
            "role": "user",
            "content": request.message,
            "timestamp": datetime.now().isoformat()
        })
        
        # Build context for GPT
        context_info = ""
        if conversation_context["last_transfer"]:
            last = conversation_context["last_transfer"]
            context_info = f"\nPrevious transfer: {last['amount']} USDC to {last['recipient']} on {last['blockchain']}"
        
        # Enhanced prompt with context awareness
        prompt = f"""You are a helpful assistant for a verifiable agent system that can generate zero-knowledge proofs and execute USDC transfers on Ethereum and Solana.

Available actions:
1. Generate KYC compliance proofs
2. Generate AI content verification proofs  
3. Generate location verification proofs
4. Execute USDC transfers (with or without KYC verification)
5. Verify existing proofs

Context awareness:
- When user says "do the same on [blockchain]" or similar, repeat the previous action but on the specified blockchain
- Remember previous transfer amounts and recipients
{context_info}

User message: {request.message}

Determine the user's intent and provide a helpful response. If they want to repeat a previous action with modifications, acknowledge this clearly."""

        # Get response from OpenAI using new API
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": request.message}
            ],
            temperature=0.7,
            max_tokens=200
        )
        
        ai_response = response.choices[0].message.content
        
        # Determine intent and metadata
        message_lower = request.message.lower()
        metadata = {"action": "none"}
        
        # Check for context-aware commands first
        if any(phrase in message_lower for phrase in ["do the same", "same thing", "now on", "repeat"]):
            if conversation_context["last_transfer"] and any(blockchain in message_lower for blockchain in ["solana", "sol", "ethereum", "eth"]):
                if conversation_context["last_proof_type"] == "kyc_transfer":
                    metadata = {
                        "action": "kyc_transfer",
                        "details": extract_transfer_details(request.message, conversation_context)
                    }
                    # Update context with new blockchain but same other details
                    update_context(metadata["details"], "kyc_transfer")
        
        # Standard intent detection
        elif "kyc" in message_lower and ("send" in message_lower or "transfer" in message_lower):
            transfer_details = extract_transfer_details(request.message, conversation_context)
            metadata = {
                "action": "kyc_transfer",
                "details": transfer_details
            }
            update_context(transfer_details, "kyc_transfer")
            
        elif "send" in message_lower or "transfer" in message_lower:
            if "kyc" not in message_lower:
                transfer_details = extract_transfer_details(request.message, conversation_context)
                metadata = {
                    "action": "direct_transfer", 
                    "details": transfer_details
                }
                update_context(transfer_details, "direct_transfer")
                
        elif "prove" in message_lower:
            if "ai" in message_lower or "content" in message_lower:
                metadata = {"action": "prove_ai_content"}
                update_context(None, "prove_ai_content")
            elif "location" in message_lower:
                metadata = {"action": "prove_location"}
                update_context(None, "prove_location")
            elif "kyc" in message_lower:
                metadata = {"action": "prove_kyc"}
                update_context(None, "prove_kyc")
                
        elif "verify" in message_lower and "proof" in message_lower:
            metadata = {"action": "verify_proof"}
        
        # Add conversation to history
        conversation_context["conversation_history"].append({
            "role": "assistant",
            "content": ai_response,
            "metadata": metadata,
            "timestamp": datetime.now().isoformat()
        })
        
        # Format response based on action type
        if metadata.get("action") == "kyc_transfer":
            # For KYC transfers, create a proof metadata that triggers the KYC proof flow
            proof_id = f"proof_kyc_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            return {
                "response": ai_response,
                "intent": {
                    "function": "prove_kyc",
                    "arguments": ["1"],  # KYC always uses argument "1"
                    "step_size": 50,
                    "explanation": "Generating KYC compliance proof for USDC transfer",
                    "additional_context": {
                        "is_automated_transfer": True,
                        "transfer_details": metadata["details"]
                    }
                },
                "metadata": {
                    "proof_id": proof_id,
                    "is_automated_transfer": True,
                    "transfer_details": metadata["details"]
                }
            }
        elif metadata.get("action") == "prove_kyc":
            # Standalone KYC proof
            return {
                "response": ai_response,
                "intent": {
                    "function": "prove_kyc",
                    "arguments": ["1"],
                    "step_size": 50,
                    "explanation": "Generating KYC compliance proof",
                    "additional_context": None
                }
            }
        elif metadata.get("action") == "prove_ai_content":
            return {
                "response": ai_response,
                "intent": {
                    "function": "prove_ai_content",
                    "arguments": ["content_hash", "openai"],  # Example arguments
                    "step_size": 50,
                    "explanation": "Generating AI content verification proof",
                    "additional_context": None
                }
            }
        elif metadata.get("action") == "prove_location":
            return {
                "response": ai_response,
                "intent": {
                    "function": "prove_location",
                    "arguments": ["12345"],  # Example packed coordinates
                    "step_size": 50,
                    "explanation": "Generating location verification proof",
                    "additional_context": None
                }
            }
        elif metadata.get("action") == "direct_transfer":
            # Direct transfer without KYC - this should be handled differently
            # Return the transfer details in a format the frontend can use
            return {
                "response": ai_response,
                "metadata": metadata,
                "action": "direct_transfer"
            }
        else:
            return {
                "response": ai_response,
                "metadata": metadata
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/execute_verified_transfer")
async def execute_verified_transfer(request: dict):
    """Execute a transfer that requires KYC verification"""
    try:
        # Extract transfer details from the additional_context
        transfer_details = request.get("transfer_details", {})
        amount = transfer_details.get("amount", "0.1")
        recipient = transfer_details.get("recipient", "alice")
        blockchain = transfer_details.get("blockchain", "ETH")
        
        # Round amount to 2 decimal places
        try:
            amount = str(round(float(amount), 2))
        except:
            amount = "0.1"
        
        # Update context
        update_context({
            "amount": amount,
            "recipient": recipient,
            "blockchain": blockchain
        }, "kyc_transfer")
        
        # Build the command for the Circle transfer
        # Use absolute path to node and the script
        node_path = subprocess.run("which node", shell=True, capture_output=True, text=True).stdout.strip()
        script_path = os.path.expanduser("~/agentkit/circle/executeTransfer.js")
        
        if blockchain == "SOL":
            command = f"{node_path} {script_path} send {amount} USDC to {recipient} on solana"
        else:
            command = f"{node_path} {script_path} send {amount} USDC to {recipient}"
        
        print(f"Executing transfer command: {command}")
        print(f"Working directory: {os.path.expanduser('~/agentkit')}")
        
        # Set up environment with Circle credentials
        env = os.environ.copy()
        
        # Execute the transfer with environment variables
        result = subprocess.run(
            command, 
            shell=True, 
            capture_output=True, 
            text=True, 
            cwd=os.path.expanduser("~/agentkit"),
            env=env
        )
        
        print(f"Transfer command exit code: {result.returncode}")
        print(f"Transfer stdout: {result.stdout}")
        print(f"Transfer stderr: {result.stderr}")
        
        # Extract JSON from stdout
        output = result.stdout
        
        # Try to extract JSON from output even if mixed with other text
        # Look for JSON at the end of the output
        output = result.stdout
        lines = output.strip().split('\n')
        json_str = None
        
        # Try to find the JSON line (usually the last line that starts with {)
        for line in reversed(lines):
            line = line.strip()
            if line.startswith('{') and line.endswith('}'):
                json_str = line
                break
        
        if json_str:
            try:
                transfer_data = json.loads(json_str)
                print(f"Parsed transfer result: {json.dumps(transfer_data, indent=2)}")
                
                # If we got an error in the JSON
                if transfer_data.get("success") == False:
                    return {"success": False, "error": transfer_data.get("error", "Transfer failed")}
                
                # Ensure we have a success field for the Rust server
                transfer_data["success"] = True
                
                # Add transfer details to the response
                transfer_data["amount"] = amount
                transfer_data["recipient"] = transfer_data.get("recipient", recipient)
                transfer_data["blockchain"] = blockchain
                transfer_data["from"] = transfer_data.get("from", "0x82a26a6d847e7e0961ab432b9a5a209e0db41040" if blockchain == "ETH" else "HsZdbBxZVNzEn4qR9Ebx5XxDSZ136Mu14VlH1nbXGhfG")
                
                # Get the Circle transfer ID
                if "transferId" in transfer_data:
                    transfer_data["circleTransferId"] = transfer_data["transferId"]
                
                return transfer_data
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {str(e)}")
                print(f"Attempted to parse: {json_str}")
        
        # If we couldn't parse JSON, return error
        error_msg = result.stderr or result.stdout or "Unknown error"
        print(f"Transfer failed with output: {error_msg}")
        return {"success": False, "error": "Failed to parse transfer response"}
            
    except Exception as e:
        print(f"Transfer execution error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

@app.post("/execute_direct_transfer")
async def execute_direct_transfer(request: dict):
    """Execute a direct transfer without KYC verification"""
    try:
        amount = request.get("amount", "0.1")
        recipient = request.get("recipient", "alice")
        blockchain = request.get("blockchain", "ETH")
        
        # Round amount to 2 decimal places
        try:
            amount = str(round(float(amount), 2))
        except:
            amount = "0.1"
        
        # Update context
        update_context({
            "amount": amount,
            "recipient": recipient,
            "blockchain": blockchain
        }, "direct_transfer")
        
        # Build the command for the Circle transfer
        if blockchain == "SOL":
            command = f"node circle/executeTransfer.js send {amount} USDC to {recipient} on solana"
        else:
            command = f"node circle/executeTransfer.js send {amount} USDC to {recipient}"
        
        # Execute the transfer
        result = subprocess.run(command, shell=True, capture_output=True, text=True, cwd=os.path.expanduser("~/agentkit"))
        
        if result.returncode != 0:
            error_msg = result.stderr or result.stdout
            
            # Check for rate limit error
            if "429" in error_msg or "rate limit" in error_msg.lower():
                return {
                    "error": "rate_limit",
                    "message": "Circle API rate limit reached. The transfer is being processed but may take a moment.",
                    "details": error_msg
                }
            
            # Check for validation errors (like decimal precision)
            if "422" in error_msg:
                return {
                    "error": "validation_error",
                    "message": f"Transfer validation failed. Please ensure the amount ({amount}) is valid with up to 2 decimal places.",
                    "details": error_msg
                }
            
            print(f"Transfer command failed: {error_msg}")
            return {"error": error_msg}
        
        try:
            transfer_data = json.loads(result.stdout)
            return transfer_data
        except json.JSONDecodeError:
            print(f"Failed to parse transfer result: {result.stdout}")
            return {"error": "Failed to parse transfer result", "raw_output": result.stdout}
            
    except Exception as e:
        print(f"Transfer execution error: {str(e)}")
        return {"error": str(e)}

@app.post("/check_transfer_status")
async def check_transfer_status(request: dict):
    """Check the status of a transfer"""
    try:
        transfer_id = request.get("transferId") or request.get("transfer_id")
        if not transfer_id:
            return {"error": "No transfer ID provided"}
        
        # Use the circleHandler.js script
        command = f"node circle/circleHandler.js {transfer_id}"
        result = subprocess.run(command, shell=True, capture_output=True, text=True, cwd=os.path.expanduser("~/agentkit"))
        
        if result.returncode != 0:
            error_msg = result.stderr or result.stdout
            if "429" in error_msg or "rate limit" in error_msg.lower():
                return {
                    "status": "rate_limit",
                    "message": "Rate limit reached while checking status. Please try again in a moment."
                }
            return {"error": error_msg}
        
        try:
            # Extract JSON from output that may have debug lines
            lines = result.stdout.strip().split('\n')
            json_str = None
            
            # Find the last line that looks like JSON
            for line in reversed(lines):
                line = line.strip()
                if line.startswith('{') and line.endswith('}'):
                    json_str = line
                    break
            
            if json_str:
                status_data = json.loads(json_str)
            else:
                raise json.JSONDecodeError("No JSON found", result.stdout, 0)
            
            return status_data
        except json.JSONDecodeError:
            return {"error": "Failed to parse status result", "raw_output": result.stdout}
            
    except Exception as e:
        print(f"Status check error: {str(e)}")
        return {"error": str(e)}

@app.get("/context")
async def get_context():
    """Get current conversation context (for debugging)"""
    return conversation_context

@app.post("/reset_context")
async def reset_context():
    """Reset conversation context"""
    global conversation_context
    conversation_context = {
        "last_transfer": None,
        "last_proof_type": None,
        "conversation_history": []
    }
    return {"message": "Context reset successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
