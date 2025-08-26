#!/bin/bash

echo "🔧 Setting up WASM files for zkEngine..."

ZKENGINE_DIR="$HOME/agentkit/zkengine_binary"

# Check if directory exists
if [ ! -d "$ZKENGINE_DIR" ]; then
    echo "❌ zkEngine directory not found: $ZKENGINE_DIR"
    exit 1
fi

echo "📁 Working in: $ZKENGINE_DIR"
cd "$ZKENGINE_DIR" || exit 1

echo "✅ Verifying real WASM files..."
for wasm_file in kyc_compliance_real.wasm ai_content_verification_real.wasm depin_location_real.wasm; do
    if [ -f "$wasm_file" ]; then
        size=$(stat -c%s "$wasm_file" 2>/dev/null || stat -f%z "$wasm_file" 2>/dev/null)
        echo "   ✓ $wasm_file (${size} bytes)"
    else
        echo "   ❌ $wasm_file (missing)"
    fi
done

echo "🔧 Verifying zkEngine binary..."
if [ -x "./zkEngine" ]; then
    echo "   ✓ zkEngine binary is executable"
else
    echo "   ❌ zkEngine binary is not executable or missing"
    echo "   🔧 Making zkEngine executable..."
    chmod +x ./zkEngine
    if [ -x "./zkEngine" ]; then
        echo "   ✓ zkEngine is now executable"
    else
        echo "   ❌ Failed to make zkEngine executable"
    fi
fi

echo "📋 Current WASM files in zkengine_binary directory:"
ls -la *.wasm 2>/dev/null || echo "   No WASM files found"

echo ""
echo "🎯 Function name mappings:"
echo "   'prove_kyc' → kyc_compliance_real.wasm"
echo "   'prove_location' → depin_location_real.wasm"
echo "   'prove_ai_content' → ai_content_verification_real.wasm"

echo ""
echo "✅ Setup complete! You can now test proof generation."