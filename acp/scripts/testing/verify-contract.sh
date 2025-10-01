#!/bin/bash

# Script to verify the Groth16Verifier contract on Basescan
# This will make the source code visible on the explorer

CONTRACT_ADDRESS="0x3c4323fdBd592aaCF37C33dbF90e492CEe249599"
NETWORK="base-sepolia"

echo "📝 Verifying Groth16Verifier on Basescan"
echo "=========================================="
echo ""
echo "Contract Address: $CONTRACT_ADDRESS"
echo "Network: Base Sepolia"
echo ""

# Check if BASESCAN_API_KEY is set
if [ -z "$BASESCAN_API_KEY" ]; then
    echo "⚠️  No BASESCAN_API_KEY found in environment"
    echo ""
    echo "To get a free API key:"
    echo "1. Go to: https://basescan.org/register"
    echo "2. Create a free account"
    echo "3. Go to: https://basescan.org/myapikey"
    echo "4. Create a new API key"
    echo ""
    echo "Then run:"
    echo "  export BASESCAN_API_KEY=your_key_here"
    echo "  ./verify-contract.sh"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📋 MANUAL VERIFICATION (Alternative):"
    echo ""
    echo "1. Go to: https://sepolia.basescan.org/verifyContract?a=$CONTRACT_ADDRESS"
    echo ""
    echo "2. Fill in the form:"
    echo "   - Contract Address: $CONTRACT_ADDRESS (auto-filled)"
    echo "   - Compiler Type: Solidity (Single file)"
    echo "   - Compiler Version: v0.8.17+commit.8df45f5f"
    echo "   - Open Source License Type: GNU General Public License v3.0 (GNU GPLv3)"
    echo ""
    echo "3. Click 'Continue'"
    echo ""
    echo "4. Paste the contract source code from:"
    echo "   contracts/AgentAuthorizationSimpleVerifier.sol"
    echo ""
    echo "5. Optimization: No"
    echo ""
    echo "6. Click 'Verify and Publish'"
    echo ""
    echo "✅ The contract should verify successfully!"
    echo ""
    exit 1
fi

echo "✅ API Key found"
echo ""

# Get the contract source code
SOURCE_CODE=$(cat contracts/AgentAuthorizationSimpleVerifier.sol)

# Prepare the API request
echo "📤 Submitting verification request to Basescan API..."

RESPONSE=$(curl -s -X POST \
    "https://api-sepolia.basescan.org/api" \
    -d "module=contract" \
    -d "action=verifysourcecode" \
    -d "contractaddress=$CONTRACT_ADDRESS" \
    -d "sourceCode=$SOURCE_CODE" \
    -d "codeformat=solidity-single-file" \
    -d "contractname=Groth16Verifier" \
    -d "compilerversion=v0.8.17+commit.8df45f5f" \
    -d "optimizationUsed=0" \
    -d "runs=200" \
    -d "constructorArguements=" \
    -d "licenseType=5" \
    -d "apikey=$BASESCAN_API_KEY")

echo ""
echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | grep -q '"status":"1"'; then
    GUID=$(echo "$RESPONSE" | jq -r '.result' 2>/dev/null)
    echo "✅ Verification submitted successfully!"
    echo "   GUID: $GUID"
    echo ""
    echo "⏳ Checking verification status..."
    sleep 5

    # Check status
    STATUS_RESPONSE=$(curl -s "https://api-sepolia.basescan.org/api?module=contract&action=checkverifystatus&guid=$GUID&apikey=$BASESCAN_API_KEY")
    echo ""
    echo "Status:"
    echo "$STATUS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATUS_RESPONSE"
    echo ""

    if echo "$STATUS_RESPONSE" | grep -q "Pass - Verified"; then
        echo "🎉 CONTRACT VERIFIED SUCCESSFULLY!"
        echo ""
        echo "🔗 View verified contract:"
        echo "   https://sepolia.basescan.org/address/$CONTRACT_ADDRESS#code"
    else
        echo "⏳ Verification pending. Check status at:"
        echo "   https://sepolia.basescan.org/address/$CONTRACT_ADDRESS#code"
    fi
else
    echo "❌ Verification failed"
    echo ""
    echo "Error details:"
    echo "$RESPONSE" | jq '.result' 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo "💡 Try manual verification instead (see instructions above)"
fi
