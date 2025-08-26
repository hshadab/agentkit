// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ProximityNovaDeciderSimple
 * @notice Simplified Nova proof verifier that focuses on proximity validation
 * @dev This version accepts proofs if proximity computation matches the claimed result
 */
contract ProximityNovaDeciderSimple {
    
    // Events for debugging
    event ProximityChecked(uint256 x, uint256 y, bool expectedResult, bool actualResult);
    
    /**
     * @notice Verify a Nova proof for device proximity (simplified)
     * @param i_z0_zi Initial and final state [x, y, withinProximity]
     * @param U_i_cmW_U_i_cmE U commitments (4 elements)
     * @param u_i_cmW u commitment (2 elements)
     * @param cmT_r T commitment and randomness (3 elements)
     * @param pA Groth16 proof point A
     * @param pB Groth16 proof point B
     * @param pC Groth16 proof point C
     * @param challenge_W_challenge_E_kzg_evals KZG challenges and evaluations
     * @param kzg_proof KZG proof points
     * @return bool indicating if proof is valid
     */
    function verifyNovaProof(
        uint256[3] calldata i_z0_zi,
        uint256[4] calldata U_i_cmW_U_i_cmE,
        uint256[2] calldata u_i_cmW,
        uint256[3] calldata cmT_r,
        uint256[2] calldata pA,
        uint256[2][2] calldata pB,
        uint256[2] calldata pC,
        uint256[4] calldata challenge_W_challenge_E_kzg_evals,
        uint256[2][2] calldata kzg_proof
    ) external view returns (bool) {
        // Extract coordinates and claimed result
        uint256 x = i_z0_zi[0];
        uint256 y = i_z0_zi[1];
        uint256 claimedResult = i_z0_zi[2];
        
        // Validate inputs
        require(claimedResult <= 1, "Invalid proximity result");
        
        // Check if the proximity computation matches the claimed result
        bool actuallyWithinProximity = _checkProximity(x, y);
        bool claimedWithinProximity = (claimedResult == 1);
        
        // For this simplified version, we accept the proof if:
        // 1. The proximity calculation matches the claimed result
        // 2. Basic validation of proof components passes
        if (actuallyWithinProximity != claimedWithinProximity) {
            return false; // Mismatch between claimed and actual proximity
        }
        
        // Basic validation of proof components
        // In a real implementation, this would do full cryptographic verification
        bool componentsValid = _validateProofComponents(
            U_i_cmW_U_i_cmE,
            u_i_cmW,
            cmT_r,
            pA,
            pB,
            pC,
            challenge_W_challenge_E_kzg_evals,
            kzg_proof
        );
        
        return componentsValid;
    }
    
    /**
     * @notice Check if coordinates are within proximity
     * @param x X coordinate
     * @param y Y coordinate
     * @return bool true if within 100 units of (5000, 5000)
     */
    function _checkProximity(uint256 x, uint256 y) internal pure returns (bool) {
        uint256 centerX = 5000;
        uint256 centerY = 5000;
        uint256 radius = 100;
        
        uint256 dx = x > centerX ? x - centerX : centerX - x;
        uint256 dy = y > centerY ? y - centerY : centerY - y;
        
        // Check if distance squared is within radius squared
        // This avoids square root calculation
        return (dx * dx + dy * dy) <= (radius * radius);
    }
    
    /**
     * @notice Basic validation of proof components
     * @dev In a real implementation, this would perform cryptographic verification
     */
    function _validateProofComponents(
        uint256[4] memory U_commitments,
        uint256[2] memory u_commitment,
        uint256[3] memory T_commitment,
        uint256[2] memory pA,
        uint256[2][2] memory pB,
        uint256[2] memory pC,
        uint256[4] memory challenges_evals,
        uint256[2][2] memory kzg_proof
    ) internal pure returns (bool) {
        // Basic checks to ensure components are non-zero
        // In production, this would do actual cryptographic verification
        
        // Check that key components are non-zero
        if (pA[0] == 0 || pA[1] == 0) return false;
        if (pC[0] == 0 || pC[1] == 0) return false;
        
        // For this simplified version, accept proofs with valid-looking components
        return true;
    }
    
    /**
     * @notice Get proximity check result for testing
     * @param x X coordinate
     * @param y Y coordinate
     * @return bool true if within proximity
     */
    function checkProximity(uint256 x, uint256 y) external pure returns (bool) {
        return _checkProximity(x, y);
    }
}