#!/bin/bash

echo "Testing Gateway zkML with Transfer Links"
echo "========================================"
echo ""

# Step 1: Generate zkML proof (14 parameters)
echo "STEP 1: Generating 14-parameter zkML proof..."
PROOF_RESPONSE=$(curl -s -X POST http://localhost:8002/zkml/prove \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "gateway-transfer-test",
    "agentType": "financial",
    "amount": 0.01,
    "operation": "gateway_transfer",
    "riskScore": 0.15
  }')

SESSION_ID=$(echo "$PROOF_RESPONSE" | jq -r .sessionId)
echo "Session ID: $SESSION_ID"

# Wait for proof
echo "Waiting for proof generation..."
sleep 8

# Get proof status
PROOF_STATUS=$(curl -s http://localhost:8002/zkml/status/$SESSION_ID)
echo "Proof Status: $(echo "$PROOF_STATUS" | jq -r .status)"

# Step 2: On-chain verification
echo ""
echo "STEP 2: On-chain verification..."
VERIFY_RESPONSE=$(curl -s -X POST http://localhost:3003/zkml/verify \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"proof\": $(echo "$PROOF_STATUS" | jq .proof.proofData),
    \"network\": \"sepolia\",
    \"useRealChain\": true,
    \"inputs\": $(echo "$PROOF_STATUS" | jq .proof.proofData.publicInputs)
  }")

TX_HASH=$(echo "$VERIFY_RESPONSE" | jq -r .txHash)
echo "Verification TX: $TX_HASH"
echo "View on Etherscan: https://sepolia.etherscan.io/tx/$TX_HASH"

echo ""
echo "STEP 3: Gateway Transfers (Expected)..."
echo "========================================="
echo ""
echo "The UI should now execute Gateway transfers and display:"
echo ""
echo "Expected Transaction Links:"
echo "  🔷 Ethereum Sepolia: https://sepolia.etherscan.io/tx/0x..."
echo "  🟦 Base Sepolia:     https://sepolia.basescan.org/tx/0x..."
echo "  🔺 Avalanche Fuji:   https://testnet.snowtrace.io/tx/0x..."
echo ""
echo "Note: Gateway transfers require:"
echo "1. Valid Circle API key (currently using sandbox key)"
echo "2. Sufficient USDC balance in Gateway wallet"
echo "3. Proper EIP-712 signature from user wallet"
echo ""
echo "If transfers aren't showing, check:"
echo "- Browser console for Gateway API responses"
echo "- Network tab for /v1/transfer requests to gateway-api-testnet.circle.com"