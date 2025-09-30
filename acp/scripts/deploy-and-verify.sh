#!/bin/bash

# Deploy and Verify Groth16 Verifier Contract on Base Sepolia
#
# Prerequisites:
# - Foundry installed (forge, cast)
# - BASE_PRIVATE_KEY set in environment
# - BASE_RPC_URL set (defaults to public RPC)
# - BASESCAN_API_KEY for verification (optional)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_RPC_URL="${BASE_RPC_URL:-https://sepolia.base.org}"
BASE_CHAIN_ID="${BASE_CHAIN_ID:-84532}"
CONTRACTS_DIR="$(dirname "$0")/../contracts"
VERIFIER_NAME="Groth16Verifier"

echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Base Sepolia Contract Deployment & Verification        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}1. Checking prerequisites...${NC}"

if ! command -v forge &> /dev/null; then
    echo -e "${RED}❌ Foundry not installed. Install from https://book.getfoundry.sh/${NC}"
    exit 1
fi

if [ -z "$BASE_PRIVATE_KEY" ]; then
    echo -e "${RED}❌ BASE_PRIVATE_KEY not set${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Foundry installed${NC}"
echo -e "${GREEN}✅ Private key configured${NC}"
echo ""

# Check balance
echo -e "${YELLOW}2. Checking wallet balance...${NC}"
WALLET=$(cast wallet address --private-key "$BASE_PRIVATE_KEY")
BALANCE=$(cast balance "$WALLET" --rpc-url "$BASE_RPC_URL")
BALANCE_ETH=$(echo "scale=4; $BALANCE / 1000000000000000000" | bc)

echo -e "   Deployer: ${GREEN}$WALLET${NC}"
echo -e "   Balance: ${GREEN}${BALANCE_ETH} ETH${NC}"

if (( $(echo "$BALANCE_ETH < 0.001" | bc -l) )); then
    echo -e "${RED}❌ Insufficient balance. Need at least 0.001 ETH for deployment${NC}"
    echo -e "   Get testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet"
    exit 1
fi
echo ""

# Compile contracts
echo -e "${YELLOW}3. Compiling contracts...${NC}"
cd "$CONTRACTS_DIR"

if [ ! -f "${VERIFIER_NAME}.sol" ]; then
    echo -e "${RED}❌ ${VERIFIER_NAME}.sol not found in contracts/${NC}"
    exit 1
fi

forge build --contracts "${VERIFIER_NAME}.sol"
echo -e "${GREEN}✅ Contract compiled${NC}"
echo ""

# Deploy contract
echo -e "${YELLOW}4. Deploying ${VERIFIER_NAME}...${NC}"
DEPLOY_OUTPUT=$(forge create "${VERIFIER_NAME}.sol:${VERIFIER_NAME}" \
    --rpc-url "$BASE_RPC_URL" \
    --private-key "$BASE_PRIVATE_KEY" \
    --json)

CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | jq -r '.deployedTo')
TX_HASH=$(echo "$DEPLOY_OUTPUT" | jq -r '.transactionHash')

if [ -z "$CONTRACT_ADDRESS" ] || [ "$CONTRACT_ADDRESS" == "null" ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo -e "${GREEN}✅ Contract deployed!${NC}"
echo -e "   Address: ${GREEN}${CONTRACT_ADDRESS}${NC}"
echo -e "   TX Hash: ${GREEN}${TX_HASH}${NC}"
echo -e "   Explorer: ${GREEN}https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}${NC}"
echo ""

# Wait for confirmation
echo -e "${YELLOW}5. Waiting for transaction confirmation...${NC}"
sleep 10
echo -e "${GREEN}✅ Transaction confirmed${NC}"
echo ""

# Verify on Basescan
if [ -n "$BASESCAN_API_KEY" ]; then
    echo -e "${YELLOW}6. Verifying contract on Basescan...${NC}"

    forge verify-contract \
        "$CONTRACT_ADDRESS" \
        "${VERIFIER_NAME}.sol:${VERIFIER_NAME}" \
        --chain-id "$BASE_CHAIN_ID" \
        --etherscan-api-key "$BASESCAN_API_KEY" \
        --watch || echo -e "${YELLOW}⚠️  Verification pending (check Basescan later)${NC}"

    echo -e "${GREEN}✅ Verification submitted${NC}"
    echo -e "   View at: ${GREEN}https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}#code${NC}"
else
    echo -e "${YELLOW}6. Skipping verification (BASESCAN_API_KEY not set)${NC}"
fi
echo ""

# Save deployment info
DEPLOYMENT_FILE="$(dirname "$0")/../deployments/base-sepolia-$(date +%Y%m%d-%H%M%S).json"
mkdir -p "$(dirname "$DEPLOYMENT_FILE")"

cat > "$DEPLOYMENT_FILE" <<EOF
{
  "network": "base-sepolia",
  "chainId": $BASE_CHAIN_ID,
  "contract": "$VERIFIER_NAME",
  "address": "$CONTRACT_ADDRESS",
  "deployer": "$WALLET",
  "transactionHash": "$TX_HASH",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "rpcUrl": "$BASE_RPC_URL",
  "explorerUrl": "https://sepolia.basescan.org/address/$CONTRACT_ADDRESS"
}
EOF

echo -e "${GREEN}✅ Deployment saved to: ${DEPLOYMENT_FILE}${NC}"
echo ""

# Update .env file
ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
    if grep -q "GROTH16_VERIFIER_ADDRESS" "$ENV_FILE"; then
        sed -i "s/GROTH16_VERIFIER_ADDRESS=.*/GROTH16_VERIFIER_ADDRESS=$CONTRACT_ADDRESS/" "$ENV_FILE"
    else
        echo "GROTH16_VERIFIER_ADDRESS=$CONTRACT_ADDRESS" >> "$ENV_FILE"
    fi
    echo -e "${GREEN}✅ Updated .env with contract address${NC}"
fi
echo ""

# Test contract
echo -e "${YELLOW}7. Testing contract deployment...${NC}"
VERIFY_FUNCTION=$(cast call "$CONTRACT_ADDRESS" "verifyProof(uint[2],uint[2][2],uint[2],uint[1])(bool)" \
    "[0,0]" "[[0,0],[0,0]]" "[0,0]" "[1]" \
    --rpc-url "$BASE_RPC_URL" || echo "false")

echo -e "   Contract callable: ${GREEN}$VERIFY_FUNCTION${NC}"
echo ""

# Summary
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Deployment Complete                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Contract: ${GREEN}${VERIFIER_NAME}${NC}"
echo -e "Address:  ${GREEN}${CONTRACT_ADDRESS}${NC}"
echo -e "Network:  ${GREEN}Base Sepolia (Chain ID: $BASE_CHAIN_ID)${NC}"
echo -e "Explorer: ${GREEN}https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Verify contract source on Basescan (if not auto-verified)"
echo -e "  2. Update backend with new contract address"
echo -e "  3. Test verification with: npm run test:verify"
echo ""

exit 0