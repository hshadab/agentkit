#!/bin/bash

echo "🧪 Testing Solana Commitment Verification"
echo "========================================"

# Test endpoint
PROOF_ID="test-proof-123"
echo -e "\n📋 Testing /api/proof/${PROOF_ID}/solana endpoint..."

# Make request
response=$(curl -s "http://localhost:8001/api/proof/${PROOF_ID}/solana")

if [ $? -eq 0 ]; then
    echo "✅ Endpoint is responding"
    echo -e "\n📦 Response:"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    
    # Check for commitment field
    if echo "$response" | grep -q "commitment"; then
        echo -e "\n✅ Commitment field is present"
        commitment=$(echo "$response" | jq -r '.commitment' 2>/dev/null)
        echo "Commitment: $commitment"
    else
        echo -e "\n❌ Commitment field is missing"
    fi
else
    echo "❌ Failed to reach endpoint"
fi

echo -e "\n📝 Next steps:"
echo "1. Deploy the commitment verifier to Solana using SOLANA_PLAYGROUND_DEPLOY.md"
echo "2. Update PROGRAM_ID in static/solana-verifier.js"
echo "3. Test with real proofs in the UI"