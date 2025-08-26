#!/bin/bash
# Setup script for simple circuit

echo "Setting up simple SNARK circuit..."

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo "circom not found. Please install circom first."
    exit 1
fi

# Compile circuit
echo "Compiling circuit..."
circom circuits/simple_proof.circom --r1cs --wasm --sym -o build_simple

# Download minimal powers of tau (for testing)
echo "Downloading powers of tau..."
cd build_simple
if [ ! -f "powersOfTau28_hez_final_08.ptau" ]; then
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_08.ptau
fi

# Generate zkey
echo "Generating zkey..."
npx snarkjs groth16 setup simple_proof.r1cs powersOfTau28_hez_final_08.ptau simple_proof_0000.zkey

# Contribute to ceremony
echo "Contributing to ceremony..."
npx snarkjs zkey contribute simple_proof_0000.zkey simple_proof_final.zkey --name="SimpleProof" -v

# Export verification key
echo "Exporting verification key..."
npx snarkjs zkey export verificationkey simple_proof_final.zkey simple_verification_key.json

echo "Setup complete!"