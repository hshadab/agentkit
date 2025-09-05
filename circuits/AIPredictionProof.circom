pragma circom 2.0.0;

/*
 * AI Prediction Proof Circuit
 * Proves knowledge of a valid AI prediction commitment
 * without revealing the actual prompt or response
 */

template AIPredictionProof() {
    // Private inputs - hidden from verifier
    signal input prompt;        // Private: The AI prompt (encoded as number)
    signal input response;      // Private: The AI response (encoded as number)
    signal input nonce;         // Private: Random nonce for security
    
    // Public inputs - visible to verifier
    signal input promptHash;    // Public: Hash of prompt + nonce
    signal input responseHash;  // Public: Hash of response + nonce
    signal input timestamp;     // Public: Timestamp of prediction
    
    // Intermediate signals
    signal promptSquared;
    signal responseSquared;
    signal nonceSquared;
    
    // Square the inputs (to ensure they're used in constraints)
    promptSquared <== prompt * prompt;
    responseSquared <== response * response;
    nonceSquared <== nonce * nonce;
    
    // Compute expected hashes (simplified for demo)
    signal computedPromptHash;
    signal computedResponseHash;
    
    // Simple hash: (value + nonce)^2 mod large prime
    computedPromptHash <== (prompt + nonce) * (prompt + nonce);
    computedResponseHash <== (response + nonce) * (response + nonce);
    
    // Main constraints: computed hashes must match public inputs
    promptHash === computedPromptHash;
    responseHash === computedResponseHash;
    
    // Additional constraint: timestamp must be non-zero
    signal timestampCheck;
    timestampCheck <== timestamp * timestamp;
    component isNonZero = IsNonZero();
    isNonZero.in <== timestamp;
    isNonZero.out === 1;
}

// Helper template to check non-zero
template IsNonZero() {
    signal input in;
    signal output out;
    
    signal inv;
    
    // If in != 0, then inv = 1/in and out = 1
    // If in == 0, then inv = 0 and out = 0
    inv <-- in != 0 ? 1/in : 0;
    out <== in * inv;
    
    // Ensure out is binary
    out * (1 - out) === 0;
}

component main = AIPredictionProof();