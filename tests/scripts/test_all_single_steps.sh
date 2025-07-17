#!/bin/bash

echo "Testing ALL Single-Step Workflow UI Fixes"
echo "========================================="
echo ""
echo "IMPORTANT: Check the browser UI after each test!"
echo ""

# Test 1: Simple proof generation
echo "1. Testing simple KYC proof (should show proof card only):"
curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate KYC proof"}' | jq '.intent' 2>/dev/null || echo "Error: Check server"
sleep 3
echo ""

# Test 2: Proof with AI processing
echo "2. Testing proof with AI (AI response should appear AFTER proof card):"
curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate location proof and tell me a joke about it"}' | jq '.intent' 2>/dev/null || echo "Error: Check server"
sleep 3
echo ""

# Test 3: AI content authenticity (the problematic case)
echo "3. Testing AI content authenticity (AI response should appear AFTER proof card):"
curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "explain AI content authenticity"}' | jq '.intent' 2>/dev/null || echo "Error: Check server"
sleep 3
echo ""

# Test 4: Single verification
echo "4. Testing single verification (should NOT show workflow card):"
curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "verify proof_kyc_1234"}' | jq '.intent' 2>/dev/null || echo "Error: Check server"
sleep 2
echo ""

# Test 5: Blockchain verification
echo "5. Testing blockchain verification (should NOT show workflow card):"
curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "verify KYC on ethereum"}' | jq '.intent' 2>/dev/null || echo "Error: Check server"
sleep 2
echo ""

# Test 6: List proofs
echo "6. Testing list proofs (should NOT show workflow card):"
curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "list proofs"}' | jq '.intent' 2>/dev/null || echo "Error: Check server"
sleep 2
echo ""

# Test 7: Multi-step workflow
echo "7. Testing multi-step workflow (SHOULD show workflow card):"
curl -s -X POST http://localhost:8002/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate KYC proof then send 0.1 USDC to Alice"}' | jq '.intent' 2>/dev/null || echo "Error: Check server"
sleep 3
echo ""

echo "Expected UI behavior:"
echo "✓ Tests 1-3: Proof cards with verification buttons (no workflow cards)"
echo "✓ Tests 2-3: AI responses appear AFTER proof cards complete"
echo "✓ Tests 4-6: Direct results without workflow cards"
echo "✓ Test 7: Full workflow card with multiple steps"
echo ""
echo "Check the browser to verify all behaviors are correct!"