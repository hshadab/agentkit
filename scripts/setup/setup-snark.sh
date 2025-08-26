#!/bin/bash

echo "🔧 Setting up SNARK proving infrastructure..."

# Step 1: Install circom if not already installed
if ! command -v circom &> /dev/null; then
    echo "Installing circom..."
    curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/iden3/circom/master/mkdocs/docs/getting-started/installation.md | sh
fi

# Step 2: Download powers of tau (pre-generated trusted setup)
echo "Downloading powers of tau..."
mkdir -p ceremony
cd ceremony

if [ ! -f "powersOfTau28_hez_final_12.ptau" ]; then
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau
    echo "✅ Downloaded powers of tau"
else
    echo "✅ Powers of tau already exists"
fi

cd ..

# Step 3: Compile the circuit
echo "Compiling circuit..."
mkdir -p build
circom circuits/ProofOfProof.circom --r1cs --wasm --sym -o build/

# Step 4: Generate the proving key
echo "Generating proving key..."
node node_modules/snarkjs/cli.js groth16 setup build/ProofOfProof.r1cs ceremony/powersOfTau28_hez_final_12.ptau build/proof_of_proof_0000.zkey

# Step 5: Contribute to the ceremony (for production, you'd want multiple contributors)
echo "Contributing to ceremony..."
echo "zkengine_agentkit_contribution" | node node_modules/snarkjs/cli.js zkey contribute build/proof_of_proof_0000.zkey build/proof_of_proof_final.zkey --name="AgentKit Contribution" -v

# Step 6: Export verification key
echo "Exporting verification key..."
node node_modules/snarkjs/cli.js zkey export verificationkey build/proof_of_proof_final.zkey build/verification_key.json

# Step 7: Generate Solidity verifier contract
echo "Generating Solidity verifier..."
node node_modules/snarkjs/cli.js zkey export solidityverifier build/proof_of_proof_final.zkey contracts/ProofOfProofVerifier.sol

echo "✅ SNARK setup complete!"
echo ""
echo "Generated files:"
echo "  - build/ProofOfProof.wasm (witness generator)"
echo "  - build/proof_of_proof_final.zkey (proving key)"
echo "  - build/verification_key.json (verification key)"
echo "  - contracts/ProofOfProofVerifier.sol (Solidity verifier)"