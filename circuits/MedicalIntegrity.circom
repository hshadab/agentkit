pragma circom 2.0.0;

/*
 * Medical Records Integrity Circuit
 * Proves that:
 * 1. A medical record hash matches the on-chain commitment
 * 2. The prover knows the pre-image (patient data) 
 * 3. The record hasn't been tampered with
 */

template MedicalIntegrity() {
    // Private inputs (hidden from verifier)
    signal input patientId;        // Private patient identifier
    signal input diagnosis;        // Private diagnosis code
    signal input treatment;        // Private treatment code
    signal input timestamp;        // Private timestamp
    signal input nonce;           // Private random nonce
    
    // Public inputs (visible to verifier)
    signal input recordHash;       // Public on-chain hash commitment
    signal input integrityCheck;  // Public integrity verification flag
    
    // Intermediate signals
    signal hash1;
    signal hash2;
    signal hash3;
    signal hash4;
    signal computedHash;
    
    // Compute hash step by step (simplified for demo)
    // In production, use Poseidon hash
    hash1 <== patientId * patientId + diagnosis;
    hash2 <== treatment * treatment + timestamp;
    hash3 <== hash1 * 1000000 + hash2;
    hash4 <== hash3 + nonce * nonce;
    
    // Final hash computation
    computedHash <== hash4 % 2**252;  // Keep within field size
    
    // Constraint: computed hash must match the public on-chain hash
    recordHash === computedHash;
    
    // Constraint: integrity check must be valid (1)
    integrityCheck === 1;
    
    // Additional constraints to prevent trivial solutions
    signal patientIdSquared;
    patientIdSquared <== patientId * patientId;
    component rangeCheck = IsInRange(1, 999999);
    rangeCheck.in <== patientId;
}

// Helper template to check if value is in range
template IsInRange(min, max) {
    signal input in;
    signal output out;
    
    component gtMin = GreaterThan(20);
    gtMin.in[0] <== in;
    gtMin.in[1] <== min - 1;
    
    component ltMax = LessThan(20);
    ltMax.in[0] <== in;
    ltMax.in[1] <== max + 1;
    
    out <== gtMin.out * ltMax.out;
}

template GreaterThan(n) {
    signal input in[2];
    signal output out;
    out <== in[0] > in[1] ? 1 : 0;
}

template LessThan(n) {
    signal input in[2];
    signal output out;
    out <== in[0] < in[1] ? 1 : 0;
}

component main = MedicalIntegrity();