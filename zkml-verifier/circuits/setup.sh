#!/bin/bash

# ONNX Verification Circuit Setup Script
# Generates WASM, R1CS, and proving/verification keys

set -e

CIRCUIT_NAME="OnnxVerification"
CIRCUIT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$CIRCUIT_DIR/build"

echo "🔧 Setting up ONNX Verification Circuit..."
echo "Circuit: $CIRCUIT_NAME"
echo "Directory: $CIRCUIT_DIR"
echo

# Create build directory
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

# Step 1: Compile circuit
echo "📝 Step 1: Compiling circuit..."
circom "../$CIRCUIT_NAME.circom" --r1cs --wasm --sym --c
echo "✅ Circuit compiled"
echo

# Step 2: View circuit info
echo "📊 Circuit Information:"
snarkjs r1cs info "${CIRCUIT_NAME}.r1cs"
echo

# Step 3: Generate trusted setup (Powers of Tau)
echo "🔐 Step 3: Generating trusted setup..."
if [ ! -f "pot12_final.ptau" ]; then
    echo "   Generating Powers of Tau (this may take a minute)..."
    snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
    snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v -e="random entropy"
    snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
    echo "✅ Powers of Tau generated"
else
    echo "✅ Using existing Powers of Tau"
fi
echo

# Step 4: Generate zkey
echo "🔑 Step 4: Generating proving key..."
snarkjs groth16 setup "${CIRCUIT_NAME}.r1cs" pot12_final.ptau "${CIRCUIT_NAME}_0000.zkey"
echo "✅ Proving key generated"
echo

# Step 5: Contribute to phase 2 (optional but recommended)
echo "🎲 Step 5: Contributing to phase 2..."
snarkjs zkey contribute "${CIRCUIT_NAME}_0000.zkey" "${CIRCUIT_NAME}_final.zkey" --name="Second contribution" -v -e="more random entropy"
echo "✅ Final zkey generated"
echo

# Step 6: Export verification key
echo "📤 Step 6: Exporting verification key..."
snarkjs zkey export verificationkey "${CIRCUIT_NAME}_final.zkey" "${CIRCUIT_NAME}_vkey.json"
echo "✅ Verification key exported"
echo

# Step 7: Copy files to parent directory for easy access
echo "📁 Step 7: Copying files to parent directory..."
cp "${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm" ../"${CIRCUIT_NAME}.wasm"
cp "${CIRCUIT_NAME}_final.zkey" ../"${CIRCUIT_NAME}.zkey"
cp "${CIRCUIT_NAME}_vkey.json" ../"${CIRCUIT_NAME}_vkey.json"
echo "✅ Files copied"
echo

echo "✨ Setup complete!"
echo
echo "Generated files:"
echo "  - ${CIRCUIT_NAME}.wasm (WASM for proof generation)"
echo "  - ${CIRCUIT_NAME}.zkey (Proving key)"
echo "  - ${CIRCUIT_NAME}_vkey.json (Verification key)"
echo
echo "Usage:"
echo "  snarkjs groth16 fullprove input.json ${CIRCUIT_NAME}.wasm ${CIRCUIT_NAME}.zkey proof.json public.json"
echo "  snarkjs groth16 verify ${CIRCUIT_NAME}_vkey.json public.json proof.json"
