#!/bin/bash
set -e

echo "=== Setting up Proper SNARK Circuit ==="

# Check if snarkjs is available
if ! npm list snarkjs >/dev/null 2>&1; then
    echo "Installing snarkjs..."
    npm install snarkjs
fi

cd circuits

# Step 1: Compile the circuit (if not already done)
if [ ! -f "ProofOfProof.r1cs" ] || [ "ProofOfProof.circom" -nt "ProofOfProof.r1cs" ]; then
    echo "Compiling circuit..."
    npx circom ProofOfProof.circom --r1cs --wasm --sym
fi

# Step 2: View circuit info
echo -e "\n=== Circuit Information ==="
npx snarkjs r1cs info ProofOfProof.r1cs

# Step 3: Use our minimal Powers of Tau
echo -e "\n=== Using Minimal Powers of Tau ==="
if [ ! -f "pot4_final.ptau" ]; then
    echo "Error: pot4_final.ptau not found. Run generate_minimal_ptau.sh first!"
    exit 1
else
    echo "Using existing minimal powers of tau file"
    ls -lh pot4_final.ptau
fi

# Step 4: Generate initial zkey
echo -e "\n=== Generating Initial ZKey ==="
npx snarkjs groth16 setup ProofOfProof.r1cs pot4_final.ptau ProofOfProof_0000.zkey

# Step 5: Contribute to the ceremony
echo -e "\n=== Contributing to Ceremony ==="
npx snarkjs zkey contribute ProofOfProof_0000.zkey ProofOfProof_0001.zkey --name="1st Contributor" -v -e="random entropy"

# Step 6: Apply random beacon (final contribution)
echo -e "\n=== Applying Random Beacon ==="
npx snarkjs zkey beacon ProofOfProof_0001.zkey ProofOfProof_final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"

# Step 7: Export verification key
echo -e "\n=== Exporting Verification Key ==="
npx snarkjs zkey export verificationkey ProofOfProof_final.zkey verification_key.json

# Step 8: Verify the final zkey
echo -e "\n=== Verifying Final ZKey ==="
npx snarkjs zkey verify ProofOfProof.r1cs pot4_final.ptau ProofOfProof_final.zkey

# Copy files to build directory
echo -e "\n=== Copying Files to Build Directory ==="
mkdir -p ../build/ProofOfProof_js
cp -r ProofOfProof_js/* ../build/ProofOfProof_js/ 2>/dev/null || true
cp ProofOfProof_final.zkey ../build/
cp verification_key.json ../build/

# Show file sizes
echo -e "\n=== Generated Files ==="
ls -lh ProofOfProof_final.zkey
ls -lh ../build/ProofOfProof_final.zkey

echo -e "\n✅ Setup complete! Proper zkey file generated."