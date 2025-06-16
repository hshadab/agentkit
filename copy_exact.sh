#!/bin/bash

echo "Copying zkEngine files exactly as they were..."

# 1. Copy the zkEngine binary
echo "Copying zkEngine binary..."
mkdir -p ~/agentkit/agentic/zkEngine_dev/
cp ~/agentic/zkEngine_dev/wasm_file ~/agentkit/agentic/zkEngine_dev/wasm_file
chmod +x ~/agentkit/agentic/zkEngine_dev/wasm_file

# 2. Copy all WASM files with exact same structure
echo "Copying WASM files..."
mkdir -p ~/agentkit/agentic/example_wasms/
cp -r ~/agentic/example_wasms/* ~/agentkit/agentic/example_wasms/

# 3. Show what was copied
echo ""
echo "✅ Files copied to ~/agentkit/agentic/"
echo ""
echo "zkEngine binary:"
ls -la ~/agentkit/agentic/zkEngine_dev/wasm_file
echo ""
echo "WASM files:"
ls -la ~/agentkit/agentic/example_wasms/ | head -20

echo ""
echo "Done! Everything is exactly as it was, just inside ~/agentkit/"
echo ""
echo "You can now use the original commands:"
echo "~/agentkit/agentic/zkEngine_dev/wasm_file prove \\"
echo "  --wasm ~/agentkit/agentic/example_wasms/fibonacci.wasm \\"
echo "  --step 50 \\"
echo "  --out-dir ~/agentkit/proofs/test \\"
echo "  10"
