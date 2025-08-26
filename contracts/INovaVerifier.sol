// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title INovaVerifier
 * @dev Interface for Nova SNARK verifier based on zkEngine proof structure
 * This aligns with the proof format from zkEngine's public.json output
 */
interface INovaVerifier {
    
    struct NovaPublicInputs {
        uint256[2] executionZ0;    // Initial execution state
        uint256 ICi;               // Instance commitment
        uint256[6] opsZ0;          // Initial operation state
        uint256 opsICi;            // Operations instance commitment
        uint256[5] scanZ0;         // Initial scan state
        uint256[2] scanICi;        // Scan instance commitments
    }
    
    struct NovaProof {
        // Compressed SNARK proof components
        // In production, this would include:
        // - Commitment to witness (W)
        // - Commitment to error vector (E)
        // - Evaluation proofs
        // - Cross-term commitments
        bytes32 commitmentW;
        bytes32 commitmentE;
        bytes32[] evaluationProofs;
        uint256 foldingChallenge;
    }
    
    /**
     * @dev Verify a Nova proof
     * @param proof The Nova proof to verify
     * @param publicInputs The public inputs/outputs
     * @return isValid Whether the proof is valid
     */
    function verifyProof(
        NovaProof calldata proof,
        NovaPublicInputs calldata publicInputs
    ) external view returns (bool isValid);
    
    /**
     * @dev Batch verify multiple Nova proofs
     * @param proofs Array of Nova proofs
     * @param publicInputsArray Array of public inputs
     * @return isValid Whether all proofs are valid
     */
    function batchVerifyProofs(
        NovaProof[] calldata proofs,
        NovaPublicInputs[] calldata publicInputsArray
    ) external view returns (bool isValid);
    
    /**
     * @dev Get the circuit digest (commitment to R1CS structure)
     * This would be set during contract deployment
     */
    function getCircuitDigest() external view returns (bytes32);
    
    /**
     * @dev Events
     */
    event ProofVerified(
        bytes32 indexed proofHash,
        address indexed verifier,
        bool isValid
    );
}