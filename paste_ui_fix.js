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
