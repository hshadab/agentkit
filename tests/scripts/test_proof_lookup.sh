#!/bin/bash

echo "🧪 Testing proof directory lookup..."

# Test 1: Check if proof_kyc_1752599287763 can be found
PROOF_ID="proof_kyc_1752599287763"
echo -e "\n📋 Test 1: Looking for $PROOF_ID"

# Check if the symbolic link exists
if [ -L "proofs/$PROOF_ID" ]; then
    echo "✅ Found symbolic link: proofs/$PROOF_ID"
    TARGET=$(readlink "proofs/$PROOF_ID")
    echo "   → Points to: $TARGET"
else
    echo "❌ No symbolic link found"
fi

# Check if the actual directory exists
if [ -d "proofs/prove_kyc_1752599287763" ]; then
    echo "✅ Found actual directory: proofs/prove_kyc_1752599287763"
    ls -la "proofs/prove_kyc_1752599287763/" | grep -E "(proof.bin|public.json|metadata.json)"
else
    echo "❌ No actual directory found"
fi

# Test 2: Test API endpoint (if backend is running)
echo -e "\n📋 Test 2: Testing API endpoint"
if curl -s http://localhost:8001/test > /dev/null 2>&1; then
    echo "✅ Backend is running"
    
    # Test proof export endpoint
    echo "🔍 Testing proof export endpoint..."
    RESPONSE=$(curl -s http://localhost:8001/api/proof/$PROOF_ID/ethereum)
    if echo "$RESPONSE" | grep -q "error"; then
        echo "❌ Error from API: $(echo $RESPONSE | jq -r '.error // "Unknown error"')"
    else
        echo "✅ API successfully found proof!"
        echo "   Proof type: $(echo $RESPONSE | jq -r '.proofType // "unknown"')"
    fi
else
    echo "⚠️  Backend is not running. Start it with: cd /home/hshadab/agentkit && cargo run"
fi

echo -e "\n✅ Test complete!"