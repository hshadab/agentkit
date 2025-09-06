// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ProximityGroth16Verifier.sol";

/**
 * @title IoTeXProximitySystem
 * @notice Complete IoTeX proximity verification system with device registration and IOTX rewards
 * @dev Uses real Groth16 cryptographic verification for proximity proofs
 */
contract IoTeXProximitySystem is Groth16Verifier {
    // ========== State Variables ==========
    
    struct Device {
        address owner;
        uint256 deviceIdHash;  // Hash of device secret
        bool isRegistered;
        uint256 lastProofTime;
        uint256 totalRewards;
        uint256 proofCount;
    }
    
    struct ProximityConfig {
        uint256 centerX;
        uint256 centerY;
        uint256 maxDistanceSquared;
        uint256 rewardAmount;
        uint256 cooldownPeriod;  // Minimum time between proofs
    }
    
    // Device registry
    mapping(uint256 => Device) public devices;  // deviceIdHash => Device
    mapping(address => uint256[]) public userDevices;  // user => deviceIdHashes
    
    // Proof tracking
    mapping(bytes32 => bool) public usedProofs;  // Prevent proof replay
    mapping(address => uint256) public pendingRewards;  // Accumulated rewards
    
    // Configuration
    ProximityConfig public config;
    address public owner;
    uint256 public totalDevices;
    uint256 public totalProofsVerified;
    uint256 public totalRewardsPaid;
    
    // ========== Events ==========
    
    event DeviceRegistered(
        uint256 indexed deviceIdHash,
        address indexed owner,
        uint256 timestamp
    );
    
    event ProximityProofVerified(
        uint256 indexed deviceIdHash,
        address indexed owner,
        bool isWithinProximity,
        uint256 reward,
        uint256 timestamp
    );
    
    event RewardsClaimed(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    
    event ConfigUpdated(
        uint256 centerX,
        uint256 centerY,
        uint256 maxDistanceSquared,
        uint256 rewardAmount
    );
    
    // ========== Modifiers ==========
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier deviceExists(uint256 deviceIdHash) {
        require(devices[deviceIdHash].isRegistered, "Device not registered");
        _;
    }
    
    // ========== Constructor ==========
    
    constructor() {
        owner = msg.sender;
        
        // Default configuration for IoTeX proximity
        config = ProximityConfig({
            centerX: 5000,
            centerY: 5000,
            maxDistanceSquared: 10000,  // ~100 unit radius
            rewardAmount: 0.01 ether,   // 0.01 IOTX per valid proof
            cooldownPeriod: 1 hours      // 1 hour between proofs
        });
    }
    
    // ========== Device Management ==========
    
    /**
     * @notice Register a new device
     * @param deviceIdHash Hash of the device secret (computed off-chain)
     */
    function registerDevice(uint256 deviceIdHash) external {
        require(!devices[deviceIdHash].isRegistered, "Device already registered");
        require(deviceIdHash != 0, "Invalid device ID");
        
        devices[deviceIdHash] = Device({
            owner: msg.sender,
            deviceIdHash: deviceIdHash,
            isRegistered: true,
            lastProofTime: 0,
            totalRewards: 0,
            proofCount: 0
        });
        
        userDevices[msg.sender].push(deviceIdHash);
        totalDevices++;
        
        emit DeviceRegistered(deviceIdHash, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Transfer device ownership
     * @param deviceIdHash The device to transfer
     * @param newOwner The new owner address
     */
    function transferDevice(uint256 deviceIdHash, address newOwner) 
        external 
        deviceExists(deviceIdHash) 
    {
        require(devices[deviceIdHash].owner == msg.sender, "Not device owner");
        require(newOwner != address(0), "Invalid new owner");
        
        // Remove from old owner's list
        _removeDeviceFromUser(msg.sender, deviceIdHash);
        
        // Update ownership
        devices[deviceIdHash].owner = newOwner;
        
        // Add to new owner's list
        userDevices[newOwner].push(deviceIdHash);
    }
    
    // ========== Proximity Verification ==========
    
    /**
     * @notice Verify a proximity proof and award rewards if valid
     * @param proof The Groth16 proof components
     * @param publicInputs [centerX, centerY, maxDistanceSquared, deviceIdHash]
     * @return isValid Whether the proof is valid and device is within proximity
     */
    function verifyProximity(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[6] memory publicInputs  // [centerX, centerY, maxDist², deviceId, isWithinProx, computedDeviceId]
    ) external returns (bool isValid) {
        // Check device is registered
        uint256 deviceIdHash = publicInputs[3];
        require(devices[deviceIdHash].isRegistered, "Device not registered");
        require(devices[deviceIdHash].owner == msg.sender, "Not device owner");
        
        // Check cooldown period
        require(
            block.timestamp >= devices[deviceIdHash].lastProofTime + config.cooldownPeriod,
            "Cooldown period not met"
        );
        
        // Verify configuration matches
        require(publicInputs[0] == config.centerX, "Invalid center X");
        require(publicInputs[1] == config.centerY, "Invalid center Y");
        require(publicInputs[2] == config.maxDistanceSquared, "Invalid max distance");
        
        // Prevent proof replay
        bytes32 proofHash = keccak256(abi.encodePacked(a, b, c, block.timestamp / 1 days));
        require(!usedProofs[proofHash], "Proof already used");
        usedProofs[proofHash] = true;
        
        // Verify the Groth16 proof
        isValid = verifyProof(a, b, c, publicInputs);
        
        if (isValid && publicInputs[4] == 1) {  // isWithinProximity output
            // Award rewards
            devices[deviceIdHash].lastProofTime = block.timestamp;
            devices[deviceIdHash].totalRewards += config.rewardAmount;
            devices[deviceIdHash].proofCount++;
            
            pendingRewards[msg.sender] += config.rewardAmount;
            totalProofsVerified++;
            
            emit ProximityProofVerified(
                deviceIdHash,
                msg.sender,
                true,
                config.rewardAmount,
                block.timestamp
            );
        } else {
            emit ProximityProofVerified(
                deviceIdHash,
                msg.sender,
                false,
                0,
                block.timestamp
            );
        }
        
        return isValid;
    }
    
    // ========== Reward Management ==========
    
    /**
     * @notice Claim accumulated rewards
     */
    function claimRewards() external {
        uint256 reward = pendingRewards[msg.sender];
        require(reward > 0, "No rewards to claim");
        require(address(this).balance >= reward, "Insufficient contract balance");
        
        pendingRewards[msg.sender] = 0;
        totalRewardsPaid += reward;
        
        (bool success, ) = msg.sender.call{value: reward}("");
        require(success, "Reward transfer failed");
        
        emit RewardsClaimed(msg.sender, reward, block.timestamp);
    }
    
    // ========== View Functions ==========
    
    /**
     * @notice Get all devices owned by a user
     * @param user The user address
     * @return deviceIds Array of device ID hashes
     */
    function getUserDevices(address user) external view returns (uint256[] memory) {
        return userDevices[user];
    }
    
    /**
     * @notice Get device details
     * @param deviceIdHash The device ID hash
     * @return device The device struct
     */
    function getDevice(uint256 deviceIdHash) external view returns (Device memory) {
        return devices[deviceIdHash];
    }
    
    /**
     * @notice Check if a device can submit a proof
     * @param deviceIdHash The device ID hash
     * @return canSubmit Whether the device can submit a proof now
     * @return timeUntilNext Seconds until next proof can be submitted
     */
    function canSubmitProof(uint256 deviceIdHash) 
        external 
        view 
        returns (bool canSubmit, uint256 timeUntilNext) 
    {
        if (!devices[deviceIdHash].isRegistered) {
            return (false, 0);
        }
        
        uint256 nextProofTime = devices[deviceIdHash].lastProofTime + config.cooldownPeriod;
        
        if (block.timestamp >= nextProofTime) {
            return (true, 0);
        } else {
            return (false, nextProofTime - block.timestamp);
        }
    }
    
    // ========== Admin Functions ==========
    
    /**
     * @notice Update proximity configuration
     * @param _centerX New center X coordinate
     * @param _centerY New center Y coordinate
     * @param _maxDistanceSquared New maximum distance squared
     * @param _rewardAmount New reward amount per proof
     */
    function updateConfig(
        uint256 _centerX,
        uint256 _centerY,
        uint256 _maxDistanceSquared,
        uint256 _rewardAmount
    ) external onlyOwner {
        config.centerX = _centerX;
        config.centerY = _centerY;
        config.maxDistanceSquared = _maxDistanceSquared;
        config.rewardAmount = _rewardAmount;
        
        emit ConfigUpdated(_centerX, _centerY, _maxDistanceSquared, _rewardAmount);
    }
    
    /**
     * @notice Update cooldown period
     * @param _cooldownPeriod New cooldown period in seconds
     */
    function updateCooldown(uint256 _cooldownPeriod) external onlyOwner {
        config.cooldownPeriod = _cooldownPeriod;
    }
    
    /**
     * @notice Fund contract for rewards
     */
    receive() external payable {}
    
    /**
     * @notice Emergency withdraw (owner only)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Withdraw failed");
    }
    
    // ========== Internal Functions ==========
    
    /**
     * @notice Remove device from user's device list
     * @param user The user address
     * @param deviceIdHash The device to remove
     */
    function _removeDeviceFromUser(address user, uint256 deviceIdHash) internal {
        uint256[] storage userDeviceList = userDevices[user];
        for (uint256 i = 0; i < userDeviceList.length; i++) {
            if (userDeviceList[i] == deviceIdHash) {
                userDeviceList[i] = userDeviceList[userDeviceList.length - 1];
                userDeviceList.pop();
                break;
            }
        }
    }
}