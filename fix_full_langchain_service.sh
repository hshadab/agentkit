#!/bin/bash
# Complete fix for the full LangChain service

echo "🔧 Fixing the full LangChain service..."

# Create the corrected langchain_service.py
cat > langchain_service.py << 'EOF'
# langchain_service.py - Enhanced Natural Language + Proof Generation with Location Support
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
import os
from datetime import datetime
import json
import re
import random

from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.output_parsers import PydanticOutputParser
from langchain.memory import ConversationBufferMemory
from langchain.schema import SystemMessage, HumanMessage, AIMessage
from langchain.chains import LLMChain
from langchain.schema.runnable import RunnablePassthrough

app = FastAPI(title="zkEngine LangChain Service")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class ProofIntent(BaseModel):
    """Structured output for proof generation intent"""
    function: str = Field(description="The proof function to call: prove_location, fibonacci, add, multiply, factorial, is_even, square, max, count_until")
    arguments: List[str] = Field(description="Arguments for the function as strings")
    step_size: int = Field(description="Computation steps: 50 for simple, 100 for complex")
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

# Enhanced system prompt with location capabilities
SYSTEM_PROMPT = """You are an intelligent assistant for zkEngine, a zero-knowledge proof system. 
Your role is to help users generate cryptographic proofs for various computations AND provide rich, contextual explanations in any language requested.

CRITICAL FORMATTING RULES:
- NEVER use markdown formatting of any kind
- NO asterisks (*) for emphasis
- NO hashtags (#) for headers  
- NO backticks (`) for code
- NO underscores (_) for emphasis
- NO brackets [] or parentheses () for links
- Use ONLY plain text in all responses

Available proof functions:
1. prove_location(city, device_id) - Prove device location within city boundaries (San Francisco, New York, London)
2. fibonacci(n) - Prove the nth Fibonacci number
3. add(a, b) - Prove addition of two numbers  
4. multiply(a, b) - Prove multiplication
5. factorial(n) - Prove factorial computation
6. is_even(n) - Prove whether a number is even/odd
7. square(n) - Prove squaring operation
8. max(a, b) - Prove the maximum of two numbers
9. count_until(n) - Prove counting sequence up to n

LOCATION PROOF EXAMPLES:
- "prove device location in San Francisco" → Generate GPS location proof for SF
- "verify GPS coordinates within New York" → Prove device is in NYC boundaries
- "prove London location for device 12345" → Location proof with specific device ID

When users request location proofs, you should:
1. Generate the proof intent with prove_location function
2. Explain the DePIN (Decentralized Physical Infrastructure) use case
3. Describe how location is verified without revealing exact coordinates
4. Mention token rewards based on coverage areas

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
- Cultural perspectives on mathematical concepts

When users request verification (e.g., "verify 29b46cdf"), you should:
1. Acknowledge that you're processing their verification request
2. Explain what proof verification means in the zkEngine context
3. Let them know the system will check the cryptographic validity of the proof
4. Provide educational context about zero-knowledge proofs if appropriate

Step Size Information:
- Step size controls the computational chunk size for proof generation
- Default step sizes are automatically selected based on complexity:
  * Simple operations (add, multiply, is_even, square, max): 50
  * Medium complexity (factorial < 10, fibonacci < 15): 50  
  * High complexity (factorial >= 10, fibonacci >= 15): 100
- Users can optionally specify custom step sizes (e.g., "with step size 200")
- Higher step sizes allow more complex computations but take longer
- Lower step sizes are faster but may fail for complex operations

Remember: 
- You can respond in any language and connect proofs to any domain of knowledge
- Always use plain text without any formatting symbols
- For verification requests, acknowledge and explain the process
- Keep responses conversational and helpful"""

# Function to get or create memory for a session
def get_memory(session_id: str) -> ConversationBufferMemory:
    if session_id not in memory_store:
        memory_store[session_id] = ConversationBufferMemory(
            return_messages=True,
            memory_key="history"
        )
    return memory_store[session_id]

# Enhanced complexity analyzer
def analyze_proof_complexity(function: str, args: List[str], custom_step_size: Optional[int] = None) -> tuple[int, str]:
    """Analyze the computational complexity of a proof request"""
    if custom_step_size:
        # Validate custom step size
        if custom_step_size < 10:
            return (50, f"Custom step size {custom_step_size} too low, using minimum 50.")
        elif custom_step_size > 10000:
            return (1000, f"Custom step size {custom_step_size} too high, capping at 1000.")
        else:
            return (custom_step_size, f"Using custom step size: {custom_step_size}")
    
    try:
        if function == "fibonacci":
            n = int(args[0])
            if n > 20:
                return (100, f"High complexity: Fibonacci({n}) requires many recursive calls.")
            elif n > 15:
                return (100, f"Medium-high complexity: Fibonacci({n}).")
            else:
                return (50, f"Low complexity: Fibonacci({n}).")
        elif function == "factorial":
            n = int(args[0])
            if n > 10:
                return (100, f"High complexity: Factorial({n}).")
            else:
                return (50, f"Low complexity: Factorial({n}).")
        elif function == "prove_location":
            return (50, f"Location proof for DePIN network.")
        else:
            return (50, f"Simple operation: {function}.")
    except:
        return (50, "Unable to analyze complexity. Using default step size 50.")

# Extract proof intent from natural language with location support
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
            # Look for device ID
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
    
    # Pattern matching for mathematical functions
    patterns = {
        'fibonacci': [
            r'fibonacci\s+(?:of\s+)?(\d+)',
            r'fib\s+(?:of\s+)?(\d+)',
            r'fib\((\d+)\)',
            r'(\d+)(?:th|st|nd|rd)?\s+fibonacci',
            r'prove\s+(?:the\s+)?fib\s+(?:of\s+)?(\d+)',
            r'prove\s+fibonacci\s+(\d+)'
        ],
        'add': [
            r'add\s+(\d+)\s+(?:and|to|\+)\s+(\d+)',
            r'(\d+)\s*\+\s*(\d+)',
            r'sum\s+(?:of\s+)?(\d+)\s+and\s+(\d+)',
            r'(\d+)\s+plus\s+(\d+)',
            r'prove\s+add\s+(\d+)\s+(?:and|to)\s+(\d+)'
        ],
        'multiply': [
            r'multiply\s+(\d+)\s+(?:by|and|with|\*|times)\s+(\d+)',
            r'(\d+)\s*\*\s*(\d+)',
            r'(\d+)\s+times\s+(\d+)',
            r'product\s+(?:of\s+)?(\d+)\s+and\s+(\d+)',
            r'prove\s+multiply\s+(\d+)\s+(?:by|times)\s+(\d+)'
        ],
        'factorial': [
            r'factorial\s+(?:of\s+)?(\d+)',
            r'(\d+)!',
            r'(\d+)\s+factorial',
            r'prove\s+factorial\s+(?:of\s+)?(\d+)'
        ],
        'is_even': [
            r'(?:is\s+)?(\d+)\s+even',
            r'even\s+(\d+)',
            r'parity\s+(?:of\s+)?(\d+)',
            r'(?:prove\s+)?(?:that\s+)?(\d+)\s+is\s+even'
        ],
        'square': [
            r'square\s+(?:of\s+)?(\d+)',
            r'(\d+)\s+squared',
            r'(\d+)\^2',
            r'(\d+)\s*\*\*\s*2',
            r'prove\s+square\s+(?:of\s+)?(\d+)'
        ],
        'max': [
            r'max(?:imum)?\s+(?:of\s+)?(\d+)\s+and\s+(\d+)',
            r'maximum\s+between\s+(\d+)\s+and\s+(\d+)',
            r'larger\s+(?:of\s+)?(\d+)\s+(?:and|or)\s+(\d+)',
            r'prove\s+max\s+(?:of\s+)?(\d+)\s+and\s+(\d+)'
        ],
        'count_until': [
            r'count\s+(?:until|to|up\s+to)\s+(\d+)',
            r'counting\s+(?:to|until)\s+(\d+)',
            r'sum\s+(?:from\s+)?1\s+to\s+(\d+)',
            r'prove\s+count\s+(?:until|to)\s+(\d+)'
        ]
    }
    
    for func, func_patterns in patterns.items():
        for pattern in func_patterns:
            match = re.search(pattern, message_lower)
            if match:
                args = list(match.groups())
                step_size, _ = analyze_proof_complexity(func, args, custom_step_size)
                return {
                    'function': func,
                    'arguments': args,
                    'step_size': step_size,
                    'custom_step_size': custom_step_size is not None
                }
    
    return None

# Enhanced chat endpoint that combines proof generation with rich responses
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

If they're asking for a proof (like fibonacci, factorial, location, etc), extract these details:
- Function name
- Arguments
- Provide a rich explanation in the language they requested

If they're asking for verification:
- Acknowledge the verification request
- Explain what proof verification means
- Let them know the system will verify the proof
- DO NOT say you cannot verify proofs

Always provide a conversational, helpful response that addresses ALL aspects of their request.
If they ask in a specific language, respond in that language (except technical terms).

For location proofs, explain DePIN networks and privacy-preserving location verification.""")
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
        "model": "gpt-4o-mini",
        "active_sessions": len(memory_store),
        "features": ["multilingual", "market_analysis", "educational_content", "location_proofs", "custom_step_size"]
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

if __name__ == "__main__":
    import uvicorn
    print("Starting Enhanced zkEngine LangChain Service on port 8002...")
    print("Features enabled:")
    print("✓ Multilingual support")
    print("✓ Market and business analysis")
    print("✓ Educational content generation")
    print("✓ Philosophical perspectives")
    print("✓ Location proof generation (DePIN)")
    print("✓ Combined proof + natural language responses")
    print("✓ Verification request handling")
    print("✓ Plain text responses (no markdown)")
    print("✓ Custom step size support")
    uvicorn.run(app, host="0.0.0.0", port=8002)
EOF

echo ""
echo "✅ Created fully corrected langchain_service.py"
echo ""
echo "🔧 Fixed issues:"
echo "   • Syntax error on line 270 (broken dictionary)"
echo "   • Added proper location detection with highest priority"
echo "   • Fixed analyze_proof_complexity function to return tuple"
echo "   • Added random import for device ID generation"
echo "   • Updated system prompt with location capabilities"
echo "   • Preserved all advanced AI features"
echo ""
echo "🚀 Start the service:"
echo "   python langchain_service.py"
echo ""
echo "🧪 Test with:"
echo "   • 'prove device location in San Francisco'"
echo "   • 'prove fibonacci of 20 and explain in Spanish'"
echo "   • 'verify the last proof'"
