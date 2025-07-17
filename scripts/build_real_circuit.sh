#!/bin/bash

# Build script for the real SNARK circuit

set -e

echo "Building real SNARK circuit with cryptographic constraints..."

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo "Error: circom is not installed. Please install circom first."
    echo "Visit: https://docs.circom.io/getting-started/installation/"
    exit 1
fi

# Check if snarkjs is installed
if ! command -v snarkjs &> /dev/null; then
    echo "Installing snarkjs globally..."
    npm install -g snarkjs
fi

# Create build directory if it doesn't exist
mkdir -p build
mkdir -p build/RealProofOfProof_js

# Compile the circuit
echo "Compiling circuit..."
circom circuits/RealProofOfProof.circom \
    --r1cs \
    --wasm \
    --sym \
    --c \
    -o build/RealProofOfProof_js

echo "Circuit compilation complete!"

# Check if we have a powers of tau file
PTAU_FILE="resources/ptau/pot20_final.ptau"
if [ ! -f "$PTAU_FILE" ]; then
    echo "ERROR: Powers of Tau file not found at $PTAU_FILE"
    echo ""
    echo "Please download it first:"
    echo "  cd resources/ptau"
    echo "  wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_20.ptau -O pot20_final.ptau"
    echo ""
    echo "Or see SETUP_PTAU.md for alternative options (like using the smaller pot12 file for testing)"
    exit 1
fi

# Generate proving and verification keys
echo "Generating proving and verification keys..."

# Start ceremony
echo "Starting key generation ceremony..."
snarkjs groth16 setup build/RealProofOfProof_js/RealProofOfProof.r1cs "$PTAU_FILE" build/real_proof_of_proof_0000.zkey

# Contribute to the ceremony
echo "Contributing to the ceremony..."
echo "some random text for entropy" | snarkjs zkey contribute build/real_proof_of_proof_0000.zkey build/real_proof_of_proof_0001.zkey --name="1st Contributor"

# Apply random beacon
echo "Applying random beacon..."
snarkjs zkey beacon build/real_proof_of_proof_0001.zkey build/real_proof_of_proof_final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"

# Export verification key
echo "Exporting verification key..."
snarkjs zkey export verificationkey build/real_proof_of_proof_final.zkey build/real_verification_key.json

# Generate Solidity verifier contract
echo "Generating Solidity verifier contract..."
snarkjs zkey export solidityverifier build/real_proof_of_proof_final.zkey contracts/RealProofOfProofVerifier.sol

echo "Build complete!"
echo ""
echo "Generated files:"
echo "  - WASM: build/RealProofOfProof_js/RealProofOfProof.wasm"
echo "  - ZKey: build/real_proof_of_proof_final.zkey"
echo "  - Verification Key: build/real_verification_key.json"
echo "  - Solidity Verifier: contracts/RealProofOfProofVerifier.sol"
echo ""
echo "To use the real SNARK prover, make sure to:"
echo "1. Update package.json dependencies if needed"
echo "2. Deploy the new verifier contract"
echo "3. Update your frontend to use the new contract"