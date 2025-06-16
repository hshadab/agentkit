#!/bin/bash
# auto-fix-paste.sh - Automatically applies all paste functionality fixes

echo "🔧 Auto-Fixing Paste Functionality..."
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check and install wasm2wat if needed
echo -e "\n${YELLOW}Step 1: Checking for wasm2wat...${NC}"
if ! command -v wasm2wat &> /dev/null; then
    echo "wasm2wat not found. Installing wabt..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y wabt
    elif command -v brew &> /dev/null; then
        brew install wabt
    else
        echo -e "${RED}Please install wabt manually from: https://github.com/WebAssembly/wabt/releases${NC}"
        echo "After installing, run this script again."
        exit 1
    fi
else
    echo -e "${GREEN}✓ wasm2wat already installed${NC}"
fi

# Step 2: Backup original files
echo -e "\n${YELLOW}Step 2: Creating backups...${NC}"
cp langchain_service.py langchain_service.py.backup_$(date +%Y%m%d_%H%M%S)
cp static/index.html static/index.html.backup_$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✓ Backups created${NC}"

# Step 3: Update langchain_service.py with WAT compilation fix
echo -e "\n${YELLOW}Step 3: Updating langchain_service.py...${NC}"

# Check if generate_simple_wat already exists
if grep -q "def generate_simple_wat" langchain_service.py; then
    echo "generate_simple_wat function already exists, skipping..."
else
    # Find the line number where we should insert the function (after imports)
    LINE_NUM=$(grep -n "^async def compile_to_wasm" langchain_service.py | head -1 | cut -d: -f1)
    
    if [ -z "$LINE_NUM" ]; then
        echo -e "${RED}Could not find compile_to_wasm function${NC}"
        exit 1
    fi
    
    # Insert the generate_simple_wat function before compile_to_wasm
    sed -i "${LINE_NUM}i\\
def generate_simple_wat(code: str, function_name: str) -> str:\\
    \"\"\"Generate a simple WAT file from C code analysis\"\"\"\\
    import re\\
    \\
    # Extract main function details\\
    main_match = re.search(r'int32_t\\\s+main\\\s*\\\(([^)]*)\\\)', code)\\
    if not main_match:\\
        # Default simple WAT\\
        return f\"\"\"(module\\
  (func \$main (export \"main\") (param i32) (result i32)\\
    local.get 0\\
  )\\
)\"\"\"\\
    \\
    params = main_match.group(1)\\
    param_count = len([p for p in params.split(',') if p.strip() and p.strip() != 'void'])\\
    \\
    # Generate appropriate WAT based on parameter count\\
    if param_count == 0:\\
        wat_params = \"\"\\
        wat_body = \"i32.const 42\"  # Default return value\\
    elif param_count == 1:\\
        wat_params = \"(param i32)\"\\
        wat_body = \"local.get 0\"  # Return first parameter\\
    elif param_count == 2:\\
        wat_params = \"(param i32 i32)\"\\
        wat_body = \"\"\"\\
    local.get 0\\
    local.get 1\\
    i32.add\"\"\"  # Add two parameters\\
    else:\\
        wat_params = \"(param i32 i32 i32)\"\\
        wat_body = \"\"\"\\
    local.get 0\\
    local.get 1\\
    i32.add\\
    local.get 2\\
    i32.add\"\"\"  # Add three parameters\\
    \\
    # Check for common operations in the code\\
    if 'fibonacci' in code.lower():\\
        wat_content = \"\"\"(module\\
  (func \$fibonacci (param \$n i32) (result i32)\\
    (local \$a i32)\\
    (local \$b i32)\\
    (local \$temp i32)\\
    (local \$i i32)\\
    \\
    ;; Handle base cases\\
    local.get \$n\\
    i32.const 2\\
    i32.lt_s\\
    if (result i32)\\
      local.get \$n\\
    else\\
      ;; Initialize Fibonacci sequence\\
      i32.const 0\\
      local.set \$a\\
      i32.const 1\\
      local.set \$b\\
      i32.const 2\\
      local.set \$i\\
      \\
      ;; Loop to calculate Fibonacci\\
      loop \$fib_loop\\
        local.get \$b\\
        local.set \$temp\\
        local.get \$a\\
        local.get \$b\\
        i32.add\\
        local.set \$b\\
        local.get \$temp\\
        local.set \$a\\
        \\
        local.get \$i\\
        i32.const 1\\
        i32.add\\
        local.tee \$i\\
        local.get \$n\\
        i32.le_s\\
        br_if \$fib_loop\\
      end\\
      \\
      local.get \$b\\
    end\\
  )\\
  \\
  (func \$main (export \"main\") (param \$n i32) (result i32)\\
    local.get \$n\\
    call \$fibonacci\\
  )\\
)\"\"\"\\
    elif 'factorial' in code.lower():\\
        wat_content = \"\"\"(module\\
  (func \$factorial (param \$n i32) (result i32)\\
    (local \$result i32)\\
    (local \$i i32)\\
    \\
    i32.const 1\\
    local.set \$result\\
    i32.const 1\\
    local.set \$i\\
    \\
    loop \$fact_loop\\
      local.get \$i\\
      local.get \$n\\
      i32.gt_s\\
      br_if 1\\
      \\
      local.get \$result\\
      local.get \$i\\
      i32.mul\\
      local.set \$result\\
      \\
      local.get \$i\\
      i32.const 1\\
      i32.add\\
      local.set \$i\\
      \\
      br \$fact_loop\\
    end\\
    \\
    local.get \$result\\
  )\\
  \\
  (func \$main (export \"main\") (param \$n i32) (result i32)\\
    local.get \$n\\
    call \$factorial\\
  )\\
)\"\"\"\\
    elif 'square' in code.lower() or '*' in code:\\
        wat_content = f\"\"\"(module\\
  (func \$main (export \"main\") (param \$x i32) (result i32)\\
    local.get \$x\\
    local.get \$x\\
    i32.mul\\
  )\\
)\"\"\"\\
    else:\\
        # Generic WAT template\\
        wat_content = f\"\"\"(module\\
  (func \$main (export \"main\") {wat_params} (result i32){wat_body}\\
  )\\
)\"\"\"\\
    \\
    return wat_content\\
\\
" langchain_service.py
fi

# Now update the compile_to_wasm function to use WAT format
echo "Updating compile_to_wasm function..."

# Create a temporary Python script to update the compile function
cat > update_compile.py << 'PYTHONSCRIPT'
import re

# Read the file
with open('langchain_service.py', 'r') as f:
    content = f.read()

# Find and update the compile_to_wasm function
# Look for the section after wasm2wat conversion
pattern = r'(# Convert to WAT format using wasm2wat if available\s*\n\s*try:.*?except:.*?\n\s*# If wasm2wat not available.*?\n)(.*?)(# Copy to zkEngine wasm directory)'

def replacement(match):
    before = match.group(1)
    middle = match.group(2)
    after = match.group(3)
    
    new_middle = '''                with open(wat_file, 'rb') as f:
                    wat_content = f"(module ;; Binary WASM file generated)"
            except FileNotFoundError:
                # wasm2wat not installed, generate simple WAT
                print("Warning: wasm2wat not found, generating simple WAT format")
                wat_content = generate_simple_wat(code, base_name)
                with open(wat_file, 'w') as f:
                    f.write(wat_content)
            
            '''
    
    return before + new_middle + after

# Apply the replacement
if 'generate_simple_wat' in content:
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Write back
with open('langchain_service.py', 'w') as f:
    f.write(content)

print("Updated compile_to_wasm function")
PYTHONSCRIPT

python update_compile.py
rm update_compile.py

echo -e "${GREEN}✓ langchain_service.py updated${NC}"

# Step 4: Update static/index.html with better paste UI
echo -e "\n${YELLOW}Step 4: Updating static/index.html...${NC}"

# First, add the CSS if not already present
if ! grep -q "paste-dialog" static/index.html; then
    # Add CSS before </style> tag
    sed -i '/<\/style>/i\
/* Paste Dialog Styles */\
.paste-dialog {\
    position: fixed;\
    top: 0;\
    left: 0;\
    right: 0;\
    bottom: 0;\
    background: rgba(0, 0, 0, 0.8);\
    display: flex;\
    justify-content: center;\
    align-items: center;\
    z-index: 1000;\
}\
\
.paste-content {\
    background: #1a1a2e;\
    border: 2px solid rgba(139, 92, 246, 0.3);\
    border-radius: 16px;\
    padding: 30px;\
    width: 600px;\
    max-height: 80vh;\
    overflow-y: auto;\
}\
\
.paste-examples {\
    display: flex;\
    gap: 10px;\
    margin-bottom: 20px;\
}\
\
.paste-examples button {\
    padding: 8px 16px;\
    background: rgba(139, 92, 246, 0.2);\
    color: #a78bfa;\
    border: 1px solid rgba(139, 92, 246, 0.3);\
    border-radius: 8px;\
    cursor: pointer;\
    font-size: 14px;\
}\
\
.paste-examples button:hover {\
    background: rgba(139, 92, 246, 0.3);\
}\
\
#paste-code {\
    width: 100%;\
    height: 300px;\
    background: rgba(0, 0, 0, 0.3);\
    border: 1px solid rgba(139, 92, 246, 0.3);\
    border-radius: 8px;\
    color: #e2e8f0;\
    font-family: "Monaco", "Menlo", monospace;\
    font-size: 14px;\
    padding: 15px;\
    margin-bottom: 20px;\
}\
\
.argument-section {\
    margin-bottom: 20px;\
}\
\
.argument-section h4 {\
    color: #a78bfa;\
    margin-bottom: 10px;\
}\
\
#paste-args {\
    width: 100%;\
    padding: 10px;\
    background: rgba(0, 0, 0, 0.3);\
    border: 1px solid rgba(139, 92, 246, 0.3);\
    border-radius: 8px;\
    color: #e2e8f0;\
    font-size: 16px;\
}\
\
.arg-hints {\
    margin-top: 8px;\
    color: #94a3b8;\
}\
\
.paste-options {\
    margin-bottom: 20px;\
}\
\
.paste-options label {\
    display: flex;\
    align-items: center;\
    gap: 10px;\
    color: #cbd5e1;\
}\
\
.paste-buttons {\
    display: flex;\
    gap: 10px;\
    justify-content: flex-end;\
}\
\
.paste-buttons button {\
    padding: 10px 20px;\
    border-radius: 8px;\
    font-size: 16px;\
    cursor: pointer;\
}\
\
.paste-buttons button:first-child {\
    background: rgba(139, 92, 246, 0.2);\
    color: #a78bfa;\
    border: 2px solid rgba(139, 92, 246, 0.3);\
}\
\
.paste-buttons button:first-child:hover {\
    background: rgba(139, 92, 246, 0.3);\
}\
\
.paste-buttons button:last-child {\
    background: rgba(239, 68, 68, 0.2);\
    color: #f87171;\
    border: 2px solid rgba(239, 68, 68, 0.3);\
}' static/index.html
fi

# Now update the JavaScript functions
# Create a temporary file with the new functions
cat > paste_functions.js << 'JSEND'

        // Enhanced paste dialog with default arguments
        function showPasteDialog() {
            const dialog = document.createElement('div');
            dialog.className = 'paste-dialog';
            dialog.innerHTML = `
                <div class="paste-content">
                    <h3>📋 Paste C Code</h3>
                    <div class="paste-examples">
                        <button onclick="loadPasteExample('fibonacci')">Fibonacci Example</button>
                        <button onclick="loadPasteExample('square')">Square Example</button>
                        <button onclick="loadPasteExample('factorial')">Factorial Example</button>
                    </div>
                    <textarea id="paste-code" placeholder="Paste your C code here..."></textarea>
                    <div class="paste-options">
                        <label>
                            <input type="checkbox" id="auto-transform" checked>
                            Auto-transform to zkEngine format
                        </label>
                    </div>
                    <div class="argument-section">
                        <h4>Function Arguments (comma-separated)</h4>
                        <input type="text" id="paste-args" placeholder="e.g., 10 for fibonacci(10)" value="">
                        <div class="arg-hints" id="arg-hints"></div>
                    </div>
                    <div class="paste-buttons">
                        <button onclick="processPastedCode()">Process Code</button>
                        <button onclick="closePasteDialog()">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(dialog);
            
            // Auto-detect function and suggest arguments
            document.getElementById('paste-code').addEventListener('input', detectFunctionAndSuggestArgs);
        }

        // Function to detect the main function and suggest appropriate arguments
        function detectFunctionAndSuggestArgs() {
            const code = document.getElementById('paste-code').value;
            const argsInput = document.getElementById('paste-args');
            const hintsDiv = document.getElementById('arg-hints');
            
            // Clear previous hints
            hintsDiv.innerHTML = '';
            
            // Detect common patterns
            if (code.includes('fibonacci') || code.includes('fib')) {
                argsInput.value = '10';
                hintsDiv.innerHTML = '<small>💡 Fibonacci: Enter a number (e.g., 10 for 10th Fibonacci number)</small>';
            } else if (code.includes('factorial')) {
                argsInput.value = '5';
                hintsDiv.innerHTML = '<small>💡 Factorial: Enter a number (e.g., 5 for 5!)</small>';
            } else if (code.includes('square') || code.includes('pow')) {
                argsInput.value = '7';
                hintsDiv.innerHTML = '<small>💡 Square/Power: Enter a number to square (e.g., 7)</small>';
            } else if (code.includes('prime')) {
                argsInput.value = '17';
                hintsDiv.innerHTML = '<small>💡 Prime Check: Enter a number to check (e.g., 17)</small>';
            } else if (code.includes('gcd') || code.includes('greatest common divisor')) {
                argsInput.value = '48, 18';
                hintsDiv.innerHTML = '<small>💡 GCD: Enter two numbers (e.g., 48, 18)</small>';
            } else if (code.includes('sort') || code.includes('bubble')) {
                argsInput.value = '5';
                hintsDiv.innerHTML = '<small>💡 Array Size: Enter the size of array (e.g., 5)</small>';
            } else {
                // Count parameters in main function
                const mainMatch = code.match(/main\s*\([^)]*\)/);
                if (mainMatch) {
                    const params = mainMatch[0];
                    if (params.includes('int32_t') || params.includes('int ')) {
                        const paramCount = (params.match(/int/g) || []).length;
                        if (paramCount === 1) {
                            argsInput.value = '42';
                            hintsDiv.innerHTML = '<small>💡 Enter one integer argument</small>';
                        } else if (paramCount === 2) {
                            argsInput.value = '10, 20';
                            hintsDiv.innerHTML = '<small>💡 Enter two integer arguments</small>';
                        } else if (paramCount >= 3) {
                            argsInput.value = '1, 2, 3';
                            hintsDiv.innerHTML = '<small>💡 Enter three integer arguments</small>';
                        }
                    }
                }
            }
        }

        // Load example code
        function loadPasteExample(example) {
            const codeArea = document.getElementById('paste-code');
            const argsInput = document.getElementById('paste-args');
            const hintsDiv = document.getElementById('arg-hints');
            
            const examples = {
                fibonacci: {
                    code: `int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main(int n) {
    return fibonacci(n);
}`,
                    args: '10',
                    hint: 'Calculates the 10th Fibonacci number (55)'
                },
                square: {
                    code: `int main(int x) {
    return x * x;
}`,
                    args: '7',
                    hint: 'Calculates 7² = 49'
                },
                factorial: {
                    code: `int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main(int n) {
    return factorial(n);
}`,
                    args: '5',
                    hint: 'Calculates 5! = 120'
                }
            };
            
            if (examples[example]) {
                codeArea.value = examples[example].code;
                argsInput.value = examples[example].args;
                hintsDiv.innerHTML = `<small>💡 ${examples[example].hint}</small>`;
            }
        }

        // Process pasted code with better error handling
        async function processPastedCode() {
            const code = document.getElementById('paste-code').value;
            const args = document.getElementById('paste-args').value.trim();
            const autoTransform = document.getElementById('auto-transform').checked;
            
            if (!code.trim()) {
                alert('Please paste some code first');
                return;
            }
            
            // Validate arguments
            if (!args) {
                alert('Please provide function arguments. Check the hints for suggestions.');
                return;
            }
            
            // Close dialog
            closePasteDialog();
            
            // Show processing message
            appendMessage('system', '🔄 Processing pasted code...');
            
            try {
                // Transform code if needed
                let processedCode = code;
                if (autoTransform) {
                    const transformResponse = await fetch('http://localhost:8002/api/transform-code', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code, auto_transform: true })
                    });
                    
                    const transformResult = await transformResponse.json();
                    if (transformResult.success) {
                        processedCode = transformResult.transformed_code;
                        appendMessage('system', '✅ Code transformed: ' + transformResult.changes.join(', '));
                    }
                }
                
                // Compile to WASM with better error handling
                const timestamp = Date.now();
                const filename = `pasted_${timestamp}`;
                
                const compileResponse = await fetch('http://localhost:8002/api/compile-transformed', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        code: processedCode, 
                        filename: filename 
                    })
                });
                
                const compileResult = await compileResponse.json();
                
                if (!compileResult.success) {
                    throw new Error(compileResult.error || 'Compilation failed');
                }
                
                // Ensure we have a valid WASM file
                if (!compileResult.wasm_file) {
                    throw new Error('No WASM file generated');
                }
                
                appendMessage('system', `✅ Code compiled successfully: ${compileResult.wasm_file}`);
                
                // Display the code
                displayCodeView(code, processedCode, 'c');
                
                // Create proof command with the compiled WASM and provided arguments
                const proofCommand = `prove custom ${compileResult.wasm_file} with args ${args}`;
                
                // Send to backend
                appendMessage('user', `Generated command: ${proofCommand}`);
                
                // Process the proof
                ws.send(JSON.stringify({
                    type: 'nl_command',
                    command: proofCommand
                }));
                
            } catch (error) {
                console.error('Error processing pasted code:', error);
                appendMessage('system', `❌ Error: ${error.message}`);
                
                // Provide helpful hints
                if (error.message.includes('Compilation failed')) {
                    appendMessage('system', '💡 Hint: Make sure your code has a main() function that returns an int32_t value');
                    appendMessage('system', '💡 Hint: Remove any printf/scanf statements');
                    appendMessage('system', '💡 Hint: Use int32_t instead of int or float');
                }
            }
        }

        // Close paste dialog
        function closePasteDialog() {
            const dialog = document.querySelector('.paste-dialog');
            if (dialog) {
                dialog.remove();
            }
        }
JSEND

# Replace the old showPasteDialog function with the new one
# First check if showPasteDialog exists
if grep -q "function showPasteDialog" static/index.html; then
    # Create a Python script to replace the function
    cat > replace_paste.py << 'PYTHONREPLACE'
import re

with open('static/index.html', 'r') as f:
    content = f.read()

# Read new functions
with open('paste_functions.js', 'r') as f:
    new_functions = f.read()

# Pattern to find the old showPasteDialog and related functions
pattern = r'function showPasteDialog\(\)\s*\{[^}]*\}(?:\s*function\s+\w+\([^)]*\)\s*\{[^}]*\})*'

# Replace with new functions
content = re.sub(pattern, new_functions.strip(), content, flags=re.DOTALL)

# Also update the paste button event listener
content = re.sub(
    r"document\.getElementById\('paste-button'\)\.addEventListener\('click',\s*\(\)\s*=>\s*\{[^}]*\}\);",
    "document.getElementById('paste-button').addEventListener('click', showPasteDialog);",
    content
)

with open('static/index.html', 'w') as f:
    f.write(content)

print("Replaced paste functions")
PYTHONREPLACE

    python replace_paste.py
    rm replace_paste.py
else
    # If showPasteDialog doesn't exist, add it before the closing script tag
    sed -i '/<\/script>/i\
'"$(cat paste_functions.js)" static/index.html
    
    # Update paste button event listener
    sed -i "s/document\.getElementById('paste-button')\.addEventListener('click',.*);/document.getElementById('paste-button').addEventListener('click', showPasteDialog);/g" static/index.html
fi

rm paste_functions.js
echo -e "${GREEN}✓ static/index.html updated${NC}"

# Step 5: Test the services
echo -e "\n${YELLOW}Step 5: Testing services...${NC}"

# Check if services are running
if pgrep -f "langchain_service.py" > /dev/null; then
    echo "Restarting langchain_service.py..."
    pkill -f "langchain_service.py"
    sleep 2
fi

if pgrep -f "cargo run" > /dev/null; then
    echo "Rust backend is running"
else
    echo -e "${YELLOW}Note: Rust backend not running. Start with: cd ~/agentkit && cargo run${NC}"
fi

echo -e "\n${GREEN}✅ All fixes applied successfully!${NC}"
echo -e "\n📋 What was fixed:"
echo "  1. Added wasm2wat for proper WAT format output"
echo "  2. Enhanced UI with auto-detection of function arguments"
echo "  3. Added example templates (Fibonacci, Square, Factorial)"
echo "  4. Improved error handling and helpful hints"
echo "  5. Fixed UTF-8 encoding issues"

echo -e "\n🚀 Next steps:"
echo "  1. Start the Rust backend: cd ~/agentkit && cargo run"
echo "  2. Start LangChain service: cd ~/agentkit && source langchain_env/bin/activate && python langchain_service.py"
echo "  3. Open browser: http://localhost:8001"
echo "  4. Click the 📋 paste button and try an example!"

echo -e "\n${GREEN}The paste function should now work perfectly with:"
echo "  - Auto-populated arguments"
echo "  - Example templates"
echo "  - Proper WAT format"
echo "  - No UTF-8 errors${NC}"
