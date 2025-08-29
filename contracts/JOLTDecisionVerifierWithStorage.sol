// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IGroth16Verifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[2] calldata _pubSignals
    ) external view returns (bool);
}

contract JOLTDecisionVerifierWithStorage {
    // The deployed Groth16 verifier contract
    IGroth16Verifier public immutable groth16Verifier;
    
    // Storage for verified decisions
    struct VerifiedDecision {
        uint256 decision;      // 0 = DENY, 1 = APPROVE
        uint256 confidence;    // 0-100
        uint256 timestamp;
        address verifier;
        bytes32 proofHash;
    }
    
    mapping(bytes32 => VerifiedDecision) public verifiedDecisions;
    mapping(address => uint256) public verificationCount;
    
    // Events
    event DecisionVerified(
        bytes32 indexed proofId,
        uint256 decision,
        uint256 confidence,
        address indexed verifier,
        uint256 timestamp
    );
    
    constructor(address _groth16Verifier) {
        groth16Verifier = IGroth16Verifier(_groth16Verifier);
    }
    
    /**
     * @notice Verify and store a JOLT decision proof on-chain
     * @dev This function DOES cost gas as it modifies state
     * @param _pA Proof element A
     * @param _pB Proof element B  
     * @param _pC Proof element C
     * @param _pubSignals Public signals [decision, confidence]
     * @return success Whether verification succeeded
     */
    function verifyAndStore(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[2] calldata _pubSignals
    ) external returns (bool success) {
        // Verify the proof using the Groth16 verifier
        require(
            groth16Verifier.verifyProof(_pA, _pB, _pC, _pubSignals),
            "Invalid proof"
        );
        
        // Generate unique proof ID
        bytes32 proofId = keccak256(abi.encodePacked(_pA, _pB, _pC, block.timestamp));
        
        // Ensure this exact proof hasn't been verified before
        require(
            verifiedDecisions[proofId].timestamp == 0,
            "Proof already verified"
        );
        
        // Store the verified decision on-chain
        verifiedDecisions[proofId] = VerifiedDecision({
            decision: _pubSignals[0],
            confidence: _pubSignals[1],
            timestamp: block.timestamp,
            verifier: msg.sender,
            proofHash: proofId
        });
        
        // Increment verifier's count
        verificationCount[msg.sender]++;
        
        // Emit event (this is permanently recorded in logs)
        emit DecisionVerified(
            proofId,
            _pubSignals[0],
            _pubSignals[1],
            msg.sender,
            block.timestamp
        );
        
        return true;
    }
    
    /**
     * @notice Check if a proof has been verified (gasless view function)
     * @param proofId The proof ID to check
     * @return verified Whether the proof was verified
     * @return decision The decision (0=DENY, 1=APPROVE)
     * @return confidence The confidence level
     */
    function checkVerification(bytes32 proofId) 
        external 
        view 
        returns (
            bool verified,
            uint256 decision,
            uint256 confidence,
            uint256 timestamp
        ) 
    {
        VerifiedDecision memory vd = verifiedDecisions[proofId];
        return (
            vd.timestamp > 0,
            vd.decision,
            vd.confidence,
            vd.timestamp
        );
    }
    
    /**
     * @notice Get total verifications by an address
     * @param verifier The address to check
     * @return count Number of verifications
     */
    function getVerificationCount(address verifier) external view returns (uint256) {
        return verificationCount[verifier];
    }
}