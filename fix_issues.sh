#!/bin/bash

# Fix both the transform service and UI display issues

cd ~/agentkit

# 1. Fix transform_service.py
echo "🔧 Fixing transform_service.py compilation issues..."
python3 << 'EOF'
import re

# Read the current transform_service.py
with open('transform_service.py', 'r') as f:
    content = f.read()

# Replace the transform_for_zkengine function with a fixed version
new_transform_function = '''def transform_for_zkengine(code):
    """Auto-transforms normal C to zkEngine-compatible code"""
    changes = []
    
    # Type conversions
    code = re.sub(r'\\bint\\s+', 'int32_t ', code)
    code = re.sub(r'\\bfloat\\s+', 'int32_t ', code)
    changes.append("Converted int/float to int32_t")
    
    # Remove I/O operations
    if 'printf' in code:
        code = re.sub(r'printf\\s*\\([^;]+\\);', '/* printf removed */;', code)
        changes.append("Removed printf statements")
    
    if 'scanf' in code:
        code = re.sub(r'scanf\\s*\\([^;]+\\);', '/* scanf removed */;', code)
        changes.append("Removed scanf statements")
    
    # CRITICAL: Fix main function signatures for zkEngine
    # Handle standard C main signatures
    main_patterns = [
        # main(int argc, char **argv) or main(int argc, char *argv[])
        (r'int32_t\\s+main\\s*\\(\\s*int32_t\\s+\\w+\\s*,\\s*char\\s*\\*\\*?\\s*\\w+\\[?\\]?\\s*\\)', 
         None),  # Will determine args dynamically
        # main(void) or main()
        (r'int32_t\\s+main\\s*\\(\\s*(void)?\\s*\\)', 
         'int32_t main(int32_t input)'),
        # main with any other signature
        (r'int32_t\\s+main\\s*\\([^)]*\\)', 
         None),  # Will determine args dynamically
    ]
    
    # Count how many arguments the function body expects
    main_match = re.search(r'int32_t\\s+main\\s*\\(([^)]*)\\)', code)
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
        code = re.sub(r'int32_t\\s+main\\s*\\([^)]*\\)', new_signature, code)
        changes.append(f"Fixed main signature to: {new_signature}")
    
    # Convert malloc to stack allocations
    if 'malloc' in code:
        # Add buffer size definition at the top
        if '#define BUFFER_SIZE' not in code:
            includes_end = 0
            for match in re.finditer(r'#include\\s*<[^>]+>', code):
                includes_end = match.end()
            
            if includes_end > 0:
                code = code[:includes_end] + '\\n#define BUFFER_SIZE 1000\\n' + code[includes_end:]
            else:
                code = '#define BUFFER_SIZE 1000\\n' + code
        
        # Replace malloc calls with stack arrays
        code = re.sub(r'(\\w+)\\s*=\\s*malloc\\([^)]+\\)', r'\\1 = (int32_t*)stack_buffer', code)
        code = re.sub(r'free\\s*\\([^)]+\\);', '/* free removed */;', code)
        
        # Add stack buffer declaration
        main_start = code.find('{', code.find('main'))
        if main_start > 0:
            code = code[:main_start+1] + '\\n    int32_t stack_buffer[BUFFER_SIZE];\\n' + code[main_start+1:]
        
        changes.append("Converted dynamic allocation to stack")
    
    return code, changes'''

# Find and replace the transform_for_zkengine function
pattern = r'def transform_for_zkengine\(code\):.*?(?=\ndef|\nclass|\Z)'
content = re.sub(pattern, new_transform_function, content, flags=re.DOTALL)

# Save the updated file
with open('transform_service.py', 'w') as f:
    f.write(content)

print("✅ Fixed transform_service.py")
EOF

# 2. Fix UI to show human-readable labels
echo "🎨 Adding human-readable labels to UI..."
python3 << 'EOF'
import re

with open('static/index.html', 'r') as f:
    html = f.read()

# Add the display mappings and formatting function
display_functions = '''
        // Human-readable display mappings
        const PROOF_LABELS = {
            location: {
                '1': 'San Francisco',
                '2': 'New York', 
                '3': 'London'
            },
            kyc: {
                '1': 'Approved ✅',
                '0': 'Pending ⏳',
                '-1': 'Rejected ❌'
            },
            ai_auth: {
                '1': 'Digital Signature',
                '2': 'Content Hash',
                '3': 'Full Verification'
            }
        };
        
        // Format proof arguments for human-readable display
        function formatProofDisplay(functionName, args) {
            const argsArray = typeof args === 'string' ? args.split(', ') : args;
            
            switch(functionName.toLowerCase()) {
                case 'location':
                case 'prove_location':
                    const city = PROOF_LABELS.location[argsArray[0]] || 
                                argsArray[0].charAt(0).toUpperCase() + argsArray[0].slice(1);
                    const device = argsArray[1] || 'auto';
                    return `City: ${city}, Device ID: ${device}`;
                    
                case 'kyc':
                case 'prove_kyc':
                    const wallet = argsArray[0] || '0000';
                    const status = PROOF_LABELS.kyc[argsArray[1]] || 'Unknown';
                    return `Wallet Hash: ...${String(wallet).slice(-4)}, Status: ${status}`;
                    
                case 'ai content':
                case 'prove_ai_content':
                    const content = argsArray[0] || '0';
                    const auth = PROOF_LABELS.ai_auth[argsArray[1]] || 'Standard';
                    return `Content ID: ${content}, Auth: ${auth}`;
                    
                default:
                    return argsArray.join(', ');
            }
        }
'''

# Insert the display functions after getCCode function
if 'function formatProofDisplay' not in html:
    insert_point = html.find('function getCCode(wasmFile) {')
    if insert_point > 0:
        # Find the end of getCCode function
        brace_count = 0
        for i in range(insert_point, len(html)):
            if html[i] == '{':
                brace_count += 1
            elif html[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    html = html[:i+1] + '\\n' + display_functions + html[i+1:]
                    break

# Update createProofCard to use formatted display
create_pattern = r'(<span class="metric-label-inline">Function:</span>\\s*<span class="metric-value-inline">)\\$\\{functionName\\}\\(\\$\\{args\\}\\)(</span>)'
create_replacement = r'\\1${functionName}</span>\\n                    </div>\\n                    <div class="metric-item-inline">\\n                        <span class="metric-label-inline">Arguments:</span>\\n                        <span class="metric-value-inline">${formatProofDisplay(functionName, args)}\\2'
html = re.sub(create_pattern, create_replacement, html)

# Update updateProofCard similarly
update_pattern = create_pattern
html = re.sub(update_pattern, create_replacement, html)

# Save the updated HTML
with open('static/index.html', 'w') as f:
    f.write(html)

print("✅ Added human-readable labels to UI")
print("\\n📊 Display mappings added:")
print("  - Location: 1→San Francisco, 2→New York, 3→London")
print("  - KYC Status: 1→Approved ✅, 0→Pending ⏳, -1→Rejected ❌")
print("  - AI Auth: 1→Digital Signature, 2→Content Hash, 3→Full Verification")
EOF

echo ""
echo "✅ All fixes applied!"
echo ""
echo "🚀 Next steps:"
echo "1. Restart transform service: pkill -f transform_service.py && python transform_service.py"
echo "2. Refresh your browser"
echo ""
echo "The paste functionality should now:"
echo "- Properly compile C code with standard main() signatures"
echo "- Display human-readable labels instead of numeric codes"
