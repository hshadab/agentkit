// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Simplified Mock IoTeX Device Verifier for Testing
contract IoTeXDeviceVerifierMockSimple {
    // Device registry
    mapping(bytes32 => DeviceInfo) public devices;
    mapping(bytes32 => uint256) public deviceRewards;
    
    uint256 public totalRewardsDistributed;
    uint256 public rewardPool;
    address public owner;
    
    struct DeviceInfo {
        address owner;
        bool registered;
        uint256 registrationTime;
        uint256 lastProximityProof;
    }
    
    event DeviceRegistered(bytes32 indexed deviceId, address indexed owner);
    event ProximityVerified(bytes32 indexed deviceId, uint256 proofId, uint256 timestamp);
    event RewardsClaimed(bytes32 indexed deviceId, address indexed owner, uint256 amount);
    
    uint256 constant REWARD_PER_PROOF = 0.01 ether;
    
    constructor() {
        owner = msg.sender;
    }
    
    // Register device
    function registerDevice(bytes32 deviceId, address deviceOwner) external {
        require(!devices[deviceId].registered, "Already registered");
        
        devices[deviceId] = DeviceInfo({
            owner: deviceOwner,
            registered: true,
            registrationTime: block.timestamp,
            lastProximityProof: 0
        });
        
        emit DeviceRegistered(deviceId, deviceOwner);
    }
    
    // Simplified verify - split into multiple functions to avoid stack too deep
    function verifyDeviceProximity(
        uint256[3] calldata i_z0_zi,
        uint256[4] calldata U_i_cmW_U_i_cmE,
        uint256[2] calldata u_i_cmW,
        uint256[3] calldata cmT_r,
        uint256[2] calldata pA,
        uint256[2][2] calldata pB,
        uint256[2] calldata pC,
        uint256[4] calldata challenge_W_challenge_E_kzg_evals,
        uint256[2][2] calldata kzg_proof,
        bytes32 deviceId,
        uint256 proofId
    ) external returns (bool) {
        require(devices[deviceId].registered, "Not registered");
        
        // Extract coordinates
        uint256 x = i_z0_zi[0];
        uint256 y = i_z0_zi[1];
        
        // Basic validation
        require(x > 0 || y > 0, "Invalid coordinates");
        require(pA[0] != 0 || pA[1] != 0, "Invalid proof");
        
        // Check proximity (within 100 units of 5000,5000)
        bool withinProximity = _checkProximity(x, y);
        
        // Update device
        devices[deviceId].lastProximityProof = block.timestamp;
        
        // Add rewards if within proximity
        if (withinProximity && rewardPool >= REWARD_PER_PROOF) {
            deviceRewards[deviceId] += REWARD_PER_PROOF;
            rewardPool -= REWARD_PER_PROOF;
            totalRewardsDistributed += REWARD_PER_PROOF;
        }
        
        emit ProximityVerified(deviceId, proofId, block.timestamp);
        return true;
    }
    
    function _checkProximity(uint256 x, uint256 y) internal pure returns (bool) {
        uint256 centerX = 5000;
        uint256 centerY = 5000;
        uint256 radius = 100;
        
        uint256 dx = x > centerX ? x - centerX : centerX - x;
        uint256 dy = y > centerY ? y - centerY : centerY - y;
        
        return (dx * dx + dy * dy) <= (radius * radius);
    }
    
    // Claim rewards
    function claimRewards(bytes32 deviceId) external {
        require(devices[deviceId].owner == msg.sender, "Not owner");
        
        uint256 rewards = deviceRewards[deviceId];
        require(rewards > 0, "No rewards");
        
        deviceRewards[deviceId] = 0;
        
        (bool success, ) = msg.sender.call{value: rewards}("");
        require(success, "Transfer failed");
        
        emit RewardsClaimed(deviceId, msg.sender, rewards);
    }
    
    // Get device info
    function getDeviceInfo(bytes32 deviceId) external view returns (
        address deviceOwner,
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
    
    // Fund reward pool
    function fundRewardPool() external payable {
        rewardPool += msg.value;
    }
    
    receive() external payable {
        rewardPool += msg.value;
    }
}