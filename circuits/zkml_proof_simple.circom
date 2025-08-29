pragma circom 2.0.0;

template IsZero() {
    signal input in;
    signal output out;

    signal inv;

    inv <-- in!=0 ? 1/in : 0;
    
    out <== -in*inv +1;
    in*out === 0;
}

template GreaterEqThan() {
    signal input in[2];
    signal output out;
    
    // Simple comparison: in[0] >= in[1]
    // For demo, we'll use a simplified check
    component isZero = IsZero();
    signal diff;
    diff <== in[0] - in[1] + 100; // Add offset to ensure positive
    
    // If diff >= 100, then in[0] >= in[1]
    isZero.in <== diff - 100;
    out <== 1 - isZero.out;
}

template ZKMLProofVerifier() {
    // Public inputs (visible on-chain)
    signal input proofHash;         // Hash of the zkML proof (any number)
    signal input decision;          // 1 = APPROVE, 0 = DENY
    signal input confidence;        // Confidence score (0-100)
    signal input amountValid;       // 1 = valid amount, 0 = invalid
    
    // Private inputs (hidden but proven)
    signal input zkmlSecret;        // Secret that proves knowledge of proof
    
    // Intermediate signals
    signal decisionCheck;
    signal confidenceCheck;
    signal amountCheck;
    signal secretCheck;
    
    // 1. Prove decision is binary (0 or 1)
    decisionCheck <== decision * (1 - decision);
    decisionCheck === 0;
    
    // 2. Prove confidence is high (>= 90)
    component gte = GreaterEqThan();
    gte.in[0] <== confidence;
    gte.in[1] <== 90;
    confidenceCheck <== gte.out;
    
    // 3. Prove amount is valid (binary)
    amountCheck <== amountValid * (1 - amountValid);
    amountCheck === 0;
    
    // 4. Prove knowledge of secret that hashes to proofHash
    // Simplified: secret * secret === proofHash (for demo)
    secretCheck <== zkmlSecret * zkmlSecret;
    secretCheck === proofHash;
    
    // 5. Final validation: all checks must pass
    signal output valid;
    signal temp1;
    signal temp2;
    
    temp1 <== decision * confidenceCheck;
    temp2 <== temp1 * amountValid;
    valid <== temp2;
}

component main {public [proofHash, decision, confidence, amountValid]} = ZKMLProofVerifier();