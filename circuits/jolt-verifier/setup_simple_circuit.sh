#!/bin/bash

echo "🔨 Setting up Simple JOLT Decision Verifier Circuit"
echo "=================================================="

CIRCUIT_NAME="jolt_decision_simple"
CIRCUIT_DIR="/home/hshadab/agentkit/circuits/jolt-verifier"

cd $CIRCUIT_DIR

# Step 1: Compile the circuit
echo -e "\n📐 Step 1: Compiling circuit..."
circom ${CIRCUIT_NAME}.circom --r1cs --wasm --sym --c

if [ $? -ne 0 ]; then
    echo "❌ Circuit compilation failed"
    exit 1
fi

echo "✅ Circuit compiled successfully"

# Step 2: Generate witness for testing
echo -e "\n🧪 Step 2: Generating test witness..."
cat > input_simple.json <<EOF
{
    "decision": "1",
    "confidence": "95"
}
EOF

node ${CIRCUIT_NAME}_js/generate_witness.js \
    ${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm \
    input_simple.json \
    witness_simple.wtns

if [ $? -ne 0 ]; then
    echo "❌ Witness generation failed"
    exit 1
fi

echo "✅ Test witness generated"

# Step 3: Setup ceremony (using existing ptau)
echo -e "\n🔐 Step 3: Setting up proving keys..."

# Use existing Powers of Tau file
if [ ! -f "pot12_final.ptau" ]; then
    echo "❌ Powers of Tau file not found"
    exit 1
fi

# Setup Groth16
snarkjs groth16 setup ${CIRCUIT_NAME}.r1cs pot12_final.ptau ${CIRCUIT_NAME}_0000.zkey

# Contribute to ceremony
echo "Adding contribution to ceremony..."
snarkjs zkey contribute ${CIRCUIT_NAME}_0000.zkey ${CIRCUIT_NAME}_final.zkey \
    --name="NovaNet Contributor" -v -e="random entropy seed"

# Export verification key
snarkjs zkey export verificationkey ${CIRCUIT_NAME}_final.zkey verification_key_simple.json

echo "✅ Proving keys generated"

# Step 4: Generate proof
echo -e "\n📝 Step 4: Generating test proof..."
snarkjs groth16 prove ${CIRCUIT_NAME}_final.zkey witness_simple.wtns proof_simple.json public_simple.json

if [ $? -ne 0 ]; then
    echo "❌ Proof generation failed"
    exit 1
fi

echo "✅ Test proof generated"

# Step 5: Verify proof
echo -e "\n✔️ Step 5: Verifying test proof..."
snarkjs groth16 verify verification_key_simple.json public_simple.json proof_simple.json

if [ $? -ne 0 ]; then
    echo "❌ Proof verification failed"
    exit 1
fi

echo "✅ Proof verified successfully"

# Step 6: Generate Solidity verifier
echo -e "\n📜 Step 6: Generating Solidity verifier..."
snarkjs zkey export solidityverifier ${CIRCUIT_NAME}_final.zkey JOLTDecisionSimpleVerifier.sol

if [ $? -ne 0 ]; then
    echo "❌ Solidity verifier generation failed"
    exit 1
fi

echo "✅ Solidity verifier generated"

# Display circuit info
echo -e "\n📊 Circuit Statistics:"
echo "========================"
snarkjs r1cs info ${CIRCUIT_NAME}.r1cs

echo -e "\n✅ Simple JOLT Decision Verifier setup complete!"
echo "   - Circuit: ${CIRCUIT_NAME}.circom"
echo "   - Verifier: JOLTDecisionSimpleVerifier.sol"
echo "   - Public inputs: decision, confidence"