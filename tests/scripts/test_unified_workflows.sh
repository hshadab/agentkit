#!/bin/bash
echo "Testing Unified Workflow System"
echo "==============================="
echo ""

# Test 1: Simple proof generation (should use fast-path)
echo "1. Simple proof generation:"
echo "   Command: Generate KYC proof"
response=$(curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate KYC proof"}')
intent=$(echo "$response" | jq -r '.intent')
echo "   Intent: $intent"
if [ "$intent" = "workflow_executed" ]; then
    success=$(echo "$response" | jq -r '.workflow_result.success')
    echo "   Result: $([ "$success" = "true" ] && echo "✓ SUCCESS" || echo "✗ FAILED")"
fi
echo ""

# Test 2: Simple verification (should use fast-path)
echo "2. Simple verification:"
echo "   Command: Verify proof_kyc_12345"
response=$(curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Verify proof_kyc_12345"}')
intent=$(echo "$response" | jq -r '.intent')
echo "   Intent: $intent"
echo ""

# Test 3: List proofs (should use fast-path)
echo "3. List proofs:"
echo "   Command: List proofs"
response=$(curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "List proofs"}')
intent=$(echo "$response" | jq -r '.intent')
echo "   Intent: $intent"
echo ""

# Test 4: Complex workflow (should use OpenAI)
echo "4. Complex workflow:"
echo "   Command: Generate KYC proof then send 0.1 USDC to Alice"
response=$(curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate KYC proof then send 0.1 USDC to Alice"}')
intent=$(echo "$response" | jq -r '.intent')
echo "   Intent: $intent"
if [ "$intent" = "workflow_executed" ]; then
    success=$(echo "$response" | jq -r '.workflow_result.success')
    echo "   Result: $([ "$success" = "true" ] && echo "✓ SUCCESS" || echo "✗ FAILED")"
fi
echo ""

# Test 5: Natural language (should use OpenAI chat)
echo "5. Natural language query:"
echo "   Command: What is a zero-knowledge proof?"
response=$(curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is a zero-knowledge proof?"}')
intent=$(echo "$response" | jq -r '.intent')
echo "   Intent: $intent"
if [ "$intent" = "openai_chat" ]; then
    echo "   Response: $(echo "$response" | jq -r '.response' | head -20)..."
fi
echo ""

echo "Summary:"
echo "- All zkEngine operations now go through unified workflow system"
echo "- Simple commands use fast-path parser (no OpenAI API call)"
echo "- Complex workflows use OpenAI parser"
echo "- Natural language queries still use OpenAI chat"