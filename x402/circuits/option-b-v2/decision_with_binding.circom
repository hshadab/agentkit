pragma circom 2.1.9;

// Exposes 5 public outputs for stronger binding:
// [decision, confidence, proofHash, modelHash, policyHash]
template DecisionWithBinding() {
    signal input decision;
    signal input confidence;
    signal input proofHash;
    signal input modelHash;
    signal input policyHash;

    signal output decision_pub;
    signal output confidence_pub;
    signal output proofHash_pub;
    signal output modelHash_pub;
    signal output policyHash_pub;

    decision_pub <== decision;
    confidence_pub <== confidence;
    proofHash_pub <== proofHash;
    modelHash_pub <== modelHash;
    policyHash_pub <== policyHash;
}

component main = DecisionWithBinding();

