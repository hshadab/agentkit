#!/bin/bash
# Test workflow execution directly, bypassing the chat interface

cd /home/hshadab/agentkit/circle

echo "Testing direct workflow execution with regex parser..."
echo ""

COMMAND="If Alice is KYC verified send her 0.05 USDC on Solana and if Bob is KYC verified send him 0.03 USDC on Ethereum"

echo "Command: $COMMAND"
echo ""
echo "Executing workflow..."
echo ""

# Set environment variables
export ZKENGINE_BINARY="$HOME/agentkit/zkengine_binary/zkEngine"
export WASM_DIR="$HOME/agentkit/zkengine_binary"
export PROOFS_DIR="$HOME/agentkit/proofs"

# Execute the workflow directly
node workflowCLI_generic.js "$COMMAND"