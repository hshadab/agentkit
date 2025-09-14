// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IAvaxGroth16Verifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[6] calldata _pubSignals
    ) external view returns (bool);
}

contract AvaxGroth16VerifierWithStorage {
    IAvaxGroth16Verifier public immutable groth16Verifier;

    struct VerificationRecord {
        uint256[6] inputs; // Full public inputs
        uint256 timestamp;
        address verifier;
    }

    mapping(bytes32 => VerificationRecord) public verified;
    mapping(address => uint256) public verificationCount;

    event ProofStored(bytes32 indexed proofId, address indexed verifier, uint256[6] inputs, uint256 timestamp);

    constructor(address _groth16) {
        groth16Verifier = IAvaxGroth16Verifier(_groth16);
    }

    function verifyAndStore(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[6] calldata _pubSignals
    ) external returns (bool) {
        require(groth16Verifier.verifyProof(_pA, _pB, _pC, _pubSignals), "Invalid proof");
        bytes32 proofId = keccak256(abi.encodePacked(_pA, _pB, _pC, _pubSignals));
        require(verified[proofId].timestamp == 0, "Already stored");
        verified[proofId] = VerificationRecord({ inputs: _pubSignals, timestamp: block.timestamp, verifier: msg.sender });
        verificationCount[msg.sender] += 1;
        emit ProofStored(proofId, msg.sender, _pubSignals, block.timestamp);
        return true;
    }

    function isStored(bytes32 proofId) external view returns (bool) {
        return verified[proofId].timestamp != 0;
    }
}

