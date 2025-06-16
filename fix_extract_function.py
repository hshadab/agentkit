import re

# Read the file
with open('langchain_service.py', 'r') as f:
    content = f.read()

# Find and replace the entire extract_proof_intent function
old_function = r'def extract_proof_intent\(message: str\) -> Optional\[Dict\[str, Any\]\]:[\s\S]*?return None'

new_function = '''def extract_proof_intent(message: str) -> Optional[Dict[str, Any]]:
    """Extract proof intent from message using pattern matching"""
    message_lower = message.lower()
    
    # First check for custom step size specification
    custom_step_size = None
    step_size_patterns = [
        r'(?:with\\s+)?step\\s+size\\s+(\\d+)',
        r'(?:using\\s+)?(\\d+)\\s+step\\s+size',
        r'step\\s+(\\d+)',
    ]
    
    for pattern in step_size_patterns:
        match = re.search(pattern, message_lower)
        if match:
            custom_step_size = int(match.group(1))
            break
    
    # Pattern matching for different functions
    patterns = {
        'fibonacci': [
            r'fibonacci\\s+(?:of\\s+)?(\\d+)',
            r'fib\\s+(?:of\\s+)?(\\d+)',
            r'fib\\((\\d+)\\)',
            r'(\\d+)(?:th|st|nd|rd)?\\s+fibonacci',
            r'prove\\s+(?:the\\s+)?fib\\s+(?:of\\s+)?(\\d+)',
            r'prove\\s+fibonacci\\s+(\\d+)'
        ],
        'add': [
            r'add\\s+(\\d+)\\s+(?:and|to|\\+)\\s+(\\d+)',
            r'(\\d+)\\s*\\+\\s*(\\d+)',
            r'sum\\s+(?:of\\s+)?(\\d+)\\s+and\\s+(\\d+)',
            r'(\\d+)\\s+plus\\s+(\\d+)',
            r'prove\\s+add\\s+(\\d+)\\s+(?:and|to)\\s+(\\d+)'
        ],
        'multiply': [
            r'multiply\\s+(\\d+)\\s+(?:by|and|with|\\*|times)\\s+(\\d+)',
            r'(\\d+)\\s*\\*\\s*(\\d+)',
            r'(\\d+)\\s+times\\s+(\\d+)',
            r'product\\s+(?:of\\s+)?(\\d+)\\s+and\\s+(\\d+)',
            r'prove\\s+multiply\\s+(\\d+)\\s+(?:by|times)\\s+(\\d+)'
        ],
        'factorial': [
            r'factorial\\s+(?:of\\s+)?(\\d+)',
            r'(\\d+)!',
            r'(\\d+)\\s+factorial',
            r'prove\\s+factorial\\s+(?:of\\s+)?(\\d+)'
        ],
        'is_even': [
            r'(?:is\\s+)?(\\d+)\\s+even',
            r'even\\s+(\\d+)',
            r'parity\\s+(?:of\\s+)?(\\d+)',
            r'(?:prove\\s+)?(?:that\\s+)?(\\d+)\\s+is\\s+even'
        ],
        'square': [
            r'square\\s+(?:of\\s+)?(\\d+)',
            r'(\\d+)\\s+squared',
            r'(\\d+)\\^2',
            r'(\\d+)\\s*\\*\\*\\s*2',
            r'prove\\s+square\\s+(?:of\\s+)?(\\d+)'
        ],
        'max': [
            r'max(?:imum)?\\s+(?:of\\s+)?(\\d+)\\s+and\\s+(\\d+)',
            r'maximum\\s+between\\s+(\\d+)\\s+and\\s+(\\d+)',
            r'larger\\s+(?:of\\s+)?(\\d+)\\s+(?:and|or)\\s+(\\d+)',
            r'prove\\s+max\\s+(?:of\\s+)?(\\d+)\\s+and\\s+(\\d+)'
        ],
        'count_until': [
            r'count\\s+(?:until|to|up\\s+to)\\s+(\\d+)',
            r'counting\\s+(?:to|until)\\s+(\\d+)',
            r'sum\\s+(?:from\\s+)?1\\s+to\\s+(\\d+)',
            r'prove\\s+count\\s+(?:until|to)\\s+(\\d+)'
        ]
    }
    
    for func, func_patterns in patterns.items():
        for pattern in func_patterns:
            match = re.search(pattern, message_lower)
            if match:
                args = list(match.groups())
                # Auto-calculate step size
                if func == 'fibonacci' and int(args[0]) > 15:
                    auto_step_size = 100
                elif func == 'factorial' and int(args[0]) > 10:
                    auto_step_size = 100
                else:
                    auto_step_size = 50
                
                # Use custom if provided, otherwise auto
                final_step_size = custom_step_size if custom_step_size else auto_step_size
                
                return {
                    'function': func,
                    'arguments': args,
                    'step_size': final_step_size,
                    'custom_step_size': custom_step_size is not None
                }
    
    return None'''

# Replace the function
content = re.sub(old_function, new_function, content, flags=re.DOTALL)

# Write back
with open('langchain_service.py', 'w') as f:
    f.write(content)

print("✅ Replaced extract_proof_intent function!")
print("🚀 Try running: python langchain_service.py")
