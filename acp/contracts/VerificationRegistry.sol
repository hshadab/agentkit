// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IGroth16Verifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[2] calldata _pubSignals
    ) external view returns (bool);
}

/**
 * @title VerificationRegistry
 * @notice Stores on-chain records of all zkML proof verifications
 * @dev Each verification creates an on-chain transaction with gas cost (testnet in this demo)
 */
contract VerificationRegistry {
    IGroth16Verifier public immutable verifier;

    struct VerificationRecord {
        bool verified;
        uint256 timestamp;
        uint256 authorized;
        uint256 proofHash;
        address submitter;
    }

    // Mapping from verification ID to record
    mapping(bytes32 => VerificationRecord) public verifications;

    // Array of all verification IDs for enumeration
    bytes32[] public verificationIds;

    // Events
    event ProofVerified(
        bytes32 indexed verificationId,
        address indexed submitter,
        bool verified,
        uint256 authorized,
        uint256 proofHash,
        uint256 timestamp
    );

    constructor(address _verifier) {
        verifier = IGroth16Verifier(_verifier);
    }

    /**
     * @notice Verify a proof and store the result on-chain
     * @dev This is a state-changing function that costs gas
     * @return verificationId The unique ID for this verification
     */
    function verifyAndStore(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[2] calldata _pubSignals
    ) external returns (bytes32 verificationId) {
        // Call the Groth16 verifier
        bool verified = verifier.verifyProof(_pA, _pB, _pC, _pubSignals);

        // Generate unique verification ID from proof data
        verificationId = keccak256(abi.encodePacked(
            _pA[0], _pA[1],
            _pB[0][0], _pB[0][1], _pB[1][0], _pB[1][1],
            _pC[0], _pC[1],
            block.timestamp,
            msg.sender
        ));

        // Store the verification record
        verifications[verificationId] = VerificationRecord({
            verified: verified,
            timestamp: block.timestamp,
            authorized: _pubSignals[0],
            proofHash: _pubSignals[1],
            submitter: msg.sender
        });

        // Add to verification IDs array
        verificationIds.push(verificationId);

        // Emit event
        emit ProofVerified(
            verificationId,
            msg.sender,
            verified,
            _pubSignals[0],
            _pubSignals[1],
            block.timestamp
        );

        return verificationId;
    }

    /**
     * @notice Get the total number of verifications
     */
    function getVerificationCount() external view returns (uint256) {
        return verificationIds.length;
    }

    /**
     * @notice Get verification record by ID
     */
    function getVerification(bytes32 verificationId)
        external
        view
        returns (
            bool verified,
            uint256 timestamp,
            uint256 authorized,
            uint256 proofHash,
            address submitter
        )
    {
        VerificationRecord memory record = verifications[verificationId];
        return (
            record.verified,
            record.timestamp,
            record.authorized,
            record.proofHash,
            record.submitter
        );
    }
}
