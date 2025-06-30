#!/usr/bin/env python3

print("✅ Script starting up...")

import base64
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import time
import re
import subprocess
import json
from pathlib import Path
import httpx
import uvicorn
import uuid
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from openai import OpenAI

# Models
class ProofIntent(BaseModel):
    function: str
    arguments: List[str]
    step_size: int = 50
    explanation: str
    additional_context: Dict[str, Any] = {}

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    intent: Optional[ProofIntent] = None
    response: str
    metadata: Optional[Dict[str, Any]] = None

# Configuration
app = FastAPI(title="ZKP Agent Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Initialize OpenAI client
openai_client = None
openai_available = False

api_key = os.getenv("OPENAI_API_KEY")
if api_key:
    try:
        openai_client = OpenAI(api_key=api_key)
        # Test the connection with gpt-4o-mini
        test_response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "test"}],
            max_tokens=5
        )
        openai_available = True
        print("✅ OpenAI client initialized and tested successfully with GPT-4o-mini")
    except Exception as e:
        print(f"⚠️ OpenAI initialization failed: {e}")
        openai_available = False
else:
    print("⚠️ WARNING: OPENAI_API_KEY environment variable not set!")
    print("   The system will work but without natural language capabilities.")

CIRCLE_DIR = Path(__file__).parent / "circle"
TEST_ADDRESSES = {
    "alice": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "alice_solana": "7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi",
    "bob": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "bob_solana": "GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW",
    "charlie": "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "charlie_solana": "2sWRYvL8M4S9XPvKNfUdy2Qvn6LYaXjqXDvMv9KsxbUa"
}

# System prompt for OpenAI - Enhanced for better mixed prompt detection
SYSTEM_PROMPT = """You are an AI assistant for a Zero-Knowledge Proof (ZKP) system. You can:
1. Have natural conversations on any topic
2. Generate ZK proofs for: KYC compliance, AI content authenticity, and device location
3. Execute USDC transfers (with or without KYC verification depending on request)
4. List and verify existing proofs

When users ask for proof generation, transfers, or verification, you should detect their intent and respond appropriately.
Be helpful, conversational, and can add personality, humor, or detailed explanations as requested.

IMPORTANT: Even if a message contains extra words like "with humor", "and explain", etc., you should still detect the core intent.
For example:
- "Prove Collatz steps with raunchy humor" -> Still a proof request for Collatz
- "prove kyc and make it funny" -> Still a KYC proof request
- "explain how to prove location" -> Still a location proof request

USDC Transfer Rules:
- If a transfer mentions "proof", "verify", "verified" AND "KYC" or "compliant" -> Requires KYC proof
- Otherwise, USDC transfers should be direct without proof generation
- Examples:
  - "Send 0.1 USDC to Alice if KYC compliant" -> Requires KYC proof
  - "Send 0.1 USDC to Alice" -> Direct transfer, no proof needed

Available commands you can detect:
- Prove KYC compliance
- Prove AI content authenticity
- Prove device location (supports San Francisco/SF, New York/NYC, London, Tokyo)
- Send USDC to addresses/names (alice, bob, charlie) - with or without KYC
- Verify proof [proof_id]
- List all proofs/verifications (or "Proof History"/"Verification History")
- Custom proof requests with C code
- Prove Collatz steps / prime check / digital root

You can combine natural conversation with these commands. For example, if someone asks "prove my location with humor", 
you should both detect the location proof intent AND provide a humorous response."""

# Helper Functions
def extract_transfer_details(message: str) -> Dict[str, str]:
    amount_match = re.search(r"(\d+(?:\.\d+)?)", message)
    amount = amount_match.group(1) if amount_match else "0.1"
    
    # Round to 2 decimal places for USDC
    try:
        amount = str(round(float(amount), 2))
    except:
        amount = "0.1"
    
    # Determine blockchain first
    blockchain = "SOL" if ("solana" in message.lower() or " sol" in message.lower()) else "ETH"
    
    # Initialize recipient
    recipient_address = None
    
    # Check for explicit addresses first
    eth_addr_match = re.search(r"0x[a-fA-F0-9]{40}", message)
    sol_addr_match = re.search(r"[1-9A-HJ-NP-Za-km-z]{32,44}", message)
    
    if eth_addr_match and blockchain == "ETH":
        recipient_address = eth_addr_match.group(0)
    elif sol_addr_match and blockchain == "SOL":
        recipient_address = sol_addr_match.group(0)
    else:
        # Look for named recipients
        msg_lower = message.lower()
        
        if blockchain == "SOL":
            # For Solana, look for _solana suffixed addresses
            for name, addr in TEST_ADDRESSES.items():
                if "_solana" in name:
                    base_name = name.replace("_solana", "")
                    if base_name in msg_lower:
                        recipient_address = addr
                        break
        else:
            # For Ethereum, look for addresses without _solana suffix
            for name, addr in TEST_ADDRESSES.items():
                if "_solana" not in name and name in msg_lower:
                    recipient_address = addr
                    break
    
    # Default to alice if nothing found
    if not recipient_address:
        recipient_address = TEST_ADDRESSES["alice_solana" if blockchain == "SOL" else "alice"]
    
    # DEBUG: Print what we're returning
    print(f"DEBUG extract_transfer_details: blockchain={blockchain}, recipient={recipient_address}, amount={amount}")
    
    return {"amount": amount, "recipient": recipient_address, "blockchain": blockchain}

def get_openai_response(message: str, context: str = "") -> tuple[str, Dict[str, Any]]:
    """Get response from OpenAI and extract any intents"""
    if not openai_available:
        return None, {}
    
    try:
        # Create a more specific prompt based on the message
        analysis_prompt = f"""Analyze this message and determine:
1. What the user wants (natural conversation, proof generation, transfer, etc.)
2. Generate an appropriate response (if they ask for humor, be funny!)
3. If it's a command, identify which type

IMPORTANT: Look for proof keywords even if mixed with other words:
- "prove collatz" or "collatz steps" or "collatz proof" -> custom_proof (Collatz)
- "prove prime" or "prime check" -> custom_proof (prime)
- "prove digital root" -> custom_proof (digital root)
- These work even with extra words like "with humor", "and explain", etc.

For list commands:
- "Proof History" or "list all proofs" -> list (proofs)
- "Verification History" or "list verifications" -> list (verifications)

For USDC transfers:
- If message contains "proof/verify/verified" AND "KYC/compliant" -> transfer with KYC proof required (requires_kyc: true)
- Otherwise -> direct transfer without proof (requires_kyc: false)

Message: "{message}"

Respond in JSON format:
{{
    "response": "Your natural language response to the user",
    "intent_type": "none|kyc_proof|ai_proof|location_proof|transfer|verify|list|custom_proof",
    "details": {{
        // Any relevant details based on intent_type
        // For location: {{"location": "city_name"}}
        // For transfer: {{"amount": "0.1", "recipient": "alice", "requires_kyc": true/false}}
        // For verify: {{"proof_id": "proof_xxx"}}
        // For custom_proof: {{"proof_type": "collatz|prime|digital_root"}}
        // For list: {{"list_type": "proofs" or "verifications"}}
    }},
    "personality": {{
        "add_humor": true/false,
        "add_explanation": true/false,
        "tone": "friendly|professional|humorous|educational"
    }}
}}"""
        
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": analysis_prompt}
            ],
            temperature=0.7,
            max_tokens=500,
            response_format={ "type": "json_object" }
        )
        
        result = json.loads(response.choices[0].message.content)
        return result.get("response", "I'll help you with that."), result
        
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return None, {}

def is_transfer_request(message: str) -> tuple[bool, bool]:
    """
    Check if message is a transfer request and if it requires KYC proof.
    Returns: (is_transfer, requires_kyc)
    """
    msg_lower = message.lower()
    has_usdc = "usdc" in msg_lower
    has_transfer_verb = any(k in msg_lower for k in ["send", "transfer", "pay"])
    
    if has_usdc and has_transfer_verb:
        # Check if KYC proof is explicitly requested
        has_proof_keyword = any(k in msg_lower for k in ["proof", "prove", "verified", "verify"])
        has_kyc_keyword = any(k in msg_lower for k in ["kyc", "compliant", "compliance"])
        requires_kyc = has_proof_keyword and has_kyc_keyword
        
        # Additional check for "if KYC compliant" pattern
        if "if kyc" in msg_lower:
            requires_kyc = True
        
        return True, requires_kyc
    
    return False, False

def is_kyc_proof_request(message: str) -> bool:
    msg_lower = message.lower()
    return "kyc" in msg_lower and ("prove" in msg_lower or "proof" in msg_lower) and "usdc" not in msg_lower

def is_ai_content_proof_request(message: str) -> bool:
    msg_lower = message.lower()
    return (("ai" in msg_lower or "content" in msg_lower) and 
            ("authenticity" in msg_lower or "authentic" in msg_lower) and 
            ("prove" in msg_lower or "proof" in msg_lower))

def is_location_proof_request(message: str) -> bool:
    msg_lower = message.lower()
    return (("location" in msg_lower or "device" in msg_lower or 
             any(city in msg_lower for city in ["sf", "san francisco", "new york", "nyc", "london", "tokyo"])) and 
            ("prove" in msg_lower or "proof" in msg_lower))

def is_collatz_proof_request(message: str) -> bool:
    """Check if message is requesting a Collatz proof"""
    msg_lower = message.lower()
    return ("collatz" in msg_lower and ("prove" in msg_lower or "proof" in msg_lower or "steps" in msg_lower))

def is_prime_proof_request(message: str) -> bool:
    """Check if message is requesting a prime number proof"""
    msg_lower = message.lower()
    return ("prime" in msg_lower and ("prove" in msg_lower or "proof" in msg_lower or "check" in msg_lower))

def is_digital_root_proof_request(message: str) -> bool:
    """Check if message is requesting a digital root proof"""
    msg_lower = message.lower()
    return ("digital" in msg_lower and "root" in msg_lower and ("prove" in msg_lower or "proof" in msg_lower))

def is_custom_proof_request(message: str) -> tuple:
    """Check if message is a custom proof request with base64 encoded C code"""
    if message.startswith("prove custom "):
        try:
            encoded_code = message.replace("prove custom ", "").strip()
            decoded_code = base64.b64decode(encoded_code).decode('utf-8')
            return True, decoded_code
        except:
            return False, None
    return False, None

def is_verification_request(message: str) -> tuple:
    """Check if message is a verification request"""
    msg_lower = message.lower()
    if "verify" in msg_lower and "proof" in msg_lower:
        # Extract proof ID
        proof_match = re.search(r"proof_\d+_[a-f0-9]+", message)
        if proof_match:
            return True, proof_match.group(0)
    return False, None

# API Endpoints
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    user_message = request.message
    msg_lower = user_message.lower()
    
    proof_id = f"proof_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"

    # First, try to get OpenAI's analysis if available
    ai_response, ai_analysis = get_openai_response(user_message)
    
    # If OpenAI is available and detected an intent, use its analysis
    if ai_response and ai_analysis.get("intent_type") != "none":
        intent_type = ai_analysis.get("intent_type")
        details = ai_analysis.get("details", {})
        
        # Handle different intent types based on OpenAI's analysis
        if intent_type == "verify":
            verify_proof_id = details.get("proof_id") or proof_id
            return ChatResponse(
                response=ai_response,
                intent=ProofIntent(
                    function="prove_kyc",
                    arguments=["1"],
                    explanation=f"Verify existing proof {verify_proof_id}",
                    additional_context={
                        "action": "verify",
                        "proof_id": verify_proof_id,
                        "is_verification": True
                    }
                ),
                metadata={
                    "type": "verification_request",
                    "proof_id": verify_proof_id,
                    "action": "verify"
                }
            )
        
        elif intent_type == "transfer":
            transfer_details = extract_transfer_details(user_message)
            print(f"DEBUG 1: After extract_transfer_details: {transfer_details}")
            if details.get("amount"):
                transfer_details["amount"] = details["amount"]
            print(f"DEBUG 2: AI details.recipient = {details.get('recipient')}")
            if details.get("recipient") in TEST_ADDRESSES:
                # Recipient already set correctly by extract_transfer_details
                pass
            
            # Check if KYC is required based on the message or AI detection
            requires_kyc = details.get("requires_kyc", False)
            if not requires_kyc:
                # Double-check with our pattern matching
                _, requires_kyc = is_transfer_request(user_message)
            
            if requires_kyc:
                return ChatResponse(
                    response=ai_response or f"I'll need to generate a KYC compliance proof before I can send that {transfer_details['amount']} USDC. Let's get that sorted out!",
                    intent=ProofIntent(
                        function="prove_kyc",
                        arguments=["1"],
                        explanation="Automated KYC proof for USDC transfer.",
                        additional_context={
                            "is_automated_transfer": True,
                            "transfer_details": transfer_details
                        }
                    ),
                    metadata={
                        "type": "kyc_transfer_automation_start",
                        "is_automated_transfer": True,
                        "proof_id": proof_id,
                        "transfer_details": transfer_details
                    }
                )
            else:
                # Direct transfer without KYC
                return ChatResponse(
                    response=ai_response or f"Initiating direct transfer of {transfer_details['amount']} USDC to {transfer_details['recipient'][:10]}...",
                    metadata={
                        "type": "direct_transfer",
                        "transfer_details": transfer_details
                    }
                )
            
        elif intent_type == "kyc_proof":
            return ChatResponse(
                response=ai_response,
                intent=ProofIntent(
                    function="prove_kyc",
                    arguments=["1"],
                    explanation="Manual KYC compliance proof",
                    additional_context={"is_automated_transfer": False}
                ),
                metadata={
                    "type": "manual_proof",
                    "proof_id": proof_id,
                    "proof_type": "kyc"
                }
            )
            
        elif intent_type == "ai_proof":
            return ChatResponse(
                response=ai_response,
                intent=ProofIntent(
                    function="prove_ai_content",
                    arguments=["987654321", "1000"],
                    explanation="AI content authenticity verification",
                    additional_context={"is_automated_transfer": False}
                ),
                metadata={
                    "type": "manual_proof",
                    "proof_id": proof_id,
                    "proof_type": "ai_content"
                }
            )
            
        elif intent_type == "location_proof":
            location = details.get("location", "New York")
            lat, lon = 103, 182  # NYC default
            
            if "london" in location.lower():
                lat, lon = 130, 242
            elif "new york" in location.lower() or "nyc" in location.lower():
                lat, lon = 103, 182
            elif "tokyo" in location.lower():
                lat, lon = 90, 140
            elif "san francisco" in location.lower() or "sf" in location.lower():
                lat, lon = 96, 122
                
            device_id = 1234
            packed_input = (lat << 24) | (lon << 16) | device_id
            
            return ChatResponse(
                response=ai_response,
                intent=ProofIntent(
                    function="prove_location",
                    arguments=[str(packed_input)],
                    explanation=f"Device location proof for {location} - Zone verification",
                    additional_context={
                        "is_automated_transfer": False,
                        "location": location,
                        "zone_type": "city boundary verification"
                    }
                ),
                metadata={
                    "type": "manual_proof",
                    "proof_id": proof_id,
                    "proof_type": "location"
                }
            )
            
        elif intent_type == "custom_proof":
            proof_type = details.get("proof_type", "custom")
            
            # Generate the appropriate C code for the proof type
            if proof_type == "collatz":
                c_code = """// Collatz Conjecture Steps
int main() {
    int n = 27;
    int steps = 0;
    while (n != 1 && steps < 1000) {
        if (n % 2 == 0) n = n / 2;
        else n = 3 * n + 1;
        steps++;
    }
    return steps;
}"""
                description = "Collatz conjecture computation"
                wasm_file = "collatz"
                default_arg = "27"
                
            elif proof_type == "prime":
                c_code = """// Prime Number Checker Example
int main() {
    int n = 17;
    if (n <= 1) return 0;
    if (n <= 3) return 1;
    if (n % 2 == 0 || n % 3 == 0) return 0;
    for (int i = 5; i * i <= n; i = i + 6) {
        if (n % i == 0 || n % (i + 2) == 0) return 0;
    }
    return 1;
}"""
                description = "prime number check"
                wasm_file = "prime_checker"
                default_arg = "17"
                
            elif proof_type == "digital_root":
                c_code = """// Digital Root Calculator
int main() {
    int n = 12345;
    if (n == 0) return 0;
    return (n - 1) % 9 + 1;
}"""
                description = "digital root calculation"
                wasm_file = "digital_root"
                default_arg = "12345"
                
            else:
                # Generic custom proof
                c_code = "// Custom proof"
                description = "custom computation"
                wasm_file = "custom_proof"
                default_arg = "1"
            
            return ChatResponse(
                response=ai_response,
                intent=ProofIntent(
                    function="prove_custom",
                    arguments=[default_arg],
                    explanation=f"Custom proof: {description}",
                    additional_context={
                        "is_automated_transfer": False,
                        "c_code": c_code,
                        "proof_type": "custom",
                        "is_custom": True,
                        "custom_description": description,
                        "wasm_file": wasm_file
                    }
                ),
                metadata={
                    "type": "manual_proof",
                    "proof_id": proof_id,
                    "proof_type": "custom",
                    "description": description,
                    "is_custom": True
                }
            )
            
        elif intent_type == "list":
            # Handle both "list all proofs" and "Proof History" styles
            list_type = "verifications" if ("verification" in msg_lower or details.get("list_type") == "verifications") else "proofs"
            return ChatResponse(
                response=ai_response,
                intent=ProofIntent(
                    function="list_proofs",
                    arguments=[list_type],
                    explanation=f"List all {list_type}",
                    additional_context={"list_type": list_type}
                ),
                metadata={
                    "type": "list_request",
                    "list_type": list_type
                }
            )
    
    # If OpenAI didn't detect an intent or is unavailable, fall back to pattern matching
    # Check for verification request first
    is_verify, verify_proof_id = is_verification_request(user_message)
    if is_verify:
        response_text = ai_response or f"I'll verify the proof {verify_proof_id} for you."
        return ChatResponse(
            response=response_text,
            intent=ProofIntent(
                function="prove_kyc",
                arguments=["1"],
                explanation=f"Verify existing proof {verify_proof_id}",
                additional_context={
                    "action": "verify",
                    "proof_id": verify_proof_id,
                    "is_verification": True
                }
            ),
            metadata={
                "type": "verification_request",
                "proof_id": verify_proof_id,
                "action": "verify"
            }
        )

    # Check for transfer requests BEFORE individual proof requests
    is_transfer, requires_kyc = is_transfer_request(user_message)
    if is_transfer:
        details = extract_transfer_details(user_message)
        
        if requires_kyc:
            response_text = ai_response or f"I'll need to generate a KYC compliance proof before I can send that {details['amount']} USDC to {details['recipient'][:10]}... Let's get that sorted out!"
            
            return ChatResponse(
                response=response_text,
                intent=ProofIntent(
                    function="prove_kyc",
                    arguments=["1"],
                    explanation="Automated KYC proof for USDC transfer.",
                    additional_context={
                        "is_automated_transfer": True,
                        "transfer_details": details
                    }
                ),
                metadata={
                    "type": "kyc_transfer_automation_start",
                    "is_automated_transfer": True,
                    "proof_id": proof_id,
                    "transfer_details": details
                }
            )
        else:
            # Direct transfer without KYC
            response_text = ai_response or f"Initiating direct transfer of {details['amount']} USDC to {details['recipient'][:10]}... No KYC verification required."
            
            return ChatResponse(
                response=response_text,
                metadata={
                    "type": "direct_transfer",
                    "transfer_details": details
                }
            )

    # Check for specific proof types (Collatz, Prime, Digital Root)
    if is_collatz_proof_request(user_message):
        c_code = """// Collatz Conjecture Steps
int main() {
    int n = 27;
    int steps = 0;
    while (n != 1 && steps < 1000) {
        if (n % 2 == 0) n = n / 2;
        else n = 3 * n + 1;
        steps++;
    }
    return steps;
}"""
        response_text = ai_response or "I'll generate a proof for the Collatz conjecture computation. Processing..."
        return ChatResponse(
            response=response_text,
            intent=ProofIntent(
                function="prove_custom",
                arguments=["27"],
                explanation="Custom proof: Collatz conjecture computation",
                additional_context={
                    "is_automated_transfer": False,
                    "c_code": c_code,
                    "proof_type": "custom",
                    "is_custom": True,
                    "custom_description": "Collatz conjecture computation",
                    "wasm_file": "collatz"
                }
            ),
            metadata={
                "type": "manual_proof",
                "proof_id": proof_id,
                "proof_type": "custom",
                "description": "Collatz conjecture computation",
                "is_custom": True
            }
        )
    
    elif is_prime_proof_request(user_message):
        c_code = """// Prime Number Checker Example
int main() {
    int n = 17;
    if (n <= 1) return 0;
    if (n <= 3) return 1;
    if (n % 2 == 0 || n % 3 == 0) return 0;
    for (int i = 5; i * i <= n; i = i + 6) {
        if (n % i == 0 || n % (i + 2) == 0) return 0;
    }
    return 1;
}"""
        response_text = ai_response or "I'll generate a proof for prime number checking. Processing..."
        return ChatResponse(
            response=response_text,
            intent=ProofIntent(
                function="prove_custom",
                arguments=["17"],
                explanation="Custom proof: prime number check",
                additional_context={
                    "is_automated_transfer": False,
                    "c_code": c_code,
                    "proof_type": "custom",
                    "is_custom": True,
                    "custom_description": "prime number check",
                    "wasm_file": "prime_checker"
                }
            ),
            metadata={
                "type": "manual_proof",
                "proof_id": proof_id,
                "proof_type": "custom",
                "description": "prime number check",
                "is_custom": True
            }
        )
    
    elif is_digital_root_proof_request(user_message):
        c_code = """// Digital Root Calculator
int main() {
    int n = 12345;
    if (n == 0) return 0;
    return (n - 1) % 9 + 1;
}"""
        response_text = ai_response or "I'll generate a proof for digital root calculation. Processing..."
        return ChatResponse(
            response=response_text,
            intent=ProofIntent(
                function="prove_custom",
                arguments=["12345"],
                explanation="Custom proof: digital root calculation",
                additional_context={
                    "is_automated_transfer": False,
                    "c_code": c_code,
                    "proof_type": "custom",
                    "is_custom": True,
                    "custom_description": "digital root calculation",
                    "wasm_file": "digital_root"
                }
            ),
            metadata={
                "type": "manual_proof",
                "proof_id": proof_id,
                "proof_type": "custom",
                "description": "digital root calculation",
                "is_custom": True
            }
        )

    
    elif is_kyc_proof_request(user_message):
        response_text = ai_response or "I'll generate a KYC compliance proof for you. This will create a zero-knowledge proof of your verification status."
        return ChatResponse(
            response=response_text,
            intent=ProofIntent(
                function="prove_kyc",
                arguments=["1"],
                explanation="Manual KYC compliance proof",
                additional_context={"is_automated_transfer": False}
            ),
            metadata={
                "type": "manual_proof",
                "proof_id": proof_id,
                "proof_type": "kyc"
            }
        )
    
    elif is_ai_content_proof_request(user_message):
        response_text = ai_response or "I'll generate a proof of AI content authenticity. This will verify that content was generated by an authorized AI system."
        return ChatResponse(
            response=response_text,
            intent=ProofIntent(
                function="prove_ai_content",
                arguments=["987654321", "1000"],
                explanation="AI content authenticity verification",
                additional_context={"is_automated_transfer": False}
            ),
            metadata={
                "type": "manual_proof",
                "proof_id": proof_id,
                "proof_type": "ai_content"
            }
        )
    
    elif is_location_proof_request(user_message):
        # Extract location from message or use default
        location = "New York"
        lat, lon = 103, 182  # NYC normalized coordinates
        
        if "san francisco" in msg_lower or "sf" in msg_lower:
            location = "San Francisco"
            lat, lon = 96, 122
        elif "new york" in msg_lower or "nyc" in msg_lower:
            location = "New York"
            lat, lon = 103, 182
        elif "london" in msg_lower:
            location = "London"
            lat, lon = 130, 242
        elif "tokyo" in msg_lower:
            location = "Tokyo"
            lat, lon = 90, 140
        
        device_id = 1234
        packed_input = (lat << 24) | (lon << 16) | device_id
        
        response_text = ai_response or f"I'll generate a location proof for {location}. This will create a zero-knowledge proof of device location without revealing exact coordinates."
        return ChatResponse(
            response=response_text,
            intent=ProofIntent(
                function="prove_location",
                arguments=[str(packed_input)],
                explanation=f"Device location proof for {location} - Zone verification",
                additional_context={
                    "is_automated_transfer": False,
                    "location": location,
                    "zone_type": "city boundary verification"
                }
            ),
            metadata={
                "type": "manual_proof",
                "proof_id": proof_id,
                "proof_type": "location"
            }
        )
    
    elif ("list" in msg_lower and ("proof" in msg_lower or "verification" in msg_lower)) or "proof history" in msg_lower or "verification history" in msg_lower:
        list_type = "verifications" if "verification" in msg_lower else "proofs"
        response_text = ai_response or f"Here are your recent {list_type}. Use the proof IDs to verify or inspect specific proofs."
        return ChatResponse(
            response=response_text,
            intent=ProofIntent(
                function="list_proofs",
                arguments=[list_type],
                explanation=f"List all {list_type}",
                additional_context={
                    "list_type": list_type,
                    "limit": 20  # Add limit for history
                }
            ),
            metadata={
                "type": "list_request",
                "list_type": list_type
            }
        )
    
    elif is_custom_proof_request(user_message)[0]:
        is_custom, c_code = is_custom_proof_request(user_message)
        description = "custom computation"
        wasm_file = "custom_proof"  # Default
        default_arg = "27"  # Default argument
        
        # Detect which example based on the C code
        if "prime" in c_code.lower():
            description = "prime number check"
            wasm_file = "prime_checker"
            default_arg = "17"
        elif "collatz" in c_code.lower():
            description = "Collatz conjecture computation"
            wasm_file = "collatz"
            default_arg = "27"
        elif "digital" in c_code.lower() and "root" in c_code.lower():
            description = "digital root calculation"
            wasm_file = "digital_root"
            default_arg = "12345"
        
        response_text = ai_response or f"I'll generate a proof for your {description}. Processing your custom C code..."
        return ChatResponse(
            response=response_text,
            intent=ProofIntent(
                function="prove_custom",
                arguments=[default_arg],  # Use numeric argument
                explanation=f"Custom proof: {description}",
                additional_context={
                    "is_automated_transfer": False,
                    "c_code": c_code,
                    "proof_type": "custom",
                    "is_custom": True,
                    "custom_description": description,
                    "wasm_file": wasm_file  # Store which WASM to use in metadata
                }
            ),
            metadata={
                "type": "manual_proof",
                "proof_id": proof_id,
                "proof_type": "custom",
                "description": description,
                "is_custom": True
            }
        )
    
    else:
        # This is a pure natural language query - use OpenAI if available
        if ai_response:
            return ChatResponse(
                response=ai_response,
                metadata={"type": "conversation"}
            )
        else:
            # Fallback if OpenAI is not available
            return ChatResponse(
                response="I can help you with:\n• Generating ZK proofs (KYC, AI content, location)\n• USDC transfers with KYC verification\n• Listing your proofs\n• Custom proofs (Collatz, prime check, digital root)\n\nTry: 'prove KYC compliance' or 'send 0.5 USDC to bob'",
                metadata={"type": "help"}
            )

@app.post("/execute_verified_transfer")
async def execute_verified_transfer(request: Dict[str, Any]):
    """Execute a USDC transfer after KYC verification"""
    transfer_details = request.get("transfer_details", {})
    amount = transfer_details.get("amount", "0.01")
    recipient = transfer_details.get("recipient")
    blockchain = transfer_details.get("blockchain", "ETH")

    if not recipient:
        raise HTTPException(status_code=400, detail="Recipient address is missing.")

    try:
        # Construct the command string
        command_str = f"send {amount} USDC to {recipient}"
        if blockchain == "SOL":
            command_str += " on solana"
        
        cmd = ["node", str(CIRCLE_DIR / "executeTransfer.js"), command_str]
        print(f"DEBUG: Executing command: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=60, env=os.environ.copy(), cwd=str(CIRCLE_DIR))
        
        output_lines = result.stdout.strip().split('\n')
        json_output = None
        
        print(f"Circle script output: {result.stdout}")
        
        for line in output_lines:
            if line.strip().startswith('{'):
                try:
                    json_output = json.loads(line)
                    print(f"Parsed Circle response: {json_output}")
                    break
                except Exception as e:
                    print(f"Failed to parse line as JSON: {line}, error: {e}")
                    continue
        
        if json_output:
            # Ensure we have a transaction hash
            tx_hash = (json_output.get('transactionHash') or 
                      json_output.get('txHash') or 
                      json_output.get('hash') or 
                      json_output.get('id') or
                      'pending')
            
            response_data = {
                "success": True,
                "transactionId": tx_hash,
                "transactionHash": tx_hash,
                "txHash": tx_hash,
                "hash": tx_hash,
                "transferId": json_output.get('transferId', json_output.get('id')),
                "blockchain": blockchain,
                "message": "Transfer successful via Circle SDK.",
                "from": json_output.get('from'),
                "amount": amount,
                "recipient": recipient
            }
            
            # Include Circle transfer ID if it's different from tx hash
            if json_output.get('circleTransferId'):
                response_data['circleTransferId'] = json_output['circleTransferId']
                
            print(f"Returning to Rust: {response_data}")
            return response_data
        else:
            # This shouldn't happen with the updated circleHandler
            return {
                "success": True,
                "transactionId": "pending",
                "transactionHash": "pending",
                "message": "Transfer initiated. Transaction hash pending.",
                "amount": amount,
                "recipient": recipient,
                "from": "Circle Wallet",
                "blockchain": blockchain
            }
            
    except subprocess.CalledProcessError as e:
        error_message = e.stderr or str(e)
        # Check for rate limit errors
        if "rate" in error_message.lower() and "limit" in error_message.lower():
            raise HTTPException(status_code=429, detail="Circle API rate limit exceeded. Please wait a moment and try again.")
        raise HTTPException(status_code=500, detail=f"Transfer script failed: {e.stderr}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {str(e)}")


@app.post("/execute_direct_transfer")
async def execute_direct_transfer(request: Dict[str, Any]):
    """Execute a direct USDC transfer without KYC verification"""
    transfer_details = request.get("transfer_details", {})
    amount = transfer_details.get("amount", "0.01")
    recipient = transfer_details.get("recipient")
    blockchain = transfer_details.get("blockchain", "ETH")

    print(f"DEBUG execute_direct_transfer: amount={amount}, recipient={recipient}, blockchain={blockchain}")

    if not recipient:
        raise HTTPException(status_code=400, detail="Recipient address is missing.")

    try:
        command_str = f"send {amount} USDC to {recipient}"
        if blockchain == "SOL":
            command_str += " on solana"
        
        cmd = ["node", str(CIRCLE_DIR / "executeTransfer.js"), command_str]
        
        print(f"DEBUG: Executing direct transfer: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            check=True, 
            timeout=60, 
            env=os.environ.copy(), 
            cwd=str(CIRCLE_DIR)
        )
        
        print(f"DEBUG: Script stdout: {result.stdout}")
        print(f"DEBUG: Script stderr: {result.stderr}")
        
        output_lines = result.stdout.strip().split('\n')
        json_output = None
        
        for line in output_lines:
            if line.strip().startswith('{'):
                try:
                    json_output = json.loads(line)
                    print(f"DEBUG: Parsed JSON output: {json_output}")
                    break
                except Exception as e:
                    print(f"DEBUG: Failed to parse JSON line: {line}, error: {e}")
                    continue
        
        if json_output:
            # Ensure we have a transaction hash
            tx_hash = (json_output.get('transactionHash') or 
                      json_output.get('txHash') or 
                      json_output.get('hash') or 
                      json_output.get('id') or
                      'pending')
            
            response_data = {
                "success": True,
                "transactionId": tx_hash,
                "transactionHash": tx_hash,
                "txHash": tx_hash,
                "hash": tx_hash,
                "transferId": json_output.get('transferId', json_output.get('id')),
                "blockchain": blockchain,
                "message": "Direct transfer successful.",
                "transfer_type": "direct",
                "from": json_output.get('from'),
                "amount": amount,
                "recipient": recipient
            }
            
            # Include Circle transfer ID if it's different from tx hash
            if json_output.get('circleTransferId'):
                response_data['circleTransferId'] = json_output['circleTransferId']
                
            return response_data
        else:
            # Fallback response
            return {
                "success": True,
                "transactionId": "pending",
                "transactionHash": "pending",
                "message": "Transfer initiated.",
                "amount": amount,
                "recipient": recipient,
                "from": "HsZdbBxZVNzEn4qR9Ebx5XxDSZ136Mu14VlH1nbXGhfG" if blockchain == "SOL" else "0x82a26a6d847e7e0961ab432b9a5a209e0db41040",
                "blockchain": blockchain,
                "transfer_type": "direct"
            }
        
    except subprocess.CalledProcessError as e:
        print(f"ERROR: Transfer script failed with code {e.returncode}")
        print(f"ERROR: stderr: {e.stderr}")
        print(f"ERROR: stdout: {e.stdout}")
        raise HTTPException(status_code=500, detail=f"Transfer failed: {e.stderr}")
    except Exception as e:
        print(f"ERROR: Unexpected error in execute_direct_transfer: {str(e)}")
        print(f"ERROR: Type: {type(e)}")
        import traceback
        print(f"ERROR: Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/check_transfer_status")
async def check_transfer_status(request: Dict[str, Any]):
    """Check the status of a Circle transfer"""
    transfer_id = request.get("transferId")
    if not transfer_id:
        raise HTTPException(status_code=400, detail="Transfer ID is required")
    
    try:
        # Use the Node.js script to check status
        script_content = f"""
import CircleUSDCHandler from './circleHandler.js';

const handler = new CircleUSDCHandler();
await handler.initialize();

try {{
    const details = await handler.getTransferDetails('{transfer_id}');
    console.log(JSON.stringify({{
        status: details.status || 'unknown',
        transactionHash: details.transactionHash || null,
        blockchain: details.destination?.chain || 'ETH',
        amount: details.amount?.amount || '0',
        errorCode: details.errorCode || null
    }}));
}} catch (error) {{
    console.log(JSON.stringify({{
        status: 'error',
        transactionHash: null,
        error: error.message
    }}));
}}
"""
        
        # Write to temp file
        temp_script = CIRCLE_DIR / "check_status_temp.js"
        with open(temp_script, "w") as f:
            f.write(script_content)
        
        # Execute
        cmd = ["node", str(temp_script)]
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            timeout=15, 
            env=os.environ.copy(), 
            cwd=str(CIRCLE_DIR)
        )
        
        # Clean up
        temp_script.unlink(missing_ok=True)
        
        if result.returncode == 0:
            try:
                # Parse output, looking for JSON
                output_lines = result.stdout.strip().split('\n')
                for line in reversed(output_lines):
                    if line.strip().startswith('{'):
                        data = json.loads(line)
                        print(f"DEBUG check_transfer_status response: {data}")
                        return data
                
                # If no valid JSON found
                return {"status": "unknown", "transactionHash": None}
                
            except Exception as e:
                print(f"Error parsing check_transfer_status response: {e}")
                return {"status": "unknown", "transactionHash": None}
        else:
            print(f"check_transfer_status script error: {result.stderr}")
            # Check for rate limit in stderr
            if result.stderr and "rate" in result.stderr.lower() and "limit" in result.stderr.lower():
                return {"status": "rate_limited", "transactionHash": None, "error": "Rate limit exceeded"}
            return {"status": "error", "transactionHash": None, "error": "Failed to check status"}
            
    except Exception as e:
        print(f"check_transfer_status exception: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    print("✅ Checking main execution block...")
    
    # Check if OpenAI API key is set
    if not openai_available:
        print("\n⚠️ OpenAI is NOT available!")
        print("   To enable natural language conversations:")
        print("   1. Set your API key: export OPENAI_API_KEY='sk-...'")
        print("   2. Restart this service")
    else:
        print("\n✅ OpenAI is connected and ready!")
        print("   You can now have natural conversations and use AI-enhanced responses.")
    
    try:
        uvicorn.run(app, host="0.0.0.0", port=8002)
    except NameError:
        print("\n❌ FATAL ERROR: 'uvicorn' is not defined.")
        print("   It seems the uvicorn library is not installed correctly.")
        print("   Please run: pip install 'uvicorn[standard]'")
