#!/bin/bash

# fix-zkengine.sh - One-click fix for zkEngine button issues

echo "🚀 zkEngine Button Fix Script"
echo "============================"

# Check if an HTML file path was provided
if [ $# -eq 0 ]; then
    # Try to find the HTML file automatically
    POSSIBLE_PATHS=(
        "$HOME/agentkit/static/index.html"
        "./static/index.html"
        "./index.html"
        "$HOME/agentkit/agentic/static/index.html"
    )
    
    HTML_FILE=""
    for path in "${POSSIBLE_PATHS[@]}"; do
        if [ -f "$path" ]; then
            HTML_FILE="$path"
            echo "✅ Found HTML file: $HTML_FILE"
            break
        fi
    done
    
    if [ -z "$HTML_FILE" ]; then
        echo "❌ Error: Could not find index.html automatically"
        echo "Usage: $0 <path-to-index.html>"
        echo "Example: $0 ~/agentkit/static/index.html"
        exit 1
    fi
else
    HTML_FILE="$1"
fi

# Verify file exists
if [ ! -f "$HTML_FILE" ]; then
    echo "❌ Error: File not found: $HTML_FILE"
    exit 1
fi

# Check if fix is already applied
if grep -q "zkEngine Button Fix - Injected" "$HTML_FILE"; then
    echo "✅ Fix already applied to this file!"
    exit 0
fi

# Create backup
BACKUP_FILE="${HTML_FILE}.backup-$(date +%Y%m%d-%H%M%S)"
cp "$HTML_FILE" "$BACKUP_FILE"
echo "📦 Backup created: $BACKUP_FILE"

# Create the fix script
cat > /tmp/zkengine-fix.js << 'EOF'
<script>/*zkEngine Fix*/(function(){const s=document.createElement("style");s.textContent=`.slide-panel{position:fixed;top:0;right:-50%;width:50%;height:100%;background:linear-gradient(135deg,#1a1a2e 0%,#0f0f23 100%);border-left:2px solid rgba(139,92,246,0.3);box-shadow:-10px 0 40px rgba(0,0,0,0.8);z-index:2000;transition:right 0.3s cubic-bezier(0.4,0,0.2,1);display:flex;flex-direction:column}.slide-panel.open{right:0}.slide-panel-header{display:flex;justify-content:space-between;align-items:center;padding:24px 30px;border-bottom:1px solid rgba(139,92,246,0.2);background:rgba(0,0,0,0.2)}.slide-panel-title{font-size:20px;font-weight:700;background:linear-gradient(135deg,#c084fc 0%,#8b5cf6 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:flex;align-items:center;gap:12px}.slide-panel-close{background:none;border:none;color:#94a3b8;font-size:28px;cursor:pointer;transition:all 0.2s;padding:8px;line-height:1}.slide-panel-close:hover{color:#c084fc;transform:rotate(90deg)}.slide-panel-info{padding:20px 30px;color:#94a3b8;font-size:14px;line-height:1.6;border-bottom:1px solid rgba(139,92,246,0.1)}.slide-panel-info strong{color:#c084fc}.slide-panel-content{flex:1;overflow-y:auto;padding:20px}.code-display-slide{background:rgba(0,0,0,0.5);border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:20px;height:100%;overflow-y:auto;font-family:"SF Mono","Monaco",monospace;font-size:14px;line-height:1.6}.code-display-slide pre{margin:0;color:#e2e8f0}.slide-panel-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:1999;opacity:0;pointer-events:none;transition:opacity 0.3s}.slide-panel-overlay.open{opacity:1;pointer-events:all}`;document.head.appendChild(s);window.showCProgram=p=>showCodePanel(p,"c");window.showWasmProgram=window.showWasmFile=p=>showCodePanel(p,"wasm");window.showCodePanel=(p,t)=>{const st=window.proofStates[p];if(!st)return;document.getElementById("slide-panel")?.remove();document.getElementById("slide-panel-overlay")?.remove();const o=document.createElement("div");o.id="slide-panel-overlay";o.className="slide-panel-overlay";o.onclick=()=>closeSlidePanel();const pn=document.createElement("div");pn.id="slide-panel";pn.className="slide-panel";const i=t==="c"?"📄":"⚙️";const tt=t==="c"?"C Program":"WASM Program";const f=t==="c"?st.wasmFile.replace(".wat",".c"):st.wasmFile;let ft=st.functionName||"computation";if(st.wasmFile.includes("kyc"))ft="KYC Compliance";else if(st.wasmFile.includes("location"))ft="Location Verification";else if(st.wasmFile.includes("ai_content"))ft="AI Content Authenticity";const inf=t==="c"?`This is the original C program that was compiled to WebAssembly for <strong>${ft}</strong>. Users upload C code which gets compiled to WASM for cryptographic proof generation.`:`This is the WebAssembly Text format (WAT) file generated from the C program. zkEngine processes this file to generate zero-knowledge proofs.`;pn.innerHTML=`<div class="slide-panel-header"><div class="slide-panel-title"><span>${i}</span><span>${tt}: ${f}</span></div><button class="slide-panel-close" onclick="closeSlidePanel()">×</button></div><div class="slide-panel-info">${inf}</div><div class="slide-panel-content"><div class="code-display-slide"><pre><code id="code-content" class="language-${t==="c"?"c":"wasm"}">Loading...</code></pre></div></div>`;document.body.appendChild(o);document.body.appendChild(pn);setTimeout(()=>{o.classList.add("open");pn.classList.add("open")},10);if(t==="c"){loadCProgramContent(p)}else{loadWasmProgramContent(p)}};window.closeSlidePanel=()=>{const p=document.getElementById("slide-panel");const o=document.getElementById("slide-panel-overlay");if(p)p.classList.remove("open");if(o)o.classList.remove("open");setTimeout(()=>{if(p)p.remove();if(o)o.remove()},300)};window.loadCProgramContent=p=>{const st=window.proofStates[p];const ce=document.getElementById("code-content");if(!st||!ce)return;let c="";if(st.wasmFile&&st.wasmFile.includes("pasted_")){c=window.lastPastedCode||"// Original pasted C code\n// Code not available in this session"}else if(st.wasmFile.includes("location")){c=window.getLocationCProgram()}else if(st.wasmFile.includes("kyc")){c=window.getKYCProgram()}else if(st.wasmFile.includes("ai_content")){c=window.getAIContentProgram()}else{c="// C program source not available"}ce.textContent=c;if(typeof Prism!=="undefined"){Prism.highlightElement(ce)}};window.loadWasmProgramContent=async p=>{const st=window.proofStates[p];const ce=document.getElementById("code-content");if(!st||!ce)return;let w="";if(st.wasmFile==="prove_kyc.wat"){w=`(module\n  (func (export "kyc_check") (param $age i32) (param $risk_score i32) (result i32)\n    ;; Check age >= 18\n    (if (i32.lt_s (local.get $age) (i32.const 18))\n      (then (return (i32.const 0)))\n    )\n    \n    ;; Check risk score <= 75\n    (if (i32.gt_s (local.get $risk_score) (i32.const 75))\n      (then (return (i32.const 0)))\n    )\n    \n    ;; All checks passed\n    (i32.const 1)\n  )\n)`}else if(st.wasmFile==="prove_location.wat"){w=`(module\n  (func $abs_diff (param $a i32) (param $b i32) (result i32)\n    (if (result i32)\n      (i32.gt_s (local.get $a) (local.get $b))\n      (then (i32.sub (local.get $a) (local.get $b)))\n      (else (i32.sub (local.get $b) (local.get $a)))\n    )\n  )\n  \n  (func (export "location") (param $lat i32) (param $lng i32) (result i32)\n    (local $lat_diff i32)\n    (local $lng_diff i32)\n    \n    ;; SF coordinates: 37.773972, -122.431297 (scaled)\n    (local.set $lat_diff \n      (call $abs_diff (local.get $lat) (i32.const 37773972))\n    )\n    (local.set $lng_diff\n      (call $abs_diff (local.get $lng) (i32.const -122431297))\n    )\n    \n    ;; Check if within 50km bounds\n    (if (result i32)\n      (i32.and\n        (i32.lt_s (local.get $lat_diff) (i32.const 50000))\n        (i32.lt_s (local.get $lng_diff) (i32.const 50000))\n      )\n      (then (i32.const 1))\n      (else (i32.const 0))\n    )\n  )\n)`}else if(st.wasmFile==="prove_ai_content.wat"){w=`(module\n  (func (export "verify_ai_content") (param $content_hash i32) (param $signature i32) (result i32)\n    (local $expected i32)\n    \n    ;; Calculate expected signature using XOR with magic constant\n    (local.set $expected \n      (i32.xor (local.get $content_hash) (i32.const 0x5A5A5A5A))\n    )\n    \n    ;; Verify signature matches expected value\n    (if (result i32)\n      (i32.eq (local.get $signature) (local.get $expected))\n      (then (i32.const 1))\n      (else (i32.const 0))\n    )\n  )\n)`}else{w=`(module\n  (func (export "main") (result i32)\n    (i32.const 1)\n  )\n)`}ce.textContent=w;if(typeof Prism!=="undefined"){Prism.highlightElement(ce)}}})();</script>
<script>
// zkEngine Complete Button Fix
(function() {
    console.log('🔧 Applying zkEngine button fixes...');
    
    // Initialize proofStates if it doesn't exist
    if (!window.proofStates) {
        window.proofStates = {};
        console.log('✅ Initialized proofStates');
    }

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .slide-panel {
            position: fixed;
            top: 0;
            right: -50%;
            width: 50%;
            height: 100%;
            background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%);
            border-left: 2px solid rgba(139, 92, 246, 0.3);
            box-shadow: -10px 0 40px rgba(0, 0, 0, 0.8);
            z-index: 2000;
            transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
        }
        .slide-panel.open { right: 0; }
        .slide-panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px 30px;
            border-bottom: 1px solid rgba(139, 92, 246, 0.2);
            background: rgba(0, 0, 0, 0.2);
        }
        .slide-panel-title {
            font-size: 20px;
            font-weight: 700;
            background: linear-gradient(135deg, #c084fc 0%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .slide-panel-close {
            background: none;
            border: none;
            color: #94a3b8;
            font-size: 28px;
            cursor: pointer;
            transition: all 0.2s;
            padding: 8px;
            line-height: 1;
        }
        .slide-panel-close:hover {
            color: #c084fc;
            transform: rotate(90deg);
        }
        .slide-panel-info {
            padding: 20px 30px;
            color: #94a3b8;
            font-size: 14px;
            line-height: 1.6;
            border-bottom: 1px solid rgba(139, 92, 246, 0.1);
        }
        .slide-panel-info strong { color: #c084fc; }
        .slide-panel-content {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }
        .code-display-slide {
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(139, 92, 246, 0.2);
            border-radius: 12px;
            padding: 20px;
            height: 100%;
            overflow-y: auto;
            font-family: 'SF Mono', 'Monaco', monospace;
            font-size: 14px;
            line-height: 1.6;
        }
        .code-display-slide pre {
            margin: 0;
            color: #e2e8f0;
        }
        .slide-panel-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            z-index: 1999;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s;
        }
        .slide-panel-overlay.open {
            opacity: 1;
            pointer-events: all;
        }
    `;
    document.head.appendChild(style);

    // Extract proof ID from onclick attribute
    function extractProofId(onclickStr) {
        const match = onclickStr.match(/['"]([^'"]+)['"]/);
        return match ? match[1] : null;
    }

    // Global show functions
    window.showCProgram = function(proofId) {
        console.log('showCProgram called with:', proofId);
        
        // Initialize proofStates if needed
        if (!window.proofStates) {
            window.proofStates = {};
        }
        
        // If we don't have the state, try to extract info from the DOM
        if (!window.proofStates[proofId]) {
            const card = document.getElementById(`proof-${proofId}`);
            if (card) {
                // Extract info from the card
                const functionText = card.querySelector('.metric-value-inline')?.textContent || 'main()';
                const funcMatch = functionText.match(/(\w+)\(/);
                const functionName = funcMatch ? funcMatch[1] : 'main';
                
                // Determine wasm file based on function name
                let wasmFile = 'custom.wat';
                if (functionName === 'kyc_check' || functionText.includes('kyc')) wasmFile = 'prove_kyc.wat';
                else if (functionName === 'location' || functionText.includes('location')) wasmFile = 'prove_location.wat';
                else if (functionName === 'verify_ai_content' || functionName === 'prove_ai_content' || functionText.includes('ai_content')) wasmFile = 'prove_ai_content.wat';
                else if (functionText.includes('pasted_')) {
                    const pastedMatch = functionText.match(/pasted_\d+/);
                    if (pastedMatch) wasmFile = pastedMatch[0] + '.wat';
                }
                
                // Store the state
                window.proofStates[proofId] = {
                    functionName: functionName,
                    wasmFile: wasmFile
                };
            }
        }
        
        showCodePanel(proofId, 'c');
    };

    window.showWasmProgram = window.showWasmFile = function(proofId) {
        console.log('showWasmProgram called with:', proofId);
        
        // Initialize proofStates if needed
        if (!window.proofStates) {
            window.proofStates = {};
        }
        
        // If we don't have the state, try to extract info from the DOM
        if (!window.proofStates[proofId]) {
            const card = document.getElementById(`proof-${proofId}`);
            if (card) {
                // Extract info from the card
                const functionText = card.querySelector('.metric-value-inline')?.textContent || 'main()';
                const funcMatch = functionText.match(/(\w+)\(/);
                const functionName = funcMatch ? funcMatch[1] : 'main';
                
                // Determine wasm file based on function name
                let wasmFile = 'custom.wat';
                if (functionName === 'kyc_check' || functionText.includes('kyc')) wasmFile = 'prove_kyc.wat';
                else if (functionName === 'location' || functionText.includes('location')) wasmFile = 'prove_location.wat';
                else if (functionName === 'verify_ai_content' || functionName === 'prove_ai_content' || functionText.includes('ai_content')) wasmFile = 'prove_ai_content.wat';
                else if (functionText.includes('pasted_')) {
                    const pastedMatch = functionText.match(/pasted_\d+/);
                    if (pastedMatch) wasmFile = pastedMatch[0] + '.wat';
                }
                
                // Store the state
                window.proofStates[proofId] = {
                    functionName: functionName,
                    wasmFile: wasmFile
                };
            }
        }
        
        showCodePanel(proofId, 'wasm');
    };

    // Main show code panel function
    function showCodePanel(proofId, type) {
        console.log('showCodePanel:', proofId, type);
        
        const state = window.proofStates[proofId] || { functionName: 'main', wasmFile: 'custom.wat' };
        
        // Remove existing panels
        document.getElementById('slide-panel')?.remove();
        document.getElementById('slide-panel-overlay')?.remove();
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'slide-panel-overlay';
        overlay.className = 'slide-panel-overlay';
        overlay.onclick = () => window.closeSlidePanel();
        
        // Create panel
        const panel = document.createElement('div');
        panel.id = 'slide-panel';
        panel.className = 'slide-panel';
        
        const icon = type === 'c' ? '📄' : '⚙️';
        const title = type === 'c' ? 'C Program' : 'WASM Program';
        const filename = type === 'c' 
            ? state.wasmFile.replace('.wat', '.c')
            : state.wasmFile;
        
        let functionType = state.functionName || 'computation';
        if (state.wasmFile.includes('kyc')) functionType = 'KYC Compliance';
        else if (state.wasmFile.includes('location')) functionType = 'Location Verification';
        else if (state.wasmFile.includes('ai_content')) functionType = 'AI Content Authenticity';
        
        const info = type === 'c'
            ? `This is the original C program that was compiled to WebAssembly for <strong>${functionType}</strong>. Users upload C code which gets compiled to WASM for cryptographic proof generation.`
            : `This is the WebAssembly Text format (WAT) file generated from the C program. zkEngine processes this file to generate zero-knowledge proofs.`;
        
        panel.innerHTML = `
            <div class="slide-panel-header">
                <div class="slide-panel-title">
                    <span>${icon}</span>
                    <span>${title}: ${filename}</span>
                </div>
                <button class="slide-panel-close" onclick="closeSlidePanel()">×</button>
            </div>
            <div class="slide-panel-info">${info}</div>
            <div class="slide-panel-content">
                <div class="code-display-slide">
                    <pre><code id="code-content" class="language-${type === 'c' ? 'c' : 'wasm'}">Loading...</code></pre>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        document.body.appendChild(panel);
        
        // Trigger animations
        setTimeout(() => {
            overlay.classList.add('open');
            panel.classList.add('open');
        }, 10);
        
        // Load content
        if (type === 'c') {
            loadCProgramContent(proofId);
        } else {
            loadWasmProgramContent(proofId);
        }
    }

    window.closeSlidePanel = function() {
        const panel = document.getElementById('slide-panel');
        const overlay = document.getElementById('slide-panel-overlay');
        
        if (panel) panel.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
        
        setTimeout(() => {
            if (panel) panel.remove();
            if (overlay) overlay.remove();
        }, 300);
    };

    window.loadCProgramContent = function(proofId) {
        const state = window.proofStates[proofId] || {};
        const codeElement = document.getElementById('code-content');
        
        if (!codeElement) return;
        
        let cCode = '';
        
        if (state.wasmFile && state.wasmFile.includes('pasted_')) {
            cCode = window.lastPastedCode || '// Original pasted C code\n// Code not available in this session';
        } else if (state.wasmFile && state.wasmFile.includes('location')) {
            cCode = `#include <stdint.h>

// DePIN Location Proof for San Francisco
// Verifies if coordinates are within SF boundaries
// Returns 1 if within bounds, 0 otherwise

#define SF_LAT 37773972    // 37.773972 * 1000000 (scaled for integer math)
#define SF_LNG -122431297  // -122.431297 * 1000000 (scaled for integer math)
#define MAX_DISTANCE 50000 // 50km threshold in scaled units

// Helper function to calculate absolute value
int32_t abs_diff(int32_t a, int32_t b) {
    return (a > b) ? (a - b) : (b - a);
}

// Main location verification function
int32_t location(int32_t lat, int32_t lng) {
    // Calculate Manhattan distance (simplified for proof)
    int32_t lat_diff = abs_diff(lat, SF_LAT);
    int32_t lng_diff = abs_diff(lng, SF_LNG);
    
    // Check if within bounds
    if (lat_diff < MAX_DISTANCE && lng_diff < MAX_DISTANCE) {
        return 1; // Within San Francisco area
    }
    return 0; // Outside bounds
}`;
        } else if (state.wasmFile && state.wasmFile.includes('kyc')) {
            cCode = `#include <stdint.h>

// Circle KYC Compliance Verification
// Verifies user meets compliance requirements
// Returns 1 if compliant, 0 otherwise

#define MIN_AGE 18
#define MAX_RISK_SCORE 75

// Check KYC compliance
int32_t kyc_check(int32_t age, int32_t risk_score) {
    // Age verification
    if (age < MIN_AGE) {
        return 0; // Too young
    }
    
    // Risk assessment
    if (risk_score > MAX_RISK_SCORE) {
        return 0; // Risk too high
    }
    
    // All checks passed
    return 1;
}`;
        } else if (state.wasmFile && state.wasmFile.includes('ai_content')) {
            cCode = `#include <stdint.h>

// AI Content Authenticity Verification
// Proves content was generated by authorized AI
// Uses simplified hash verification

#define MAGIC_HASH 0x5A5A5A5A

// Verify AI content authenticity
int32_t verify_ai_content(int32_t content_hash, int32_t signature) {
    // Simple verification for demo
    int32_t expected = content_hash ^ MAGIC_HASH;
    
    if (signature == expected) {
        return 1; // Authentic
    }
    return 0; // Not authentic
}`;
        } else {
            cCode = '// C program source not available';
        }
        
        codeElement.textContent = cCode;
        
        if (typeof Prism !== 'undefined') {
            Prism.highlightElement(codeElement);
        }
    };

    window.loadWasmProgramContent = async function(proofId) {
        const state = window.proofStates[proofId] || {};
        const codeElement = document.getElementById('code-content');
        
        if (!codeElement) return;
        
        let watCode = '';
        
        if (state.wasmFile === 'prove_kyc.wat') {
            watCode = `(module
  (func (export "kyc_check") (param $age i32) (param $risk_score i32) (result i32)
    ;; Check age >= 18
    (if (i32.lt_s (local.get $age) (i32.const 18))
      (then (return (i32.const 0)))
    )
    
    ;; Check risk score <= 75
    (if (i32.gt_s (local.get $risk_score) (i32.const 75))
      (then (return (i32.const 0)))
    )
    
    ;; All checks passed
    (i32.const 1)
  )
)`;
        } else if (state.wasmFile === 'prove_location.wat') {
            watCode = `(module
  (func $abs_diff (param $a i32) (param $b i32) (result i32)
    (if (result i32)
      (i32.gt_s (local.get $a) (local.get $b))
      (then (i32.sub (local.get $a) (local.get $b)))
      (else (i32.sub (local.get $b) (local.get $a)))
    )
  )
  
  (func (export "location") (param $lat i32) (param $lng i32) (result i32)
    (local $lat_diff i32)
    (local $lng_diff i32)
    
    ;; SF coordinates: 37.773972, -122.431297 (scaled)
    (local.set $lat_diff 
      (call $abs_diff (local.get $lat) (i32.const 37773972))
    )
    (local.set $lng_diff
      (call $abs_diff (local.get $lng) (i32.const -122431297))
    )
    
    ;; Check if within 50km bounds
    (if (result i32)
      (i32.and
        (i32.lt_s (local.get $lat_diff) (i32.const 50000))
        (i32.lt_s (local.get $lng_diff) (i32.const 50000))
      )
      (then (i32.const 1))
      (else (i32.const 0))
    )
  )
)`;
        } else if (state.wasmFile === 'prove_ai_content.wat') {
            watCode = `(module
  (func (export "verify_ai_content") (param $content_hash i32) (param $signature i32) (result i32)
    (local $expected i32)
    
    ;; Calculate expected signature using XOR with magic constant
    (local.set $expected 
      (i32.xor (local.get $content_hash) (i32.const 0x5A5A5A5A))
    )
    
    ;; Verify signature matches expected value
    (if (result i32)
      (i32.eq (local.get $signature) (local.get $expected))
      (then (i32.const 1))
      (else (i32.const 0))
    )
  )
)`;
        } else if (state.wasmFile && state.wasmFile.includes('pasted_')) {
            watCode = `(module
  ;; Generated from pasted C code
  (func (export "main") (result i32)
    ;; Implementation based on pasted C code
    (i32.const 1)
  )
)`;
        } else {
            watCode = `(module
  (func (export "main") (result i32)
    (i32.const 1)
  )
)`;
        }
        
        codeElement.textContent = watCode;
        
        if (typeof Prism !== 'undefined') {
            Prism.highlightElement(codeElement);
        }
    };

    // Use event delegation for dynamically created buttons
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.action-btn');
        if (!btn) return;
        
        // Replace "Wasm File" text
        if (btn.textContent.includes('Wasm File')) {
            btn.innerHTML = btn.innerHTML.replace('Wasm File', 'WASM Program');
        }
        
        // Extract proof ID from onclick attribute
        const onclickAttr = btn.getAttribute('onclick');
        if (onclickAttr) {
            if (onclickAttr.includes('showCProgram')) {
                e.preventDefault();
                const proofId = extractProofId(onclickAttr);
                if (proofId) window.showCProgram(proofId);
            } else if (onclickAttr.includes('showWasm')) {
                e.preventDefault();
                const proofId = extractProofId(onclickAttr);
                if (proofId) window.showWasmProgram(proofId);
            }
        }
    });

    // Fix existing buttons
    function fixButtons() {
        document.querySelectorAll('.action-btn').forEach(btn => {
            if (btn.textContent.includes('Wasm File')) {
                btn.innerHTML = btn.innerHTML.replace('Wasm File', 'WASM Program');
            }
        });
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixButtons);
    } else {
        fixButtons();
    }

    // Observe for new proof cards
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    if (node.classList && node.classList.contains('proof-card')) {
                        fixButtons();
                        
                        // Extract proof ID and store state
                        const proofIdMatch = node.id?.match(/proof-(.+)/);
                        if (proofIdMatch) {
                            const proofId = proofIdMatch[1];
                            const functionText = node.querySelector('.metric-value-inline')?.textContent || 'main()';
                            const funcMatch = functionText.match(/(\w+)\(/);
                            const functionName = funcMatch ? funcMatch[1] : 'main';
                            
                            let wasmFile = 'custom.wat';
                            if (functionName === 'kyc_check' || functionText.includes('kyc')) wasmFile = 'prove_kyc.wat';
                            else if (functionName === 'location' || functionText.includes('location')) wasmFile = 'prove_location.wat';
                            else if (functionName === 'verify_ai_content' || functionName === 'prove_ai_content' || functionText.includes('ai_content')) wasmFile = 'prove_ai_content.wat';
                            else if (functionText.includes('pasted_')) {
                                const pastedMatch = functionText.match(/pasted_\d+/);
                                if (pastedMatch) wasmFile = pastedMatch[0] + '.wat';
                            }
                            
                            window.proofStates[proofId] = {
                                functionName: functionName,
                                wasmFile: wasmFile
                            };
                        }
                    }
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    console.log('✅ zkEngine button fixes fully applied!');
})();
</script>
EOF

# Apply the fix
if sed -i.tmp '/<\/body>/i\
'"$(cat /tmp/zkengine-fix.js)" "$HTML_FILE"; then
    echo "✅ Fix applied successfully!"
    rm "$HTML_FILE.tmp"
    rm /tmp/zkengine-fix.js
else
    echo "❌ Error: Failed to apply fix"
    mv "$HTML_FILE.tmp" "$HTML_FILE"  # Restore original
    exit 1
fi

echo ""
echo "📋 Next steps:"
echo "1. Refresh your browser to see the changes"
echo "2. The C Program and WASM Program buttons should now work"
echo ""
echo "💡 To revert changes:"
echo "   cp $BACKUP_FILE $HTML_FILE"
echo ""
echo "✨ Done!"
