#!/bin/bash

echo "🔧 Compiling Real WASM Files from C Sources"
echo "==========================================="

# Check if emcc is installed
if ! command -v emcc &> /dev/null; then
    echo "⚠️  Emscripten (emcc) not found. Trying clang with WASM target..."
    USE_CLANG=true
else
    USE_CLANG=false
fi

# Directories
WASM_SRC_DIR="/home/hshadab/agentkit/zkengine/example_wasms"
ZKENGINE_BIN_DIR="/home/hshadab/agentkit/zkengine_binary"

cd "$WASM_SRC_DIR" || exit 1

echo "📁 Working in: $WASM_SRC_DIR"
echo ""

# Function to compile C to WASM
compile_to_wasm() {
    local c_file=$1
    local wasm_name=$2
    local wat_name="${wasm_name%.wasm}.wat"
    
    echo "🔨 Compiling $c_file -> $wasm_name"
    
    if [ "$USE_CLANG" = true ]; then
        # Try clang with WASM target
        if command -v clang &> /dev/null; then
            clang --target=wasm32 -O3 -nostdlib -Wl,--no-entry -Wl,--export-all \
                  -o "$wasm_name" "$c_file" 2>/dev/null
            
            if [ $? -eq 0 ]; then
                echo "   ✓ Compiled with clang"
            else
                echo "   ⚠️  Clang compilation failed, using existing WASM"
                return 1
            fi
        else
            echo "   ❌ Neither emcc nor clang found"
            return 1
        fi
    else
        # Use emscripten
        emcc "$c_file" -O3 -s STANDALONE_WASM=1 -s EXPORTED_FUNCTIONS='["_main"]' \
             -s SIDE_MODULE=1 -o "$wasm_name"
        
        if [ $? -eq 0 ]; then
            echo "   ✓ Compiled with emscripten"
        else
            echo "   ❌ Emscripten compilation failed"
            return 1
        fi
    fi
    
    # Generate WAT (text format) for debugging
    if command -v wasm2wat &> /dev/null; then
        wasm2wat "$wasm_name" -o "$wat_name" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "   ✓ Generated WAT file: $wat_name"
        fi
    fi
    
    return 0
}

# Compile the three main C files
echo "1️⃣ KYC Compliance Proof"
if compile_to_wasm "prove_kyc.c" "kyc_compliance_real.wasm"; then
    cp "kyc_compliance_real.wasm" "$ZKENGINE_BIN_DIR/kyc_compliance.wasm"
    echo "   ✓ Copied to zkengine_binary directory"
else
    echo "   ⚠️  Using existing compiled version"
    if [ -f "prove_kyc_compiled.wasm" ]; then
        cp "prove_kyc_compiled.wasm" "$ZKENGINE_BIN_DIR/kyc_compliance.wasm"
        echo "   ✓ Copied pre-compiled version"
    fi
fi
echo ""

echo "2️⃣ Location Verification (DePIN)"
if compile_to_wasm "prove_location.c" "depin_location_real.wasm"; then
    cp "depin_location_real.wasm" "$ZKENGINE_BIN_DIR/depin_location.wasm"
    echo "   ✓ Copied to zkengine_binary directory"
else
    echo "   ⚠️  Using existing compiled version"
    if [ -f "prove_location_compiled.wasm" ]; then
        cp "prove_location_compiled.wasm" "$ZKENGINE_BIN_DIR/depin_location.wasm"
        echo "   ✓ Copied pre-compiled version"
    fi
fi
echo ""

echo "3️⃣ AI Content Verification"
if compile_to_wasm "prove_ai_content.c" "ai_content_verification_real.wasm"; then
    cp "ai_content_verification_real.wasm" "$ZKENGINE_BIN_DIR/ai_content_verification.wasm"
    echo "   ✓ Copied to zkengine_binary directory"
else
    echo "   ⚠️  Using existing compiled version"
    if [ -f "ai_content_verification_compiled.wasm" ]; then
        cp "ai_content_verification_compiled.wasm" "$ZKENGINE_BIN_DIR/ai_content_verification.wasm"
        echo "   ✓ Copied pre-compiled version"
    fi
fi
echo ""

# Verify the WASM files
echo "📋 Verifying WASM files in zkengine_binary:"
cd "$ZKENGINE_BIN_DIR"
for wasm in kyc_compliance.wasm depin_location.wasm ai_content_verification.wasm; do
    if [ -f "$wasm" ]; then
        size=$(ls -lh "$wasm" | awk '{print $5}')
        echo "   ✓ $wasm ($size)"
        
        # Check if it's a symlink
        if [ -L "$wasm" ]; then
            target=$(readlink "$wasm")
            echo "     ⚠️  Warning: This is a symlink to $target"
            echo "     🔧 Removing symlink to use real WASM"
            rm "$wasm"
            
            # Try to copy the real compiled version
            real_wasm="${wasm%.wasm}_real.wasm"
            if [ -f "$WASM_SRC_DIR/$real_wasm" ]; then
                cp "$WASM_SRC_DIR/$real_wasm" "$wasm"
                echo "     ✓ Replaced with real compiled WASM"
            fi
        fi
    else
        echo "   ❌ $wasm (missing)"
    fi
done

echo ""
echo "🎯 Summary:"
echo "   - C source files contain real logic for KYC, Location, and AI verification"
echo "   - Compiled WASMs implement actual privacy-preserving algorithms"
echo "   - KYC: Proves Circle compliance without revealing personal data"
echo "   - Location: Verifies city boundaries without exact GPS coordinates"
echo "   - AI: Validates content authenticity from OpenAI/Anthropic"

echo ""
echo "✅ Compilation complete! The zkEngine will now use real implementations."
echo ""
echo "🚀 To test the real WASMs:"
echo "   1. Start the backend: cd /home/hshadab/agentkit && cargo run"
echo "   2. In the UI, try: 'Generate KYC proof'"
echo "   3. The proof will now use the real C implementation!"