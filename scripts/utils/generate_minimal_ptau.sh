#!/bin/bash
set -e

echo "=== Generating Minimal Powers of Tau ==="

cd circuits

# Our circuit has only 8 constraints, so we need a very small powers of tau
# We'll create a powers of tau for 2^4 = 16 constraints (more than enough)

echo "Step 1: Starting new powers of tau ceremony..."
npx snarkjs powersoftau new bn128 4 pot4_0000.ptau -v

echo -e "\nStep 2: Contributing to ceremony..."
npx snarkjs powersoftau contribute pot4_0000.ptau pot4_0001.ptau --name="First contribution" -v -e="random text"

echo -e "\nStep 3: Applying beacon..."
npx snarkjs powersoftau beacon pot4_0001.ptau pot4_beacon.ptau 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"

echo -e "\nStep 4: Preparing phase 2..."
npx snarkjs powersoftau prepare phase2 pot4_beacon.ptau pot4_final.ptau -v

echo -e "\nStep 5: Verifying the final ptau..."
npx snarkjs powersoftau verify pot4_final.ptau

echo -e "\n✅ Minimal powers of tau generated successfully!"
ls -lh pot4_final.ptau