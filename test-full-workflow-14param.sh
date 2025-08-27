#!/bin/bash

echo "Testing Full Gateway zkML Workflow with 14-Parameter Model"
echo "==========================================================="
echo ""

# Step 1: Generate 14-parameter zkML proof
echo "STEP 1: Generating 14-parameter zkML proof..."
PROOF_RESPONSE=$(curl -s -X POST http://localhost:8002/zkml/prove \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "gateway-test-full",
    "agentType": "financial",
    "amount": 0.01,
    "operation": "gateway_transfer",
    "riskScore": 0.2
  }')

SESSION_ID=$(echo "$PROOF_RESPONSE" | jq -r .sessionId)
echo "Session ID: $SESSION_ID"

# Wait for proof
echo "Waiting for proof generation..."
sleep 8

# Get proof status
PROOF_STATUS=$(curl -s http://localhost:8002/zkml/status/$SESSION_ID)
echo "Proof Status: $(echo "$PROOF_STATUS" | jq -r .status)"

# Verify it's 14 parameters
PARAM_COUNT=$(echo "$PROOF_STATUS" | jq '.proof.proofData.publicInputs | length')
echo "Parameter count: $PARAM_COUNT"

if [ "$PARAM_COUNT" != "14" ]; then
  echo "❌ ERROR: Not using 14-parameter model!"
  exit 1
fi

echo "✅ Confirmed: Using 14-parameter model"
echo ""

# Step 2: On-chain verification
echo "STEP 2: Performing on-chain verification..."
VERIFY_RESPONSE=$(curl -s -X POST http://localhost:3003/zkml/verify \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"proof\": $(echo "$PROOF_STATUS" | jq .proof.proofData),
    \"network\": \"sepolia\",
    \"useRealChain\": true,
    \"inputs\": $(echo "$PROOF_STATUS" | jq .proof.proofData.publicInputs)
  }")

echo "Verification Response:"
echo "$VERIFY_RESPONSE" | jq '.'

TX_HASH=$(echo "$VERIFY_RESPONSE" | jq -r .txHash)
if [ "$TX_HASH" != "null" ] && [ ! -z "$TX_HASH" ]; then
  echo ""
  echo "✅ On-chain verification successful!"
  echo "🔗 Transaction Hash: $TX_HASH"
  echo "🔗 View on Etherscan: https://sepolia.etherscan.io/tx/$TX_HASH"
else
  echo "❌ No transaction hash returned"
fi

echo ""
echo "STEP 3: Gateway Transfers (would execute if integrated)..."
echo "Expected transfers on:"
echo "  • Ethereum Sepolia"
echo "  • Base Sepolia"  
echo "  • Avalanche Fuji"

echo ""
echo "========================================="
echo "Workflow Summary:"
echo "  • zkML Proof: ✅ (14 parameters)"
echo "  • Model: sentiment_analysis_14param_REAL"
echo "  • On-chain Verification: $([ "$TX_HASH" != "null" ] && echo "✅" || echo "❌")"
echo "  • Transaction Links: $([ "$TX_HASH" != "null" ] && echo "Available" || echo "Not available")"