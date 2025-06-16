#!/bin/bash

echo "🔧 Safely updating zkEngine Agent Kit UI..."

cd ~/agentkit

# Create a backup first
cp static/index.html static/index.html.backup_safe

# Create Python script for safe HTML manipulation
cat > /tmp/safe_update.py << 'PYTHON_SCRIPT'
import re

# Read the HTML file
with open('static/index.html', 'r') as f:
    html = f.read()

# 1. Update the title
html = html.replace(
    '<h3>✨ ZKP Agent Kit</h3>',
    '<h3>✨ ZKP Agent Kit - 3 Core Proofs</h3>'
)

# 2. Update the info box
html = html.replace(
    'Generate real cryptographic proofs using zkEngine. All metrics shown are actual values from proof generation - no simulations.',
    'Generate real cryptographic proofs for three key use cases: Circle KYC compliance verification, AI content authenticity, and DePIN location verification. All metrics shown are actual values from proof generation - no simulations.'
)

# 3. Replace the entire DePIN Location Proofs section with our new structure
old_category = '''        <div class="example-category">
            <h4>📍 DePIN Location Proofs</h4>
            <div class="example-item" data-example="prove device location in San Francisco">
                <strong>SF Location</strong> - Prove device in SF for rewards
            </div>
            <div class="example-item" data-example="prove add 15 and 27">
                <strong>add</strong> - Addition operation
            </div>
            <div class="example-item" data-example="prove multiply 8 by 7">
                <strong>multiply</strong> - Multiplication
            </div>
            <div class="example-item" data-example="prove fibonacci of 20">
                <strong>fibonacci</strong> - Recursive sequence
            </div>
            <div class="example-item" data-example="prove factorial of 5">
                <strong>factorial</strong> - Factorial computation
            </div>
            <div class="example-item" data-example="prove ai content authenticity">
                <strong>AI Content</strong> - Verify AI-generated content authenticity
            </div>
        </div>'''

new_category = '''        <div class="example-category">
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
        </div>'''

# Replace the section
html = html.replace(old_category, new_category)

# 4. Add prove_kyc.wat to getCCode function
old_getccode = '''                'prove_location.wat': `#include <stdint.h>'''

new_getccode = '''                'prove_kyc.wat': `#include <stdint.h>

// Circle KYC Compliance Proof
// Proves KYC approval without revealing wallet identity or personal details
// Returns 1 if KYC approved, 0 if not approved

#define CIRCLE_KYC_WEBHOOK 0x436972636C65  // "Circle" identifier
#define KYC_APPROVED 1
#define KYC_PENDING 0
#define KYC_REJECTED -1

// Hash validation for wallet identity
int32_t is_valid_wallet_hash(int32_t wallet_hash) {
    // Wallet hash must be non-zero and within valid range
    return (wallet_hash > 0 && wallet_hash < 0x7FFFFFFF);
}

// Validate KYC status from Circle webhook
int32_t validate_kyc_status(int32_t kyc_status) {
    // Only approved status (1) returns true
    return (kyc_status == KYC_APPROVED);
}

// Main KYC compliance verification
int32_t prove_kyc(
    int32_t wallet_hash,    // Hashed wallet address (preserves privacy)
    int32_t kyc_status      // KYC approval status from Circle (1=approved)
) {
    // Verify wallet hash is valid (non-zero, proper range)
    if (!is_valid_wallet_hash(wallet_hash)) {
        return 0;
    }
    
    // Verify KYC status is approved
    if (!validate_kyc_status(kyc_status)) {
        return 0;
    }
    
    // Both validations passed - KYC compliant
    return 1;
}

// Entry point for zkEngine proof generation
int32_t main(int32_t wallet_hash, int32_t kyc_status) {
    return prove_kyc(wallet_hash, kyc_status);
}`,
                'prove_location.wat': `#include <stdint.h>'''

html = html.replace(old_getccode, new_getccode)

# 5. Add prove_kyc.wat to getWasmCode function
old_getwasm = '''                'prove_location.wat': `(module'''

new_getwasm = '''                'prove_kyc.wat': `(module
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
)`,
                'prove_location.wat': `(module'''

html = html.replace(old_getwasm, new_getwasm)

# Write the updated HTML
with open('static/index.html', 'w') as f:
    f.write(html)

print("✅ HTML updated successfully!")
PYTHON_SCRIPT

# Run the Python script
python3 /tmp/safe_update.py

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
echo "📝 Updating main.rs..."
if ! grep -q '"prove_kyc" => "prove_kyc.wat"' src/main.rs; then
    sed -i '/\"prove_ai_content\" => \"prove_ai_content.wat\",/a\                    "prove_kyc" => "prove_kyc.wat",' src/main.rs
fi

echo ""
echo "✅ Update complete! Verifying changes..."
echo ""
echo "🔍 Checking for Circle KYC in sidebar:"
grep -i "circle kyc" static/index.html | head -3

echo ""
echo "🔍 Checking for removed math operations:"
grep -E "(add.*Addition|multiply.*Multiplication|fibonacci.*Recursive|factorial.*Factorial)" static/index.html || echo "✅ Math operations removed"

echo ""
echo "🔍 Checking if prove_kyc.wat exists:"
ls -la zkengine/example_wasms/prove_kyc.wat 2>/dev/null && echo "✅ prove_kyc.wat exists" || echo "❌ prove_kyc.wat not found"

echo ""
echo "🔍 Checking main.rs for prove_kyc mapping:"
grep "prove_kyc" src/main.rs | head -1

echo ""
echo "🚀 Please refresh your browser to see the updated UI!"
echo ""
echo "📋 Test commands:"
echo "  - prove kyc compliance"
echo "  - verify kyc status"
echo "  - prove ai content authenticity"
echo "  - prove device location in San Francisco"
