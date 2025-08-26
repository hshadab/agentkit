// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MockVerifier {
    event ProofVerified(
        bytes32 indexed proofId,
        address indexed verifier,
        uint256 timestamp,
        bool isValid
    );
    
    mapping(bytes32 => bool) public verifiedProofs;
    mapping(bytes32 => uint256) public proofTimestamps;
    
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory publicSignals
    ) public returns (bool) {
        // Mock verifier - accepts any proof
        // In production, this would perform actual verification
        
        // Create a unique proof ID from the proof data
        bytes32 proofId = keccak256(abi.encodePacked(a, b, c, publicSignals));
        
        // Mark as verified
        verifiedProofs[proofId] = true;
        proofTimestamps[proofId] = block.timestamp;
        
        emit ProofVerified(proofId, msg.sender, block.timestamp, true);
        
        return true;
    }
    
    function getProofStatus(bytes32 proofId) public view returns (
        bool isVerified,
        uint256 timestamp
    ) {
        return (verifiedProofs[proofId], proofTimestamps[proofId]);
    }
}