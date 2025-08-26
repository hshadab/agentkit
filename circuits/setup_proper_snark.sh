#\!/bin/bash
set -e

echo "=== Setting up Proper SNARK Circuit ==="

cd circuits

# Step 1: Circuit info
echo -e "\n=== Circuit Information ==="
npx snarkjs r1cs info ProofOfProof.r1cs

# Step 2: Use minimal Powers of Tau
echo -e "\n=== Using Minimal Powers of Tau ==="
ls -lh pot4_final.ptau

# Step 3: Generate initial zkey
echo -e "\n=== Generating Initial ZKey ==="
npx snarkjs groth16 setup ProofOfProof.r1cs pot4_final.ptau ProofOfProof_0000.zkey

# Step 4: Contribute to the ceremony
echo -e "\n=== Contributing to Ceremony ==="
npx snarkjs zkey contribute ProofOfProof_0000.zkey ProofOfProof_0001.zkey --name="1st Contributor" -v -e="random entropy"

# Step 5: Apply random beacon
echo -e "\n=== Applying Random Beacon ==="
npx snarkjs zkey beacon ProofOfProof_0001.zkey ProofOfProof_final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"

# Step 6: Export verification key
echo -e "\n=== Exporting Verification Key ==="
npx snarkjs zkey export verificationkey ProofOfProof_final.zkey verification_key.json

# Step 7: Verify the final zkey
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

echo -e "\n✅ Setup complete\! Proper zkey file generated."
