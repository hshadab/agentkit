pragma circom 2.1.9;

// Minimal circuit that exposes [decision, confidence, proofHash] as public outputs
// and enforces they equal the respective inputs. Intended for commitment anchoring.
template DecisionWithCommitment() {
    signal input decision;
    signal input confidence;
    signal input proofHash;

    signal output decision_pub;
    signal output confidence_pub;
    signal output proofHash_pub;

    decision_pub <== decision;
    confidence_pub <== confidence;
    proofHash_pub <== proofHash;
}

component main = DecisionWithCommitment();
