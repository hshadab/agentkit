// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Interface for the Proximity Nova Decider
interface IProximityNovaDecider {
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

/**
 * @title IoTeXDeviceVerifierV3
 * @notice Device verifier using new Proximity Nova Decider
 * @dev Rewards devices for valid proximity proofs
 */
contract IoTeXDeviceVerifierV3 {
    // Nova Decider contract address (to be set after deployment)
    IProximityNovaDecider public novaDecider;
    
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
    
    // Events
    event DeviceRegistered(bytes32 indexed deviceId, address indexed owner);
    event ProximityVerified(bytes32 indexed deviceId, uint256 proofId, uint256 timestamp, bool withinProximity);
    event RewardsClaimed(bytes32 indexed deviceId, address indexed owner, uint256 amount);
    event NovaDeciderUpdated(address indexed newDecider);
    
    // Reward configuration
    uint256 constant REWARD_PER_PROOF = 0.01 ether; // 0.01 IOTX per valid proof
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor(address _novaDecider) {
        owner = msg.sender;
        novaDecider = IProximityNovaDecider(_novaDecider);
    }
    
    /**
     * @notice Update the Nova Decider address
     * @param _newDecider Address of new Nova Decider contract
     */
    function setNovaDecider(address _newDecider) external onlyOwner {
        require(_newDecider != address(0), "Invalid address");
        novaDecider = IProximityNovaDecider(_newDecider);
        emit NovaDeciderUpdated(_newDecider);
    }
    
    /**
     * @notice Register a new IoT device
     * @param deviceId Unique identifier for the device
     * @param deviceOwner Address that owns the device
     */
    function registerDevice(bytes32 deviceId, address deviceOwner) external {
        require(!devices[deviceId].registered, "Device already registered");
        require(deviceOwner != address(0), "Invalid owner address");
        
        devices[deviceId] = DeviceInfo({
            owner: deviceOwner,
            registered: true,
            registrationTime: block.timestamp,
            lastProximityProof: 0
        });
        
        emit DeviceRegistered(deviceId, deviceOwner);
    }
    
    /**
     * @notice Verify device proximity using Nova proof
     * @dev Calls the Nova Decider for cryptographic verification
     * @return bool indicating if proof is valid
     */
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
        
        // Call the Nova Decider for verification
        bool isValid;
        try novaDecider.verifyNovaProof(
            i_z0_zi,
            U_i_cmW_U_i_cmE,
            u_i_cmW,
            cmT_r,
            pA,
            pB,
            pC,
            challenge_W_challenge_E_kzg_evals,
            kzg_proof
        ) returns (bool result) {
            isValid = result;
        } catch {
            // If verification fails, return false
            isValid = false;
        }
        
        if (isValid) {
            verifiedProofs[deviceId][proofId] = true;
            devices[deviceId].lastProximityProof = block.timestamp;
            
            // Check if device was within proximity (from proof output)
            bool withinProximity = i_z0_zi[2] == 1;
            
            // Add rewards for successful proximity proof
            if (withinProximity) {
                deviceRewards[deviceId] += REWARD_PER_PROOF;
            }
            
            emit ProximityVerified(deviceId, proofId, block.timestamp, withinProximity);
        }
        
        return isValid;
    }
    
    /**
     * @notice Claim accumulated rewards
     * @param deviceId Device to claim rewards for
     */
    function claimRewards(bytes32 deviceId) external {
        require(devices[deviceId].registered, "Device not registered");
        require(msg.sender == devices[deviceId].owner, "Not device owner");
        
        uint256 rewards = deviceRewards[deviceId];
        require(rewards > 0, "No rewards to claim");
        require(address(this).balance >= rewards, "Insufficient contract balance");
        
        deviceRewards[deviceId] = 0;
        
        // Transfer rewards
        (bool success, ) = msg.sender.call{value: rewards}("");
        require(success, "Reward transfer failed");
        
        emit RewardsClaimed(deviceId, msg.sender, rewards);
    }
    
    /**
     * @notice Get device information
     * @param deviceId Device identifier
     * @return deviceOwner Address of device owner
     * @return registered Whether device is registered
     * @return registrationTime When device was registered
     * @return lastProximityProof Last proof timestamp
     * @return pendingRewards Unclaimed rewards amount
     */
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
    
    /**
     * @notice Check contract balance
     * @return Current IOTX balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // Fallback function to receive IOTX for rewards pool
    receive() external payable {}
}