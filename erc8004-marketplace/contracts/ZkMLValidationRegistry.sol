// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC8004ValidationRegistry.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ZkMLValidationRegistry
 * @dev ERC-8004 Validation Registry with zkML proof verification
 *
 * First monetizable zkML validation service implementing ERC-8004 standard.
 * Agents pay to get cryptographically validated and receive permanent on-chain certificates.
 *
 * Features:
 * - ERC-8004 compliant interface
 * - Groth16 zkSNARK proof verification
 * - USDC payment integration
 * - Permanent validation records
 * - Pay-per-validation or subscription models
 *
 * Integration:
 * - Uses existing Groth16 verifier at 0xf752509cb5af017f465B42053d41B730991c6624
 * - Proof generation via NovaNet JOLT-Atlas backend
 * - On-chain validation certificates
 */
contract ZkMLValidationRegistry is IERC8004ValidationRegistry, Ownable, ReentrancyGuard {
    // ============ State Variables ============

    /// @dev NovaNet validator ID (zkML proof service)
    bytes32 public constant NOVANET_VALIDATOR_ID = keccak256("NOVANET_ZKML_VALIDATOR_V1");

    /// @dev Validation fee (in USDC, 6 decimals)
    uint256 public validationFee = 2 * 10**6; // $2 USDC

    /// @dev USDC token address (Base Sepolia)
    address public usdcToken;

    /// @dev Groth16 verifier contract address
    address public groth16Verifier;

    /// @dev Treasury address for collecting fees
    address public treasury;

    /// @dev Request expiration time (default: 24 hours)
    uint256 public constant REQUEST_EXPIRATION = 24 hours;

    // ============ Data Structures ============

    struct ValidationRequestData {
        bytes32 agentValidatorId;
        bytes32 agentServerId;
        bytes32 dataHash;
        uint256 timestamp;
        address requester;
        bool active;
    }

    struct ValidationRecord {
        bytes32 agentValidatorId;
        bytes32 agentServerId;
        bytes32 dataHash;
        bytes32 proofHash;
        uint8 score; // 0-100
        uint256 timestamp;
        bool verified;
    }

    struct Groth16Proof {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
    }

    // ============ Storage Mappings ============

    /// @dev Pending validation requests by dataHash
    mapping(bytes32 => ValidationRequestData) public validationRequests;

    /// @dev Completed validations by agentServerId => dataHash
    mapping(bytes32 => mapping(bytes32 => ValidationRecord)) public validations;

    /// @dev Agent validation count
    mapping(bytes32 => uint256) public agentValidationCount;

    /// @dev Authorized validators (NovaNet backend)
    mapping(address => bool) public authorizedValidators;

    // ============ Events ============

    event ProofVerified(
        bytes32 indexed agentServerId,
        bytes32 indexed dataHash,
        bytes32 proofHash,
        uint8 score
    );

    event PaymentReceived(
        address indexed payer,
        uint256 amount,
        bytes32 indexed agentServerId
    );

    event ValidatorAuthorized(address indexed validator, bool authorized);
    event FeeUpdated(uint256 newFee);
    event TreasuryUpdated(address newTreasury);

    // ============ Constructor ============

    constructor(
        address _usdcToken,
        address _groth16Verifier,
        address _treasury
    ) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_groth16Verifier != address(0), "Invalid verifier address");
        require(_treasury != address(0), "Invalid treasury address");

        usdcToken = _usdcToken;
        groth16Verifier = _groth16Verifier;
        treasury = _treasury;
    }

    // ============ ERC-8004 Interface Implementation ============

    /**
     * @dev Request validation for an agent model
     * @param agentValidatorId ID of validator (NovaNet zkML service)
     * @param agentServerId ID of agent requesting validation
     * @param dataHash Hash of model data to validate
     *
     * Requirements:
     * - Must pay validation fee in USDC
     * - AgentServerId must be unique per request
     */
    function requestValidation(
        bytes32 agentValidatorId,
        bytes32 agentServerId,
        bytes32 dataHash
    ) external payable override nonReentrant {
        require(agentValidatorId == NOVANET_VALIDATOR_ID, "Only NovaNet validator supported");
        require(agentServerId != bytes32(0), "Invalid agent ID");
        require(dataHash != bytes32(0), "Invalid data hash");
        require(!validationRequests[dataHash].active, "Request already exists");

        // Collect USDC payment
        require(
            IERC20(usdcToken).transferFrom(msg.sender, treasury, validationFee),
            "USDC payment failed"
        );

        // Store validation request
        validationRequests[dataHash] = ValidationRequestData({
            agentValidatorId: agentValidatorId,
            agentServerId: agentServerId,
            dataHash: dataHash,
            timestamp: block.timestamp,
            requester: msg.sender,
            active: true
        });

        emit ValidationRequest(agentValidatorId, agentServerId, dataHash);
        emit PaymentReceived(msg.sender, validationFee, agentServerId);
    }

    /**
     * @dev Submit validation response with zkML proof
     * @param dataHash Hash of validated data
     * @param response Validation score (0-100)
     *
     * Requirements:
     * - Caller must be authorized validator (NovaNet backend)
     * - DataHash must exist in pending requests
     * - Request must not be expired
     */
    function submitValidationResponse(
        bytes32 dataHash,
        uint8 response
    ) external override {
        require(authorizedValidators[msg.sender], "Not authorized validator");

        ValidationRequestData storage request = validationRequests[dataHash];
        require(request.active, "No active request for this dataHash");
        require(block.timestamp <= request.timestamp + REQUEST_EXPIRATION, "Request expired");
        require(response <= 100, "Response must be 0-100");

        // Mark request as processed
        request.active = false;

        // Store validation record
        validations[request.agentServerId][dataHash] = ValidationRecord({
            agentValidatorId: request.agentValidatorId,
            agentServerId: request.agentServerId,
            dataHash: dataHash,
            proofHash: bytes32(0), // Set by submitProof
            score: response,
            timestamp: block.timestamp,
            verified: false // Set to true by submitProof
        });

        agentValidationCount[request.agentServerId]++;

        emit ValidationResponse(
            request.agentValidatorId,
            request.agentServerId,
            dataHash,
            response
        );
    }

    /**
     * @dev Submit zkML proof for validation
     * @param agentServerId ID of agent
     * @param dataHash Hash of validated data
     * @param proof Groth16 proof
     * @param publicSignals Public inputs to circuit
     *
     * This function verifies the zkML proof on-chain and marks validation as verified.
     * Called by NovaNet backend after proof generation.
     */
    function submitProof(
        bytes32 agentServerId,
        bytes32 dataHash,
        Groth16Proof calldata proof,
        uint256[] calldata publicSignals
    ) external nonReentrant {
        require(authorizedValidators[msg.sender], "Not authorized validator");

        ValidationRecord storage record = validations[agentServerId][dataHash];
        require(record.timestamp > 0, "Validation record not found");
        require(!record.verified, "Already verified");

        // Verify Groth16 proof on-chain
        bool valid = verifyGroth16Proof(proof, publicSignals);
        require(valid, "Invalid zkML proof");

        // Calculate proof hash
        bytes32 proofHash = keccak256(abi.encode(proof, publicSignals));

        // Mark as verified
        record.verified = true;
        record.proofHash = proofHash;

        emit ProofVerified(agentServerId, dataHash, proofHash, record.score);
    }

    // ============ View Functions ============

    /**
     * @dev Get validation status for an agent
     * @param agentServerId ID of agent
     * @param dataHash Hash of data
     * @return validated Whether validation was completed
     * @return response Validation score (0 if not validated)
     */
    function getValidationStatus(
        bytes32 agentServerId,
        bytes32 dataHash
    ) external view override returns (bool validated, uint8 response) {
        ValidationRecord memory record = validations[agentServerId][dataHash];
        return (record.verified, record.score);
    }

    /**
     * @dev Get full validation record
     */
    function getValidationRecord(
        bytes32 agentServerId,
        bytes32 dataHash
    ) external view returns (ValidationRecord memory) {
        return validations[agentServerId][dataHash];
    }

    /**
     * @dev Get agent validation count
     */
    function getAgentValidationCount(bytes32 agentServerId) external view returns (uint256) {
        return agentValidationCount[agentServerId];
    }

    // ============ Proof Verification ============

    /**
     * @dev Verify Groth16 proof using existing verifier contract
     * @param proof Groth16 proof
     * @param publicSignals Public inputs
     * @return valid Whether proof is valid
     *
     * Calls existing Groth16Verifier contract deployed at:
     * 0xf752509cb5af017f465B42053d41B730991c6624 (Base Sepolia)
     */
    function verifyGroth16Proof(
        Groth16Proof calldata proof,
        uint256[] calldata publicSignals
    ) internal returns (bool) {
        // Call verifier contract
        (bool success, bytes memory data) = groth16Verifier.call(
            abi.encodeWithSignature(
                "verifyProof(uint256[2],uint256[2][2],uint256[2],uint256[])",
                proof.a,
                proof.b,
                proof.c,
                publicSignals
            )
        );

        require(success, "Verifier call failed");
        return abi.decode(data, (bool));
    }

    // ============ Admin Functions ============

    /**
     * @dev Authorize/deauthorize validator (NovaNet backend address)
     */
    function setAuthorizedValidator(address validator, bool authorized) external onlyOwner {
        require(validator != address(0), "Invalid validator address");
        authorizedValidators[validator] = authorized;
        emit ValidatorAuthorized(validator, authorized);
    }

    /**
     * @dev Update validation fee
     */
    function setValidationFee(uint256 newFee) external onlyOwner {
        validationFee = newFee;
        emit FeeUpdated(newFee);
    }

    /**
     * @dev Update treasury address
     */
    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /**
     * @dev Update Groth16 verifier contract
     */
    function setGroth16Verifier(address newVerifier) external onlyOwner {
        require(newVerifier != address(0), "Invalid verifier address");
        groth16Verifier = newVerifier;
    }
}
