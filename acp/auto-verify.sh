#!/bin/bash
set -e

CONTRACT_ADDRESS="0x3c4323fdBd592aaCF37C33dbF90e492CEe249599"
CONTRACT_NAME="Groth16Verifier"
COMPILER_VERSION="v0.8.17+commit.8df45f5f"

echo "🔐 Automated Contract Verification for Basescan"
echo "==============================================="
echo ""

# Function to URL encode the source code
urlencode() {
    local string="${1}"
    local strlen=${#string}
    local encoded=""
    local pos c o

    for (( pos=0 ; pos<strlen ; pos++ )); do
        c=${string:$pos:1}
        case "$c" in
            [-_.~a-zA-Z0-9] ) o="${c}" ;;
            * ) printf -v o '%%%02x' "'$c"
        esac
        encoded+="${o}"
    done
    echo "${encoded}"
}

if [ -z "$BASESCAN_API_KEY" ]; then
    echo "⚠️  No BASESCAN_API_KEY found!"
    echo ""
    echo "Quick Setup (2 minutes):"
    echo ""
    echo "1️⃣  Get a FREE API key:"
    echo "   Open: https://basescan.org/register"
    echo ""
    echo "2️⃣  After creating account, get your API key:"
    echo "   Go to: https://basescan.org/myapikey"
    echo "   Click: 'Add' to create a new API key"
    echo ""
    echo "3️⃣  Run this command with your key:"
    echo "   export BASESCAN_API_KEY='your_api_key_here'"
    echo "   ./auto-verify.sh"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "OR verify manually (30 seconds):"
    echo "1. Open: http://localhost:9000/verify-helper.html"
    echo "2. Click the buttons to auto-fill the Basescan form"
    echo "3. Done! ✅"
    echo ""
    exit 1
fi

echo "✅ API Key found: ${BASESCAN_API_KEY:0:10}..."
echo ""

# Read the contract source code
SOURCE_FILE="contracts/AgentAuthorizationSimpleVerifier.sol"
if [ ! -f "$SOURCE_FILE" ]; then
    echo "❌ Source file not found: $SOURCE_FILE"
    exit 1
fi

echo "📄 Reading contract source from: $SOURCE_FILE"
SOURCE_CODE=$(cat "$SOURCE_FILE")

echo "📦 Contract Details:"
echo "   Address: $CONTRACT_ADDRESS"
echo "   Name: $CONTRACT_NAME"
echo "   Compiler: $COMPILER_VERSION"
echo ""

# URL encode the source code
echo "🔄 Encoding source code..."
ENCODED_SOURCE=$(urlencode "$SOURCE_CODE")

echo "📤 Submitting verification to Basescan API..."
echo ""

# Submit to Basescan API
RESPONSE=$(curl -s -X POST "https://api-sepolia.basescan.org/api" \
    --data-urlencode "module=contract" \
    --data-urlencode "action=verifysourcecode" \
    --data-urlencode "contractaddress=$CONTRACT_ADDRESS" \
    --data-urlencode "sourceCode@$SOURCE_FILE" \
    --data-urlencode "codeformat=solidity-single-file" \
    --data-urlencode "contractname=$CONTRACT_NAME" \
    --data-urlencode "compilerversion=$COMPILER_VERSION" \
    --data-urlencode "optimizationUsed=0" \
    --data-urlencode "runs=200" \
    --data-urlencode "licenseType=5" \
    --data-urlencode "apikey=$BASESCAN_API_KEY")

echo "📨 Response from Basescan:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | grep -q '"status":"1"'; then
    GUID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['result'])" 2>/dev/null)

    if [ -n "$GUID" ]; then
        echo "✅ Verification submitted successfully!"
        echo "   Submission GUID: $GUID"
        echo ""
        echo "⏳ Waiting 10 seconds for verification to complete..."
        sleep 10

        # Check status
        echo "🔍 Checking verification status..."
        STATUS_RESPONSE=$(curl -s "https://api-sepolia.basescan.org/api?module=contract&action=checkverifystatus&guid=$GUID&apikey=$BASESCAN_API_KEY")

        echo ""
        echo "📊 Verification Status:"
        echo "$STATUS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$STATUS_RESPONSE"
        echo ""

        if echo "$STATUS_RESPONSE" | grep -q "Pass - Verified"; then
            echo "🎉 CONTRACT VERIFIED SUCCESSFULLY!"
            echo ""
            echo "🔗 View verified contract at:"
            echo "   https://sepolia.basescan.org/address/$CONTRACT_ADDRESS#code"
            echo ""
            echo "✨ Source code is now public and readable on the explorer!"
        elif echo "$STATUS_RESPONSE" | grep -q "Pending"; then
            echo "⏳ Verification is pending..."
            echo "   Check status in 1-2 minutes at:"
            echo "   https://sepolia.basescan.org/address/$CONTRACT_ADDRESS#code"
        else
            echo "⚠️  Verification status unknown. Please check manually:"
            echo "   https://sepolia.basescan.org/address/$CONTRACT_ADDRESS#code"
        fi
    else
        echo "⚠️  Could not extract GUID from response"
        echo "   Please check manually at:"
        echo "   https://sepolia.basescan.org/address/$CONTRACT_ADDRESS#code"
    fi
else
    echo "❌ Verification submission failed"
    echo ""
    ERROR_MSG=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('result', 'Unknown error'))" 2>/dev/null)
    echo "Error: $ERROR_MSG"
    echo ""
    echo "💡 Common issues:"
    echo "   - Contract already verified"
    echo "   - Wrong compiler version"
    echo "   - Source code doesn't match bytecode"
    echo ""
    echo "Try manual verification instead:"
    echo "   http://localhost:9000/verify-helper.html"
fi
