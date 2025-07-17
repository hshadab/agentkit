#!/bin/bash

echo "📊 Testing proof sizes with different step sizes"
echo ""

# Create test directories
mkdir -p /tmp/proof_test_5
mkdir -p /tmp/proof_test_10
mkdir -p /tmp/proof_test_50

# Test with step_size=5
echo "Generating proof with step_size=5..."
./zkengine_binary/zkEngine prove --wasm zkengine_binary/kyc_compliance_real.wasm --step 5 --out-dir /tmp/proof_test_5 12345 1 2>/dev/null
SIZE_5=$(ls -lh /tmp/proof_test_5/proof.bin 2>/dev/null | awk '{print $5}')
echo "Proof size with step_size=5: $SIZE_5"

# Test with step_size=10
echo "Generating proof with step_size=10..."
./zkengine_binary/zkEngine prove --wasm zkengine_binary/kyc_compliance_real.wasm --step 10 --out-dir /tmp/proof_test_10 12345 1 2>/dev/null
SIZE_10=$(ls -lh /tmp/proof_test_10/proof.bin 2>/dev/null | awk '{print $5}')
echo "Proof size with step_size=10: $SIZE_10"

# Test with step_size=50
echo "Generating proof with step_size=50..."
./zkengine_binary/zkEngine prove --wasm zkengine_binary/kyc_compliance_real.wasm --step 50 --out-dir /tmp/proof_test_50 12345 1 2>/dev/null
SIZE_50=$(ls -lh /tmp/proof_test_50/proof.bin 2>/dev/null | awk '{print $5}')
echo "Proof size with step_size=50: $SIZE_50"

echo ""
echo "📁 Detailed file sizes:"
echo "Step 5:"
ls -la /tmp/proof_test_5/ 2>/dev/null | grep -E "(proof\.bin|public\.json)"
echo ""
echo "Step 10:"
ls -la /tmp/proof_test_10/ 2>/dev/null | grep -E "(proof\.bin|public\.json)"
echo ""
echo "Step 50:"
ls -la /tmp/proof_test_50/ 2>/dev/null | grep -E "(proof\.bin|public\.json)"

# Get exact byte counts
BYTES_5=$(stat -c%s /tmp/proof_test_5/proof.bin 2>/dev/null || echo 0)
BYTES_10=$(stat -c%s /tmp/proof_test_10/proof.bin 2>/dev/null || echo 0)
BYTES_50=$(stat -c%s /tmp/proof_test_50/proof.bin 2>/dev/null || echo 0)

echo ""
echo "📈 Size comparison:"
echo "Step 5:  $BYTES_5 bytes"
echo "Step 10: $BYTES_10 bytes"
echo "Step 50: $BYTES_50 bytes"

# Clean up
rm -rf /tmp/proof_test_5 /tmp/proof_test_10 /tmp/proof_test_50