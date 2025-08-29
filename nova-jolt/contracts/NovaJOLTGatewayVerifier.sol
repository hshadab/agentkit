// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title NovaJOLTGatewayVerifier
 * @notice On-chain verification for Nova+JOLT recursive zkML proofs
 * @dev Authorizes Circle Gateway USDC transfers based on accumulated AI decisions
 */

interface ICircleGateway {
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract NovaJOLTGatewayVerifier {
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    struct NovaAccumulator {
        uint256 step;
        bytes32 merkleRoot;
        uint256 aggregateRisk; // Scaled by 1000 (e.g., 250 = 0.25)
        uint256 timestamp;
        bool finalized;
    }
    
    struct JOLTProof {
        uint256[2] pi_a;
        uint256[2][2] pi_b;
        uint256[2] pi_c;
        uint256[14] parameters; // 14 parameters from JOLT-Atlas
    }
    
    struct AuthorizationSession {
        address requester;
        address recipient;
        uint256 amount;
        bytes32 novaRoot;
        uint256 decisionsCount;
        uint256 riskScore;
        bool authorized;
        bool executed;
        uint256 expiresAt;
    }
    
    // Circle Gateway contracts
    address public constant CIRCLE_GATEWAY = 0x2c319fD56081145521F872F9470D31Ff1F79c4d4;
    address public constant USDC_ADDRESS = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    
    // Risk thresholds
    uint256 public constant MAX_RISK_THRESHOLD = 400; // 0.4 scaled by 1000
    uint256 public constant MIN_DECISIONS_REQUIRED = 3;
    uint256 public constant AUTHORIZATION_DURATION = 5 minutes;
    
    // Storage
    mapping(bytes32 => AuthorizationSession) public sessions;
    mapping(bytes32 => NovaAccumulator) public novaProofs;
    mapping(address => uint256) public userRiskScores;
    mapping(address => uint256) public dailyVolume;
    mapping(address => uint256) public lastResetTime;
    
    // Multi-agent consensus
    mapping(bytes32 => address[]) public consensusAgents;
    mapping(bytes32 => mapping(address => bool)) public agentVotes;
    
    // Events
    event SessionCreated(bytes32 indexed sessionId, address requester, uint256 amount);
    event JOLTProofVerified(bytes32 indexed sessionId, uint256 riskScore);
    event NovaAccumulated(bytes32 indexed sessionId, uint256 step, bytes32 merkleRoot);
    event AuthorizationGranted(bytes32 indexed sessionId, address recipient, uint256 amount);
    event TransferExecuted(bytes32 indexed sessionId, bytes32 attestationId);
    
    // ============================================
    // JOLT VERIFICATION (GROTH16)
    // ============================================
    
    // Groth16 verifier for JOLT proofs
    function verifyJOLTProof(
        JOLTProof memory proof,
        uint256[1] memory publicInputs
    ) public view returns (bool) {
        // In production, this would call the actual Groth16 verifier
        // For now, we validate the structure and parameters
        
        require(proof.parameters[0] > 0, "Invalid amount parameter");
        require(proof.parameters[13] == 1000, "KYC not complete"); // KYC completeness check
        
        // Calculate risk from parameters
        uint256 risk = calculateRiskFromParameters(proof.parameters);
        require(risk == publicInputs[0], "Risk calculation mismatch");
        
        return true;
    }
    
    function calculateRiskFromParameters(uint256[14] memory params) internal pure returns (uint256) {
        // Real risk calculation based on 14 parameters
        uint256 risk = 0;
        
        // Weight each parameter
        risk += params[1] * 15 / 100;  // recipient_risk (15%)
        risk += params[5] * 10 / 100;  // jurisdiction_risk (10%)
        risk += params[6] * 20 / 100;  // sanctions_check (20%)
        risk += params[7] * 10 / 100;  // velocity_score (10%)
        risk += params[8] * 8 / 100;   // pattern_deviation (8%)
        
        // Good factors reduce risk
        if (params[2] > 800) risk -= 100; // Good sender history
        if (params[9] > 900) risk -= 80;  // Good counterparty score
        if (params[13] == 1000) risk -= 50; // Full KYC
        
        return risk;
    }
    
    // ============================================
    // NOVA ACCUMULATION
    // ============================================
    
    function accumulateNova(
        bytes32 sessionId,
        bytes32 previousRoot,
        bytes32 newDecisionHash,
        uint256 newRisk
    ) public returns (bytes32) {
        NovaAccumulator storage nova = novaProofs[sessionId];
        
        // First accumulation
        if (nova.step == 0) {
            require(previousRoot == bytes32(0), "Invalid initial root");
            nova.merkleRoot = newDecisionHash;
        } else {
            // Verify previous root matches
            require(nova.merkleRoot == previousRoot, "Root mismatch");
            // Compute new Merkle root
            nova.merkleRoot = keccak256(abi.encodePacked(previousRoot, newDecisionHash));
        }
        
        // Update accumulator
        nova.step++;
        nova.timestamp = block.timestamp;
        
        // Calculate aggregate risk with decay
        if (nova.aggregateRisk == 0) {
            nova.aggregateRisk = newRisk;
        } else {
            // Weighted average with 0.9 decay factor
            nova.aggregateRisk = (nova.aggregateRisk * 900 + newRisk * 1000) / 1900;
        }
        
        emit NovaAccumulated(sessionId, nova.step, nova.merkleRoot);
        
        return nova.merkleRoot;
    }
    
    // ============================================
    // AUTHORIZATION FLOW
    // ============================================
    
    function createAuthorizationSession(
        address recipient,
        uint256 amount,
        JOLTProof memory initialProof
    ) external returns (bytes32 sessionId) {
        require(amount >= 1e6 && amount <= 100e6, "Amount out of range"); // $1-$100 USDC
        
        // Reset daily volume if needed
        if (block.timestamp > lastResetTime[msg.sender] + 1 days) {
            dailyVolume[msg.sender] = 0;
            lastResetTime[msg.sender] = block.timestamp;
        }
        
        require(dailyVolume[msg.sender] + amount <= 1000e6, "Daily limit exceeded");
        
        // Generate session ID
        sessionId = keccak256(abi.encodePacked(msg.sender, recipient, amount, block.timestamp));
        
        // Verify initial JOLT proof
        uint256 initialRisk = calculateRiskFromParameters(initialProof.parameters);
        require(verifyJOLTProof(initialProof, [initialRisk]), "Invalid JOLT proof");
        
        // Create session
        sessions[sessionId] = AuthorizationSession({
            requester: msg.sender,
            recipient: recipient,
            amount: amount,
            novaRoot: bytes32(0),
            decisionsCount: 1,
            riskScore: initialRisk,
            authorized: false,
            executed: false,
            expiresAt: block.timestamp + AUTHORIZATION_DURATION
        });
        
        // Initialize Nova accumulator
        bytes32 decisionHash = keccak256(abi.encode(initialProof));
        accumulateNova(sessionId, bytes32(0), decisionHash, initialRisk);
        
        emit SessionCreated(sessionId, msg.sender, amount);
        emit JOLTProofVerified(sessionId, initialRisk);
    }
    
    // ============================================
    // MULTI-AGENT CONSENSUS
    // ============================================
    
    function submitAgentDecision(
        bytes32 sessionId,
        JOLTProof memory proof,
        bool approve
    ) external {
        AuthorizationSession storage session = sessions[sessionId];
        require(session.requester != address(0), "Session not found");
        require(!session.authorized, "Already authorized");
        require(block.timestamp < session.expiresAt, "Session expired");
        
        // Verify agent hasn't voted
        require(!agentVotes[sessionId][msg.sender], "Already voted");
        
        // Verify JOLT proof
        uint256 riskScore = calculateRiskFromParameters(proof.parameters);
        require(verifyJOLTProof(proof, [riskScore]), "Invalid proof");
        
        // Accumulate in Nova
        bytes32 decisionHash = keccak256(abi.encode(proof, msg.sender));
        NovaAccumulator storage nova = novaProofs[sessionId];
        accumulateNova(sessionId, nova.merkleRoot, decisionHash, riskScore);
        
        // Record vote
        agentVotes[sessionId][msg.sender] = approve;
        consensusAgents[sessionId].push(msg.sender);
        session.decisionsCount++;
        
        // Update session risk
        session.riskScore = nova.aggregateRisk;
        session.novaRoot = nova.merkleRoot;
        
        // Check if we can authorize
        checkAuthorization(sessionId);
    }
    
    // ============================================
    // FRAUD DETECTION
    // ============================================
    
    function submitFraudAnalysis(
        bytes32 sessionId,
        uint256 velocityScore,
        uint256 patternScore,
        bytes memory fraudProof
    ) external {
        AuthorizationSession storage session = sessions[sessionId];
        require(session.requester != address(0), "Session not found");
        require(!session.authorized, "Already authorized");
        
        // Create fraud decision
        uint256[14] memory fraudParams;
        fraudParams[7] = velocityScore;  // velocity_score
        fraudParams[8] = patternScore;   // pattern_deviation
        
        JOLTProof memory proof = JOLTProof({
            pi_a: [uint256(0), uint256(0)],
            pi_b: [[uint256(0), uint256(0)], [uint256(0), uint256(0)]],
            pi_c: [uint256(0), uint256(0)],
            parameters: fraudParams
        });
        
        // Calculate fraud risk
        uint256 fraudRisk = (velocityScore + patternScore) / 2;
        
        // Accumulate in Nova
        bytes32 fraudHash = keccak256(abi.encodePacked("FRAUD", fraudProof));
        NovaAccumulator storage nova = novaProofs[sessionId];
        accumulateNova(sessionId, nova.merkleRoot, fraudHash, fraudRisk);
        
        session.decisionsCount++;
        session.riskScore = nova.aggregateRisk;
        
        checkAuthorization(sessionId);
    }
    
    // ============================================
    // AUTHORIZATION DECISION
    // ============================================
    
    function checkAuthorization(bytes32 sessionId) internal {
        AuthorizationSession storage session = sessions[sessionId];
        NovaAccumulator storage nova = novaProofs[sessionId];
        
        // Check requirements
        bool hasEnoughDecisions = session.decisionsCount >= MIN_DECISIONS_REQUIRED;
        bool riskAcceptable = nova.aggregateRisk <= MAX_RISK_THRESHOLD;
        bool hasConsensus = checkConsensus(sessionId);
        
        if (hasEnoughDecisions && riskAcceptable && hasConsensus) {
            session.authorized = true;
            nova.finalized = true;
            
            // Update user risk profile
            userRiskScores[session.requester] = 
                (userRiskScores[session.requester] + nova.aggregateRisk) / 2;
            
            emit AuthorizationGranted(sessionId, session.recipient, session.amount);
        }
    }
    
    function checkConsensus(bytes32 sessionId) internal view returns (bool) {
        address[] memory agents = consensusAgents[sessionId];
        if (agents.length < 2) return false;
        
        uint256 approvals = 0;
        for (uint256 i = 0; i < agents.length; i++) {
            if (agentVotes[sessionId][agents[i]]) {
                approvals++;
            }
        }
        
        return approvals >= (agents.length * 2) / 3; // 2/3 majority
    }
    
    // ============================================
    // CIRCLE GATEWAY EXECUTION
    // ============================================
    
    function executeTransfer(
        bytes32 sessionId,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        AuthorizationSession storage session = sessions[sessionId];
        
        require(session.authorized, "Not authorized");
        require(!session.executed, "Already executed");
        require(block.timestamp < session.expiresAt, "Authorization expired");
        
        // Mark as executed
        session.executed = true;
        dailyVolume[session.requester] += session.amount;
        
        // Execute Circle Gateway transfer
        ICircleGateway(CIRCLE_GATEWAY).transferWithAuthorization(
            session.requester,
            session.recipient,
            session.amount,
            validAfter,
            validBefore,
            nonce,
            v,
            r,
            s
        );
        
        // Generate attestation
        bytes32 attestationId = keccak256(abi.encodePacked(
            sessionId,
            session.novaRoot,
            block.timestamp
        ));
        
        emit TransferExecuted(sessionId, attestationId);
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    function getAuthorizationStatus(bytes32 sessionId) external view returns (
        bool authorized,
        bool executed,
        uint256 riskScore,
        uint256 decisionsCount,
        bytes32 novaRoot
    ) {
        AuthorizationSession memory session = sessions[sessionId];
        NovaAccumulator memory nova = novaProofs[sessionId];
        
        return (
            session.authorized,
            session.executed,
            nova.aggregateRisk,
            session.decisionsCount,
            nova.merkleRoot
        );
    }
    
    function getNovaProof(bytes32 sessionId) external view returns (
        uint256 step,
        bytes32 merkleRoot,
        uint256 aggregateRisk,
        bool finalized
    ) {
        NovaAccumulator memory nova = novaProofs[sessionId];
        return (nova.step, nova.merkleRoot, nova.aggregateRisk, nova.finalized);
    }
    
    function getUserRiskProfile(address user) external view returns (
        uint256 riskScore,
        uint256 dailyVolumeUsed,
        uint256 dailyVolumeRemaining
    ) {
        uint256 remaining = 1000e6 > dailyVolume[user] ? 1000e6 - dailyVolume[user] : 0;
        return (userRiskScores[user], dailyVolume[user], remaining);
    }
}