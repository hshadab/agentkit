#!/bin/bash

echo "🚀 Testing proof generation performance with different step sizes"
echo ""

# Test KYC proof with step size 10
echo "Testing with step_size=10 (optimized)..."
START=$(date +%s%N)
./zkengine_binary/zkEngine prove --wasm zkengine_binary/kyc_compliance_real.wasm --step 10 --out-dir /tmp/test_proof_10 12345 1
END=$(date +%s%N)
TIME_10=$((($END - $START) / 1000000))
echo "Time with step_size=10: ${TIME_10}ms"
echo ""

# Test KYC proof with step size 50
echo "Testing with step_size=50 (original)..."
START=$(date +%s%N)
./zkengine_binary/zkEngine prove --wasm zkengine_binary/kyc_compliance_real.wasm --step 50 --out-dir /tmp/test_proof_50 12345 1
END=$(date +%s%N)
TIME_50=$((($END - $START) / 1000000))
echo "Time with step_size=50: ${TIME_50}ms"
echo ""

# Calculate speedup
if [ $TIME_50 -gt 0 ]; then
    SPEEDUP=$(echo "scale=2; $TIME_50 / $TIME_10" | bc)
    echo "⚡ Speedup: ${SPEEDUP}x faster with step_size=10"
else
    echo "Could not calculate speedup"
fi

# Clean up
rm -rf /tmp/test_proof_10 /tmp/test_proof_50