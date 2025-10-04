#!/bin/bash
set -e

echo "🔧 Building Agent Behavior Verification Circuit"
echo "================================================"
echo ""

# Navigate to project root
cd /home/hshadab/agentkit/erc8004-zkml-auditor

# Install circomlib if not present
if [ ! -d "node_modules/circomlib" ]; then
    echo "📦 Installing circomlib..."
    npm install circomlib
fi

# Install snarkjs if not present
if ! command -v snarkjs &> /dev/null; then
    echo "📦 Installing snarkjs..."
    npm install -g snarkjs
fi

# Create output directory
mkdir -p circuits/build

echo ""
echo "1️⃣  Compiling circuit..."
circom circuits/AgentBehaviorVerification.circom \
    --r1cs \
    --wasm \
    --sym \
    -o circuits/build

echo ""
echo "2️⃣  Generating Powers of Tau (this takes 2-3 minutes)..."
# Start Powers of Tau ceremony for circuits up to 2^12 constraints
if [ ! -f circuits/build/pot12_0000.ptau ]; then
    snarkjs powersoftau new bn128 12 circuits/build/pot12_0000.ptau -v
fi

if [ ! -f circuits/build/pot12_0001.ptau ]; then
    snarkjs powersoftau contribute circuits/build/pot12_0000.ptau \
        circuits/build/pot12_0001.ptau \
        --name="First contribution" \
        -v \
        -e="$(date +%s)"
fi

if [ ! -f circuits/build/pot12_final.ptau ]; then
    snarkjs powersoftau prepare phase2 circuits/build/pot12_0001.ptau \
        circuits/build/pot12_final.ptau \
        -v
fi

echo ""
echo "3️⃣  Generating zkey (this takes 3-5 minutes)..."
# Generate the .zkey file
if [ ! -f circuits/build/agent_behavior_0000.zkey ]; then
    snarkjs groth16 setup \
        circuits/build/AgentBehaviorVerification.r1cs \
        circuits/build/pot12_final.ptau \
        circuits/build/agent_behavior_0000.zkey
fi

# Make a contribution
if [ ! -f circuits/build/agent_behavior_0001.zkey ]; then
    snarkjs zkey contribute \
        circuits/build/agent_behavior_0000.zkey \
        circuits/build/agent_behavior_0001.zkey \
        --name="1st Contributor" \
        -v \
        -e="$(date +%s)"
fi

# Export verification key
echo ""
echo "4️⃣  Exporting verification key..."
snarkjs zkey export verificationkey \
    circuits/build/agent_behavior_0001.zkey \
    circuits/build/verification_key.json

echo ""
echo "5️⃣  Generating Solidity verifier contract..."
snarkjs zkey export solidityverifier \
    circuits/build/agent_behavior_0001.zkey \
    contracts/AgentBehaviorVerifier.sol

echo ""
echo "✅ Circuit build complete!"
echo ""
echo "📁 Output files:"
echo "   - circuits/build/AgentBehaviorVerification_js/AgentBehaviorVerification.wasm"
echo "   - circuits/build/agent_behavior_0001.zkey"
echo "   - circuits/build/verification_key.json"
echo "   - contracts/AgentBehaviorVerifier.sol"
echo ""
echo "Next steps:"
echo "   1. Deploy contracts/AgentBehaviorVerifier.sol to Base Sepolia"
echo "   2. Update backend with new verifier address"
echo "   3. Update proof service to use new circuit"
