// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ProofVerifier
 * @dev Verifies zero-knowledge proofs on Ethereum
 * Deployed on Sepolia: 0x1e8150050a7a4715aad42b905c08df76883f396f
 */
contract ProofVerifier {
    // Mapping to track verified commitments
    mapping(bytes32 => bool) public verifiedProofs;
    
    // Mapping to store proof details
    mapping(string => ProofData) public proofDetails;
    
    struct ProofData {
        bytes32 commitment;
        uint8 proofType;
        address verifier;
        uint256 timestamp;
    }
    
    // Events
    event ProofVerified(
        string indexed proofId,
        bytes32 indexed commitment,
        address indexed verifier,
        uint8 proofType,
        uint256 timestamp
    );
    
    /**
     * @dev Verify a proof on-chain
     * @param proofId Unique identifier for the proof
     * @param commitment Cryptographic commitment (hash) of the proof
     * @param proofType Type of proof (0: KYC, 1: Location, 2: AI Content)
     */
    function verifyProof(
        string memory proofId,
        bytes32 commitment,
        uint8 proofType
    ) public {
        require(!verifiedProofs[commitment], "Proof already verified");
        require(proofType <= 2, "Invalid proof type");
        
        // Mark as verified
        verifiedProofs[commitment] = true;
        
        // Store proof details
        proofDetails[proofId] = ProofData({
            commitment: commitment,
            proofType: proofType,
            verifier: msg.sender,
            timestamp: block.timestamp
        });
        
        // Emit event
        emit ProofVerified(
            proofId,
            commitment,
            msg.sender,
            proofType,
            block.timestamp
        );
    }
    
    /**
     * @dev Check if a commitment has been verified
     * @param commitment The commitment to check
     * @return bool True if verified
     */
    function isVerified(bytes32 commitment) public view returns (bool) {
        return verifiedProofs[commitment];
    }
    
    /**
     * @dev Get proof details by ID
     * @param proofId The proof ID to query
     * @return ProofData The proof details
     */
    function getProofDetails(string memory proofId) public view returns (ProofData memory) {
        return proofDetails[proofId];
    }
}