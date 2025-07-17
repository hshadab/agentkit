#!/bin/bash

echo "Testing workflow card updates..."

# Test 1: Execute two workflows quickly to test card separation
echo -e "\n1. Testing workflow card separation:"
echo "   Executing first workflow..."
node circle/workflowCLI_generic.js "Generate KYC proof" &
PID1=$!

sleep 2

echo "   Executing second workflow..."
node circle/workflowCLI_generic.js "Prove AI content authenticity" &
PID2=$!

# Wait for both to complete
wait $PID1
wait $PID2

echo -e "\n2. Testing transfer with explorer link:"
echo "   Executing transfer workflow..."
node circle/workflowCLI_generic.js "Send 0.01 USDC to alice on Ethereum if KYC compliant"

echo -e "\nTests completed. Check the UI to verify:"
echo "- Each workflow has its own card"
echo "- Transfer shows explorer link when complete"