#!/bin/bash

# zkEngine Consolidation Script - Simple Version
set -e

echo "🚀 Consolidating zkEngine Demo into ~/agentkit/"
echo "============================================="

cd ~/agentkit

# Create directories
echo "Creating directories..."
mkdir -p zkengine_binary wasm_files c_sources proofs backup_$(date +%Y%m%d_%H%M%S)

# Copy zkEngine binary if it exists
if [ -f ~/agentic/zkEngine_dev/wasm_file ]; then
    echo "Copying zkEngine binary..."
    cp ~/agentic/zkEngine_dev/wasm_file zkengine_binary/zkengine
    chmod +x zkengine_binary/zkengine
else
    echo "Warning: zkEngine binary not found at ~/agentic/zkEngine_dev/wasm_file"
fi

# Copy WASM files if they exist
if [ -d ~/agentic/example_wasms ]; then
    echo "Copying WASM files..."
    cp ~/agentic/example_wasms/*.wat wasm_files/ 2>/dev/null || true
    cp ~/agentic/example_wasms/*.wasm wasm_files/ 2>/dev/null || true
else
    echo "Warning: WASM files not found at ~/agentic/example_wasms"
fi

echo ""
echo "✅ Basic consolidation complete!"
echo ""
echo "📁 Structure created:"
echo "   ~/agentkit/zkengine_binary/  - zkEngine executable"
echo "   ~/agentkit/wasm_files/        - WASM programs"
echo "   ~/agentkit/proofs/            - For generated proofs"
