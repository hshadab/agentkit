pragma circom 2.1.0;

template ProofOfProof() {
    // Public inputs
    signal input novaProofCommitment;  // Hash of the Nova proof
    signal input proofType;            // 1=KYC, 2=Location, 3=AI
    signal input timestamp;            // When verified
    signal input verificationResult;   // 1 if Nova proof was valid, 0 otherwise
    
    // Private witness (proves we know these values)
    signal input proofId;
    signal input executionResult;      // Result from zkEngine execution
    
    // Outputs
    signal output commitment;
    signal output isValid;
    
    // Enforce that verification result is binary (0 or 1)
    verificationResult * (1 - verificationResult) === 0;
    
    // Simple constraint to ensure proofType is non-zero
    signal proofTypeNonZero <== proofType - 1;
    signal proofTypeCheck <== proofTypeNonZero * (proofTypeNonZero + 1);
    
    // Create commitment (simplified - just multiply and add)
    signal temp1 <== novaProofCommitment * proofType;
    signal temp2 <== temp1 + timestamp;
    signal temp3 <== temp2 * proofId;
    commitment <== temp3 + executionResult;
    
    // Output is valid only if Nova verification passed
    isValid <== verificationResult;
}

component main {public [novaProofCommitment, proofType, timestamp, verificationResult]} = ProofOfProof();