pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

template ZKMLProofOfProof() {
    // Public inputs (visible on-chain)
    signal input proofHash;         // Hash of the zkML proof
    signal input decision;          // 1 = APPROVE, 0 = DENY
    signal input confidence;        // Confidence score (0-100)
    signal input amountValid;       // 1 = valid amount, 0 = invalid
    
    // Private inputs (hidden but proven)
    signal input zkmlProofData[4];  // Simplified proof data
    signal input promptHash;        // Original prompt hash from zkML
    
    // Output signal
    signal output valid;
    
    // 1. Prove the zkML proof data hashes to the public hash
    component hasher = Poseidon(4);
    hasher.inputs[0] <== zkmlProofData[0];
    hasher.inputs[1] <== zkmlProofData[1];
    hasher.inputs[2] <== zkmlProofData[2];
    hasher.inputs[3] <== zkmlProofData[3];
    
    // Check hash matches
    proofHash === hasher.out;
    
    // 2. Prove decision is binary (0 or 1)
    decision * (1 - decision) === 0;
    
    // 3. Prove confidence is high enough (>= 90)
    component gte = GreaterEqThan(8);
    gte.in[0] <== confidence;
    gte.in[1] <== 90;
    
    // 4. Prove amount is valid
    amountValid * (1 - amountValid) === 0;
    
    // 5. Combine all checks for final validity
    // valid = 1 only if all conditions are met:
    // - decision == 1 (APPROVE)
    // - confidence >= 90
    // - amountValid == 1
    signal intermediate1;
    signal intermediate2;
    
    intermediate1 <== decision * gte.out;
    intermediate2 <== intermediate1 * amountValid;
    
    valid <== intermediate2;
    
    // Ensure prompt hash is non-zero (basic sanity check)
    component isZero = IsZero();
    isZero.in <== promptHash;
    isZero.out === 0;
}

component main {public [proofHash, decision, confidence, amountValid]} = ZKMLProofOfProof();