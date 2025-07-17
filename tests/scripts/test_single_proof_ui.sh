#!/bin/bash

echo "Testing Single-Step Proof UI Display Fix"
echo "========================================"
echo ""

# Test AI content proof with "authenticity" (the problematic case from the logs)
echo "1. Testing AI content proof with 'authenticity' keyword:"
echo "   This was showing as workflow card instead of proof card"
echo ""
curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "explain ai content authenticity"}' | jq '.intent, .workflow_result.success' 2>/dev/null || echo "Error: Check if server is running"
echo ""

echo "2. Testing simple KYC proof (should show proof card):"
echo ""
curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate KYC proof"}' | jq '.intent, .workflow_result.success' 2>/dev/null || echo "Error: Check if server is running"
echo ""

echo "3. Testing proof with AI enhancement (should show proof card + AI response):"
echo ""
curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate location proof and tell me a joke"}' | jq '.intent, .workflow_result.success' 2>/dev/null || echo "Error: Check if server is running"
echo ""

echo "Expected UI behavior after fix:"
echo "✓ All single-step proofs show as proof cards (not workflow cards)"
echo "✓ Proof cards show completion status with verification buttons"
echo "✓ AI responses appear as separate chat messages"
echo "✓ Multi-step workflows still show workflow cards"
echo ""
echo "Check the browser UI to verify these behaviors!"