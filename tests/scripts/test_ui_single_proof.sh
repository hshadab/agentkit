#!/bin/bash
echo "Testing Single-Step Proof UI Display"
echo "===================================="
echo ""

# Test different single-step operations
echo "1. Single proof generation (should show proof card with verification buttons):"
echo "   Command: Generate KYC proof"
curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate KYC proof"}' | jq '.intent, .workflow_result.success' 2>/dev/null
echo ""

echo "2. Single proof with AI (should show proof card + AI response):"
echo "   Command: Generate location proof and make a joke"
curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate location proof and make a joke"}' | jq '.intent, .workflow_result.ai_response' 2>/dev/null | head -5
echo ""

echo "3. List operation (should not show workflow card):"
echo "   Command: List proofs"
curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "List proofs"}' | jq '.intent' 2>/dev/null
echo ""

echo "4. Multi-step workflow (should show workflow card):"
echo "   Command: Generate KYC proof then send 0.1 USDC to Alice"
curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate KYC proof then send 0.1 USDC to Alice"}' | jq '.intent, .workflow_result.success' 2>/dev/null
echo ""

echo "Expected UI behavior:"
echo "✓ Single proof: Shows standard proof card with time, size, function name"
echo "✓ Completed proof: Shows 3 verification buttons (Local, Ethereum, Solana)"
echo "✓ Single list/verify: No workflow card shown, results displayed directly"
echo "✓ Multi-step: Shows workflow card with multiple steps"
echo "✓ AI responses: Shown as regular chat messages, not in cards"