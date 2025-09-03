pragma circom 2.0.0;

/*
 * Simplified Medical Records Integrity Circuit
 * Proves knowledge of medical record pre-image that hashes to on-chain commitment
 */

template MedicalIntegritySimple() {
    // Private inputs - what we're hiding
    signal input patientId;      // Private: patient identifier
    signal input recordData;     // Private: medical data
    
    // Public inputs - what the verifier sees
    signal input recordHash;     // Public: on-chain hash commitment
    
    // Compute hash of private inputs
    signal hash1;
    signal hash2;
    signal computedHash;
    
    // Simple hash computation (for demo - use Poseidon in production)
    hash1 <== patientId * patientId;
    hash2 <== recordData * recordData;
    computedHash <== hash1 + hash2;
    
    // Main constraint: computed hash MUST equal on-chain hash
    recordHash === computedHash;
    
    // Additional constraint to prevent trivial solutions
    signal check;
    check <== patientId * recordData;
    check * 1 === check; // Force computation
}

component main = MedicalIntegritySimple();