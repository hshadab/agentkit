#!/bin/bash
# Simple test to see current behavior

echo "Testing simple workflow to check current state"
echo "============================================="

# Test 1: Simple workflow with "then"
echo -e "\n1. Testing: Generate KYC proof then send 0.1 USDC to Alice"
response=$(curl -s -X POST http://localhost:8002/execute_workflow \
  -H "Content-Type: application/json" \
  -d '{"command": "Generate KYC proof then send 0.1 USDC to Alice"}')

success=$(echo "$response" | jq -r '.success')
echo "Success: $success"

if [ "$success" = "true" ]; then
    echo "✓ Workflow succeeded"
    transfers=$(echo "$response" | jq -r '.transferIds | length')
    echo "Transfers: $transfers"
else
    echo "✗ Workflow failed"
    error=$(echo "$response" | jq -r '.error' | head -3)
    echo "Error: $error"
fi

# Test 2: Check if blockchain verification works
echo -e "\n2. Testing: Generate KYC proof, verify on Ethereum, then send 0.1 USDC"
response=$(curl -s -X POST http://localhost:8002/execute_workflow \
  -H "Content-Type: application/json" \
  -d '{"command": "Generate KYC proof, verify on Ethereum, then send 0.1 USDC to Alice"}')

success=$(echo "$response" | jq -r '.success')
echo "Success: $success"

# Check execution log for blockchain verification
if [ "$success" = "true" ]; then
    echo "Checking for blockchain verification steps..."
    echo "$response" | jq -r '.executionLog' | grep -E "verify_on_ethereum|verify_on_solana" || echo "No blockchain verification found"
fi