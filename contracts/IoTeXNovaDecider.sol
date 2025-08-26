// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// IoTeX Nova Decider Contract for Device Proximity Verification
// This contract verifies Nova IVC proofs for IoT device proximity

contract IoTeXNovaDecider {
    // Device registry
    mapping(bytes32 => DeviceInfo) public devices;
    mapping(bytes32 => mapping(uint256 => bool)) public verifiedProofs;
    mapping(bytes32 => uint256) public deviceRewards;
    
    struct DeviceInfo {
        address owner;
        bool registered;
        uint256 registrationTime;
        uint256 lastProximityProof;
    }
    
    struct NovaProof {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
        uint256[32] publicInputs;
    }
    
    event DeviceRegistered(bytes32 indexed deviceId, address indexed owner);
    event ProximityVerified(bytes32 indexed deviceId, uint256 proofId, uint256 timestamp);
    event RewardsClaimed(bytes32 indexed deviceId, address indexed owner, uint256 amount);
    
    // Proximity parameters (center: 5000,5000, radius: 100)
    uint256 constant PROXIMITY_CENTER_X = 5000;
    uint256 constant PROXIMITY_CENTER_Y = 5000;
    uint256 constant PROXIMITY_RADIUS = 100;
    uint256 constant REWARD_PER_PROOF = 0.01 ether; // 0.01 IOTX per proof
    
    // Register a new IoT device
    function registerDevice(bytes32 deviceId, address owner) external {
        require(!devices[deviceId].registered, "Device already registered");
        require(owner != address(0), "Invalid owner address");
        
        devices[deviceId] = DeviceInfo({
            owner: owner,
            registered: true,
            registrationTime: block.timestamp,
            lastProximityProof: 0
        });
        
        emit DeviceRegistered(deviceId, owner);
    }
    
    // Verify device proximity using Nova proof
    function verifyDeviceProximity(
        NovaProof memory proof,
        bytes32 deviceId,
        uint256 proofId,
        bytes memory signature
    ) external returns (bool) {
        require(devices[deviceId].registered, "Device not registered");
        require(!verifiedProofs[deviceId][proofId], "Proof already verified");
        
        // In production, this would verify the Nova proof using KZG commitment
        // For testnet demo, we'll do simplified verification
        bool isValid = _verifyNovaProof(proof, deviceId);
        
        if (isValid) {
            verifiedProofs[deviceId][proofId] = true;
            devices[deviceId].lastProximityProof = block.timestamp;
            
            // Add rewards for successful proximity proof
            deviceRewards[deviceId] += REWARD_PER_PROOF;
            
            emit ProximityVerified(deviceId, proofId, block.timestamp);
        }
        
        return isValid;
    }
    
    // Simplified Nova proof verification (placeholder for actual verification)
    function _verifyNovaProof(NovaProof memory proof, bytes32 deviceId) internal pure returns (bool) {
        // In production:
        // 1. Verify the Groth16 proof using precompiled contracts
        // 2. Check that publicInputs encode valid proximity proof
        // 3. Verify device signature
        
        // For demo, check basic constraints
        require(proof.publicInputs[0] != 0, "Invalid proof data");
        require(uint256(deviceId) != 0, "Invalid device ID");
        
        // Simulate verification success for demo
        return true;
    }
    
    // Claim accumulated rewards
    function claimRewards(bytes32 deviceId) external {
        require(devices[deviceId].registered, "Device not registered");
        require(msg.sender == devices[deviceId].owner, "Not device owner");
        
        uint256 rewards = deviceRewards[deviceId];
        require(rewards > 0, "No rewards to claim");
        
        deviceRewards[deviceId] = 0;
        
        // Transfer rewards
        (bool success, ) = msg.sender.call{value: rewards}("");
        require(success, "Reward transfer failed");
        
        emit RewardsClaimed(deviceId, msg.sender, rewards);
    }
    
    // Get device information
    function getDeviceInfo(bytes32 deviceId) external view returns (
        address owner,
        bool registered,
        uint256 registrationTime,
        uint256 lastProximityProof,
        uint256 pendingRewards
    ) {
        DeviceInfo memory device = devices[deviceId];
        return (
            device.owner,
            device.registered,
            device.registrationTime,
            device.lastProximityProof,
            deviceRewards[deviceId]
        );
    }
    
    // Check if a specific proof has been verified
    function isProofVerified(bytes32 deviceId, uint256 proofId) external view returns (bool) {
        return verifiedProofs[deviceId][proofId];
    }
    
    // Fallback function to receive IOTX for rewards pool
    receive() external payable {}
}