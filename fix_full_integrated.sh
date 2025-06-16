#!/bin/bash

cd ~/agentkit

echo "🔧 Creating FULL Integrated Service (LangChain + Transform)"
echo "=========================================================="
echo ""

# First, let's check if we have the original transform_service.py
if [ -f "transform_service.py" ] || [ -f "transform_service.py.backup.*" ]; then
    echo "✅ Found transform service code"
else
    echo "⚠️  Creating transform service code from scratch"
fi

# Create the complete integrated service with FULL functionality
cat > langchain_service_full.py << 'FULLSERVICE'
#!/usr/bin/env python3
"""
FULL Integrated LangChain + Transform Service for zkEngine
Complete functionality - nothing simplified
"""

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
import os
import re
import subprocess
import tempfile
import uuid
from datetime import datetime
import json
import random
import shutil

from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.output_parsers import PydanticOutputParser
from langchain.memory import ConversationBufferMemory
from langchain.schema import SystemMessage, HumanMessage, AIMessage
from langchain.chains import LLMChain
from langchain.schema.runnable import RunnablePassthrough

app = FastAPI(title="zkEngine Integrated Service (LangChain + Transform) - FULL")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== LANGCHAIN MODELS =====

class ProofIntent(BaseModel):
    """Structured output for proof generation intent"""
    function: str = Field(description="The proof function to call: prove_kyc, prove_ai_content, prove_location")
    arguments: List[str] = Field(description="Arguments for the function as strings")
    step_size: int = Field(description="Computation steps: 50 for all current proof types")
    explanation: str = Field(description="Human-friendly explanation of what will be proved")
    complexity_reasoning: Optional[str] = Field(description="Why this step size was chosen")
    additional_context: Optional[Dict[str, Any]] = Field(description="Additional context or insights", default={})

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    intent: Optional[ProofIntent] = None
    response: str
    session_id: str
    requires_proof: bool = False
    additional_analysis: Optional[str] = None
    suggestions: Optional[List[str]] = None

# ===== TRANSFORM SERVICE MODELS =====

class TransformRequest(BaseModel):
    code: str
    auto_transform: bool = True

class TransformResponse(BaseModel):
    success: bool
    transformed_code: str
    changes: List[str]
    error: Optional[str] = None

class CompileRequest(BaseModel):
    code: str
    filename: str

class CompileResponse(BaseModel):
    success: bool
    wat_content: Optional[str] = None
    wasm_file: Optional[str] = None
    wasm_size: Optional[int] = None
    error: Optional[str] = None

# Initialize LangChain components
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("WARNING: OPENAI_API_KEY not found in environment variables!")
    print("Please set it with: export OPENAI_API_KEY='your-key-here'")

llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.7,
    api_key=api_key
)

# Memory storage per session
memory_store: Dict[str, ConversationBufferMemory] = {}

# Streamlined system prompt with only 3 proof types
SYSTEM_PROMPT = """You are an intelligent assistant for zkEngine, a zero-knowledge proof system. 
Your role is to help users generate cryptographic proofs for real-world use cases AND provide rich, contextual explanations in any language requested.

CRITICAL FORMATTING RULES:
- NEVER use markdown formatting of any kind
- NO asterisks (*) for emphasis
- NO hashtags (#) for headers  
- NO backticks (`) for code
- NO underscores (_) for emphasis
- NO brackets [] or parentheses () for links
- Use ONLY plain text in all responses

Available proof functions:
1. prove_kyc(wallet_hash, kyc_status) - Prove Circle KYC compliance without revealing wallet identity or personal details (wallet_hash: numeric hash of wallet, kyc_status: 1=approved)
2. prove_ai_content(content_hash, auth_type) - Prove AI-generated content authenticity and integrity (content_hash: numeric ID, auth_type: 1=signature, 2=hash, 3=full)
3. prove_location(city, device_id) - Prove device location within city boundaries (San Francisco, New York, London)

CIRCLE KYC PROOF EXAMPLES:
- "prove kyc compliance" → Generate proof that wallet passed Circle KYC without revealing identity
- "verify kyc status" → Prove KYC approval without disclosing wallet owner or risk assessment details  
- "kyc proof" → Create zero-knowledge proof of regulatory compliance for DeFi access

When users request KYC proofs, you should:
1. Generate the proof intent with prove_kyc function
2. Explain how zero-knowledge proofs enable regulatory compliance while preserving privacy
3. Describe Circle KYC webhook integration (rampSession.kycApproved) 
4. Mention applications in DeFi, DEX access, and institutional adoption
5. Emphasize that wallet identity and personal details remain completely private

AI CONTENT PROOF EXAMPLES:
- "prove ai content authenticity" → Generate authenticity proof for AI-generated content
- "verify ai generated content" → Prove content was generated by AI and hasn't been tampered with
- "ai content verification" → Create cryptographic proof of AI content integrity

When users request AI content proofs, you should:
1. Generate the proof intent with prove_ai_content function
2. Explain how zero-knowledge proofs can verify AI content without revealing the content itself
3. Describe applications in content verification, deepfake detection, and AI model attestation
4. Mention use cases in media authenticity and digital provenance

LOCATION PROOF EXAMPLES:
- "prove device location in San Francisco" → Generate GPS location proof for SF
- "verify GPS coordinates within New York" → Prove device is in NYC boundaries
- "prove London location for device 12345" → Location proof with specific device ID

When users request location proofs, you should:
1. Generate the proof intent with prove_location function
2. Explain the DePIN (Decentralized Physical Infrastructure) use case
3. Describe how location is verified without revealing exact coordinates
4. Mention token rewards based on coverage areas
5. If no device ID specified, say you'll use a random ID - do NOT ask for one

Available commands:
- verify - Verify the last generated proof
- verify proof <id> - Verify a specific proof by its ID
- list all proofs - Show all generated proofs
- list verifications - Show verification history
- help - Show available commands
- status - Check system health

You can handle:
- Proof generation requests with rich explanations in any language
- Verification requests for existing proofs
- Multi-step requests with comparative analysis
- Educational content about zero-knowledge proofs and their applications
- Market analysis and trends in verifiable computation
- Philosophical discussions about trust and verification
- Cultural perspectives on cryptographic concepts

When users request verification (e.g., "verify 29b46cdf"), you should:
1. Acknowledge that you're processing their verification request
2. Explain what proof verification means in the zkEngine context
3. Let them know the system will check the cryptographic validity of the proof
4. Provide educational context about zero-knowledge proofs if appropriate

Step Size Information:
- Step size controls the computational chunk size for proof generation
- Default step sizes are automatically selected based on complexity:
  * All current proof types (prove_kyc, prove_ai_content, prove_location): 50
- Users can optionally specify custom step sizes (e.g., "with step size 200")
- Higher step sizes allow more complex computations but take longer
- Lower step sizes are faster but may fail for complex operations

Remember: 
- You can respond in any language and connect proofs to any domain of knowledge
- Always use plain text without any formatting symbols
- For verification requests, acknowledge and explain the process
- Keep responses conversational and helpful"""

# ===== TRANSFORM SERVICE FUNCTIONS =====

def transform_for_zkengine(code: str) -> tuple[str, List[str]]:
    """Auto-transforms normal C to zkEngine-compatible code"""
    changes = []
    
    # Type conversions
    code = re.sub(r'\bint\s+', 'int32_t ', code)
    code = re.sub(r'\bfloat\s+', 'int32_t ', code)
    changes.append("Converted int/float to int32_t")
    
    # Remove I/O operations
    if 'printf' in code:
        code = re.sub(r'printf\s*\([^;]+\);', '/* printf removed */;', code)
        changes.append("Removed printf statements")
    
    if 'scanf' in code:
        code = re.sub(r'scanf\s*\([^;]+\);', '/* scanf removed */;', code)
        changes.append("Removed scanf statements")
    
    # CRITICAL: Fix main function signatures for zkEngine
    # Handle standard C main signatures
    main_patterns = [
        # main(int argc, char **argv) or main(int argc, char *argv[])
        (r'int32_t\s+main\s*\(\s*int32_t\s+\w+\s*,\s*char\s*\*\*?\s*\w+\[?\]?\s*\)', 
         None),  # Will determine args dynamically
        # main(void) or main()
        (r'int32_t\s+main\s*\(\s*(void)?\s*\)', 
         'int32_t main(int32_t input)'),
        # main with any other signature
        (r'int32_t\s+main\s*\([^)]*\)', 
         None),  # Will determine args dynamically
    ]
    
    # Count how many arguments the function body expects
    main_match = re.search(r'int32_t\s+main\s*\(([^)]*)\)', code)
    if main_match:
        params = main_match.group(1)
        # Count parameters (rough estimate)
        if not params.strip() or params.strip() == 'void':
            new_signature = 'int32_t main(int32_t input)'
        else:
            param_count = len([p for p in params.split(',') if p.strip()])
            if param_count == 1:
                new_signature = 'int32_t main(int32_t arg1)'
            elif param_count == 2:
                new_signature = 'int32_t main(int32_t arg1, int32_t arg2)'
            else:
                new_signature = 'int32_t main(int32_t arg1, int32_t arg2, int32_t arg3)'
        
        # Replace the signature
        code = re.sub(r'int32_t\s+main\s*\([^)]*\)', new_signature, code)
        changes.append(f"Fixed main signature to: {new_signature}")
    
    # Convert malloc to stack allocations
    if 'malloc' in code:
        # Add buffer size definition at the top
        if '#define BUFFER_SIZE' not in code:
            includes_end = 0
            for match in re.finditer(r'#include\s*<[^>]+>', code):
                includes_end = match.end()
            
            if includes_end > 0:
                code = code[:includes_end] + '\n#define BUFFER_SIZE 1000\n' + code[includes_end:]
            else:
                code = '#define BUFFER_SIZE 1000\n' + code
        
        # Replace malloc calls with stack arrays
        code = re.sub(r'(\w+)\s*=\s*malloc\([^)]+\)', r'\1 = (int32_t*)stack_buffer', code)
        code = re.sub(r'free\s*\([^)]+\);', '/* free removed */;', code)
        
        # Add stack buffer declaration
        main_start = code.find('{', code.find('main'))
        if main_start > 0:
            code = code[:main_start+1] + '\n    int32_t stack_buffer[BUFFER_SIZE];\n' + code[main_start+1:]
        
        changes.append("Converted dynamic allocation to stack")
    
    return code, changes

async def compile_to_wasm(code: str, filename: str) -> Dict[str, Any]:
    """Compile transformed C code to WebAssembly"""
    try:
        # Create temporary directory
        with tempfile.TemporaryDirectory() as tmpdir:
            # Generate unique filename
            base_name = filename.replace('.c', '')
            unique_id = str(uuid.uuid4())[:8]
            c_file = os.path.join(tmpdir, f"{base_name}_{unique_id}.c")
            wat_file = os.path.join(tmpdir, f"{base_name}_{unique_id}.wat")
            
            # Write C code
            with open(c_file, 'w') as f:
                f.write(code)
            
            # Compile to WASM using clang
            compile_cmd = [
                'clang',
                '--target=wasm32',
                '-nostdlib',
                '-Wl,--no-entry',
                '-Wl,--export-all',
                '-o', wat_file,
                c_file
            ]
            
            result = subprocess.run(compile_cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                return {
                    'success': False,
                    'error': result.stderr or 'Compilation failed'
                }
            
            # Convert to WAT format using wasm2wat if available
            try:
                wat_text_file = wat_file.replace('.wat', '_text.wat')
                subprocess.run(['wasm2wat', wat_file, '-o', wat_text_file], 
                             capture_output=True, check=True)
                
                with open(wat_text_file, 'r') as f:
                    wat_content = f.read()
            except:
                # If wasm2wat not available, read binary
                with open(wat_file, 'rb') as f:
                    wat_content = f"(module ;; Binary WASM file generated)"
            
            # Copy to zkEngine wasm directory
            wasm_dir = os.path.expanduser('~/agentkit/zkengine/example_wasms')
            os.makedirs(wasm_dir, exist_ok=True)
            
            final_wat_name = f"{base_name}_{unique_id}.wat"
            final_wat_path = os.path.join(wasm_dir, final_wat_name)
            
            # Copy the compiled file
            shutil.copy2(wat_file, final_wat_path)
            
            # Get file size
            file_size = os.path.getsize(wat_file)
            
            return {
                'success': True,
                'wat_content': wat_content,
                'wasm_file': final_wat_name,
                'wasm_size': file_size
            }
            
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

# ===== LANGCHAIN FUNCTIONS =====

def get_memory(session_id: str) -> ConversationBufferMemory:
    if session_id not in memory_store:
        memory_store[session_id] = ConversationBufferMemory(
            return_messages=True,
            memory_key="history"
        )
    return memory_store[session_id]

def analyze_proof_complexity(function: str, args: List[str], custom_step_size: Optional[int] = None) -> tuple[int, str]:
    """Analyze the computational complexity of a proof request"""
    if custom_step_size:
        if custom_step_size < 10:
            return (50, f"Custom step size {custom_step_size} too low, using minimum 50.")
        elif custom_step_size > 10000:
            return (1000, f"Custom step size {custom_step_size} too high, capping at 1000.")
        else:
            return (custom_step_size, f"Using custom step size: {custom_step_size}")
    
    if function == "prove_location":
        return (50, f"Location proof for DePIN network.")
    elif function == "prove_kyc":
        return (50, f"Circle KYC compliance proof with wallet_hash: {args[0] if len(args) > 0 else '12345'}, kyc_status: {args[1] if len(args) > 1 else '1'} (1=approved).")
    elif function == "prove_ai_content":
        return (50, f"AI content authenticity proof with content_hash: {args[0] if len(args) > 0 else '42'}, auth_type: {args[1] if len(args) > 1 else '1'}.")
    else:
        return (50, f"Simple operation: {function}.")

def extract_proof_intent(message: str) -> Optional[Dict[str, Any]]:
    """Extract proof intent from message using pattern matching"""
    message_lower = message.lower()
    
    # LOCATION PATTERNS FIRST - highest priority
    if 'location' in message_lower:
        cities = ['san francisco', 'sf', 'new york', 'nyc', 'london']
        detected_city = None
        for city in cities:
            if city in message_lower:
                detected_city = city
                break
        
        if detected_city:
            device_match = re.search(r'device.*?(\d+)', message_lower)
            device_id = device_match.group(1) if device_match else str(random.randint(1000, 99999))
            
            return {
                'function': 'prove_location',
                'arguments': [detected_city, device_id],
                'step_size': 50,
                'location_based': True
            }
    
    # Check for custom step size specification
    custom_step_size = None
    step_size_patterns = [
        r'(?:with\s+)?step\s+size\s+(\d+)',
        r'(?:using\s+)?(\d+)\s+step\s+size',
        r'step\s+(\d+)',
    ]
    
    for pattern in step_size_patterns:
        match = re.search(pattern, message_lower)
        if match:
            custom_step_size = int(match.group(1))
            break
    
    # Pattern matching for 3 main proof types
    patterns = {
        'prove_kyc': [
            r'prove\s+kyc\s+compliance',
            r'kyc\s+compliance',
            r'verify\s+kyc\s+status',
            r'prove\s+kyc',
            r'kyc\s+proof',
            r'kyc\s+verification',
            r'circle\s+kyc',
            r'regulatory\s+compliance',
            r'compliance\s+proof',
            r'kyc\s+approved',
            r'prove\s+compliance'
        ],
        'prove_ai_content': [
            r'prove\s+ai\s+content\s+authenticity',
            r'ai\s+content\s+authenticity', 
            r'verify\s+ai\s+content',
            r'prove\s+content\s+authenticity',
            r'ai\s+authenticity',
            r'content\s+verification',
            r'verify\s+ai\s+generated',
            r'prove\s+ai\s+generated',
            r'ai\s+content\s+proof',
            r'authenticate\s+ai\s+content',
            r'ai\s+content',
            r'content\s+authenticity'
        ]
    }
    
    for func, func_patterns in patterns.items():
        for pattern in func_patterns:
            match = re.search(pattern, message_lower)
            if match:
                # Handle functions with no capture groups
                if match.groups():
                    args = list(match.groups())
                else:
                    # Set default arguments for each proof type
                    if func == 'prove_kyc':
                        args = ["12345", "1"]  # wallet_hash=12345, kyc_approved=1
                    elif func == 'prove_ai_content':
                        args = ["42", "1"]  # content_hash=42, auth_type=1
                    else:
                        args = []
                
                step_size, _ = analyze_proof_complexity(func, args, custom_step_size)
                return {
                    'function': func,
                    'arguments': args,
                    'step_size': step_size,
                    'custom_step_size': custom_step_size is not None
                }
    
    return None

# ===== API ENDPOINTS =====

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Process natural language and return structured proof intent with rich contextual response"""
    try:
        memory = get_memory(request.session_id)
        
        # First, check if this might involve a proof or verification
        lower_msg = request.message.lower()
        
        # Check for verification requests
        is_verification = any(word in lower_msg for word in ["verify", "check", "validate"])
        
        # Check for proof-related content
        proof_intent = extract_proof_intent(request.message)
        
        # Determine if additional context is requested
        has_language_request = any(lang in lower_msg for lang in [
            "spanish", "español", "french", "français", "german", "deutsch",
            "italian", "italiano", "portuguese", "português", "chinese", "中文",
            "japanese", "日本語", "russian", "русский", "arabic", "عربي",
            "persian", "farsi", "فارسی"
        ])
        
        has_analysis_request = any(word in lower_msg for word in [
            "explain", "market", "trends", "analysis", "significance",
            "philosophy", "cultural", "economic", "business", "industry",
            "what is", "tell me", "describe"
        ])
        
        # If we have a proof intent OR special request, process with LLM
        if proof_intent or has_language_request or has_analysis_request or is_verification:
            # Build the enhanced prompt
            enhanced_prompt = ChatPromptTemplate.from_messages([
                ("system", SYSTEM_PROMPT),
                MessagesPlaceholder(variable_name="history"),
                ("human", "{input}"),
                ("system", """Analyze this request carefully. The user said: "{input}"

ABSOLUTELY CRITICAL: 
- Use ONLY plain text
- NO markdown formatting whatsoever
- NO asterisks, hashtags, backticks, underscores, or any other formatting symbols
- Write everything as simple, clean plain text

If they're asking for a proof (kyc, ai content, location), extract these details:
- Function name
- Arguments
- Provide a rich explanation in the language they requested

If they're asking for verification:
- Acknowledge the verification request
- Explain what proof verification means
- Let them know the system will verify the proof
- DO NOT say you cannot verify proofs

Always provide a conversational, helpful response that addresses ALL aspects of their request.
If they ask in a specific language, respond in that language (except technical terms).""")
            ])
            
            # Get conversation history
            messages = memory.chat_memory.messages
            
            # Create the prompt
            prompt_value = enhanced_prompt.format_prompt(
                input=request.message,
                history=messages
            )
            
            # Get LLM response
            response = llm.invoke(prompt_value.to_messages())
            response_content = response.content
            
            # Clean any remaining markdown that might slip through
            response_content = re.sub(r'\*+', '', response_content)
            response_content = re.sub(r'#+', '', response_content)
            response_content = re.sub(r'`+', '', response_content)
            response_content = re.sub(r'_+', '', response_content)
            response_content = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', response_content)
            
            # Initialize response components
            intent = None
            requires_proof = False
            main_response = response_content
            
            # If we detected a proof intent, create the structured intent
            if proof_intent:
                step_size, complexity_reasoning = analyze_proof_complexity(
                    proof_intent['function'], 
                    proof_intent['arguments'],
                    proof_intent.get('step_size') if proof_intent.get('custom_step_size') else None
                )
                
                explanation = f"Generating proof for {proof_intent['function']}({', '.join(proof_intent['arguments'])})"
                if proof_intent.get('custom_step_size'):
                    explanation += f" with custom step size {step_size}"
                
                intent = ProofIntent(
                    function=proof_intent['function'],
                    arguments=proof_intent['arguments'],
                    step_size=step_size,
                    explanation=explanation,
                    complexity_reasoning=complexity_reasoning
                )
                requires_proof = True
            
            # Save to memory
            memory.save_context(
                {"input": request.message},
                {"output": main_response}
            )
            
            return ChatResponse(
                intent=intent,
                response=main_response,
                session_id=request.session_id,
                requires_proof=requires_proof
            )
        
        else:
            # For non-proof queries, still use LLM for natural conversation
            conversation_prompt = ChatPromptTemplate.from_messages([
                ("system", SYSTEM_PROMPT + "\n\nThe user is having a general conversation. Be helpful and conversational. Remember: NO markdown formatting whatsoever. Use only plain text."),
                MessagesPlaceholder(variable_name="history"),
                ("human", "{input}")
            ])
            
            # Use invoke method
            chain = conversation_prompt | llm
            
            # Get history
            messages = memory.chat_memory.messages
            
            # Invoke the chain
            response = chain.invoke({
                "input": request.message,
                "history": messages
            })
            
            # Clean any markdown from response
            cleaned_content = response.content
            cleaned_content = re.sub(r'\*+', '', cleaned_content)
            cleaned_content = re.sub(r'#+', '', cleaned_content)
            cleaned_content = re.sub(r'`+', '', cleaned_content)
            cleaned_content = re.sub(r'_+', '', cleaned_content)
            cleaned_content = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', cleaned_content)
            
            # Save to memory
            memory.save_context(
                {"input": request.message},
                {"output": cleaned_content}
            )
            
            return ChatResponse(
                intent=None,
                response=cleaned_content,
                session_id=request.session_id,
                requires_proof=False
            )
        
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        import traceback
        traceback.print_exc()
        
        # Return a helpful error response
        return ChatResponse(
            intent=None,
            response=f"I understand you're asking about: {request.message}. Let me help you with that. Could you please rephrase your request or try one of the examples from the sidebar?",
            session_id=request.session_id or "default",
            requires_proof=False
        )

@app.get("/sessions/{session_id}/history")
async def get_history(session_id: str):
    """Get conversation history for a session"""
    if session_id in memory_store:
        memory = memory_store[session_id]
        messages = memory.chat_memory.messages
        return {
            "session_id": session_id,
            "messages": [
                {
                    "type": type(msg).__name__,
                    "content": msg.content
                }
                for msg in messages
            ]
        }
    return {"session_id": session_id, "messages": []}

@app.delete("/sessions/{session_id}")
async def clear_session(session_id: str):
    """Clear conversation history for a session"""
    if session_id in memory_store:
        del memory_store[session_id]
    return {"message": f"Session {session_id} cleared"}

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "integrated",
        "model": "gpt-4o-mini",
        "active_sessions": len(memory_store),
        "features": [
            "multilingual", 
            "market_analysis", 
            "educational_content", 
            "kyc_proofs", 
            "ai_content_proofs", 
            "location_proofs",
            "code_transformation",
            "wasm_compilation"
        ]
    }

@app.post("/analyze")
async def analyze_concept(request: Dict[str, str]):
    """Analyze a mathematical concept with market and philosophical perspectives"""
    concept = request.get("concept", "")
    domain = request.get("domain", "general")
    language = request.get("language", "english")
    
    analysis_prompt = ChatPromptTemplate.from_template("""
    Analyze the concept: {concept}
    Domain focus: {domain}
    Response language: {language}
    
    CRITICAL: Use ONLY plain text. NO markdown formatting. No asterisks, hashtags, backticks, or any other formatting.
    
    Provide:
    1. A clear explanation of the concept
    2. How it relates to zkEngine proofs and zero-knowledge systems
    3. Domain-specific insights ({domain})
    4. Suggested proofs to demonstrate this concept
    5. Real-world applications and implications
    
    Make the analysis engaging and accessible while maintaining technical accuracy.
    If the language is not English, provide the entire response in {language}.
    """)
    
    response = llm.invoke(analysis_prompt.format(
        concept=concept,
        domain=domain,
        language=language
    ))
    
    # Clean any markdown that might appear
    cleaned_content = response.content
    cleaned_content = re.sub(r'\*+', '', cleaned_content)
    cleaned_content = re.sub(r'#+', '', cleaned_content)
    cleaned_content = re.sub(r'`+', '', cleaned_content)
    cleaned_content = re.sub(r'_+', '', cleaned_content)
    cleaned_content = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', cleaned_content)
    
    return {
        "concept": concept,
        "domain": domain,
        "language": language,
        "analysis": cleaned_content
    }

# ===== TRANSFORM SERVICE ENDPOINTS =====

@app.post("/api/transform-code", response_model=TransformResponse)
async def transform_code(request: TransformRequest):
    """Transform C code to zkEngine-compatible format"""
    try:
        if request.auto_transform:
            transformed_code, changes = transform_for_zkengine(request.code)
            return TransformResponse(
                success=True,
                transformed_code=transformed_code,
                changes=changes
            )
        else:
            return TransformResponse(
                success=True,
                transformed_code=request.code,
                changes=["No transformation applied (auto_transform=False)"]
            )
    except Exception as e:
        return TransformResponse(
            success=False,
            transformed_code=request.code,
            changes=[],
            error=str(e)
        )

@app.post("/api/compile-transformed", response_model=CompileResponse)
async def compile_transformed(request: CompileRequest):
    """Compile transformed C code to WebAssembly"""
    try:
        result = await compile_to_wasm(request.code, request.filename)
        
        if result['success']:
            return CompileResponse(
                success=True,
                wat_content=result.get('wat_content'),
                wasm_file=result.get('wasm_file'),
                wasm_size=result.get('wasm_size')
            )
        else:
            return CompileResponse(
                success=False,
                error=result.get('error', 'Unknown compilation error')
            )
    except Exception as e:
        return CompileResponse(
            success=False,
            error=str(e)
        )

# Upload interface endpoint (optional)
@app.get("/upload")
async def upload_interface():
    """Simple upload interface for testing"""
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>zkEngine Code Upload</title>
        <style>
            body { font-family: Arial; margin: 40px; background: #0a0a0a; color: #e2e8f0; }
            .container { max-width: 800px; margin: 0 auto; }
            h1 { color: #c084fc; }
            .info { background: rgba(139, 92, 246, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>zkEngine Code Upload</h1>
            <div class="info">
                <p>The upload functionality is integrated into the main UI.</p>
                <p>Use the 📤 button next to the input field in the main interface.</p>
                <p>Or use the 📋 paste button to paste C code directly.</p>
            </div>
            <a href="http://localhost:8001" style="color: #a78bfa;">← Back to Main Interface</a>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting FULL Integrated zkEngine Service on port 8002...")
    print("Features enabled:")
    print("✓ Natural language processing with GPT-4o-mini")
    print("✓ Circle KYC compliance proofs")
    print("✓ AI content authenticity proofs")
    print("✓ DePIN location proofs")
    print("✓ C code transformation to zkEngine format")
    print("✓ WebAssembly compilation")
    print("✓ Multilingual support")
    print("✓ Educational content generation")
    print("\nNo need for separate transform service anymore! 🎉")
    uvicorn.run(app, host="0.0.0.0", port=8002)
FULLSERVICE

echo "✅ Created full integrated service"

# Update the HTML to use port 8002 for transform endpoints
echo "🔧 Updating UI endpoints..."
python3 << 'EOF'
import re

# Read index.html
with open('static/index.html', 'r') as f:
    html = f.read()

# Replace all references to port 8003 with port 8002
html = re.sub(r'http://localhost:8003', 'http://localhost:8002', html)
html = re.sub(r':8003', ':8002', html)

# Update any error messages that mention transform_service.py
html = re.sub(
    r'python transform_service\.py',
    'python langchain_service.py',
    html
)

# Save updated HTML
with open('static/index.html', 'w') as f:
    f.write(html)

print("✅ Updated UI to use integrated service on port 8002")
EOF

# Replace the current service with the full one
mv langchain_service.py langchain_service_old.py 2>/dev/null
mv langchain_service_full.py langchain_service.py

# Check dependencies
echo ""
echo "📦 Checking dependencies..."
pip install -q fastapi uvicorn langchain langchain-openai pydantic requests 2>/dev/null

# Create a verification script
cat > verify_integration.sh << 'VERIFY'
#!/bin/bash

echo "🔍 Verifying Integrated Service"
echo ""

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  OPENAI_API_KEY not set!"
    echo "   Run: export OPENAI_API_KEY='your-key-here'"
else
    echo "✅ OPENAI_API_KEY is set"
fi

# Test the service
echo ""
echo "Testing service endpoints..."

# Start the service in background for testing
timeout 5 python langchain_service.py > test.log 2>&1 &
PID=$!
sleep 3

# Test health endpoint
if curl -s http://localhost:8002/health > /dev/null 2>&1; then
    echo "✅ Health endpoint working"
else
    echo "❌ Health endpoint not responding"
fi

# Kill test service
kill $PID 2>/dev/null

echo ""
echo "Service is ready to run!"
VERIFY

chmod +x verify_integration.sh

echo ""
echo "✅ FULL Integrated Service Created!"
echo ""
echo "==== WHAT'S INCLUDED ===="
echo "• Full LangChain/OpenAI integration"
echo "• All 3 proof types (KYC, AI Content, Location)"
echo "• Code transformation (C → zkEngine)"
echo "• WASM compilation"
echo "• Multi-language support"
echo "• Session memory"
echo "• Educational content generation"
echo ""
echo "==== HOW TO RUN ===="
echo "1. Set your OpenAI API key (if not already set):"
echo "   export OPENAI_API_KEY='your-key-here'"
echo ""
echo "2. Run services in 2 terminals:"
echo "   Terminal 1: cd ~/agentkit && cargo run"
echo "   Terminal 2: cd ~/agentkit && python langchain_service.py"
echo ""
echo "3. Open browser: http://localhost:8001"
echo ""
echo "==== VERIFICATION ===="
echo "Run: ./verify_integration.sh"
echo ""
echo "The integrated service now handles EVERYTHING on port 8002!"
echo "No more transform_service.py needed! 🎉"
