#!/bin/bash

# Setup script for testing the real SNARK circuit with a small trusted setup

set -e

echo "Setting up test SNARK environment..."

# Create build directory if it doesn't exist
mkdir -p build

# Use the existing r1cs file
echo "Using existing circuit compilation..."

# Create a simple test circuit for initial testing
echo "Creating simplified test setup..."

# Generate a small powers of tau for testing (power 10 = 1024 constraints max)
echo "Generating small powers of tau..."
snarkjs powersoftau new bn128 10 pot10_0000.ptau -v

echo "Contributing to ceremony..."
echo "test entropy" | snarkjs powersoftau contribute pot10_0000.ptau pot10_0001.ptau --name="Test contribution" -v

echo "Preparing phase 2..."
snarkjs powersoftau prepare phase2 pot10_0001.ptau pot10_final.ptau -v

echo "Starting phase 2..."
snarkjs groth16 setup build/RealProofOfProof_js/RealProofOfProof.r1cs pot10_final.ptau build/real_proof_of_proof_0000.zkey

echo "Contributing to phase 2..."
echo "test zkey contribution" | snarkjs zkey contribute build/real_proof_of_proof_0000.zkey build/real_proof_of_proof_final.zkey --name="Test contributor" -v

echo "Exporting verification key..."
snarkjs zkey export verificationkey build/real_proof_of_proof_final.zkey build/real_verification_key.json

echo "Test setup complete!"
echo ""
echo "Note: This is a TEST setup only. For production:"
echo "1. Use a larger powers of tau (at least 16)"
echo "2. Conduct a proper multi-party trusted setup ceremony"
echo "3. Use real entropy sources"