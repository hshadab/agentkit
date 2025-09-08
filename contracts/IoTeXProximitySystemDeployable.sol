// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IGroth16Verifier {
    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[6] calldata _pubSignals) external view returns (bool);
}

/**
 * @title IoTeXProximitySystem
 * @notice Complete IoTeX proximity verification system with device registration and IOTX rewards
 * @dev Uses real Groth16 cryptographic verification for proximity proofs
 */
contract IoTeXProximitySystem {
    // ========== State Variables ==========
    
    IGroth16Verifier public immutable verifier;
    
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
    mapping(uint256 => Device) public devices;         // deviceIdHash (raw 256-bit) => Device
    mapping(uint256 => Device) public devicesByModR;   // deviceIdHash mod r (BN128 scalar field) => Device
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
        uint256 x,
        uint256 y,
        uint256 distanceSquared,
        uint256 timestamp
    );
    
    event RewardClaimed(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    
    event ConfigUpdated(
        uint256 centerX,
        uint256 centerY,
        uint256 maxDistanceSquared,
        uint256 rewardAmount,
        uint256 cooldownPeriod
    );
    
    // ========== Modifiers ==========
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier deviceExists(uint256 deviceIdHash) {
        require(devices[deviceIdHash].isRegistered, "Device not registered");
        _;
    }
    
    // ========== Constructor ==========
    
    constructor(address _verifier) {
        verifier = IGroth16Verifier(_verifier);
        owner = msg.sender;
        
        // Initialize default proximity config (IoTeX office location)
        config = ProximityConfig({
            centerX: 5000,      // Example center coordinates
            centerY: 5000,
            maxDistanceSquared: 10000, // 100m radius (100^2)
            rewardAmount: 0.1 ether,   // 0.1 IOTX per proof
            cooldownPeriod: 1 hours    // 1 hour between proofs
        });
    }
    
    // BN128 scalar field modulus
    uint256 constant FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    
    // ========== Core Functions ==========
    
    /**
     * @notice Register a new device
     * @param deviceSecret Unique secret for the device
     * @return deviceIdHash The hash of the device ID
     */
    function registerDevice(uint256 deviceSecret) external returns (uint256) {
        // Generate device ID hash from secret
        uint256 deviceIdHash = uint256(keccak256(abi.encodePacked(deviceSecret, msg.sender)));
        
        require(!devices[deviceIdHash].isRegistered, "Device already registered");
        
        // Create device record (raw)
        devices[deviceIdHash] = Device({
            owner: msg.sender,
            deviceIdHash: deviceIdHash,
            isRegistered: true,
            lastProofTime: 0,
            totalRewards: 0,
            proofCount: 0
        });
        
        // Also index by field modulus to match zk public signal representation
        uint256 deviceIdHashModR = deviceIdHash % FIELD_MODULUS;
        require(!devicesByModR[deviceIdHashModR].isRegistered, "Device (mod r) already registered");
        devicesByModR[deviceIdHashModR] = Device({
            owner: msg.sender,
            deviceIdHash: deviceIdHash,
            isRegistered: true,
            lastProofTime: 0,
            totalRewards: 0,
            proofCount: 0
        });
        
        // Track user's devices
        userDevices[msg.sender].push(deviceIdHash);
        totalDevices++;
        
        emit DeviceRegistered(deviceIdHash, msg.sender, block.timestamp);
        
        return deviceIdHash;
    }
    
    /**
     * @notice Verify a proximity proof and reward the device owner
     * @param _pA Proof component A
     * @param _pB Proof component B
     * @param _pC Proof component C
     * @param _pubSignals Public signals [deviceId, x, y, distanceSquared, timestamp, nonce]
     */
    function verifyProximityAndReward(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[6] calldata _pubSignals
    ) external {
        // Extract public inputs (deviceIdHash is represented mod r in the proof)
        uint256 deviceIdHashModR = _pubSignals[0];
        uint256 x = _pubSignals[1];
        uint256 y = _pubSignals[2];
        uint256 distanceSquared = _pubSignals[3];
        uint256 proofTimestamp = _pubSignals[4];
        uint256 nonce = _pubSignals[5];
        
        // Lookup registered device by mod r
        Device storage device = devicesByModR[deviceIdHashModR];
        require(device.isRegistered, "Device not registered");
        
        // Verify proof hasn't been used
        bytes32 proofHash = keccak256(abi.encodePacked(_pA, _pB, _pC, _pubSignals));
        require(!usedProofs[proofHash], "Proof already used");
        
        // Check cooldown period
        require(
            block.timestamp >= device.lastProofTime + config.cooldownPeriod,
            "Cooldown period not met"
        );
        
        // Verify timestamp is recent (within 5 minutes)
        require(
            block.timestamp <= proofTimestamp + 5 minutes,
            "Proof timestamp too old"
        );
        require(
            proofTimestamp <= block.timestamp,
            "Proof timestamp in future"
        );
        
        // Verify distance is within allowed range
        require(
            distanceSquared <= config.maxDistanceSquared,
            "Distance exceeds maximum allowed"
        );
        
        // Verify the zero-knowledge proof
        bool valid = verifier.verifyProof(_pA, _pB, _pC, _pubSignals);
        require(valid, "Invalid proximity proof");
        
        // Mark proof as used
        usedProofs[proofHash] = true;
        
        // Update device stats
        device.lastProofTime = block.timestamp;
        device.proofCount++;
        device.totalRewards += config.rewardAmount;
        
        // Add reward to pending
        pendingRewards[device.owner] += config.rewardAmount;
        totalProofsVerified++;
        
        emit ProximityProofVerified(
            device.deviceIdHash,
            x,
            y,
            distanceSquared,
            block.timestamp
        );
    }
    
    /**
     * @notice Claim accumulated rewards
     */
    function claimRewards() external {
        uint256 amount = pendingRewards[msg.sender];
        require(amount > 0, "No rewards to claim");
        
        // Reset pending rewards
        pendingRewards[msg.sender] = 0;
        totalRewardsPaid += amount;
        
        // Transfer IOTX rewards
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Reward transfer failed");
        
        emit RewardClaimed(msg.sender, amount, block.timestamp);
    }
    
    // ========== View Functions ==========
    
    /**
     * @notice Get device information
     */
    function getDevice(uint256 deviceIdHash) external view returns (Device memory) {
        return devices[deviceIdHash];
    }
    
    /**
     * @notice Get all devices owned by a user
     */
    function getUserDevices(address user) external view returns (uint256[] memory) {
        return userDevices[user];
    }
    
    /**
     * @notice Check if a proof has been used
     */
    function isProofUsed(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[6] calldata _pubSignals
    ) external view returns (bool) {
        bytes32 proofHash = keccak256(abi.encodePacked(_pA, _pB, _pC, _pubSignals));
        return usedProofs[proofHash];
    }
    
    /**
     * @notice Get contract balance (available for rewards)
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // ========== Admin Functions ==========
    
    /**
     * @notice Update proximity configuration
     */
    function updateConfig(
        uint256 _centerX,
        uint256 _centerY,
        uint256 _maxDistanceSquared,
        uint256 _rewardAmount,
        uint256 _cooldownPeriod
    ) external onlyOwner {
        config = ProximityConfig({
            centerX: _centerX,
            centerY: _centerY,
            maxDistanceSquared: _maxDistanceSquared,
            rewardAmount: _rewardAmount,
            cooldownPeriod: _cooldownPeriod
        });
        
        emit ConfigUpdated(
            _centerX,
            _centerY,
            _maxDistanceSquared,
            _rewardAmount,
            _cooldownPeriod
        );
    }
    
    /**
     * @notice Deposit IOTX for rewards
     */
    function depositRewards() external payable {
        require(msg.value > 0, "Must deposit some IOTX");
    }
    
    /**
     * @notice Withdraw excess IOTX (owner only)
     */
    function withdrawExcess(uint256 amount) external onlyOwner {
        require(
            address(this).balance >= amount,
            "Insufficient balance"
        );
        
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
    }
    
    // ========== Receive Function ==========
    
    receive() external payable {
        // Accept IOTX deposits for rewards
    }
}
