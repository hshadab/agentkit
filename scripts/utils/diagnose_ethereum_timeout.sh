#!/bin/bash

echo "Ethereum Verification Timeout Diagnosis"
echo "======================================"
echo ""
echo "This will help identify where the Ethereum verification is hanging."
echo ""

# Test 1: Check if the backend is responsive
echo "1. Testing backend proof endpoint..."
PROOF_ID="proof_kyc_1234567890"
echo "   Fetching proof data for test ID: $PROOF_ID"
curl -s -w "\n   Response time: %{time_total}s\n" \
     http://localhost:8001/api/proof/$PROOF_ID/ethereum | head -5

echo ""
echo "2. Generate a new proof and test verification:"
echo "   Generating KYC proof..."
curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate KYC proof"}' | jq '.intent' 2>/dev/null

echo ""
echo "3. In the browser, open Developer Tools (F12) and check:"
echo "   a) Network tab - Are there any pending requests?"
echo "   b) Console tab - Look for these logs in order:"
echo ""
echo "   Expected sequence when clicking 'Verify on Ethereum':"
echo "   ✓ === Pre-verification checks ==="
echo "   ✓ Contract exists: true"
echo "   ✓ Testing contract accessibility..."
echo "   ✓ Current network ID: [number]"
echo "   ✓ Account balance: [amount] ETH"
echo "   ✓ Fetched proof data structure: [keys]"
echo "   ✓ Starting gas estimation at [timestamp]"
echo "   ✗ If it stops here → Gas estimation is hanging"
echo "   ✓ Gas estimation completed at [timestamp]"
echo "   ✓ Sending transaction with params:"
echo "   ✓ Transaction hash received: 0x..."
echo ""
echo "4. Common causes of timeout:"
echo "   - Wrong network (should be Sepolia testnet)"
echo "   - Contract not deployed on current network"
echo "   - MetaMask not connected or locked"
echo "   - Insufficient ETH for gas"
echo "   - RPC endpoint issues"
echo ""
echo "5. Quick fixes to try:"
echo "   - Switch MetaMask to Sepolia testnet"
echo "   - Refresh the page and reconnect wallet"
echo "   - Check if you have test ETH on Sepolia"
echo "   - Try a different browser"