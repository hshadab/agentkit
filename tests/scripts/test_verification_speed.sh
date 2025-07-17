#!/bin/bash

echo "🔍 Testing verification speed"
echo ""

# First, generate a proof to verify
echo "Generating a test proof..."
mkdir -p /tmp/verify_test
./zkengine_binary/zkEngine prove --wasm zkengine_binary/kyc_compliance_real.wasm --step 50 --out-dir /tmp/verify_test 12345 1 >/dev/null 2>&1

if [ ! -f "/tmp/verify_test/proof.bin" ]; then
    echo "❌ Failed to generate test proof"
    exit 1
fi

echo "✅ Test proof generated"
echo ""

# Test verification speed multiple times
echo "Running verification speed tests..."
echo ""

for i in {1..5}; do
    echo "Test $i:"
    START=$(date +%s%N)
    
    # Run verification
    ./zkengine_binary/zkEngine verify --step 50 /tmp/verify_test/proof.bin /tmp/verify_test/public.json
    
    END=$(date +%s%N)
    TIME_MS=$((($END - $START) / 1000000))
    echo "Verification time: ${TIME_MS}ms"
    echo ""
done

# Also test with different step sizes
echo "Testing verification with different step sizes:"
echo ""

# Generate proofs with different step sizes
for STEP in 10 20 50; do
    echo "Step size $STEP:"
    mkdir -p /tmp/verify_test_${STEP}
    
    # Generate proof
    ./zkengine_binary/zkEngine prove --wasm zkengine_binary/kyc_compliance_real.wasm --step $STEP --out-dir /tmp/verify_test_${STEP} 12345 1 >/dev/null 2>&1
    
    # Time verification
    START=$(date +%s%N)
    ./zkengine_binary/zkEngine verify --step $STEP /tmp/verify_test_${STEP}/proof.bin /tmp/verify_test_${STEP}/public.json >/dev/null 2>&1
    END=$(date +%s%N)
    
    TIME_MS=$((($END - $START) / 1000000))
    echo "Verification time: ${TIME_MS}ms"
    echo ""
done

# Clean up
rm -rf /tmp/verify_test /tmp/verify_test_*