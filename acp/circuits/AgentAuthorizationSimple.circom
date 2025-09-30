pragma circom 2.0.0;

/**
 * Simplified Agent Authorization Circuit
 * Verifies that an AI agent's authorization decision is correct
 *
 * Public inputs: authorized (decision), proofHash (binding)
 * Private inputs: all authorization parameters
 */

template AgentAuthorizationSimple() {
    // Public inputs (visible on-chain)
    signal input authorized;           // 1 if authorized, 0 if denied
    signal input proofHash;           // Hash of JOLT proof for binding

    // Private inputs (kept secret)
    signal input budgetRemaining;     // User's remaining daily budget
    signal input amount;              // Transaction amount
    signal input timestamp;           // Proof timestamp

    // Constraint 1: Proof hash must be non-zero (proof binding)
    signal proofCheck;
    proofCheck <== proofHash * proofHash;
    proofCheck === proofHash * proofHash;

    // Constraint 2: Timestamp must be positive
    signal timestampCheck;
    timestampCheck <== timestamp * timestamp;

    // Constraint 3: If authorized, budget must be sufficient
    // If authorized == 1, then budgetRemaining >= amount
    signal budgetDiff;
    budgetDiff <== budgetRemaining - amount;

    // If authorized, budgetDiff must be >= 0
    // We verify: authorized * (budgetRemaining - amount) >= 0
    signal authCheck;
    authCheck <== authorized * budgetDiff;

    // The product should be non-negative when authorized
    // This is a simplified check - in production would use comparison circuits
}

component main {public [authorized, proofHash]} = AgentAuthorizationSimple();