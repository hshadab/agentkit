// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ProofStorage {
    event ProofStored(
        bytes32 indexed proofHash,
        uint256 decision,
        uint256 confidence,
        address indexed submitter,
        uint256 timestamp
    );

    struct Verification {
        bytes32 proofHash;
        uint256 decision;
        uint256 confidence;
        address submitter;
        uint256 timestamp;
        bool exists;
    }

    mapping(bytes32 => Verification) public verifications;

    function storeVerification(
        bytes32 proofHash,
        uint256 decision,
        uint256 confidence
    ) external returns (bool) {
        require(!verifications[proofHash].exists, "Proof already stored");

        verifications[proofHash] = Verification({
            proofHash: proofHash,
            decision: decision,
            confidence: confidence,
            submitter: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        emit ProofStored(proofHash, decision, confidence, msg.sender, block.timestamp);

        return true;
    }

    function getVerification(bytes32 proofHash) external view returns (
        uint256 decision,
        uint256 confidence,
        address submitter,
        uint256 timestamp
    ) {
        require(verifications[proofHash].exists, "Proof not found");
        Verification memory v = verifications[proofHash];
        return (v.decision, v.confidence, v.submitter, v.timestamp);
    }
}
