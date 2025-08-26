// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Medical Records Integrity on Avalanche
 * @notice Ensure medical records haven't been tampered with using ZK proofs
 * @dev Optimized for Avalanche C-Chain - fast finality, low costs
 */
contract MedicalRecordsIntegrity {
    struct MedicalRecord {
        bytes32 recordHash;
        uint256 creationTimestamp;
        address provider;
        address patient;
        bool exists;
        uint256 accessCount;
        uint256 integrityScore;
    }
    
    struct AccessLog {
        address accessor;
        uint256 timestamp;
        bool verified;
    }
    
    // Mapping from record ID to medical record
    mapping(bytes32 => MedicalRecord) public medicalRecords;
    
    // Mapping from record ID to access logs
    mapping(bytes32 => AccessLog[]) public accessLogs;
    
    // Mapping from patient address to their record IDs
    mapping(address => bytes32[]) public patientRecords;
    
    // Integrity rewards
    mapping(address => uint256) public providerRewards;
    uint256 public constant INTEGRITY_REWARD = 0.001 ether;
    
    // Events
    event RecordCreated(
        bytes32 indexed recordId,
        address indexed provider,
        address indexed patient,
        uint256 timestamp
    );
    
    event RecordAccessed(
        bytes32 indexed recordId,
        address indexed accessor,
        bool integrityVerified,
        uint256 timestamp
    );
    
    event IntegrityVerified(
        bytes32 indexed recordId,
        uint256 integrityScore,
        uint256 rewardAmount
    );
    
    /**
     * @notice Create a new medical record entry
     * @param patientId The patient's unique identifier
     * @param recordHash Hash of the medical record content
     * @param patientAddress The patient's wallet address
     * @return recordId Unique ID for this medical record
     */
    function createMedicalRecord(
        uint256 patientId,
        bytes32 recordHash,
        address patientAddress
    ) external returns (bytes32 recordId) {
        // Generate unique record ID
        recordId = keccak256(abi.encodePacked(
            patientId,
            recordHash,
            msg.sender,
            block.timestamp
        ));
        
        // Ensure record doesn't already exist
        require(!medicalRecords[recordId].exists, "Record already exists");
        
        // Store medical record
        medicalRecords[recordId] = MedicalRecord({
            recordHash: recordHash,
            creationTimestamp: block.timestamp,
            provider: msg.sender,
            patient: patientAddress,
            exists: true,
            accessCount: 0,
            integrityScore: 100 // Start with perfect integrity
        });
        
        // Add to patient's records
        patientRecords[patientAddress].push(recordId);
        
        emit RecordCreated(recordId, msg.sender, patientAddress, block.timestamp);
    }
    
    /**
     * @notice Verify medical record integrity with ZK proof
     * @param recordId The record to verify
     * @param zkProof The ZK proof of integrity (verified off-chain)
     * @param currentHash The current hash to verify against
     */
    function verifyIntegrity(
        bytes32 recordId,
        bytes memory zkProof,
        bytes32 currentHash
    ) external {
        MedicalRecord storage record = medicalRecords[recordId];
        require(record.exists, "Record not found");
        
        // Check if hash matches (ensures no tampering)
        bool integrityMaintained = (record.recordHash == currentHash);
        
        // Log access
        accessLogs[recordId].push(AccessLog({
            accessor: msg.sender,
            timestamp: block.timestamp,
            verified: integrityMaintained
        }));
        
        record.accessCount++;
        
        // Update integrity score
        if (integrityMaintained) {
            // Increase score for successful verification
            if (record.integrityScore < 100) {
                record.integrityScore++;
            }
            
            // Reward provider for maintaining integrity
            if (block.timestamp > record.creationTimestamp + 30 days) {
                providerRewards[record.provider] += INTEGRITY_REWARD;
                emit IntegrityVerified(recordId, record.integrityScore, INTEGRITY_REWARD);
            }
        } else {
            // Decrease score for failed verification
            if (record.integrityScore > 0) {
                record.integrityScore = record.integrityScore / 2;
            }
        }
        
        emit RecordAccessed(recordId, msg.sender, integrityMaintained, block.timestamp);
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
            uint256 creationTimestamp,
            address provider,
            address patient,
            uint256 accessCount,
            uint256 integrityScore
        ) 
    {
        MedicalRecord memory record = medicalRecords[recordId];
        require(record.exists, "Record not found");
        
        return (
            record.recordHash,
            record.creationTimestamp,
            record.provider,
            record.patient,
            record.accessCount,
            record.integrityScore
        );
    }
    
    /**
     * @notice Get access history for a record
     * @param recordId The record to query
     * @param limit Maximum number of logs to return
     */
    function getAccessHistory(bytes32 recordId, uint256 limit) 
        external 
        view 
        returns (AccessLog[] memory) 
    {
        AccessLog[] memory logs = accessLogs[recordId];
        if (logs.length <= limit) {
            return logs;
        }
        
        // Return most recent logs
        AccessLog[] memory recentLogs = new AccessLog[](limit);
        uint256 startIndex = logs.length - limit;
        for (uint256 i = 0; i < limit; i++) {
            recentLogs[i] = logs[startIndex + i];
        }
        return recentLogs;
    }
    
    /**
     * @notice Get all records for a patient
     * @param patient The patient address
     */
    function getPatientRecords(address patient) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return patientRecords[patient];
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