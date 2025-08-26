// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Interface for the existing Nova Decider deployed at 0xAD5f0101B94F581979AA22F123b7efd9501BfeB3
interface INovaDecider {
    function verifyNovaProof(
        uint256[3] calldata i_z0_zi, 
        uint256[4] calldata U_i_cmW_U_i_cmE, 
        uint256[2] calldata u_i_cmW, 
        uint256[3] calldata cmT_r, 
        uint256[2] calldata pA, 
        uint256[2][2] calldata pB, 
        uint256[2] calldata pC, 
        uint256[4] calldata challenge_W_challenge_E_kzg_evals, 
        uint256[2][2] calldata kzg_proof
    ) external view returns (bool);
}

// Updated IoTeX Device Verifier that uses the real Nova Decider
contract IoTeXDeviceVerifierV2 {
    // Real Nova Decider contract
    INovaDecider constant NOVA_DECIDER = INovaDecider(0xAD5f0101B94F581979AA22F123b7efd9501BfeB3);
    
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
    
    event DeviceRegistered(bytes32 indexed deviceId, address indexed owner);
    event ProximityVerified(bytes32 indexed deviceId, uint256 proofId, uint256 timestamp);
    event RewardsClaimed(bytes32 indexed deviceId, address indexed owner, uint256 amount);
    
    // Proximity parameters
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
    
    // Verify device proximity using real Nova proof
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
        require(devices[deviceId].registered, "Device not registered");
        require(!verifiedProofs[deviceId][proofId], "Proof already verified");
        
        // Call the real Nova Decider for verification
        bool isValid = NOVA_DECIDER.verifyNovaProof(
            i_z0_zi,
            U_i_cmW_U_i_cmE,
            u_i_cmW,
            cmT_r,
            pA,
            pB,
            pC,
            challenge_W_challenge_E_kzg_evals,
            kzg_proof
        );
        
        if (isValid) {
            verifiedProofs[deviceId][proofId] = true;
            devices[deviceId].lastProximityProof = block.timestamp;
            
            // Add rewards for successful proximity proof
            deviceRewards[deviceId] += REWARD_PER_PROOF;
            
            emit ProximityVerified(deviceId, proofId, block.timestamp);
        }
        
        return isValid;
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
    
    // Fallback function to receive IOTX for rewards pool
    receive() external payable {}
}