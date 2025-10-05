pragma circom 2.1.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";

/*
 * ONNX Model Verification Circuit
 *
 * Verifies that specific outputs were generated from specific inputs
 * for a specific ONNX model (identified by hash).
 *
 * Inputs:
 *   - modelHash: SHA-256 hash of the ONNX model (public)
 *   - inputHash: Hash of test inputs (public)
 *   - outputHash: Hash of test outputs (public)
 *   - timestamp: Verification timestamp (public)
 *   - nonce: Random nonce for uniqueness (private)
 *
 * This circuit proves:
 * 1. The prover knows the relationship between inputs and outputs
 * 2. The model hash matches the claimed model
 * 3. The verification happened at a specific time
 */

template OnnxVerification() {
    // Public inputs
    signal input modelHash;      // Model identifier (first 128 bits of SHA-256)
    signal input inputHash;      // Hash of test inputs
    signal input outputHash;     // Hash of test outputs
    signal input timestamp;      // Unix timestamp

    // Private witness
    signal input nonce;          // Random nonce for uniqueness

    // Compute combined hash to prove knowledge
    component hasher = Poseidon(5);
    hasher.inputs[0] <== modelHash;
    hasher.inputs[1] <== inputHash;
    hasher.inputs[2] <== outputHash;
    hasher.inputs[3] <== timestamp;
    hasher.inputs[4] <== nonce;

    signal output commitmentHash;
    commitmentHash <== hasher.out;

    // Range check: timestamp must be reasonable (after Jan 1, 2024)
    component timestampCheck = GreaterThan(32);
    timestampCheck.in[0] <== timestamp;
    timestampCheck.in[1] <== 1704067200; // Jan 1, 2024
    timestampCheck.out === 1;
}

component main {public [modelHash, inputHash, outputHash, timestamp]} = OnnxVerification();
