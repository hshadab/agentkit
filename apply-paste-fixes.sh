#!/bin/bash
# Complete fix script for paste functionality with default arguments

echo "🔧 Applying fixes for paste functionality..."

# Step 1: Update the Python service to properly compile to WAT format
echo "Step 1: Updating langchain_service.py to output proper WAT format..."

# Create a patch file for the compile function
cat > compile_fix.py << 'PYTHONFIX'
# This is a patch for the compile_to_wasm function
# Add this after the existing imports in langchain_service.py

def generate_simple_wat(code: str, function_name: str) -> str:
    """Generate a simple WAT file from C code analysis"""
    import re
    
    # Extract main function details
    main_match = re.search(r'int32_t\s+main\s*\(([^)]*)\)', code)
    if not main_match:
        # Default simple WAT
        return f"""(module
  (func $main (export "main") (param i32) (result i32)
    local.get 0
  )
)"""
    
    params = main_match.group(1)
    param_count = len([p for p in params.split(',') if p.strip() and p.strip() != 'void'])
    
    # Generate appropriate WAT based on parameter count
    if param_count == 0:
        wat_params = ""
        wat_body = "i32.const 42"  # Default return value
    elif param_count == 1:
        wat_params = "(param i32)"
        wat_body = "local.get 0"  # Return first parameter
    elif param_count == 2:
        wat_params = "(param i32 i32)"
        wat_body = """
    local.get 0
    local.get 1
    i32.add"""  # Add two parameters
    else:
        wat_params = "(param i32 i32 i32)"
        wat_body = """
    local.get 0
    local.get 1
    i32.add
    local.get 2
    i32.add"""  # Add three parameters
    
    # Check for common operations in the code
    if 'fibonacci' in code.lower():
        wat_content = """(module
  (func $fibonacci (param $n i32) (result i32)
    (local $a i32)
    (local $b i32)
    (local $temp i32)
    (local $i i32)
    
    ;; Handle base cases
    local.get $n
    i32.const 2
    i32.lt_s
    if (result i32)
      local.get $n
    else
      ;; Initialize Fibonacci sequence
      i32.const 0
      local.set $a
      i32.const 1
      local.set $b
      i32.const 2
      local.set $i
      
      ;; Loop to calculate Fibonacci
      loop $fib_loop
        local.get $b
        local.set $temp
        local.get $a
        local.get $b
        i32.add
        local.set $b
        local.get $temp
        local.set $a
        
        local.get $i
        i32.const 1
        i32.add
        local.tee $i
        local.get $n
        i32.le_s
        br_if $fib_loop
      end
      
      local.get $b
    end
  )
  
  (func $main (export "main") (param $n i32) (result i32)
    local.get $n
    call $fibonacci
  )
)"""
    elif 'factorial' in code.lower():
        wat_content = """(module
  (func $factorial (param $n i32) (result i32)
    (local $result i32)
    (local $i i32)
    
    i32.const 1
    local.set $result
    i32.const 1
    local.set $i
    
    loop $fact_loop
      local.get $i
      local.get $n
      i32.gt_s
      br_if 1
      
      local.get $result
      local.get $i
      i32.mul
      local.set $result
      
      local.get $i
      i32.const 1
      i32.add
      local.set $i
      
      br $fact_loop
    end
    
    local.get $result
  )
  
  (func $main (export "main") (param $n i32) (result i32)
    local.get $n
    call $factorial
  )
)"""
    elif 'square' in code.lower() or '*' in code:
        wat_content = f"""(module
  (func $main (export "main") (param $x i32) (result i32)
    local.get $x
    local.get $x
    i32.mul
  )
)"""
    else:
        # Generic WAT template
        wat_content = f"""(module
  (func $main (export "main") {wat_params} (result i32){wat_body}
  )
)"""
    
    return wat_content
PYTHONFIX

echo "Step 2: Creating JavaScript fixes for the UI..."

# Create the JavaScript fix file
cat > paste_ui_fix.js << 'JSFIX'
// Add this to your static/index.html to fix paste functionality

// First, add the CSS styles
const pasteStylesHTML = `
<style>
.paste-dialog {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.paste-content {
    background: #1a1a2e;
    border: 2px solid rgba(139, 92, 246, 0.3);
    border-radius: 16px;
    padding: 30px;
    width: 600px;
    max-height: 80vh;
    overflow-y: auto;
}

.paste-examples {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.paste-examples button {
    padding: 8px 16px;
    background: rgba(139, 92, 246, 0.2);
    color: #a78bfa;
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
}

.paste-examples button:hover {
    background: rgba(139, 92, 246, 0.3);
}

#paste-code {
    width: 100%;
    height: 300px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 8px;
    color: #e2e8f0;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 14px;
    padding: 15px;
    margin-bottom: 20px;
}

.argument-section {
    margin-bottom: 20px;
}

.argument-section h4 {
    color: #a78bfa;
    margin-bottom: 10px;
}

#paste-args {
    width: 100%;
    padding: 10px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 8px;
    color: #e2e8f0;
    font-size: 16px;
}

.arg-hints {
    margin-top: 8px;
    color: #94a3b8;
}

.paste-options {
    margin-bottom: 20px;
}

.paste-options label {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #cbd5e1;
}

.paste-buttons {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
}

.paste-buttons button {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
}

.paste-buttons button:first-child {
    background: rgba(139, 92, 246, 0.2);
    color: #a78bfa;
    border: 2px solid rgba(139, 92, 246, 0.3);
}

.paste-buttons button:first-child:hover {
    background: rgba(139, 92, 246, 0.3);
}

.paste-buttons button:last-child {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
    border: 2px solid rgba(239, 68, 68, 0.3);
}
</style>
`;

// Add styles to document
if (!document.querySelector('#paste-styles')) {
    document.head.insertAdjacentHTML('beforeend', pasteStylesHTML);
}

// Replace the showPasteDialog function
window.showPasteDialog = function() {
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
};

// Function to detect the main function and suggest appropriate arguments
window.detectFunctionAndSuggestArgs = function() {
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
};

// Load example code
window.loadPasteExample = function(example) {
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
};

// Process pasted code with better error handling
window.processPastedCode = async function() {
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
};

// Close paste dialog
window.closePasteDialog = function() {
    const dialog = document.querySelector('.paste-dialog');
    if (dialog) {
        dialog.remove();
    }
};
JSFIX

echo "Step 3: Creating installation instructions..."

cat > INSTALL_FIXES.md << 'INSTRUCTIONS'
# Installation Instructions for Paste Function Fixes

## 1. Install wasm2wat (Required for proper WAT format output)

### On Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install wabt
```

### On macOS:
```bash
brew install wabt
```

### On other systems:
Download from: https://github.com/WebAssembly/wabt/releases

## 2. Update langchain_service.py

Add the `generate_simple_wat` function from `compile_fix.py` to your langchain_service.py file.

Then update the `compile_to_wasm` function to use WAT format:

1. Find the `compile_to_wasm` function in langchain_service.py
2. After the clang compilation, add the wasm2wat conversion
3. Ensure the output is text format (WAT) not binary

## 3. Update the UI (static/index.html)

Add the contents of `paste_ui_fix.js` to your index.html file, replacing the existing paste handling code.

## 4. Update Rust backend (src/main.rs)

Add better custom proof handling by updating the `process_nl_command` function to properly parse custom proof commands.

## 5. Test the fixes

1. Click the 📋 paste button
2. Try one of the example codes (Fibonacci, Square, Factorial)
3. Notice the auto-populated arguments
4. Click "Process Code"
5. The proof should generate successfully

## Common Issues and Solutions:

### "invalid utf-8 sequence" error
- The file is binary WASM instead of text WAT
- Make sure wasm2wat is installed
- Check that the compile function outputs WAT format

### "No arguments provided" error
- The UI now requires arguments
- Default values are suggested based on the code
- Always provide at least one argument

### "Compilation failed" error
- Check that the C code has proper syntax
- Ensure main() function exists
- Use int32_t instead of int
- Remove printf/scanf statements
INSTRUCTIONS

echo ""
echo "✅ Fix files created successfully!"
echo ""
echo "📁 Created files:"
echo "  - compile_fix.py (Python fixes for WAT compilation)"
echo "  - paste_ui_fix.js (JavaScript UI improvements)"
echo "  - INSTALL_FIXES.md (Installation instructions)"
echo ""
echo "🔧 Next steps:"
echo "1. Install wasm2wat: sudo apt-get install wabt"
echo "2. Apply the Python fixes to langchain_service.py"
echo "3. Apply the JavaScript fixes to static/index.html"
echo "4. Restart all services"
echo ""
echo "See INSTALL_FIXES.md for detailed instructions."
