#!/bin/bash

echo "Debugging Blockchain Verification Timeout"
echo "========================================"
echo ""
echo "This test will help identify where the verification is timing out."
echo ""

# Generate an AI content proof
echo "1. Generating AI content proof..."
curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "explain AI content authenticity"}' | jq '.intent' 2>/dev/null || echo "Error: Check server"

echo ""
echo "2. Wait for proof to complete, then click 'Verify on Ethereum'"
echo ""
echo "3. Check browser console for these debug logs in order:"
echo ""
echo "Expected sequence:"
echo "✓ 'Button found: true, StatusDiv found: true'"
echo "✓ 'Fetching proof data...'"
echo "✓ 'Proof data fetched in Xms'"
echo "✓ 'Proof data keys: proof, publicInputs, proofIdBytes32, public_signals'"
echo "✓ '=== Starting verifyProofOnChain ==='"
echo "✓ 'IsConnected: true'"
echo "✓ 'Contract initialized at: 0x...'"
echo "✓ 'Estimated gas: XXXXX'"
echo "✓ 'Sending transaction with params:'"
echo "✓ 'Transaction hash received: 0x...'"
echo ""
echo "If it stops at any point, that's where the timeout is occurring."
echo ""
echo "Common issues:"
echo "1. Stops after 'Proof data fetched' → verifyProofOnChain not being called"
echo "2. Stops after 'Starting verifyProofOnChain' → Contract not initialized"
echo "3. Stops after 'Estimated gas' → MetaMask not prompting"
echo "4. No 'Transaction hash' → User rejected or network issue"