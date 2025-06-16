#!/bin/bash

# Quick check of zkEngine setup

echo "🔍 Checking zkEngine setup..."
echo "============================"

# Check zkEngine binary
ZKENGINE="/home/hshadab/agentic/zkEngine_dev/wasm_file"
echo "1. zkEngine binary:"
if [ -f "$ZKENGINE" ]; then
    echo "✅ Found at: $ZKENGINE"
    echo "   Permissions: $(ls -l $ZKENGINE | awk '{print $1}')"
    echo "   Size: $(ls -lh $ZKENGINE | awk '{print $5}')"
    
    # Check if executable
    if [ -x "$ZKENGINE" ]; then
        echo "✅ Is executable"
    else
        echo "❌ NOT executable - run: chmod +x $ZKENGINE"
    fi
else
    echo "❌ NOT found at expected location"
fi

# Check if it runs at all
echo ""
echo "2. Testing zkEngine --help:"
$ZKENGINE --help 2>&1 | head -10 || echo "❌ Failed to run"

# Check WASM directory
echo ""
echo "3. WASM directory:"
WASM_DIR="/home/hshadab/agentkit/zkengine/example_wasms"
if [ -d "$WASM_DIR" ]; then
    echo "✅ Found at: $WASM_DIR"
    echo "   Recent WAT files:"
    ls -lt "$WASM_DIR"/*.wat 2>/dev/null | head -5 || echo "   No WAT files found"
else
    echo "❌ NOT found"
fi

# Check for wasm2wat
echo ""
echo "4. wasm2wat availability:"
if command -v wasm2wat &> /dev/null; then
    echo "✅ wasm2wat is installed"
    wasm2wat --version 2>&1 || true
else
    echo "⚠️  wasm2wat NOT found - install with:"
    echo "   sudo apt-get install wabt"
fi

# Alternative zkEngine location
echo ""
echo "5. Alternative zkEngine locations:"
find ~/agentic -name "wasm_file" -type f 2>/dev/null | head -5 || echo "No other wasm_file found"
find ~/zkengine -name "wasm_file" -type f 2>/dev/null | head -5 || true

echo ""
echo "============================"
echo "If zkEngine is not working, you might need to:"
echo "1. Check the correct path to zkEngine binary"
echo "2. Make sure it's executable: chmod +x <path>"
echo "3. Install wabt for wasm2wat: sudo apt-get install wabt"
