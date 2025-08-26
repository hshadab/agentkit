#!/bin/bash

echo "Debugging Phantom Wallet Ethereum Verification"
echo "============================================="
echo ""

echo "1. Phantom Wallet Checks:"
echo "   - Open Phantom wallet"
echo "   - Check you're on Ethereum network (not Solana)"
echo "   - Ensure you're on Sepolia testnet"
echo "   - Check if you have ETH balance on Sepolia"
echo ""

echo "2. Testing backend proof endpoint directly..."
PROOF_ID="test_proof_$(date +%s)"
echo "   Testing with proof ID: $PROOF_ID"
START_TIME=$(date +%s)
curl -s http://localhost:8001/api/proof/$PROOF_ID/ethereum -w "\n" | jq '.' 2>/dev/null | head -20
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo "   Response time: ${DURATION} seconds"

echo ""
echo "3. Browser Console Checks (F12):"
echo "   When you click 'Verify on Ethereum', look for:"
echo ""
echo "   ✓ Connected to Phantom wallet: 0x..."
echo "   ✓ Current network ID: 11155111 (should be Sepolia)"
echo "   ✓ Contract address: 0x7eCe59B5e5fBEbf8761642352d70ADdCA7B38d29"
echo "   ✓ Account balance: X.XXX ETH"
echo ""
echo "   If network ID is NOT 11155111:"
echo "   → In Phantom: Settings → Developer Settings → Change Network → Ethereum → Sepolia"
echo ""

echo "4. Common Phantom + Ethereum issues:"
echo "   - Phantom defaults to Solana network"
echo "   - Need to manually switch to Ethereum in Phantom"
echo "   - Then switch to Sepolia testnet"
echo "   - Phantom's Ethereum RPC might be different/slower"
echo ""

echo "5. Quick test - Generate a fresh proof:"
curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate location proof"}' | jq '.intent' 2>/dev/null

echo ""
echo "6. Alternative: Force MetaMask usage"
echo "   - Disable Phantom extension temporarily"
echo "   - Install/enable MetaMask"
echo "   - Page will auto-detect MetaMask instead"