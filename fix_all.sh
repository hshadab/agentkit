#!/bin/bash

echo "🔧 Fixing all zkEngine issues..."

# Backup files
cp static/index.html static/index.html.backup
cp src/main.rs src/main.rs.backup

echo "📝 Creating fixed handleMessage function..."

# Create the fixed handleMessage function
cat > /tmp/fixed_handlemessage.js << 'EOF'
        // FIXED: handleMessage function
        function handleMessage(data) {
            const msgType = data.type || data.msg_type;
            
            // Remove loading dots when we receive a response
            removeLoadingDots();
            
            // Handle structured data types FIRST
            if (data.data && data.data.type) {
                const dataType = data.data.type;
                
                if (dataType === 'proof_list') {
                    displayProofTable(data.data);
                    return; // Don't show message
                } else if (dataType === 'verification_list') {
                    displayVerificationTable(data.data);
                    return; // Don't show message
                } else if (dataType === 'verification_complete') {
                    displayVerificationResult(data.data);
                    waitingForProof = false;
                    removeLoadingDots();
                    return; // Don't show message
                } else if (dataType === 'proof_start') {
                    console.log('Creating proof card for:', data.data.proof_id);
                    removeExistingProofCards();
                    createProofCard(data.data.proof_id, 'running', data.content, data.data);
                    activeProofCards.add(data.data.proof_id);
                    waitingForProof = false;
                    return; // Don't show message
                } else if (dataType === 'proof_complete') {
                    console.log('Updating proof card to complete:', data.data.proof_id);
                    updateProofCard(data.data.proof_id, 'success', data.content, data.data);
                    activeProofCards.delete(data.data.proof_id);
                    waitingForProof = false;
                    return; // Don't show the raw JSON message
                } else if (dataType === 'proof_failed') {
                    updateProofCard(data.data.proof_id, 'failed', data.content, data.data);
                    activeProofCards.delete(data.data.proof_id);
                    waitingForProof = false;
                    addMessage(data.content, 'assistant');
                    return;
                }
            }
            
            // Only show regular messages that aren't structured data
            if (msgType === 'message' && data.content && !data.data?.type) {
                addMessage(data.content, 'assistant');
                
                const contentLower = data.content.toLowerCase();
                const shouldWait = contentLower.includes('verifying') || 
                    contentLower.includes('verification') || 
                    contentLower.includes('processing');
                    
                if (shouldWait) {
                    waitingForProof = true;
                    setTimeout(() => {
                        if (waitingForProof) {
                            showLoadingDots();
                        }
                    }, 100);
                }
            }
        }
EOF

# Replace the existing handleMessage function
sed -i '/function handleMessage(data) {/,/^        }$/c\'"$(cat /tmp/fixed_handlemessage.js | sed 's/$/\\/')" static/index.html

echo "📝 Fixing function name mapping..."

# Fix function name mapping  
sed -i "s/'prove_location': 'location proof'/'prove_location': 'Location'/" static/index.html
sed -i "s/'location': 'location proof'/'location': 'Location'/" static/index.html

# Also fix getDescriptiveFunctionName function
sed -i '/if (data && data.function) {/,/};/c\
            if (data && data.function) {\
                // Map function names properly\
                const functionMap = {\
                    "prove_location": "Location",\
                    "main": "Location",\
                    "fibonacci": "Fibonacci",\
                    "add": "Addition",\
                    "multiply": "Multiplication",\
                    "factorial": "Factorial"\
                };\
                info = {\
                    function: functionMap[data.function] || data.function,\
                    args: data.arguments ? data.arguments.join(", ") : "",\
                    stepSize: data.step_size ? data.step_size.toString() : "50",\
                    wasmFile: data.wasm_file || "unknown.wat",\
                    time: null,\
                    size: null,\
                    customStepSize: data.step_size && data.step_size !== 50\
                };' static/index.html

echo "📝 Adding list proofs functionality to backend..."

# Add list functionality to Rust backend
cat > /tmp/list_proofs_handler.txt << 'EOF'
    
    // Handle list commands directly (before LangChain)
    if input_lower.contains("list") && (input_lower.contains("proof") || input_lower.contains("all")) {
        let proofs = state.proof_store.lock().await;
        let proofs_list: Vec<&ProofRecord> = proofs.values().collect();
        
        return NlResponse {
            message: String::new(),
            data: Some(json!({
                "type": "proof_list",
                "proofs": proofs_list
            })),
        };
    }
    
    if input_lower.contains("list") && input_lower.contains("verification") {
        let verifications = state.verification_store.lock().await;
        
        return NlResponse {
            message: String::new(),
            data: Some(json!({
                "type": "verification_list", 
                "verifications": *verifications
            })),
        };
    }
EOF

# Insert the list handler right after the session_id line in process_nl_command
sed -i '/let session_id = Some("default".to_string());/r /tmp/list_proofs_handler.txt' src/main.rs

echo "📝 Adding clickable proof cards with modal..."

# Add modal CSS
cat > /tmp/modal_styles.css << 'EOF'
        
        /* Code Modal Styles */
        .code-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        
        .code-modal.show {
            opacity: 1;
            visibility: visible;
        }
        
        .code-modal-content {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 2px solid rgba(139, 92, 246, 0.4);
            border-radius: 16px;
            padding: 32px;
            max-width: 900px;
            max-height: 85vh;
            overflow-y: auto;
            position: relative;
            transform: scale(0.8);
            transition: transform 0.3s ease;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        }
        
        .code-modal.show .code-modal-content {
            transform: scale(1);
        }
        
        .code-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(139, 92, 246, 0.2);
        }
        
        .code-modal-title {
            font-size: 24px;
            font-weight: 700;
            background: linear-gradient(135deg, #c084fc 0%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .code-modal-close {
            background: rgba(139, 92, 246, 0.1);
            border: 1px solid rgba(139, 92, 246, 0.3);
            color: #c084fc;
            font-size: 28px;
            cursor: pointer;
            padding: 8px 12px;
            border-radius: 8px;
            transition: all 0.2s;
            line-height: 1;
        }
        
        .code-modal-close:hover {
            background: rgba(139, 92, 246, 0.2);
            color: #e9d5ff;
            transform: scale(1.1);
        }
        
        .code-info {
            margin-bottom: 20px;
            padding: 16px;
            background: rgba(139, 92, 246, 0.08);
            border: 1px solid rgba(139, 92, 246, 0.2);
            border-radius: 12px;
            font-size: 14px;
            color: #c084fc;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
        }
        
        .code-display {
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 12px;
            padding: 20px;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
            font-size: 13px;
            line-height: 1.6;
            color: #e2e8f0;
            overflow-x: auto;
            white-space: pre;
            max-height: 500px;
            overflow-y: auto;
        }
        
        /* Make proof cards clickable */
        .proof-card {
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
        }
        
        .proof-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
            border-color: rgba(139, 92, 246, 0.6);
        }
        
        .proof-card::after {
            content: '👁️ Click to view WASM code';
            position: absolute;
            top: 16px;
            right: 16px;
            font-size: 11px;
            color: rgba(139, 92, 246, 0.7);
            background: rgba(0, 0, 0, 0.8);
            padding: 4px 8px;
            border-radius: 4px;
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
        }
        
        .proof-card:hover::after {
            opacity: 1;
        }
EOF

# Insert CSS before the closing </style> tag
sed -i '/<\/style>/i\'"$(cat /tmp/modal_styles.css | sed 's/$/\\/')" static/index.html

# Add JavaScript for modal functionality
cat > /tmp/modal_code.js << 'EOF'
        
        // WASM code examples
        const WASM_CODES = {
            'prove_location': `(module
  ;; DePIN Location Proof for San Francisco
  ;; Proves device is within city boundaries without revealing exact GPS coordinates
  
  (memory 1)
  
  ;; San Francisco boundary definitions
  (global $SF_LAT_MIN f32 (f32.const 37.708))   ;; Southern boundary
  (global $SF_LAT_MAX f32 (f32.const 37.833))   ;; Northern boundary  
  (global $SF_LON_MIN f32 (f32.const -122.515)) ;; Western boundary
  (global $SF_LON_MAX f32 (f32.const -122.357)) ;; Eastern boundary
  
  ;; Device coordinates (securely obtained from GPS)
  (global $DEVICE_LAT (mut f32) (f32.const 0))
  (global $DEVICE_LON (mut f32) (f32.const 0))
  
  ;; Main proof function: proves device location without revealing exact coordinates
  (func $main (export "main") (param $city_code i32) (param $device_id i32) (result i32)
    (local $lat f32)
    (local $lon f32)
    (local $in_sf_bounds i32)
    
    ;; Get device GPS coordinates (in production: secure GPS attestation)
    call $get_secure_gps_coordinates
    
    ;; Load device coordinates
    global.get $DEVICE_LAT
    local.set $lat
    global.get $DEVICE_LON  
    local.set $lon
    
    ;; Check if city_code = 1 (San Francisco)
    local.get $city_code
    i32.const 1
    i32.eq
    if (result i32)
      ;; Verify device is within San Francisco boundaries
      ;; Latitude check: SF_LAT_MIN <= lat <= SF_LAT_MAX
      local.get $lat
      global.get $SF_LAT_MIN
      f32.ge
      
      local.get $lat  
      global.get $SF_LAT_MAX
      f32.le
      i32.and
      
      ;; Longitude check: SF_LON_MIN <= lon <= SF_LON_MAX  
      local.get $lon
      global.get $SF_LON_MIN
      f32.ge
      i32.and
      
      local.get $lon
      global.get $SF_LON_MAX
      f32.le
      i32.and
    else
      ;; Other cities not implemented yet
      i32.const 0
    end
  )
  
  ;; Secure GPS coordinate retrieval (mock implementation)
  (func $get_secure_gps_coordinates
    ;; In production: this would interface with secure GPS hardware
    ;; For demo: using SF coordinates that pass the boundary check
    f32.const 37.7749  ;; SF latitude (City Hall)
    global.set $DEVICE_LAT
    f32.const -122.4194  ;; SF longitude (City Hall)  
    global.set $DEVICE_LON
  )
)`,
            'fib': `(module
  ;; Fibonacci sequence computation using iterative approach
  (func $main (export "main") (param $n i32) (result i32)
    (local $a i32)
    (local $b i32) 
    (local $temp i32)
    (local $i i32)
    
    ;; Handle base cases
    local.get $n
    i32.const 0
    i32.eq
    if (result i32)
      i32.const 0
      return
    end
    
    local.get $n  
    i32.const 1
    i32.eq
    if (result i32)
      i32.const 1
      return
    end
    
    ;; Initialize for iterative calculation
    i32.const 0
    local.set $a
    i32.const 1
    local.set $b
    i32.const 2
    local.set $i
    
    ;; Iterative fibonacci calculation
    loop $fib_loop
      ;; temp = a + b
      local.get $a
      local.get $b
      i32.add
      local.set $temp
      
      ;; a = b, b = temp
      local.get $b
      local.set $a
      local.get $temp
      local.set $b
      
      ;; increment counter
      local.get $i
      i32.const 1
      i32.add
      local.set $i
      
      ;; continue if i <= n
      local.get $i
      local.get $n
      i32.le_s
      br_if $fib_loop
    end
    
    local.get $b
  )
)`,
            'add': `(module
  ;; Simple integer addition
  (func $main (export "main") (param $a i32) (param $b i32) (result i32)
    local.get $a
    local.get $b
    i32.add
  )
)`
        };
        
        // Show code modal when proof card is clicked
        function showCodeModal(proofId) {
            const proofState = proofStates[proofId];
            if (!proofState) return;
            
            // Determine WASM code based on function type
            let wasmFile = 'unknown.wat';
            let wasmCode = '// WASM code not available for this function';
            let functionType = 'unknown';
            
            if (proofState.info && proofState.originalMessage) {
                const msg = proofState.originalMessage.toLowerCase();
                
                if (msg.includes('location') || msg.includes('san francisco')) {
                    wasmFile = 'prove_location.wat';
                    wasmCode = WASM_CODES['prove_location'];
                    functionType = 'Location Proof';
                } else if (msg.includes('fibonacci') || msg.includes('fib')) {
                    wasmFile = 'fib.wat';
                    wasmCode = WASM_CODES['fib'];
                    functionType = 'Fibonacci';
                } else if (msg.includes('add')) {
                    wasmFile = 'add.wat';
                    wasmCode = WASM_CODES['add'];
                    functionType = 'Addition';
                }
            }
            
            // Create and show modal
            const modal = document.createElement('div');
            modal.className = 'code-modal';
            modal.innerHTML = `
                <div class="code-modal-content">
                    <div class="code-modal-header">
                        <div class="code-modal-title">WASM Code: ${wasmFile}</div>
                        <button class="code-modal-close">&times;</button>
                    </div>
                    <div class="code-info">
                        <div><strong>Proof ID:</strong> ${proofId.substring(0, 12)}...</div>
                        <div><strong>Function:</strong> ${functionType}</div>
                        <div><strong>Arguments:</strong> [${proofState.info?.args || 'none'}]</div>
                        <div><strong>Step Size:</strong> ${proofState.info?.stepSize || '50'}</div>
                    </div>
                    <div class="code-display">${wasmCode}</div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Show with animation
            setTimeout(() => modal.classList.add('show'), 10);
            
            // Close handlers
            const closeBtn = modal.querySelector('.code-modal-close');
            const closeModal = () => {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            };
            
            closeBtn.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
            
            // ESC key handler
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        }
EOF

# Insert modal JavaScript before the existing event delegation
sed -i '/\/\/ Event delegation for dynamic content/i\'"$(cat /tmp/modal_code.js | sed 's/$/\\/')" static/index.html

# Add proof card click handler to existing event delegation
sed -i '/\/\/ Handle example items/i\            // Handle proof card clicks\
            if (e.target.closest('\''.proof-card'\'')) {\
                const card = e.target.closest('\''.proof-card'\'');\
                const proofId = card.id?.replace('\''proof-'\'', '\'\'');\
                if (proofId && proofStates[proofId]) {\
                    e.stopPropagation();\
                    showCodeModal(proofId);\
                }\
                return;\
            }\
' static/index.html

# Clean up temp files
rm -f /tmp/fixed_handlemessage.js /tmp/list_proofs_handler.txt /tmp/modal_styles.css /tmp/modal_code.js

echo ""
echo "✅ All fixes applied successfully!"
echo ""
echo "🚀 Restart the server now:"
echo "cargo run"
echo ""
echo "🎯 Issues fixed:"
echo "  ✅ Function name: 'computation' → 'Location'"
echo "  ✅ Stopped duplicate JSON messages"  
echo "  ✅ Fixed proof card creation and updates"
echo "  ✅ Added 'list all proofs' command"
echo "  ✅ Added clickable proof cards with WASM code modal"
echo "  ✅ Fixed message handling to prevent raw JSON display"
echo ""
echo "🧪 Test commands:"
echo "  • prove device location in San Francisco"
echo "  • list all proofs" 
echo "  • Click on any proof card to see WASM code"
