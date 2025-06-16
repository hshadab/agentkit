#!/bin/bash

echo "Testing all proof files..."
echo "========================="

ZKENGINE="$HOME/agentkit/agentic/zkEngine_dev/wasm_file"
WASM_DIR="$HOME/agentkit/agentic/example_wasms"
PROOF_DIR="$HOME/agentkit/proofs"

# Test each WAT file
echo -e "\n1. Testing add.wat (5 + 3)..."
$ZKENGINE prove --wasm $WASM_DIR/add.wat --step 50 --out-dir $PROOF_DIR/test_add 5 3

echo -e "\n2. Testing fibonacci.wat (n=10)..."
$ZKENGINE prove --wasm $WASM_DIR/fib.wat --step 50 --out-dir $PROOF_DIR/test_fib 10

echo -e "\n3. Testing factorial.wat (5!)..."
$ZKENGINE prove --wasm $WASM_DIR/factorial.wat --step 50 --out-dir $PROOF_DIR/test_factorial 5

echo -e "\n4. Testing multiply.wat (6 × 7)..."
$ZKENGINE prove --wasm $WASM_DIR/multiply.wat --step 50 --out-dir $PROOF_DIR/test_multiply 6 7

echo -e "\n5. Testing square.wat (8²)..."
$ZKENGINE prove --wasm $WASM_DIR/square.wat --step 50 --out-dir $PROOF_DIR/test_square 8

echo -e "\n6. Testing subtract.wat (10 - 3)..."
$ZKENGINE prove --wasm $WASM_DIR/subtract.wat --step 50 --out-dir $PROOF_DIR/test_subtract 10 3

echo -e "\nAll tests completed!"
