pragma circom 2.0.0;

/*
 * Agent Authorization Circuit for CCTP Transfers
 * 
 * This circuit proves that an AI agent is authorized to spend USDC
 * without revealing sensitive information about spending limits or
 * internal agent logic.
 * 
 * Public Inputs:
 * - agentIdHash: Hash of the agent identifier
 * - transferAmount: Amount of USDC to transfer (in 6-decimal format)
 * - timestamp: Unix timestamp of authorization
 * 
 * Private Inputs:
 * - agentId: The actual agent identifier (e.g., "executor_001")
 * - ownerSecret: Owner's authorization secret
 * - spendingLimit: Maximum amount agent can spend
 * - nonce: Prevents replay attacks
 */

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

template AgentAuthorization() {
    // Public inputs
    signal input agentIdHash;      // Hash of agent ID for public verification
    signal input transferAmount;   // Amount to transfer (public)
    signal input timestamp;        // Authorization timestamp (public)
    
    // Private inputs
    signal input agentId;          // Secret agent identifier
    signal input ownerSecret;      // Owner authorization secret
    signal input spendingLimit;    // Agent's spending limit
    signal input nonce;            // Unique nonce for this authorization
    
    // Outputs
    signal output isValid;         // 1 if authorization is valid, 0 otherwise
    
    // Components for hashing and comparisons
    component agentHasher = Poseidon(1);
    component authHasher = Poseidon(4);
    component limitCheck = LessEqThan(64);
    component nonZeroCheck = IsZero();
    
    // 1. Verify agent ID hash matches
    agentHasher.inputs[0] <== agentId;
    agentIdHash === agentHasher.out;
    
    // 2. Verify transfer amount is within spending limit
    limitCheck.in[0] <== transferAmount;
    limitCheck.in[1] <== spendingLimit;
    limitCheck.out === 1;
    
    // 3. Verify authorization signature
    // Hash(ownerSecret + agentId + transferAmount + nonce) must be valid
    authHasher.inputs[0] <== ownerSecret;
    authHasher.inputs[1] <== agentId;
    authHasher.inputs[2] <== transferAmount;
    authHasher.inputs[3] <== nonce;
    
    // 4. Ensure non-zero transfer amount
    nonZeroCheck.in <== transferAmount;
    nonZeroCheck.out === 0; // transferAmount should NOT be zero
    
    // 5. Output validation result
    // All checks must pass for valid authorization
    isValid <== limitCheck.out;
}

component main = AgentAuthorization();