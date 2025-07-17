#!/bin/bash
echo "Testing Fully Unified OpenAI + ZKP System"
echo "========================================="
echo ""

# Test 1: Simple proof with explanation
echo "1. Proof generation with explanation:"
echo "   Command: Generate KYC proof and explain how it works"
response=$(curl -s -X POST http://localhost:8002/test_parser \
  -H "Content-Type: application/json" \
  -d '{"command": "Generate KYC proof and explain how it works"}')
  
echo "   Parsed steps:"
echo "$response" | jq -r '.parsed_result.steps[] | "   - " + .type + ": " + .description'
echo ""

# Test 2: Simple proof without explanation  
echo "2. Simple proof generation (via OpenAI):"
echo "   Command: Generate location proof"
response=$(curl -s -X POST http://localhost:8002/test_parser \
  -H "Content-Type: application/json" \
  -d '{"command": "Generate location proof"}')
  
echo "   Parsed steps:"
echo "$response" | jq -r '.parsed_result.steps[] | "   - " + .type + ": " + .description'
echo ""

# Test 3: List with explanation
echo "3. List proofs with explanation:"
echo "   Command: List my proofs and explain what they mean"
response=$(curl -s -X POST http://localhost:8002/test_parser \
  -H "Content-Type: application/json" \
  -d '{"command": "List my proofs and explain what they mean"}')
  
echo "   Parsed steps:"
echo "$response" | jq -r '.parsed_result.steps[] | "   - " + .type + ": " + .description'
echo ""

# Test 4: Complex workflow with explanation
echo "4. Complex workflow with explanation:"
echo "   Command: Generate AI content proof, verify it, send 0.1 USDC to Alice, and explain the whole process"
response=$(curl -s -X POST http://localhost:8002/test_parser \
  -H "Content-Type: application/json" \
  -d '{"command": "Generate AI content proof, verify it, send 0.1 USDC to Alice, and explain the whole process"}')
  
echo "   Parsed steps:"
echo "$response" | jq -r '.parsed_result.steps[] | "   - " + .type + ": " + .description'
echo ""

# Test 5: Execute with explanation
echo "5. Executing proof with explanation:"
response=$(curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate KYC proof and tell me how zero-knowledge proofs protect privacy"}')
  
intent=$(echo "$response" | jq -r '.intent')
echo "   Intent: $intent"

if [ "$intent" = "workflow_executed" ]; then
    success=$(echo "$response" | jq -r '.workflow_result.success')
    echo "   Success: $success"
    
    # Check if explanation is included
    has_explanation=$(echo "$response" | jq -r 'if .workflow_result.explanation then "yes" else "no" end')
    echo "   Has explanation: $has_explanation"
    
    if [ "$has_explanation" = "yes" ]; then
        echo "   Full response preview:"
        echo "$response" | jq -r '.response' | head -10
        echo "   ..."
    fi
fi

echo ""
echo "Summary:"
echo "- ALL commands now go through OpenAI (no fast-path)"
echo "- Simple proofs are parsed as single-step workflows"
echo "- Explanations can be combined with any action"
echo "- Full integration of zkp operations with natural language understanding"