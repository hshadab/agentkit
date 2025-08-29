pragma circom 2.1.0;

include "../../node_modules/circomlib/circuits/comparators.circom";
include "../../node_modules/circomlib/circuits/gates.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";

/*
 * JOLT zkML Decision Verifier Circuit - Phase 1
 * 
 * This circuit verifies the core decision logic from a JOLT-Atlas LLM proof:
 * - Decision (APPROVE/DENY)
 * - Confidence score (0-100)
 * - Basic threshold validation
 * 
 * Public inputs:
 * - decision (1 = APPROVE, 0 = DENY)
 * - confidence (0-100)
 * - threshold (minimum confidence required, typically 80)
 * 
 * Private witnesses:
 * - proofHash (hash of the full JOLT proof)
 * - timestamp (when proof was generated)
 */

template JOLTDecisionVerifier() {
    // Public inputs
    signal input decision;      // 1 = APPROVE, 0 = DENY
    signal input confidence;    // 0-100
    signal input threshold;     // Minimum confidence (e.g., 80)
    
    // Private witnesses (not revealed on-chain)
    signal input proofHash;     // Hash of the full JOLT proof
    signal input timestamp;     // Unix timestamp
    
    // Output signal
    signal output valid;        // 1 if valid, 0 otherwise
    
    // --- Constraint 1: Decision must be binary (0 or 1) ---
    component decisionBinary = IsZero();
    decisionBinary.in <== decision * (decision - 1);
    decisionBinary.out === 1;
    
    // --- Constraint 2: Confidence must be in range [0, 100] ---
    component confInRange = LessEqThan(7); // 7 bits for values up to 127
    confInRange.in[0] <== confidence;
    confInRange.in[1] <== 100;
    
    component confNonNegative = GreaterEqThan(7);
    confNonNegative.in[0] <== confidence;
    confNonNegative.in[1] <== 0;
    
    component confValid = AND();
    confValid.a <== confInRange.out;
    confValid.b <== confNonNegative.out;
    confValid.out === 1;
    
    // --- Constraint 3: If APPROVE, confidence must meet threshold ---
    // If decision == 1 (APPROVE), then confidence >= threshold
    // If decision == 0 (DENY), no threshold check needed
    
    component thresholdCheck = GreaterEqThan(7);
    thresholdCheck.in[0] <== confidence;
    thresholdCheck.in[1] <== threshold;
    
    // Use implication: decision => thresholdCheck
    // Which is equivalent to: NOT(decision) OR thresholdCheck
    component notDecision = NOT();
    notDecision.in <== decision;
    
    component implication = OR();
    implication.a <== notDecision.out;
    implication.b <== thresholdCheck.out;
    implication.out === 1;
    
    // --- Constraint 4: ProofHash must be non-zero ---
    component proofHashNonZero = IsZero();
    proofHashNonZero.in <== proofHash;
    proofHashNonZero.out === 0; // Proof hash should NOT be zero
    
    // --- Constraint 5: Timestamp reasonableness check ---
    // Timestamp should be > 1700000000 (Nov 2023) and < 2000000000 (May 2033)
    component timestampMin = GreaterThan(32);
    timestampMin.in[0] <== timestamp;
    timestampMin.in[1] <== 1700000000;
    
    component timestampMax = LessThan(32);
    timestampMax.in[0] <== timestamp;
    timestampMax.in[1] <== 2000000000;
    
    component timestampValid = AND();
    timestampValid.a <== timestampMin.out;
    timestampValid.b <== timestampMax.out;
    timestampValid.out === 1;
    
    // --- Final output: All constraints must be satisfied ---
    component finalAnd1 = AND();
    finalAnd1.a <== decisionBinary.out;
    finalAnd1.b <== confValid.out;
    
    component finalAnd2 = AND();
    finalAnd2.a <== finalAnd1.out;
    finalAnd2.b <== implication.out;
    
    component finalAnd3 = AND();
    finalAnd3.a <== finalAnd2.out;
    finalAnd3.b <== 1 - proofHashNonZero.out; // Convert to positive logic
    
    component finalAnd4 = AND();
    finalAnd4.a <== finalAnd3.out;
    finalAnd4.b <== timestampValid.out;
    
    valid <== finalAnd4.out;
    
    // Log for debugging (these won't appear on-chain)
    log("Decision:", decision);
    log("Confidence:", confidence);
    log("Threshold:", threshold);
    log("Valid:", valid);
}

component main {public [decision, confidence, threshold]} = JOLTDecisionVerifier();