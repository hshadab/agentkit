#!/bin/bash

echo "🚀 zkEngine Full Demo Test"
echo "=========================="

ZKENGINE="$HOME/agentkit/agentic/zkEngine_dev/wasm_file"
WASM_DIR="$HOME/agentkit/agentic/example_wasms"
PROOF_DIR="$HOME/agentkit/proofs"

# Test fibonacci
echo -e "\n📊 Testing Fibonacci(10)..."
$ZKENGINE prove --wasm $WASM_DIR/fib.wat --step 50 --out-dir $PROOF_DIR/demo_fib 10

echo -e "\n✅ Verifying Fibonacci proof..."
cd $PROOF_DIR/demo_fib && $ZKENGINE verify --step 50 proof.bin public.json

# Test addition
echo -e "\n➕ Testing Addition (25 + 17)..."
$ZKENGINE prove --wasm $WASM_DIR/add.wat --step 50 --out-dir $PROOF_DIR/demo_add 25 17

echo -e "\n✅ Verifying Addition proof..."
cd $PROOF_DIR/demo_add && $ZKENGINE verify --step 50 proof.bin public.json

# Test factorial
echo -e "\n🔢 Testing Factorial(6)..."
$ZKENGINE prove --wasm $WASM_DIR/factorial.wat --step 50 --out-dir $PROOF_DIR/demo_factorial 6

echo -e "\n✅ Verifying Factorial proof..."
cd $PROOF_DIR/demo_factorial && $ZKENGINE verify --step 50 proof.bin public.json

echo -e "\n🎉 All tests completed successfully!"
