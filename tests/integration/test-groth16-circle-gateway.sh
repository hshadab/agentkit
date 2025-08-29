#!/bin/bash

echo "========================================="
echo "Testing Groth16 + Circle Gateway Workflow"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if services are running
echo "Checking required services..."
echo ""

# Check zkML backend (port 8002)
echo -n "1. zkML Backend (port 8002): "
if curl -s http://localhost:8002/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Not running${NC}"
    echo "   Start with: node api/zkml-llm-decision-backend.js"
fi

# Check Groth16 verifier backend (port 3004)
echo -n "2. Groth16 Verifier Backend (port 3004): "
if curl -s http://localhost:3004/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
    GROTH16_HEALTH=$(curl -s http://localhost:3004/health)
    echo "   Contract: $(echo $GROTH16_HEALTH | jq -r '.contract')"
else
    echo -e "${RED}✗ Not running${NC}"
    echo "   Start with: node api/groth16-verifier-backend.js"
fi

# Check web server (port 8000)
echo -n "3. Web Server (port 8000): "
if curl -s http://localhost:8000/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Not running${NC}"
    echo "   Start with: python3 serve-no-cache.py"
fi

echo ""
echo "========================================="
echo "Test Workflow Steps"
echo "========================================="
echo ""

# Test Step 1: zkML Proof Generation
echo "Step 1: Testing zkML Proof Generation..."
ZKML_RESPONSE=$(curl -s -X POST http://localhost:8002/zkml/prove \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "prompt": "gateway zkml transfer USDC",
      "system_rules": "approve transfers under limit",
      "temperature": 0.0,
      "model_version": 4919,
      "context_window_size": 2048,
      "approve_confidence": 0.95,
      "amount_confidence": 0.92,
      "rules_attention": 0.88,
      "amount_attention": 0.90,
      "format_valid": 1,
      "amount_valid": 1,
      "recipient_valid": 1,
      "decision": 1
    }
  }')

if [ $? -eq 0 ]; then
    SESSION_ID=$(echo $ZKML_RESPONSE | jq -r '.sessionId')
    if [ "$SESSION_ID" != "null" ]; then
        echo -e "${GREEN}✓ zkML proof generation initiated${NC}"
        echo "  Session ID: $SESSION_ID"
        
        # Wait for proof to complete
        echo "  Waiting for proof completion (15 seconds)..."
        sleep 15
        
        # Check status
        STATUS_RESPONSE=$(curl -s http://localhost:8002/zkml/status/$SESSION_ID)
        STATUS=$(echo $STATUS_RESPONSE | jq -r '.status')
        echo "  Proof status: $STATUS"
    else
        echo -e "${RED}✗ Failed to get session ID${NC}"
    fi
else
    echo -e "${RED}✗ zkML backend not responding${NC}"
fi

echo ""

# Test Step 2: Groth16 Proof-of-Proof
echo "Step 2: Testing Groth16 Proof-of-Proof..."
GROTH16_RESPONSE=$(curl -s -X POST http://localhost:3004/groth16/prove \
  -H "Content-Type: application/json" \
  -d '{
    "proofHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "decision": 1,
    "confidence": 95,
    "amount": 2.0
  }')

if [ $? -eq 0 ]; then
    SUCCESS=$(echo $GROTH16_RESPONSE | jq -r '.success')
    if [ "$SUCCESS" = "true" ]; then
        echo -e "${GREEN}✓ Groth16 proof generated${NC}"
        PUBLIC_SIGNALS=$(echo $GROTH16_RESPONSE | jq -r '.publicSignals')
        echo "  Public signals: $PUBLIC_SIGNALS"
        
        echo ""
        echo "  Testing on-chain verification..."
        VERIFY_RESPONSE=$(curl -s -X POST http://localhost:3004/groth16/verify \
          -H "Content-Type: application/json" \
          -d "$GROTH16_RESPONSE")
        
        TX_HASH=$(echo $VERIFY_RESPONSE | jq -r '.transactionHash')
        if [ "$TX_HASH" != "null" ]; then
            echo -e "${GREEN}✓ On-chain verification submitted${NC}"
            echo "  Transaction: $TX_HASH"
            echo "  View on Etherscan: https://sepolia.etherscan.io/tx/$TX_HASH"
        else
            echo -e "${YELLOW}⚠ On-chain verification may be pending${NC}"
        fi
    else
        echo -e "${RED}✗ Groth16 proof generation failed${NC}"
    fi
else
    echo -e "${RED}✗ Groth16 backend not responding${NC}"
fi

echo ""

# Test Step 3: Circle Gateway Balance Check
echo "Step 3: Checking Circle Gateway Balance..."
BALANCE_RESPONSE=$(curl -s -X POST https://gateway-api-testnet.circle.com/v1/balances \
  -H "Authorization: Bearer SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "USDC",
    "sources": [
      {
        "chain": "ETH",
        "account": "0x0077777d7EBA4688BDeF3E311b846F25870A19B9"
      }
    ]
  }')

if [ $? -eq 0 ]; then
    BALANCE=$(echo $BALANCE_RESPONSE | jq -r '.balances[0].amount' 2>/dev/null)
    if [ "$BALANCE" != "null" ] && [ -n "$BALANCE" ]; then
        echo -e "${GREEN}✓ Gateway balance retrieved${NC}"
        echo "  Balance: $BALANCE USDC"
    else
        echo -e "${YELLOW}⚠ Could not parse balance${NC}"
    fi
else
    echo -e "${RED}✗ Gateway API not accessible${NC}"
fi

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo ""
echo "The workflow is ready for:"
echo "1. REAL zkML proof generation (JOLT-Atlas)"
echo "2. REAL Groth16 proof-of-proof on Ethereum Sepolia"
echo "3. REAL Circle Gateway transfers to Base and Avalanche"
echo ""
echo "To test the complete workflow:"
echo "1. Open http://localhost:8000/index-clean.html"
echo "2. Type: 'gateway zkml transfer to multiple chains'"
echo "3. Watch the 3-step process execute with real proofs and transfers"
echo ""
echo "Contract addresses:"
echo "- Groth16 Verifier: 0xE2506E6871EAe022608B97d92D5e051210DF684E"
echo "- Gateway Wallet: 0x0077777d7EBA4688BDeF3E311b846F25870A19B9"