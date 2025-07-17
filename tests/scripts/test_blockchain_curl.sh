#!/bin/bash
# Test complex blockchain workflows using curl

echo "Testing Complex Blockchain Verification Workflows"
echo "================================================"

# Function to test a workflow
test_workflow() {
    local name="$1"
    local command="$2"
    
    echo -e "\n\n=== Testing: $name ==="
    echo "Command: $command"
    echo "---"
    
    # Execute workflow
    response=$(curl -s -X POST http://localhost:8000/execute_workflow \
        -H "Content-Type: application/json" \
        -d "{\"command\": \"$command\"}" \
        --max-time 60)
    
    if [ $? -eq 0 ]; then
        echo "$response" | jq '.'
    else
        echo "Error: Request failed"
    fi
    
    sleep 2
}

# Check if server is running
echo "Checking server status..."
if curl -s http://localhost:8000/ > /dev/null; then
    echo "✓ Server is running"
else
    echo "❌ Server not running. Please start with: python3 chat_service.py"
    exit 1
fi

# Test cases
test_workflow "Basic Ethereum Verification" \
    "Generate KYC proof for Alice, verify it on blockchain, then send 0.1 USDC to Alice on Ethereum"

test_workflow "Solana Verification" \
    "Generate location proof, verify it on Solana, then transfer 0.05 USDC to Bob on SOL"

test_workflow "Conditional On-Chain Transfer" \
    "If Charlie is KYC verified on-chain, send him 0.2 USDC on Ethereum"

test_workflow "Multi-Chain Verification" \
    "Generate AI content proof, verify locally, verify on Ethereum, verify on Solana, then send 0.15 USDC to David"

test_workflow "Natural Language Conditional" \
    "When Emma's KYC is verified on the blockchain, transfer 0.3 USDC to her wallet"

echo -e "\n\nAll tests completed!"