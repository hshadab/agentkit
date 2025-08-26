pragma circom 2.0.0;

template SimpleProof() {
    signal input commitment;
    signal input proofType;
    signal output isValid;
    
    // Simple constraint: isValid = 1 if commitment != 0
    signal nonZero;
    nonZero <-- commitment != 0 ? 1 : 0;
    nonZero * (1 - nonZero) === 0; // Ensure nonZero is binary
    
    isValid <== nonZero;
}

component main = SimpleProof();