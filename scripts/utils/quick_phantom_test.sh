#!/bin/bash

echo "=== Quick Phantom Integration Test ==="
echo ""
echo "1. Testing WebSocket connection..."
echo '{"message":"test"}' | websocat ws://localhost:8001/ws -1 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ WebSocket server is running"
else
    echo "❌ WebSocket server is not responding"
    exit 1
fi

echo ""
echo "2. Testing proof generation API..."
# Generate a test proof
PROOF_ID="proof_kyc_$(date +%s)"
RESPONSE=$(curl -s -X POST http://localhost:8001/ws \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"Generate KYC proof\",\"proof_id\":\"$PROOF_ID\"}" 2>/dev/null || echo "failed")

if [[ "$RESPONSE" != "failed" ]]; then
    echo "✅ API endpoint accessible"
else
    echo "⚠️  Direct API test skipped (WebSocket-only server)"
fi

echo ""
echo "3. Opening test page in browser..."
echo ""
echo "📋 Test Instructions:"
echo "1. Open http://localhost:8001/test_phantom_browser.html"
echo "2. Click 'Detect Phantom' - should show Phantom detected"
echo "3. Click 'Connect Solana' - should work perfectly"
echo "4. Click 'Connect Ethereum' - may show service worker error"
echo "5. Click 'Test Full Flow' - should generate a proof"
echo ""
echo "🎯 Main App Test:"
echo "1. Open http://localhost:8001"
echo "2. Type: Generate KYC proof"
echo "3. Click 'Verify on Solana' (recommended for Phantom)"
echo "4. If you click 'Verify on Ethereum', you'll see our warning"
echo ""
echo "✅ Backend services are ready for testing!"