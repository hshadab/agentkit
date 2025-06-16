#!/bin/bash

echo "🔧 Fixing zkEngine Agent Kit to show 3 core proof types..."

# Update the HTML file to show only 3 proof types
cd ~/agentkit

# Create backup
cp static/index.html static/index.html.backup

# Update index.html with the fixed sidebar
cat > /tmp/sidebar_fix.html << 'EOF'
        <div class="example-category">
            <h4>🌐 Proof Generation Examples</h4>
            <div class="example-item" data-example="prove kyc compliance">
                <strong>Circle KYC</strong> - Prove Circle KYC compliance without revealing identity
            </div>
            <div class="example-item" data-example="verify kyc status">
                <strong>KYC Status</strong> - Zero-knowledge proof of regulatory approval
            </div>
            <div class="example-item" data-example="prove ai content authenticity">
                <strong>AI Content</strong> - Verify AI-generated content authenticity
            </div>
            <div class="example-item" data-example="authenticate ai content">
                <strong>AI Authentication</strong> - Cryptographic proof of AI content integrity
            </div>
            <div class="example-item" data-example="prove device location in San Francisco">
                <strong>SF Location</strong> - DePIN proof for SF rewards
            </div>
            <div class="example-item" data-example="prove device location in New York">
                <strong>NYC Location</strong> - DePIN proof for NYC coverage
            </div>
        </div>
EOF

# Replace the sidebar section in index.html
sed -i '/<div class="example-category">/,/<\/div>/{//!d}' static/index.html
sed -i '/<div class="example-category">/r /tmp/sidebar_fix.html' static/index.html
sed -i '/<div class="example-category">/d' static/index.html

# Update the info box
sed -i 's/Generate real cryptographic proofs using zkEngine\. All metrics shown are actual values from proof generation - no simulations\./Generate real cryptographic proofs for three key use cases: Circle KYC compliance verification, AI content authenticity, and DePIN location verification. All metrics shown are actual values from proof generation - no simulations./' static/index.html

# Update the h3 title
sed -i 's/<h3>✨ ZKP Agent Kit<\/h3>/<h3>✨ ZKP Agent Kit - 3 Core Proofs<\/h3>/' static/index.html

# Create prove_kyc.wat if it doesn't exist
if [ ! -f "zkengine/example_wasms/prove_kyc.wat" ]; then
    echo "📝 Creating prove_kyc.wat..."
    cat > zkengine/example_wasms/prove_kyc.wat << 'EOF'
(module
  ;; Circle KYC Compliance Verification
  ;; Proves KYC approval without revealing wallet identity
  
  ;; Constants
  (global $KYC_APPROVED i32 (i32.const 1))
  (global $MAX_WALLET_HASH i32 (i32.const 0x7FFFFFFF))
  
  ;; Validate wallet hash
  (func $is_valid_wallet_hash (param $wallet_hash i32) (result i32)
    ;; Wallet hash must be positive and within valid range
    (i32.and
      (i32.gt_s (local.get $wallet_hash) (i32.const 0))
      (i32.lt_s (local.get $wallet_hash) (global.get $MAX_WALLET_HASH))))
  
  ;; Validate KYC status
  (func $validate_kyc_status (param $kyc_status i32) (result i32)
    ;; Only approved status (1) returns true
    (i32.eq (local.get $kyc_status) (global.get $KYC_APPROVED)))
  
  ;; Main KYC verification function
  (func $prove_kyc (param $wallet_hash i32) (param $kyc_status i32) (result i32)
    ;; Verify wallet hash is valid
    (if (i32.eqz (call $is_valid_wallet_hash (local.get $wallet_hash)))
      (then (return (i32.const 0))))
    
    ;; Verify KYC status is approved
    (if (i32.eqz (call $validate_kyc_status (local.get $kyc_status)))
      (then (return (i32.const 0))))
    
    ;; Both validations passed - KYC compliant
    (i32.const 1))
  
  (export "main" (func $prove_kyc))
)
EOF
fi

# Update main.rs to include prove_kyc mapping
echo "📝 Updating main.rs to include prove_kyc mapping..."
sed -i '/\"prove_ai_content\" => \"prove_ai_content.wat\",/a\    "prove_kyc" => "prove_kyc.wat",' src/main.rs

echo ""
echo "✅ Fixed! Now verifying the changes..."
echo ""
echo "🔍 Checking for Circle KYC in sidebar:"
grep -i "circle\|kyc" static/index.html | head -5

echo ""
echo "🔍 Checking for removed math operations:"
grep -i "add.*Addition\|multiply.*Multiplication" static/index.html || echo "✅ Math operations removed"

echo ""
echo "🔍 Checking if prove_kyc.wat exists:"
ls -la zkengine/example_wasms/prove_kyc.wat 2>/dev/null || echo "❌ prove_kyc.wat not found"

echo ""
echo "🚀 To start the system:"
echo "  1. Terminal 1: cd ~/agentkit && cargo run"
echo "  2. Terminal 2: cd ~/agentkit && source langchain_env/bin/activate && python langchain_service.py"
echo "  3. Browser: http://localhost:8001"

echo ""
echo "📋 Test the KYC proof with:"
echo "  - 'prove kyc compliance'"
echo "  - 'verify kyc status'"
echo "  - 'kyc proof'"

