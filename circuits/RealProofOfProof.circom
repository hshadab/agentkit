pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

template RealProofOfProof() {
    // Public inputs - these are visible on-chain
    signal input novaProofCommitment;      // Hash commitment of the Nova proof
    signal input proofType;                // 1=KYC, 2=Location, 3=AI Content
    signal input timestamp;                // Unix timestamp of verification
    signal input userAddress;              // User's Ethereum address (as field element)
    
    // Private witnesses - these prove knowledge without revealing
    signal input novaProofHash;            // SHA256 hash of actual Nova proof data
    signal input executionStepCount;       // Number of steps in Nova execution
    signal input finalStateHash;           // Hash of final execution state
    signal input verificationSeed;         // Random seed used in verification
    
    // Proof-type specific private data
    signal input kycData;                  // Encrypted KYC verification data
    signal input locationData;             // Encrypted location proof data  
    signal input aiContentHash;            // Hash of AI-generated content
    
    // Outputs
    signal output commitment;              // Proof commitment for on-chain storage
    signal output isValid;                 // 1 if all constraints pass, 0 otherwise
    
    // === CONSTRAINT 1: Verify proof type is valid (1, 2, or 3) ===
    component proofTypeCheck = IsZero();
    component proofTypeValid1 = IsEqual();
    component proofTypeValid2 = IsEqual();
    component proofTypeValid3 = IsEqual();
    
    proofTypeValid1.in[0] <== proofType;
    proofTypeValid1.in[1] <== 1;
    
    proofTypeValid2.in[0] <== proofType;
    proofTypeValid2.in[1] <== 2;
    
    proofTypeValid3.in[0] <== proofType;
    proofTypeValid3.in[1] <== 3;
    
    signal proofTypeOr1 <== proofTypeValid1.out + proofTypeValid2.out;
    signal proofTypeOrAll <== proofTypeOr1 + proofTypeValid3.out;
    
    // Ensure exactly one proof type matches
    proofTypeCheck.in <== proofTypeOrAll - 1;
    proofTypeCheck.out === 1;  // IsZero returns 1 when input is 0
    
    // === CONSTRAINT 2: Verify Nova proof commitment matches ===
    // Use Poseidon hash for efficient in-circuit hashing
    component novaCommitmentHasher = Poseidon(4);
    novaCommitmentHasher.inputs[0] <== novaProofHash;
    novaCommitmentHasher.inputs[1] <== executionStepCount;
    novaCommitmentHasher.inputs[2] <== finalStateHash;
    novaCommitmentHasher.inputs[3] <== verificationSeed;
    
    // The computed hash must match the public commitment
    novaCommitmentHasher.out === novaProofCommitment;
    
    // === CONSTRAINT 3: Execution step count must be reasonable ===
    // Between 100 and 1,000,000 steps (prevents trivial proofs)
    component stepCountLow = GreaterThan(20); // 20 bits = up to ~1M
    stepCountLow.in[0] <== executionStepCount;
    stepCountLow.in[1] <== 99;
    stepCountLow.out === 1;
    
    component stepCountHigh = LessThan(20);
    stepCountHigh.in[0] <== executionStepCount;
    stepCountHigh.in[1] <== 1000001;
    stepCountHigh.out === 1;
    
    // === CONSTRAINT 4: Timestamp validation ===
    // Ensure timestamp is reasonable (after Jan 1, 2024 and before year 2030)
    component timestampLow = GreaterThan(32);
    timestampLow.in[0] <== timestamp;
    timestampLow.in[1] <== 1704067200; // Jan 1, 2024
    timestampLow.out === 1;
    
    component timestampHigh = LessThan(32);
    timestampHigh.in[0] <== timestamp;
    timestampHigh.in[1] <== 1893456000; // ~Year 2030
    timestampHigh.out === 1;
    
    // === CONSTRAINT 5: Proof-type specific validation ===
    // KYC Proof constraints
    component kycActive = IsEqual();
    kycActive.in[0] <== proofType;
    kycActive.in[1] <== 1;
    
    // KYC data must be non-zero when proof type is KYC
    component kycNonZero = IsZero();
    kycNonZero.in <== kycData;
    signal kycConstraint <== kycActive.out * kycNonZero.out;
    kycConstraint === 0; // If KYC active, data must not be zero
    
    // Location Proof constraints
    component locActive = IsEqual();
    locActive.in[0] <== proofType;
    locActive.in[1] <== 2;
    
    // Location data must be non-zero when proof type is Location
    component locNonZero = IsZero();
    locNonZero.in <== locationData;
    signal locConstraint <== locActive.out * locNonZero.out;
    locConstraint === 0;
    
    // AI Content Proof constraints
    component aiActive = IsEqual();
    aiActive.in[0] <== proofType;
    aiActive.in[1] <== 3;
    
    // AI content hash must be non-zero when proof type is AI
    component aiNonZero = IsZero();
    aiNonZero.in <== aiContentHash;
    signal aiConstraint <== aiActive.out * aiNonZero.out;
    aiConstraint === 0;
    
    // === CONSTRAINT 6: Create deterministic commitment ===
    // Combine all public and private data into a commitment
    component commitmentHasher = Poseidon(8);
    commitmentHasher.inputs[0] <== novaProofCommitment;
    commitmentHasher.inputs[1] <== proofType;
    commitmentHasher.inputs[2] <== timestamp;
    commitmentHasher.inputs[3] <== userAddress;
    commitmentHasher.inputs[4] <== finalStateHash;
    commitmentHasher.inputs[5] <== kycData * kycActive.out;
    commitmentHasher.inputs[6] <== locationData * locActive.out;
    commitmentHasher.inputs[7] <== aiContentHash * aiActive.out;
    
    commitment <== commitmentHasher.out;
    
    // === CONSTRAINT 7: Verification seed validation ===
    // Ensure verification seed has enough entropy (non-zero and large)
    component seedCheck = GreaterThan(128);
    seedCheck.in[0] <== verificationSeed;
    seedCheck.in[1] <== 2**64; // Must be at least 64 bits of entropy
    seedCheck.out === 1;
    
    // === OUTPUT: Set isValid based on all constraints passing ===
    // In a real circuit, all constraints must pass or proof generation fails
    // This output is redundant but useful for clarity
    isValid <== 1;
}

// Declare main component with public inputs
component main {public [novaProofCommitment, proofType, timestamp, userAddress]} = RealProofOfProof();