# langchain_service.py - Enhanced Natural Language + Proof Generation
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
import os
from datetime import datetime
import json
import re

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
    function: str = Field(description="The proof function to call: fibonacci, add, multiply, factorial, is_even, square, max, count_until")
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
    temperature=0.7,  # Increased for more creative responses
    api_key=api_key
)

# Parser for structured output
parser = PydanticOutputParser(pydantic_object=ProofIntent)

# Memory storage per session
memory_store: Dict[str, ConversationBufferMemory] = {}

# Enhanced system prompt with multilingual and analytical capabilities
SYSTEM_PROMPT = """You are an intelligent assistant for zkEngine, a zero-knowledge proof system. 
Your role is to help users generate cryptographic proofs for various computations AND provide rich, contextual explanations in any language requested.

IMPORTANT: Do NOT use any markdown formatting in your responses. No asterisks for bold, no hashtags for headers, no backticks for code. Use plain text only.

Available proof functions:
1. fibonacci(n) - Prove the nth Fibonacci number
2. add(a, b) - Prove addition of two numbers  
3. multiply(a, b) - Prove multiplication
4. factorial(n) - Prove factorial computation
5. is_even(n) - Prove whether a number is even/odd
6. square(n) - Prove squaring operation
7. max(a, b) - Prove the maximum of two numbers
8. count_until(n) - Prove counting sequence up to n

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

When users request proofs with additional context (e.g., "prove fibonacci 5 and explain it in Spanish"), you should:
1. Generate the proof intent
2. Provide the explanation in the requested language
3. Add relevant insights, analogies, or connections to broader topics

Step size guidelines:
- Simple operations (add, multiply, is_even, square, max): 50 steps
- Medium complexity (factorial < 10, fibonacci < 15): 50 steps  
- High complexity (factorial >= 10, fibonacci >= 15): 100 steps

Remember: 
- You can respond in any language and connect proofs to any domain of knowledge
- Always use plain text without any formatting symbols
- For verification requests, acknowledge and explain the process"""

# Function to get or create memory for a session
def get_memory(session_id: str) -> ConversationBufferMemory:
    if session_id not in memory_store:
        memory_store[session_id] = ConversationBufferMemory(
            return_messages=True,
            memory_key="history"
        )
    return memory_store[session_id]

# Enhanced complexity analyzer
def analyze_proof_complexity(function: str, args: List[str]) -> str:
    """Analyze the computational complexity of a proof request"""
    try:
        if function == "fibonacci":
            n = int(args[0])
            if n > 20:
                return f"High complexity: Fibonacci({n}) requires many recursive calls. Recommended: 100 step size."
            elif n > 15:
                return f"Medium-high complexity: Fibonacci({n}). Recommended: 100 step size."
            else:
                return f"Low complexity: Fibonacci({n}). Recommended: 50 step size."
        elif function == "factorial":
            n = int(args[0])
            if n > 10:
                return f"High complexity: Factorial({n}). Recommended: 100 step size."
            else:
                return f"Low complexity: Factorial({n}). Recommended: 50 step size."
        else:
            return f"Simple operation: {function}. Recommended: 50 step size."
    except:
        return "Unable to analyze complexity. Using default 50 step size."

# Extract proof intent from natural language
def extract_proof_intent(message: str) -> Optional[Dict[str, Any]]:
    """Extract proof intent from message using pattern matching"""
    message_lower = message.lower()
    
    # Pattern matching for different functions
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
                return {
                    'function': func,
                    'arguments': args,
                    'step_size': 50 if func != 'fibonacci' or int(args[0]) < 15 else 100
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

CRITICAL: Do NOT use any markdown formatting. No asterisks, no hashtags, no backticks. Use plain text only.

If they're asking for a proof (like fibonacci, factorial, etc), extract these details:
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

For example:
- "prove fib of 3 and explain to me in persian" → Generate proof AND explain in Persian
- "verify 29b46cdf" → Acknowledge verification request and explain the process
- "what is hello in persian?" → Just answer the question""")
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
            
            # Initialize response components
            intent = None
            requires_proof = False
            main_response = response_content
            
            # If we detected a proof intent, create the structured intent
            if proof_intent:
                intent = ProofIntent(
                    function=proof_intent['function'],
                    arguments=proof_intent['arguments'],
                    step_size=proof_intent['step_size'],
                    explanation=f"Generating proof for {proof_intent['function']}({', '.join(proof_intent['arguments'])})",
                    complexity_reasoning=analyze_proof_complexity(proof_intent['function'], proof_intent['arguments'])
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
                ("system", SYSTEM_PROMPT + "\n\nThe user is having a general conversation. Be helpful and conversational. Remember: NO markdown formatting."),
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
            
            # Save to memory
            memory.save_context(
                {"input": request.message},
                {"output": response.content}
            )
            
            return ChatResponse(
                intent=None,
                response=response.content,
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
        "features": ["multilingual", "market_analysis", "educational_content"]
    }

@app.post("/analyze")
async def analyze_concept(request: Dict[str, str]):
    """Analyze a mathematical concept with market and philosophical perspectives"""
    concept = request.get("concept", "")
    domain = request.get("domain", "general")  # math, market, philosophy, etc.
    language = request.get("language", "english")
    
    analysis_prompt = ChatPromptTemplate.from_template("""
    Analyze the concept: {concept}
    Domain focus: {domain}
    Response language: {language}
    
    IMPORTANT: Do NOT use any markdown formatting in your response. No asterisks, no hashtags, no backticks.
    
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
    
    return {
        "concept": concept,
        "domain": domain,
        "language": language,
        "analysis": response.content
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Enhanced zkEngine LangChain Service on port 8002...")
    print("Features enabled:")
    print("✓ Multilingual support")
    print("✓ Market and business analysis")
    print("✓ Educational content generation")
    print("✓ Philosophical perspectives")
    print("✓ Combined proof + natural language responses")
    print("✓ Verification request handling")
    print("✓ Plain text responses (no markdown)")
    uvicorn.run(app, host="0.0.0.0", port=8002)
