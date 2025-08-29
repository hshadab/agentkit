#!/bin/bash

# Test the 14-parameter zkML backend

echo "Testing 14-parameter zkML proof generation..."
echo "============================================"

# Generate proof
RESPONSE=$(curl -s -X POST http://localhost:8002/zkml/prove \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "test-14param-full",
    "agentType": "financial",
    "amount": 0.01,
    "operation": "gateway_transfer",
    "riskScore": 0.3
  }')

SESSION_ID=$(echo "$RESPONSE" | jq -r .sessionId)
echo "Session ID: $SESSION_ID"
echo ""

# Wait for proof generation
echo "Waiting 10 seconds for proof generation..."
sleep 10

# Check status
echo ""
echo "Checking proof status..."
STATUS=$(curl -s http://localhost:8002/zkml/status/$SESSION_ID)

echo "$STATUS" | jq '.'

# Check if it's using 14 parameters
PARAM_COUNT=$(echo "$STATUS" | jq '.proof.proofData.publicInputs | length')
echo ""
echo "Number of parameters in proof: $PARAM_COUNT"

if [ "$PARAM_COUNT" = "14" ]; then
  echo "✅ SUCCESS: Using full 14-parameter model!"
else
  echo "❌ ERROR: Not using 14 parameters (found $PARAM_COUNT)"
fi

# Check if it's marked as real
IS_REAL=$(echo "$STATUS" | jq -r '.proof.real14ParamModel')
if [ "$IS_REAL" = "true" ]; then
  echo "✅ Proof marked as REAL 14-parameter model"
else
  echo "⚠️ Warning: Proof not marked as real 14-param model"
fi

echo ""
echo "Model used: $(echo "$STATUS" | jq -r '.proof.model')"
echo "Framework: $(echo "$STATUS" | jq -r '.proof.framework')"
echo "Parameters: $(echo "$STATUS" | jq -r '.proof.parameters')"