// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Medical Records Integrity V2 on Avalanche
 * @notice Enhanced version with real cryptographic verification
 * @dev Uses Merkle proofs for efficient on-chain verification
 */
contract MedicalRecordsIntegrityV2 {
    struct MedicalRecord {
        bytes32 recordHash;
        bytes32 merkleRoot;        // Root of Merkle tree containing all record data
        uint256 creationTimestamp;
        address provider;
        address patient;
        bool exists;
        uint256 accessCount;
        uint256 integrityScore;
        uint256 lastVerified;      // Last successful verification timestamp
    }
    
    struct MerkleProof {
        bytes32[] proof;
        uint256 leafIndex;
        bytes32 leafData;
    }
    
    struct AccessLog {
        address accessor;
        uint256 timestamp;
        bool verified;
        bytes32 proofHash;         // Hash of the proof provided
    }
    
    // Mapping from record ID to medical record
    mapping(bytes32 => MedicalRecord) public medicalRecords;
    
    // Mapping from record ID to access logs
    mapping(bytes32 => AccessLog[]) public accessLogs;
    
    // Mapping from patient address to their record IDs
    mapping(address => bytes32[]) public patientRecords;
    
    // Mapping to track verified proof hashes (prevent replay)
    mapping(bytes32 => bool) public usedProofs;
    
    // Integrity rewards
    mapping(address => uint256) public providerRewards;
    uint256 public constant INTEGRITY_REWARD = 0.001 ether;
    uint256 public constant VERIFICATION_BONUS = 0.0005 ether;
    
    // Events
    event RecordCreated(
        bytes32 indexed recordId,
        address indexed provider,
        address indexed patient,
        bytes32 merkleRoot,
        uint256 timestamp
    );
    
    event IntegrityVerified(
        bytes32 indexed recordId,
        address indexed verifier,
        uint256 integrityScore,
        bytes32 proofHash,
        uint256 timestamp
    );
    
    event VerificationFailed(
        bytes32 indexed recordId,
        address indexed verifier,
        string reason,
        uint256 timestamp
    );
    
    /**
     * @notice Create a new medical record entry with Merkle root
     * @param patientId The patient's unique identifier
     * @param recordHash Hash of the medical record content
     * @param merkleRoot Root of Merkle tree containing record components
     * @param patientAddress The patient's wallet address
     * @return recordId Unique ID for this medical record
     */
    function createMedicalRecord(
        uint256 patientId,
        bytes32 recordHash,
        bytes32 merkleRoot,
        address patientAddress
    ) external returns (bytes32 recordId) {
        // Generate unique record ID
        recordId = keccak256(abi.encodePacked(
            patientId,
            recordHash,
            merkleRoot,
            msg.sender,
            block.timestamp
        ));
        
        // Ensure record doesn't already exist
        require(!medicalRecords[recordId].exists, "Record already exists");
        
        // Store medical record with Merkle root
        medicalRecords[recordId] = MedicalRecord({
            recordHash: recordHash,
            merkleRoot: merkleRoot,
            creationTimestamp: block.timestamp,
            provider: msg.sender,
            patient: patientAddress,
            exists: true,
            accessCount: 0,
            integrityScore: 100,
            lastVerified: 0
        });
        
        // Add to patient's records
        patientRecords[patientAddress].push(recordId);
        
        emit RecordCreated(recordId, msg.sender, patientAddress, merkleRoot, block.timestamp);
    }
    
    /**
     * @notice Verify medical record integrity with Merkle proof
     * @param recordId The record to verify
     * @param merkleProof The Merkle proof components
     * @param currentHash The current hash to verify against
     */
    function verifyIntegrityWithProof(
        bytes32 recordId,
        bytes32[] memory merkleProof,
        uint256 leafIndex,
        bytes32 leafData,
        bytes32 currentHash
    ) external {
        MedicalRecord storage record = medicalRecords[recordId];
        require(record.exists, "Record not found");
        
        // Generate proof hash to prevent replay attacks
        bytes32 proofHash = keccak256(abi.encodePacked(
            merkleProof,
            leafIndex,
            leafData,
            msg.sender,
            block.number
        ));
        
        // Ensure this proof hasn't been used before
        require(!usedProofs[proofHash], "Proof already used");
        usedProofs[proofHash] = true;
        
        // Verify the Merkle proof
        bool proofValid = verifyMerkleProof(
            merkleProof,
            record.merkleRoot,
            leafData,
            leafIndex
        );
        
        // Check if hash matches (ensures no tampering)
        bool hashMatches = (record.recordHash == currentHash);
        
        // Both conditions must be true for successful verification
        bool integrityMaintained = proofValid && hashMatches;
        
        // Log access with proof hash
        accessLogs[recordId].push(AccessLog({
            accessor: msg.sender,
            timestamp: block.timestamp,
            verified: integrityMaintained,
            proofHash: proofHash
        }));
        
        record.accessCount++;
        
        if (integrityMaintained) {
            // Update last verified timestamp
            record.lastVerified = block.timestamp;
            
            // Increase integrity score
            if (record.integrityScore < 100) {
                record.integrityScore += 5; // Bigger boost for successful verification
                if (record.integrityScore > 100) {
                    record.integrityScore = 100;
                }
            }
            
            // Reward verifier for successful verification
            if (msg.sender != record.provider) {
                providerRewards[msg.sender] += VERIFICATION_BONUS;
            }
            
            // Reward provider for maintaining integrity
            if (block.timestamp > record.creationTimestamp + 7 days) {
                providerRewards[record.provider] += INTEGRITY_REWARD;
            }
            
            emit IntegrityVerified(
                recordId, 
                msg.sender, 
                record.integrityScore, 
                proofHash,
                block.timestamp
            );
        } else {
            // Decrease score for failed verification
            if (record.integrityScore > 10) {
                record.integrityScore = record.integrityScore * 3 / 4; // 25% penalty
            }
            
            emit VerificationFailed(
                recordId,
                msg.sender,
                proofValid ? "Hash mismatch" : "Invalid proof",
                block.timestamp
            );
        }
    }
    
    /**
     * @notice Verify a Merkle proof
     * @param proof Array of sibling hashes
     * @param root Merkle root to verify against
     * @param leaf Leaf data to verify
     * @param index Position of leaf in the tree
     * @return bool True if proof is valid
     */
    function verifyMerkleProof(
        bytes32[] memory proof,
        bytes32 root,
        bytes32 leaf,
        uint256 index
    ) internal pure returns (bool) {
        bytes32 computedHash = leaf;
        
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            
            if (index % 2 == 0) {
                // Hash(current, proof)
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                // Hash(proof, current)
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
            
            index = index / 2;
        }
        
        return computedHash == root;
    }
    
    /**
     * @notice Get medical record details
     * @param recordId The record to query
     */
    function getRecord(bytes32 recordId) 
        external 
        view 
        returns (
            bytes32 recordHash,
            bytes32 merkleRoot,
            uint256 creationTimestamp,
            address provider,
            address patient,
            uint256 accessCount,
            uint256 integrityScore,
            uint256 lastVerified
        ) 
    {
        MedicalRecord memory record = medicalRecords[recordId];
        require(record.exists, "Record not found");
        
        return (
            record.recordHash,
            record.merkleRoot,
            record.creationTimestamp,
            record.provider,
            record.patient,
            record.accessCount,
            record.integrityScore,
            record.lastVerified
        );
    }
    
    /**
     * @notice Check if a proof has been used
     * @param proofData The proof data to check
     */
    function isProofUsed(bytes32 proofData) external view returns (bool) {
        bytes32 proofHash = keccak256(abi.encodePacked(proofData, msg.sender));
        return usedProofs[proofHash];
    }
    
    /**
     * @notice Get verification statistics for a record
     * @param recordId The record to query
     */
    function getVerificationStats(bytes32 recordId) 
        external 
        view 
        returns (
            uint256 totalAccesses,
            uint256 successfulVerifications,
            uint256 failedVerifications,
            uint256 daysSinceCreation,
            uint256 hoursSinceLastVerified
        ) 
    {
        MedicalRecord memory record = medicalRecords[recordId];
        require(record.exists, "Record not found");
        
        AccessLog[] memory logs = accessLogs[recordId];
        uint256 successful = 0;
        uint256 failed = 0;
        
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].verified) {
                successful++;
            } else {
                failed++;
            }
        }
        
        uint256 daysSince = (block.timestamp - record.creationTimestamp) / 1 days;
        uint256 hoursSince = record.lastVerified > 0 
            ? (block.timestamp - record.lastVerified) / 1 hours 
            : 0;
        
        return (record.accessCount, successful, failed, daysSince, hoursSince);
    }
    
    /**
     * @notice Claim accumulated rewards
     */
    function claimRewards() external {
        uint256 rewards = providerRewards[msg.sender];
        require(rewards > 0, "No rewards available");
        
        providerRewards[msg.sender] = 0;
        
        (bool success, ) = msg.sender.call{value: rewards}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @notice Fund the reward pool
     */
    receive() external payable {}
}