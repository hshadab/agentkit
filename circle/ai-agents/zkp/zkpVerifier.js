import WebSocket from 'ws';
import { ZKP_PROOF_SCHEMAS, VALIDATION_RULES, ProofSchemaHelper } from './proofSchemas.js';
import { ChainVerification } from './chainVerification.js';
import { v4 as uuidv4 } from 'uuid';

// NovaNet ZKP verification for AI agents
export default class AIAgentZKPVerifier {
  constructor() {
    this.zkEngineUrl = process.env.NOVANET_ENDPOINT || 'ws://localhost:8001/ws';
    this.ws = null;
    this.activeProofs = new Map(); // Track ongoing proof generation
    this.verificationHistory = []; // Store verification results
    this.chainVerification = new ChainVerification();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      await this.connectToNovaNet();
      await this.chainVerification.initialize();
      this.initialized = true;
      console.log('✅ AI Agent ZKP Verifier connected to zkEngine and blockchain networks');
    } catch (error) {
      console.error('❌ Failed to connect to zkEngine:', error.message);
      console.error('Make sure zkEngine is running: cargo run');
      throw error;
    }
  }

  async connectToNovaNet() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.zkEngineUrl);
      
      this.ws.on('open', () => {
        console.log('🔗 Connected to NovaNet ZKP engine');
        resolve();
      });

      this.ws.on('error', (error) => {
        reject(new Error(`NovaNet connection failed: ${error.message}`));
      });

      this.ws.on('message', (data) => {
        this.handleNovaNetMessage(data);
      });

      // Timeout after 3 seconds
      setTimeout(() => {
        if (this.ws.readyState !== WebSocket.OPEN) {
          reject(new Error('NovaNet connection timeout'));
        }
      }, 3000);
    });
  }

  handleNovaNetMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      
      // Handle zkEngine response formats
      if (message.type === 'proof_status' && message.status === 'generating') {
        console.log(`⏳ zkEngine started generating proof: ${message.proof_id}`);
        return;
      }
      
      if (message.type === 'proof_complete') {
        const proofId = message.proof_id;
        const activeProof = this.activeProofs.get(proofId);
        
        if (activeProof) {
          console.log(`✅ zkEngine completed proof: ${proofId}`);
          activeProof.resolve({
            verified: true,
            proof: message.proof || `proof_${proofId}`,
            publicSignals: message.public_signals || message.public_inputs || [],
            proofId: proofId,
            zkEngine: true,
            metrics: message.metrics
          });
          this.activeProofs.delete(proofId);
        }
      } else if (message.type === 'proof_error' || (message.type === 'error' && message.proof_id)) {
        const proofId = message.proof_id;
        const activeProof = this.activeProofs.get(proofId);
        
        if (activeProof) {
          console.error(`❌ zkEngine proof failed: ${message.error || message.message}`);
          activeProof.resolve({
            verified: false,
            error: message.error || message.message,
            proofId: proofId
          });
          this.activeProofs.delete(proofId);
        }
      } else if (message.type === 'list_response') {
        console.log(`📋 zkEngine has ${message.count} available proofs`);
      }
    } catch (error) {
      console.error('Error handling NovaNet message:', error);
    }
  }

  // Generate ZKP proof for agent authorization
  async generateAgentAuthorizationProof(agentId, ownerId, spendingLimit, purpose) {
    const proofData = {
      agent_id: agentId,
      owner_signature: `sig_${ownerId}_${Date.now()}`, // Simulated signature
      spending_limit: spendingLimit,
      time_bound: Math.floor(Date.now() / 1000) + VALIDATION_RULES.MAX_AUTHORIZATION_DURATION,
      purpose_hash: this.hashString(purpose)
    };

    return this.generateProof('AGENT_AUTHORIZATION', proofData);
  }

  // Generate ZKP proof for budget compliance
  async generateBudgetComplianceProof(agentId, requestedAmount, currentSpent, periodLimit, category) {
    const proofData = {
      agent_id: agentId,
      requested_amount: requestedAmount,
      current_period_spent: currentSpent,
      period_limit: periodLimit,
      category: category,
      emergency_override: false
    };

    return this.generateProof('BUDGET_COMPLIANCE', proofData);
  }

  // Generate ZKP proof for work completion
  async generateWorkCompletionProof(agentId, taskId, deliverableData, qualityScore) {
    const proofData = {
      agent_id: agentId,
      task_id: taskId,
      deliverable_hash: this.hashString(JSON.stringify(deliverableData)),
      quality_score: qualityScore,
      completion_timestamp: Math.floor(Date.now() / 1000),
      validation_proofs: []
    };

    return this.generateProof('WORK_COMPLETION', proofData);
  }

  // Generate ZKP proof for multi-agent consensus
  async generateConsensusProof(initiatingAgent, participatingAgents, amount, votes) {
    if (!votes || !Array.isArray(votes)) {
      throw new Error('Votes parameter must be a valid array');
    }
    
    const approvalCount = votes.filter(vote => vote).length;
    const approvalPercentage = Math.floor((approvalCount / votes.length) * 100);

    const proofData = {
      initiating_agent: initiatingAgent,
      participating_agents: participatingAgents,
      spending_amount: amount,
      consensus_threshold: VALIDATION_RULES.MIN_CONSENSUS_THRESHOLD,
      agent_votes: votes,
      vote_timestamps: new Array(votes.length).fill(Math.floor(Date.now() / 1000)),
      decision_deadline: Math.floor(Date.now() / 1000) + VALIDATION_RULES.MAX_DECISION_TIME
    };

    return this.generateProof('MULTI_AGENT_CONSENSUS', proofData);
  }

  // Generate ZKP proof for service quality
  async generateServiceQualityProof(provider, consumer, serviceType, metrics, satisfaction) {
    const proofData = {
      service_provider: provider,
      service_consumer: consumer,
      service_type: serviceType,
      quality_metrics: metrics,
      completion_time: Math.floor(Date.now() / 1000),
      expected_time: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      consumer_satisfaction: satisfaction
    };

    return this.generateProof('SERVICE_QUALITY', proofData);
  }

  // Core proof generation method
  async generateProof(proofType, proofData) {
    if (!this.initialized) await this.initialize();

    // Validate proof type and inputs
    if (!ProofSchemaHelper.validateProofType(proofType)) {
      throw new Error(`Invalid proof type: ${proofType}`);
    }

    const validation = ProofSchemaHelper.validateInputs(proofType, proofData);
    if (!validation.valid) {
      throw new Error(`Invalid proof inputs: ${validation.error}`);
    }

    const proofId = ProofSchemaHelper.generateProofId(proofType, proofData.agent_id || 'unknown');

    // Real NovaNet proof generation
    return this.generateNovaNetProof(proofType, proofData, proofId);
  }

  async generateSimulatedProof(proofType, proofData, proofId) {
    // Simulate proof generation delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const schema = ZKP_PROOF_SCHEMAS[proofType];
    const outputs = this.simulateProofOutputs(proofType, proofData);

    const proof = {
      verified: outputs.success !== false,
      proof: `temp_proof_${proofId}`, // This method should not be called anymore
      publicSignals: outputs,
      proofId: proofId,
      proofType: proofType,
      generated: new Date().toISOString(),
      deprecated: true
    };

    // Store in verification history
    this.verificationHistory.push({
      proofId,
      proofType,
      inputs: proofData,
      outputs,
      verified: proof.verified,
      timestamp: new Date().toISOString()
    });

    console.log(`🔐 Generated simulated ${proofType} proof: ${proof.verified ? 'VERIFIED' : 'FAILED'}`);
    return proof;
  }

  async generateNovaNetProof(proofType, proofData, proofId) {
    return new Promise((resolve, reject) => {
      // Use zkEngine's expected metadata format with supported functions
      // Map AI agent proof types to device proximity proofs for demonstration
      const agentId = proofData.agent_id || 'unknown';
      
      // Generate deterministic coordinates based on agent ID and proof type
      const agentHash = this.hashString(agentId + proofType);
      const x = Math.abs(parseInt(agentHash.slice(2, 10), 16) % 10000).toString();
      const y = Math.abs(parseInt(agentHash.slice(10, 18), 16) % 10000).toString();
      
      const request = {
        metadata: {
          function: "prove_device_proximity",
          arguments: [`agent_${agentId.slice(0, 8)}`, x, y],
          step_size: 10,
          explanation: `ZKP verification for ${proofType} - Agent ${agentId}`
        }
      };

      // Store resolver for async response
      this.activeProofs.set(proofId, { resolve, reject });

      console.log(`🔐 Generating ${proofType} proof via zkEngine (using device proximity)...`);
      
      // Send to zkEngine
      this.ws.send(JSON.stringify(request));

      // Timeout after 30 seconds (device proximity proofs take ~15-16 seconds)
      setTimeout(() => {
        if (this.activeProofs.has(proofId)) {
          this.activeProofs.delete(proofId);
          reject(new Error(`zkEngine proof generation timeout for ${proofType}`));
        }
      }, 30000);
    });
  }

  // Simulate proof outputs based on proof type
  simulateProofOutputs(proofType, inputs) {
    switch (proofType) {
      case 'AGENT_AUTHORIZATION':
        return {
          is_authorized: true,
          remaining_budget: Math.max(0, inputs.spending_limit - 10),
          authority_level: Math.floor(Math.random() * 5) + 6 // 6-10
        };

      case 'BUDGET_COMPLIANCE':
        const wouldExceed = (inputs.current_period_spent + inputs.requested_amount) > inputs.period_limit;
        return {
          is_compliant: !wouldExceed,
          remaining_budget: Math.max(0, inputs.period_limit - inputs.current_period_spent),
          risk_score: wouldExceed ? 8 : Math.floor(Math.random() * 4) + 2 // 2-5 if compliant, 8 if not
        };

      case 'WORK_COMPLETION':
        return {
          work_completed: inputs.quality_score >= VALIDATION_RULES.MIN_QUALITY_SCORE,
          quality_verified: inputs.quality_score >= VALIDATION_RULES.MIN_QUALITY_SCORE,
          payment_due: inputs.quality_score >= VALIDATION_RULES.MIN_QUALITY_SCORE ? 5 : 0
        };

      case 'MULTI_AGENT_CONSENSUS':
        const approvals = inputs.agent_votes.filter(vote => vote).length;
        const percentage = Math.floor((approvals / inputs.agent_votes.length) * 100);
        return {
          consensus_reached: percentage >= inputs.consensus_threshold,
          approval_percentage: percentage,
          authorized_amount: percentage >= inputs.consensus_threshold ? inputs.spending_amount : 0
        };

      case 'SERVICE_QUALITY':
        const qualityMet = inputs.consumer_satisfaction >= VALIDATION_RULES.SATISFACTION_THRESHOLD;
        return {
          quality_approved: qualityMet,
          payment_percentage: qualityMet ? 100 : Math.max(50, inputs.consumer_satisfaction * 10),
          bonus_eligible: inputs.consumer_satisfaction >= VALIDATION_RULES.QUALITY_BONUS_THRESHOLD
        };

      default:
        return { success: false, error: 'Unknown proof type' };
    }
  }

  // Verify an existing proof on-chain
  async verifyProofOnChain(proof, targetChain = 'ethereum', agentId = null) {
    if (!proof || !proof.proofId) {
      return { valid: false, error: 'Invalid proof object' };
    }

    if (!proof.zkEngine) {
      return { valid: false, error: 'Proof not generated by zkEngine' };
    }

    try {
      const result = await this.chainVerification.verifyProofOnChain(proof, targetChain, agentId);
      
      // Store verification result
      this.verificationHistory.push({
        proofId: proof.proofId,
        chain: targetChain,
        verified: result.verified,
        timestamp: result.timestamp,
        transactionHash: result.transactionHash,
        agentId
      });

      return result;

    } catch (error) {
      console.error(`❌ On-chain verification failed:`, error.message);
      return { valid: false, error: error.message };
    }
  }

  // Get supported blockchain networks
  async getSupportedChains() {
    return this.chainVerification.getSupportedChains();
  }

  // Get verification history for a proof
  async getProofVerificationHistory(proofId, targetChain = 'ethereum') {
    return this.chainVerification.getVerificationHistory(proofId, targetChain);
  }

  // Helper methods
  hashString(input) {
    // Simple hash simulation - in real implementation would use proper cryptographic hash
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
  }

  getVerificationHistory() {
    return this.verificationHistory;
  }

  getActiveProofCount() {
    return this.activeProofs.size;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      console.log('🔌 Disconnected from NovaNet');
    }
  }
}