#!/bin/bash
# Test the regex parser directly

cd /home/hshadab/agentkit/circle

echo "Testing regex parser with complex multi-person conditional transfer..."
echo ""

COMMAND="If Alice is KYC verified send her 0.05 USDC on Solana and if Bob is KYC verified send him 0.03 USDC on Ethereum"

echo "Command: $COMMAND"
echo ""
echo "Running parser..."
echo ""

node workflowParser_generic_final.js "$COMMAND"