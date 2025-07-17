#!/bin/bash
# Test to see debug output for parser selection

echo "Testing parser selection with debug output"
echo "=========================================="

# Function to test and extract key debug info
test_command() {
    local desc="$1"
    local cmd="$2"
    
    echo -e "\n\nTest: $desc"
    echo "Command: $cmd"
    echo "---"
    
    # Execute and capture response
    response=$(curl -s -X POST http://localhost:8002/execute_workflow \
        -H "Content-Type: application/json" \
        -d "{\"command\": \"$cmd\"}" \
        --max-time 30)
    
    # Check if successful
    success=$(echo "$response" | jq -r '.success' 2>/dev/null)
    
    if [ "$success" = "true" ]; then
        echo "✓ Success"
        # Extract step types
        echo "$response" | jq -r '.executionLog' | grep -E "type:" | sort | uniq -c
    else
        echo "✗ Failed"
        # Show error
        echo "$response" | jq -r '.error' 2>/dev/null | head -5
    fi
}

# Test cases
test_command "Blockchain verification (should use OpenAI)" \
    "Generate KYC proof, verify it on blockchain, then send 0.1 USDC to Alice"

test_command "Explicit Ethereum (should use OpenAI)" \
    "Generate location proof, verify it on Ethereum, then transfer 0.05 USDC to Bob"

test_command "Conditional on-chain (should use OpenAI)" \
    "If Charlie is KYC verified on-chain, send him 0.2 USDC"

test_command "Multi-chain verification (should use OpenAI)" \
    "Generate AI content proof, verify on Ethereum and Solana, then send 0.15 USDC"

echo -e "\n\nDone!"