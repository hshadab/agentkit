#!/bin/bash

echo "================================================="
echo "JOLT zkML Verifier Circuit Setup - Phase 1"
echo "================================================="
echo ""
echo "This script sets up the JOLT decision verifier circuit"
echo "for on-chain verification of zkML proofs."
echo ""

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo "❌ Circom not found. Please install circom first:"
    echo "   npm install -g circom"
    exit 1
fi

# Check if snarkjs is available
if [ ! -f "../../node_modules/.bin/snarkjs" ]; then
    echo "❌ snarkjs not found. Installing..."
    cd ../..
    npm install snarkjs@latest
    cd circuits/jolt-verifier
fi

echo "Step 1: Compiling JOLT Decision Verifier Circuit..."
echo "-----------------------------------------------------"

# Compile the circuit
circom jolt_decision_verifier.circom \
    --r1cs \
    --wasm \
    --sym \
    --c \
    --output . \
    2>&1 | tee compile.log

if [ $? -ne 0 ]; then
    echo "❌ Circuit compilation failed. Check compile.log"
    exit 1
fi

echo "✅ Circuit compiled successfully!"
echo ""

# Check R1CS info
echo "Step 2: Circuit Statistics"
echo "-----------------------------------------------------"
npx snarkjs r1cs info jolt_decision_verifier.r1cs

echo ""
echo "Step 3: Setting up Powers of Tau"
echo "-----------------------------------------------------"

# Use existing ptau file if available, otherwise create a small one
PTAU_FILE="pot12_final.ptau"

if [ ! -f "$PTAU_FILE" ]; then
    echo "Generating new Powers of Tau (this may take a minute)..."
    
    # Start ceremony
    npx snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
    
    # Contribute randomness
    npx snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau \
        --name="JOLT Contributor 1" -v <<< "random_entropy_1234"
    
    # Prepare phase 2
    npx snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
    
    # Clean up temp files
    rm pot12_0000.ptau pot12_0001.ptau
    
    echo "✅ Powers of Tau ceremony complete!"
else
    echo "✅ Using existing Powers of Tau file"
fi

echo ""
echo "Step 4: Generating Proving and Verification Keys"
echo "-----------------------------------------------------"

# Generate zkey
npx snarkjs groth16 setup \
    jolt_decision_verifier.r1cs \
    $PTAU_FILE \
    jolt_decision_verifier_0000.zkey

# Contribute to phase 2
npx snarkjs zkey contribute \
    jolt_decision_verifier_0000.zkey \
    jolt_decision_verifier_final.zkey \
    --name="JOLT Final Contribution" \
    -v <<< "more_random_entropy_5678"

# Export verification key
npx snarkjs zkey export verificationkey \
    jolt_decision_verifier_final.zkey \
    verification_key.json

echo "✅ Keys generated successfully!"
echo ""

echo "Step 5: Generating Solidity Verifier Contract"
echo "-----------------------------------------------------"

# Generate Solidity verifier
npx snarkjs zkey export solidityverifier \
    jolt_decision_verifier_final.zkey \
    JOLTDecisionVerifier.sol

if [ -f "JOLTDecisionVerifier.sol" ]; then
    echo "✅ Solidity verifier generated: JOLTDecisionVerifier.sol"
    
    # Add custom logic to the verifier
    cat >> JOLTDecisionVerifier.sol << 'EOF'

// Additional JOLT zkML verification logic
contract JOLTzkMLVerifier is Groth16Verifier {
    struct VerifiedDecision {
        uint256 decision;     // 1 = APPROVE, 0 = DENY
        uint256 confidence;   // 0-100
        uint256 threshold;    // Min confidence required
        uint256 timestamp;
        address verifier;
    }
    
    mapping(bytes32 => VerifiedDecision) public verifiedProofs;
    
    event JOLTProofVerified(
        bytes32 indexed proofId,
        uint256 decision,
        uint256 confidence,
        address indexed agent
    );
    
    function verifyAndStore(
        uint[2] memory _pA,
        uint[2][2] memory _pB,
        uint[2] memory _pC,
        uint[3] memory _pubSignals // decision, confidence, threshold
    ) public returns (bool) {
        require(verifyProof(_pA, _pB, _pC, _pubSignals), "Invalid JOLT proof");
        
        bytes32 proofId = keccak256(abi.encodePacked(_pA, _pB, _pC));
        
        verifiedProofs[proofId] = VerifiedDecision({
            decision: _pubSignals[0],
            confidence: _pubSignals[1],
            threshold: _pubSignals[2],
            timestamp: block.timestamp,
            verifier: msg.sender
        });
        
        emit JOLTProofVerified(proofId, _pubSignals[0], _pubSignals[1], msg.sender);
        
        return true;
    }
}
EOF
    
    echo "✅ Enhanced verifier contract created!"
else
    echo "❌ Failed to generate Solidity verifier"
    exit 1
fi

echo ""
echo "Step 6: Creating Test Input"
echo "-----------------------------------------------------"

# Create test input file
cat > input_test.json << EOF
{
    "decision": "1",
    "confidence": "95",
    "threshold": "80",
    "proofHash": "123456789",
    "timestamp": "1735000000"
}
EOF

echo "✅ Test input created: input_test.json"
echo ""

echo "Step 7: Generating Test Proof"
echo "-----------------------------------------------------"

# Calculate witness
npx snarkjs wtns calculate \
    jolt_decision_verifier_js/jolt_decision_verifier.wasm \
    input_test.json \
    witness.wtns

# Generate proof
npx snarkjs groth16 prove \
    jolt_decision_verifier_final.zkey \
    witness.wtns \
    proof.json \
    public.json

echo "✅ Test proof generated!"
echo ""

echo "Step 8: Verifying Test Proof"
echo "-----------------------------------------------------"

# Verify the proof
npx snarkjs groth16 verify \
    verification_key.json \
    public.json \
    proof.json

if [ $? -eq 0 ]; then
    echo "✅ Proof verification successful!"
else
    echo "❌ Proof verification failed"
    exit 1
fi

echo ""
echo "================================================="
echo "✅ JOLT Circuit Setup Complete!"
echo "================================================="
echo ""
echo "Generated files:"
echo "  - jolt_decision_verifier.r1cs : Circuit constraints"
echo "  - jolt_decision_verifier_js/   : WASM witness calculator"
echo "  - jolt_decision_verifier_final.zkey : Proving key"
echo "  - verification_key.json : Verification key"
echo "  - JOLTDecisionVerifier.sol : Solidity verifier contract"
echo "  - proof.json : Example proof"
echo "  - public.json : Example public signals"
echo ""
echo "Next steps:"
echo "1. Deploy JOLTDecisionVerifier.sol to Ethereum Sepolia"
echo "2. Integrate with zkML backend to generate real proofs"
echo "3. Update frontend to show on-chain verification"
echo ""
echo "Test the contract locally with:"
echo "  npx hardhat test test/JOLTVerifier.test.js"
echo ""