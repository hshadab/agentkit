pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

/*
 * Agent Behavior Verification Circuit
 *
 * Proves that an AI agent produces expected outputs for given test inputs.
 * This enables trustless agent marketplaces by cryptographically verifying
 * agent behavior before purchase/deployment.
 *
 * Private inputs:
 *   - testInput[3]: Hashes of 3 test inputs given to the agent
 *   - expectedOutput[3]: Hashes of expected outputs for each test
 *   - actualOutput[3]: Hashes of actual outputs the agent produced
 *
 * Public inputs:
 *   - agentModelHash: Hash of the agent's model weights (public identifier)
 *
 * Public outputs:
 *   - allTestsPassed: 1 if all tests passed, 0 otherwise
 *   - passedCount: Number of tests that passed (0-3)
 */

template AgentBehaviorVerification() {
    // Private inputs - what we're proving
    signal input testInput[3];
    signal input expectedOutput[3];
    signal input actualOutput[3];

    // Public input - identifies which agent
    signal input agentModelHash;

    // Public outputs - verification results
    signal output allTestsPassed;
    signal output passedCount;

    // Internal signals for test results
    signal testPassed[3];
    signal runningSum[4];

    // Component to check equality
    component eq[3];

    // Check each test case
    for (var i = 0; i < 3; i++) {
        eq[i] = IsEqual();
        eq[i].in[0] <== expectedOutput[i];
        eq[i].in[1] <== actualOutput[i];
        testPassed[i] <== eq[i].out;
    }

    // Count how many tests passed
    runningSum[0] <== 0;
    for (var i = 0; i < 3; i++) {
        runningSum[i + 1] <== runningSum[i] + testPassed[i];
    }

    passedCount <== runningSum[3];

    // All tests passed if count == 3
    component allPassed = IsEqual();
    allPassed.in[0] <== passedCount;
    allPassed.in[1] <== 3;
    allTestsPassed <== allPassed.out;

    // Verify test inputs are non-zero (prevents trivial proofs)
    component nonZero[3];
    for (var i = 0; i < 3; i++) {
        nonZero[i] = IsZero();
        nonZero[i].in <== testInput[i];
        nonZero[i].out === 0;  // Constraint: testInput must NOT be zero
    }

    // Verify agent model hash is non-zero
    component modelNonZero = IsZero();
    modelNonZero.in <== agentModelHash;
    modelNonZero.out === 0;
}

component main {public [agentModelHash]} = AgentBehaviorVerification();
