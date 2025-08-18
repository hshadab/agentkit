// NovaNet ZKP proof schemas for AI agent authorization
export const ZKP_PROOF_SCHEMAS = {
  // Agent identity and authorization proof
  AGENT_AUTHORIZATION: {
    type: 'agent_authorization',
    description: 'Proves AI agent identity and spending authority',
    inputs: {
      agent_id: 'string', // Unique agent identifier
      owner_signature: 'signature', // Owner authorization signature
      spending_limit: 'uint256', // Maximum spending amount
      time_bound: 'uint256', // Authorization expiry timestamp
      purpose_hash: 'bytes32' // Hash of intended spending purpose
    },
    outputs: {
      is_authorized: 'bool', // Whether agent is authorized
      remaining_budget: 'uint256', // Remaining spending capacity
      authority_level: 'uint8' // Level of spending authority (1-10)
    },
    constraints: [
      'spending_limit > 0',
      'time_bound > current_timestamp',
      'owner_signature is valid',
      'agent_id is registered'
    ]
  },

  // Budget compliance proof
  BUDGET_COMPLIANCE: {
    type: 'budget_compliance',
    description: 'Proves spending request complies with budget constraints',
    inputs: {
      agent_id: 'string',
      requested_amount: 'uint256',
      current_period_spent: 'uint256', // Amount spent in current period
      period_limit: 'uint256', // Spending limit for the period
      category: 'string', // Spending category
      emergency_override: 'bool' // Whether this is emergency spending
    },
    outputs: {
      is_compliant: 'bool',
      remaining_budget: 'uint256',
      risk_score: 'uint8' // Risk assessment (1-10)
    },
    constraints: [
      'requested_amount <= remaining_budget OR emergency_override',
      'current_period_spent + requested_amount <= period_limit * 1.1', // 10% buffer
      'category is in allowed_categories'
    ]
  },

  // Work completion proof
  WORK_COMPLETION: {
    type: 'work_completion',
    description: 'Proves AI agent completed assigned work satisfactorily',
    inputs: {
      agent_id: 'string',
      task_id: 'string',
      deliverable_hash: 'bytes32', // Hash of completed work
      quality_score: 'uint8', // Self-assessed quality (1-10)
      completion_timestamp: 'uint256',
      validation_proofs: 'bytes[]' // Additional validation data
    },
    outputs: {
      work_completed: 'bool',
      quality_verified: 'bool',
      payment_due: 'uint256' // Amount agent should receive
    },
    constraints: [
      'quality_score >= minimum_quality_threshold',
      'completion_timestamp <= deadline',
      'deliverable_hash matches expected_hash'
    ]
  },

  // Multi-agent consensus proof
  MULTI_AGENT_CONSENSUS: {
    type: 'multi_agent_consensus',
    description: 'Proves consensus reached among multiple agents for spending decision',
    inputs: {
      initiating_agent: 'string',
      participating_agents: 'string[]',
      spending_amount: 'uint256',
      consensus_threshold: 'uint8', // Required percentage agreement
      agent_votes: 'bool[]', // Each agent's vote
      vote_timestamps: 'uint256[]',
      decision_deadline: 'uint256'
    },
    outputs: {
      consensus_reached: 'bool',
      approval_percentage: 'uint8',
      authorized_amount: 'uint256'
    },
    constraints: [
      'participating_agents.length >= minimum_participants',
      'approval_percentage >= consensus_threshold',
      'all vote_timestamps <= decision_deadline'
    ]
  },

  // Service quality verification proof
  SERVICE_QUALITY: {
    type: 'service_quality',
    description: 'Proves AI service meets quality standards for payment release',
    inputs: {
      service_provider: 'string', // Agent providing service
      service_consumer: 'string', // Agent consuming service
      service_type: 'string',
      quality_metrics: 'uint256[]', // Various quality measurements
      completion_time: 'uint256',
      expected_time: 'uint256',
      consumer_satisfaction: 'uint8' // 1-10 rating
    },
    outputs: {
      quality_approved: 'bool',
      payment_percentage: 'uint8', // Percentage of full payment due
      bonus_eligible: 'bool'
    },
    constraints: [
      'quality_metrics meet minimum_standards',
      'completion_time <= expected_time * 1.2', // 20% buffer
      'consumer_satisfaction >= 7'
    ]
  },

  // Cross-chain operation proof
  CROSS_CHAIN_AUTHORITY: {
    type: 'cross_chain_authority',
    description: 'Proves agent authority to operate across blockchain networks',
    inputs: {
      agent_id: 'string',
      source_chain: 'string',
      destination_chain: 'string',
      operation_type: 'string', // transfer, contract_call, etc.
      cross_chain_nonce: 'uint256', // Prevents replay attacks
      chain_specific_data: 'bytes' // Chain-specific authorization data
    },
    outputs: {
      cross_chain_authorized: 'bool',
      max_cross_chain_amount: 'uint256',
      operation_hash: 'bytes32' // For tracking across chains
    },
    constraints: [
      'agent authorized on both chains',
      'cross_chain_nonce is unique',
      'operation_type is supported'
    ]
  }
};

// Proof validation rules
export const VALIDATION_RULES = {
  // Minimum thresholds
  MIN_QUALITY_SCORE: 7,
  MIN_CONSENSUS_THRESHOLD: 60, // 60% agreement required
  MIN_PARTICIPANTS: 2,
  
  // Time limits
  MAX_AUTHORIZATION_DURATION: 24 * 60 * 60, // 24 hours in seconds
  MAX_DECISION_TIME: 60 * 60, // 1 hour for consensus decisions
  
  // Spending limits
  MAX_SINGLE_TRANSACTION: 100, // USDC
  MAX_DAILY_SPENDING: 500, // USDC
  EMERGENCY_MULTIPLIER: 2.0, // Emergency spending can be 2x normal limit
  
  // Quality thresholds
  QUALITY_BONUS_THRESHOLD: 9, // Quality score for bonus eligibility
  SATISFACTION_THRESHOLD: 7, // Minimum consumer satisfaction
  
  // Cross-chain limits
  MAX_CROSS_CHAIN_AMOUNT: 1000, // USDC
  CROSS_CHAIN_CONFIRMATION_BLOCKS: 12
};

// Helper functions for proof generation
export class ProofSchemaHelper {
  static validateProofType(proofType) {
    return Object.keys(ZKP_PROOF_SCHEMAS).includes(proofType);
  }

  static getProofSchema(proofType) {
    return ZKP_PROOF_SCHEMAS[proofType];
  }

  static validateInputs(proofType, inputs) {
    const schema = ZKP_PROOF_SCHEMAS[proofType];
    if (!schema) return { valid: false, error: 'Unknown proof type' };

    const requiredInputs = Object.keys(schema.inputs);
    const providedInputs = Object.keys(inputs);

    const missing = requiredInputs.filter(input => !providedInputs.includes(input));
    if (missing.length > 0) {
      return { valid: false, error: `Missing inputs: ${missing.join(', ')}` };
    }

    return { valid: true };
  }

  static generateProofId(proofType, agentId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${proofType}_${agentId.slice(0, 8)}_${timestamp}_${random}`;
  }

  static isWithinTimeLimit(timestamp, maxDuration) {
    const now = Math.floor(Date.now() / 1000);
    return (timestamp + maxDuration) > now;
  }

  static calculateRiskScore(spendingHistory, requestedAmount) {
    // Simple risk calculation based on spending patterns
    const averageSpending = spendingHistory.reduce((sum, tx) => sum + tx.amount, 0) / spendingHistory.length;
    const ratio = requestedAmount / averageSpending;
    
    if (ratio > 3) return 8; // High risk
    if (ratio > 2) return 6; // Medium-high risk  
    if (ratio > 1.5) return 4; // Medium risk
    return 2; // Low risk
  }

  static formatProofData(proofType, inputs, outputs) {
    return {
      schema_version: '1.0',
      proof_type: proofType,
      generated_at: Math.floor(Date.now() / 1000),
      inputs,
      outputs,
      proof_id: this.generateProofId(proofType, inputs.agent_id || 'unknown')
    };
  }
}