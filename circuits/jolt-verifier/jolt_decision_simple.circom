pragma circom 2.1.0;

include "../../node_modules/circomlib/circuits/comparators.circom";

/*
 * Simplified JOLT zkML Decision Verifier
 * 
 * This circuit verifies just the core decision from JOLT-Atlas:
 * - Decision (APPROVE/DENY) 
 * - Confidence score
 * 
 * Future: Can be expanded to validate all 14 LLM parameters
 */

template JOLTDecisionSimple() {
    // Public inputs (what gets verified on-chain)
    signal input decision;      // 1 = APPROVE, 0 = DENY
    signal input confidence;    // 0-100
    
    // Constraint 1: Decision must be binary (0 or 1)
    signal decisionCheck;
    decisionCheck <== decision * (decision - 1);
    decisionCheck === 0;
    
    // Constraint 2: Confidence must be in range [0, 100]
    component confRange = LessEqThan(7); // 7 bits for values up to 127
    confRange.in[0] <== confidence;
    confRange.in[1] <== 100;
    confRange.out === 1;
    
    // Constraint 3: If APPROVE, confidence must be >= 80
    component confThreshold = GreaterEqThan(7);
    confThreshold.in[0] <== confidence;
    confThreshold.in[1] <== 80;
    
    // Only check threshold if decision is APPROVE
    signal thresholdCheck;
    thresholdCheck <== decision * (1 - confThreshold.out);
    thresholdCheck === 0;
}

component main {public [decision, confidence]} = JOLTDecisionSimple();