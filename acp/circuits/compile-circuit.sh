#!/bin/bash

# Compile AgentAuthorization circuit and generate Groth16 trusted setup
# This creates everything needed for on-chain verification

set -e

CIRCUIT_NAME="AgentAuthorization"
CIRCUIT_DIR="/home/hshadab/agentkit/acp/circuits"
BUILD_DIR="$CIRCUIT_DIR/build"
PTAU_FILE="/home/hshadab/agentkit/circuits/powersOfTau28_hez_final_12.ptau"

echo "🔨 Compiling Agent Authorization Circuit for Groth16"
echo "======================================================"

# Create build directory
mkdir -p "$BUILD_DIR"
cd "$CIRCUIT_DIR"

# Step 1: Compile circuit with circom
echo ""
echo "Step 1: Compiling Circom circuit..."
circom "$CIRCUIT_NAME.circom" \
  --r1cs \
  --wasm \
  --sym \
  --c \
  -o "$BUILD_DIR"

echo "✅ Circuit compiled"
echo "   R1CS: $BUILD_DIR/$CIRCUIT_NAME.r1cs"
echo "   WASM: $BUILD_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm"

# Step 2: Generate witness calculator info
echo ""
echo "Step 2: Circuit statistics..."
snarkjs r1cs info "$BUILD_DIR/$CIRCUIT_NAME.r1cs"

# Step 3: Start Groth16 trusted setup
echo ""
echo "Step 3: Groth16 trusted setup (Phase 1 - Powers of Tau)..."

# Check if ptau file exists, if not download it
if [ ! -f "$PTAU_FILE" ]; then
    echo "⬇️  Downloading Powers of Tau file (12 constraints, ~17MB)..."
    wget -O "$PTAU_FILE" \
      https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau
fi

echo "✅ Using Powers of Tau: $PTAU_FILE"

# Step 4: Phase 2 (circuit-specific)
echo ""
echo "Step 4: Groth16 Phase 2 (circuit-specific setup)..."
snarkjs groth16 setup \
  "$BUILD_DIR/$CIRCUIT_NAME.r1cs" \
  "$PTAU_FILE" \
  "$BUILD_DIR/${CIRCUIT_NAME}_0000.zkey"

echo "✅ Initial zkey generated"

# Step 5: Contribute to ceremony (add randomness)
echo ""
echo "Step 5: Contributing randomness to trusted setup..."
snarkjs zkey contribute \
  "$BUILD_DIR/${CIRCUIT_NAME}_0000.zkey" \
  "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey" \
  --name="ACP Integration" \
  -e="$(date +%s)$(openssl rand -hex 32)"

echo "✅ Final zkey with contribution"

# Step 6: Export verification key
echo ""
echo "Step 6: Exporting verification key..."
snarkjs zkey export verificationkey \
  "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey" \
  "$BUILD_DIR/verification_key.json"

echo "✅ Verification key exported"

# Step 7: Generate Solidity verifier contract
echo ""
echo "Step 7: Generating Solidity verifier contract..."
snarkjs zkey export solidityverifier \
  "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey" \
  "$BUILD_DIR/${CIRCUIT_NAME}Verifier.sol"

echo "✅ Solidity verifier generated: $BUILD_DIR/${CIRCUIT_NAME}Verifier.sol"

# Step 8: Generate sample input for testing
echo ""
echo "Step 8: Creating sample input file..."
cat > "$BUILD_DIR/sample_input.json" << EOF
{
  "authorized": "1",
  "proofHash": "12345678901234567890",
  "budgetRemaining": "50000",
  "merchantTrust": "95",
  "amount": "4500",
  "categoryScore": "100",
  "velocity": "3",
  "modelHash": "11111111111111111111",
  "inputsHash": "22222222222222222222",
  "timestamp": "1234567890",
  "nonce": "99999999999999999999"
}
EOF

echo "✅ Sample input created: $BUILD_DIR/sample_input.json"

# Step 9: Generate a test proof
echo ""
echo "Step 9: Generating test proof..."
node "$BUILD_DIR/${CIRCUIT_NAME}_js/generate_witness.js" \
  "$BUILD_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm" \
  "$BUILD_DIR/sample_input.json" \
  "$BUILD_DIR/witness.wtns"

snarkjs groth16 prove \
  "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey" \
  "$BUILD_DIR/witness.wtns" \
  "$BUILD_DIR/proof.json" \
  "$BUILD_DIR/public.json"

echo "✅ Test proof generated"

# Step 10: Verify the test proof
echo ""
echo "Step 10: Verifying test proof..."
snarkjs groth16 verify \
  "$BUILD_DIR/verification_key.json" \
  "$BUILD_DIR/public.json" \
  "$BUILD_DIR/proof.json"

echo ""
echo "🎉 Circuit compilation and trusted setup complete!"
echo ""
echo "📁 Generated files:"
echo "   Circuit WASM: $BUILD_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm"
echo "   Proving key:  $BUILD_DIR/${CIRCUIT_NAME}_final.zkey"
echo "   Verify key:   $BUILD_DIR/verification_key.json"
echo "   Verifier:     $BUILD_DIR/${CIRCUIT_NAME}Verifier.sol"
echo ""
echo "Next steps:"
echo "  1. Deploy verifier contract to Base Sepolia"
echo "  2. Update verification service with contract address"
echo "  3. Test end-to-end proof generation and on-chain verification"