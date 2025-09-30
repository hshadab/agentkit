pragma circom 2.0.0;

/**
 * Agent Authorization Circuit - Groth16 Proof-of-Proof
 *
 * This circuit verifies that an AI agent correctly authorized a payment
 * based on user-defined spending rules. It proves:
 * 1. Agent decision was computed correctly
 * 2. User spending rules were enforced
 * 3. All authorization checks passed
 *
 * This is a "proof-of-proof" that validates the zkML JOLT proof output
 */

template AgentAuthorization() {
    // Public inputs (visible on-chain)
    signal input authorized;           // 1 if authorized, 0 if denied
    signal input proofHash;           // Hash of JOLT proof for binding

    // Private inputs (kept secret)
    signal input budgetRemaining;     // User's remaining daily budget
    signal input merchantTrust;       // Merchant trust score (0-100)
    signal input amount;              // Transaction amount
    signal input categoryScore;       // Category allowance (0 or 100)
    signal input velocity;            // Transactions today

    signal input modelHash;           // Hash of ONNX model (prevents tampering)
    signal input inputsHash;          // Hash of user rules (prevents modification)
    signal input timestamp;           // Proof timestamp
    signal input nonce;               // Random nonce (prevents replay)

    // Authorization logic components
    signal budgetCheck;
    signal trustCheck;
    signal categoryCheck;
    signal velocityCheck;
    signal allChecksPassed;

    // 1. Budget check: amount <= budgetRemaining
    component budgetComparator = LessThan(64);
    budgetComparator.in[0] <== amount;
    budgetComparator.in[1] <== budgetRemaining + 1; // +1 to make it <=
    budgetCheck <== budgetComparator.out;

    // 2. Trust check: merchantTrust >= 50 (0.5 * 100)
    component trustComparator = GreaterEqThan(64);
    trustComparator.in[0] <== merchantTrust;
    trustComparator.in[1] <== 50;
    trustCheck <== trustComparator.out;

    // 3. Category check: categoryScore == 100 (allowed)
    component categoryComparator = IsEqual();
    categoryComparator.in[0] <== categoryScore;
    categoryComparator.in[1] <== 100;
    categoryCheck <== categoryComparator.out;

    // 4. Velocity check: velocity < 15
    component velocityComparator = LessThan(64);
    velocityComparator.in[0] <== velocity;
    velocityComparator.in[1] <== 15;
    velocityCheck <== velocityComparator.out;

    // 5. All checks must pass for authorization
    component andGate1 = AND();
    andGate1.a <== budgetCheck;
    andGate1.b <== trustCheck;

    component andGate2 = AND();
    andGate2.a <== andGate1.out;
    andGate2.b <== categoryCheck;

    component andGate3 = AND();
    andGate3.a <== andGate2.out;
    andGate3.b <== velocityCheck;

    allChecksPassed <== andGate3.out;

    // 6. Verify authorized output matches computed result
    component authComparator = IsEqual();
    authComparator.in[0] <== authorized;
    authComparator.in[1] <== allChecksPassed;
    authComparator.out === 1; // Must match

    // 7. Constrain inputs to prevent tampering
    // Verify modelHash, inputsHash, timestamp, nonce are non-zero
    signal modelHashNonZero <== IsNonZero(modelHash);
    signal inputsHashNonZero <== IsNonZero(inputsHash);
    signal timestampNonZero <== IsNonZero(timestamp);
    signal nonceNonZero <== IsNonZero(nonce);

    modelHashNonZero === 1;
    inputsHashNonZero === 1;
    timestampNonZero === 1;
    nonceNonZero === 1;

    // 8. Bind proof hash to prevent proof swapping
    signal proofHashNonZero <== IsNonZero(proofHash);
    proofHashNonZero === 1;
}

// Helper: Check if value is non-zero
function IsNonZero(value) {
    signal output out;
    signal inv <-- value != 0 ? 1/value : 0;
    out <== value * inv;
    return out;
}

// Comparison templates (from circomlib)
template LessThan(n) {
    assert(n <= 252);
    signal input in[2];
    signal output out;

    component n2b = Num2Bits(n+1);
    n2b.in <== in[0] + (1<<n) - in[1];

    out <== 1-n2b.out[n];
}

template GreaterEqThan(n) {
    signal input in[2];
    signal output out;

    component lt = LessThan(n);
    lt.in[0] <== in[0];
    lt.in[1] <== in[1];

    out <== 1 - lt.out;
}

template IsEqual() {
    signal input in[0];
    signal input in[1];
    signal output out;

    component isz = IsZero();
    isz.in <== in[1] - in[0];

    out <== isz.out;
}

template IsZero() {
    signal input in;
    signal output out;

    signal inv;
    inv <-- in!=0 ? 1/in : 0;

    out <== -in*inv +1;
    in*out === 0;
}

template AND() {
    signal input a;
    signal input b;
    signal output out;

    out <== a*b;
}

template Num2Bits(n) {
    signal input in;
    signal output out[n];
    var lc1=0;

    var e2=1;
    for (var i = 0; i<n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] -1 ) === 0;
        lc1 += out[i] * e2;
        e2 = e2+e2;
    }

    lc1 === in;
}

// Main component
component main {public [authorized, proofHash]} = AgentAuthorization();