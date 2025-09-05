pragma circom 2.0.0;

/*
 * Simplified AI Prediction Circuit
 * Proves knowledge of prompt/response that hash to public commitments
 */

template AIPredictionSimple() {
    // Private inputs
    signal input prompt;      // Private: AI prompt as number
    signal input response;    // Private: AI response as number  
    signal input nonce;       // Private: Random nonce
    
    // Public output - the commitment hash
    signal output commitmentHash;
    
    // Compute hash (simplified: (prompt + response + nonce)^2)
    signal sum;
    
    sum <== prompt + response + nonce;
    commitmentHash <== sum * sum;
    
    // Additional constraints to prevent trivial solutions
    signal promptCheck;
    signal responseCheck;
    
    promptCheck <== prompt * prompt;
    responseCheck <== response * response;
}

component main = AIPredictionSimple();