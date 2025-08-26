#!/bin/bash

echo "Resetting Ethereum Verification Environment"
echo "=========================================="
echo ""

echo "1. Clearing browser state..."
echo "   - Open Chrome DevTools (F12)"
echo "   - Go to Application tab"
echo "   - Clear Storage > Clear site data"
echo "   - Or use Incognito/Private mode"
echo ""

echo "2. Resetting MetaMask..."
echo "   - Click MetaMask extension"
echo "   - Ensure you're on Sepolia Testnet"
echo "   - Settings > Advanced > Clear activity tab data"
echo "   - Lock and unlock MetaMask"
echo ""

echo "3. Testing with a fresh proof..."
curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate KYC proof"}' | jq '.intent' 2>/dev/null || echo "Error: Check server"

echo ""
echo "4. Quick connectivity test..."
echo "   Testing backend proof endpoint..."
curl -s -w "\nResponse time: %{time_total}s\n" \
     http://localhost:8001/api/proof/test_proof_123/ethereum 2>&1 | grep -E "(time|error)" | head -3

echo ""
echo "5. Alternative solutions if still timing out:"
echo "   a) Try a different browser"
echo "   b) Use a different Sepolia RPC:"
echo "      - https://sepolia.infura.io/v3/YOUR_API_KEY"
echo "      - https://rpc.sepolia.org"
echo "      - https://ethereum-sepolia.blockpi.network/v1/rpc/public"
echo "   c) Check Sepolia status: https://sepolia.etherscan.io/"
echo ""
echo "If it was working 16 hours ago and code hasn't changed,"
echo "it's almost certainly a network/state issue, not a code issue."