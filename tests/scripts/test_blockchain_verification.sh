#!/bin/bash

echo "Testing Blockchain Verification Display"
echo "======================================="
echo ""
echo "This test will generate a proof and then you can manually click 'Verify on Ethereum'"
echo "to see if the transaction link and on-chain data are displayed correctly."
echo ""

# Generate a KYC proof
echo "1. Generating KYC proof..."
curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate KYC proof"}' | jq '.intent' 2>/dev/null || echo "Error: Check server"

echo ""
echo "2. Wait for the proof to complete (check browser for 'COMPLETE' status)"
echo ""
echo "3. Click 'Verify on Ethereum' button"
echo ""
echo "Expected behavior after clicking:"
echo "✓ Status div should appear immediately showing 'Fetching proof data...'"
echo "✓ After data is fetched, should show 'Submitting to blockchain...'"
echo "✓ After verification completes, should show:"
echo "  - Transaction hash with Etherscan link"
echo "  - Block number"
echo "  - Gas used"
echo "  - 'View on Etherscan' button"
echo ""
echo "Check the browser console for debug logs:"
echo "- 'Button found: true, StatusDiv found: true'"
echo "- 'Proof data keys: ...'"
echo "- 'Calling verifyProofOnChain with proofType: ...'"
echo "- 'Verification result: ...'"
echo ""
echo "If verification hangs after 'Proof data fetched', check:"
echo "1. Is MetaMask/wallet connected?"
echo "2. Are you on the correct network?"
echo "3. Check browser console for errors"