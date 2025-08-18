import { v4 as uuidv4 } from 'uuid';
import AIAgentWalletManager from '../wallets/walletManager.js';

// Base AI Agent class following Circle's AutoGen pattern
export default class AIAgent {
  constructor(type, role, capabilities = [], spendingAuthority = '25.00') {
    this.id = uuidv4();
    this.type = type; // researcher, validator, executor, coordinator
    this.role = role; // human-readable role description
    this.capabilities = capabilities; // list of what this agent can do
    this.spendingAuthority = spendingAuthority; // max USDC per transaction
    this.created = new Date();
    this.status = 'inactive';
    this.wallet = null;
    this.walletManager = new AIAgentWalletManager();
    this.conversationHistory = [];
    this.taskHistory = [];
    this.collaborators = new Set(); // other agents this agent works with
  }

  async initialize() {
    try {
      // Initialize wallet manager
      await this.walletManager.initialize();
      
      // Create wallet for this agent
      this.wallet = await this.walletManager.createAgentWallet(this.type, this.id);
      
      // Fund wallet with initial budget (simulation)
      await this.walletManager.fundAgentWallet(this.id, this.spendingAuthority);
      
      this.status = 'active';
      console.log(`🤖 AI Agent ${this.type} (${this.id.slice(0,8)}) initialized with ${this.spendingAuthority} USDC`);
      
    } catch (error) {
      console.error(`❌ Failed to initialize agent ${this.id}:`, error.message);
      throw error;
    }
  }

  // Core AI reasoning (simplified for demo)
  async think(prompt, context = {}) {
    const reasoning = {
      agent: this.id,
      type: this.type,
      role: this.role,
      prompt,
      context,
      timestamp: new Date().toISOString(),
      reasoning: this.generateReasoning(prompt, context),
      confidence: Math.random() * 0.3 + 0.7 // 0.7-1.0 confidence
    };

    this.conversationHistory.push(reasoning);
    return reasoning;
  }

  // Generate AI reasoning based on agent type
  generateReasoning(prompt, context) {
    switch (this.type) {
      case 'researcher':
        return this.researcherReasoning(prompt, context);
      case 'validator':
        return this.validatorReasoning(prompt, context);
      case 'executor':
        return this.executorReasoning(prompt, context);
      case 'coordinator':
        return this.coordinatorReasoning(prompt, context);
      default:
        return this.defaultReasoning(prompt, context);
    }
  }

  researcherReasoning(prompt, context) {
    return {
      analysis: `As a researcher, I need to gather data about: ${prompt}`,
      methodology: 'systematic data collection and analysis',
      dataNeeds: ['market data', 'historical trends', 'comparative analysis'],
      estimatedCost: '5.00', // USDC for data APIs
      timeRequired: '10-15 minutes',
      confidence: 0.85
    };
  }

  validatorReasoning(prompt, context) {
    return {
      validation: `Evaluating quality and accuracy of: ${prompt}`,
      criteria: ['accuracy', 'completeness', 'methodology', 'relevance'],
      scoreCard: {
        accuracy: Math.random() * 0.3 + 0.7,
        completeness: Math.random() * 0.3 + 0.7,
        methodology: Math.random() * 0.3 + 0.7
      },
      recommendation: Math.random() > 0.3 ? 'approve' : 'revise',
      estimatedCost: '2.00' // USDC for validation tools
    };
  }

  executorReasoning(prompt, context) {
    return {
      execution: `Planning to execute: ${prompt}`,
      steps: ['analyze requirements', 'gather resources', 'execute task', 'deliver results'],
      resources: ['API access', 'compute resources', 'external services'],
      timeline: '20-30 minutes',
      estimatedCost: '8.00' // USDC for execution resources
    };
  }

  coordinatorReasoning(prompt, context) {
    return {
      coordination: `Orchestrating multi-agent task: ${prompt}`,
      agentAssignments: {
        researcher: 'data gathering',
        validator: 'quality control',
        executor: 'task completion'
      },
      budget: '15.00', // USDC for paying other agents
      timeline: '45-60 minutes total'
    };
  }

  defaultReasoning(prompt, context) {
    return {
      general: `Processing request: ${prompt}`,
      approach: 'standard analysis and response',
      estimatedCost: '3.00'
    };
  }

  // Request spending authorization
  async requestSpending(amount, category, purpose) {
    try {
      const authorization = await this.walletManager.authorizeSpending(
        this.id,
        amount,
        category,
        purpose
      );

      console.log(`💳 Agent ${this.type} authorized to spend ${amount} USDC for ${category}`);
      return authorization;

    } catch (error) {
      console.error(`❌ Spending request denied for agent ${this.id}:`, error.message);
      throw error;
    }
  }

  // Execute payment
  async makePayment(authorization, recipient, metadata = {}) {
    try {
      const transaction = await this.walletManager.executeSpending(
        this.id,
        authorization,
        recipient
      );

      // Record the transaction
      this.taskHistory.push({
        type: 'payment',
        transaction,
        metadata,
        timestamp: new Date().toISOString()
      });

      console.log(`💸 Agent ${this.type} paid ${authorization.amount} USDC to ${recipient}`);
      return transaction;

    } catch (error) {
      console.error(`❌ Payment failed for agent ${this.id}:`, error.message);
      throw error;
    }
  }

  // Collaborate with another agent
  async collaborate(otherAgent, task) {
    this.collaborators.add(otherAgent.id);
    otherAgent.collaborators.add(this.id);

    const collaboration = {
      collaborationId: uuidv4(),
      agents: [this.id, otherAgent.id],
      task,
      startTime: new Date().toISOString(),
      status: 'active'
    };

    console.log(`🤝 Agent ${this.type} collaborating with ${otherAgent.type} on: ${task}`);
    return collaboration;
  }

  // Get agent status and metrics
  getStatus() {
    return {
      id: this.id,
      type: this.type,
      role: this.role,
      status: this.status,
      wallet: this.wallet,
      capabilities: this.capabilities,
      collaborators: Array.from(this.collaborators),
      tasksCompleted: this.taskHistory.length,
      conversationsCount: this.conversationHistory.length,
      created: this.created,
      uptime: Date.now() - this.created.getTime()
    };
  }

  // Receive payment from another agent or external source
  async receivePayment(amount, from, purpose) {
    // In simulation mode, just add to wallet balance
    if (this.walletManager.simulationMode) {
      const currentBalance = parseFloat(this.wallet.balance);
      const receiveAmount = parseFloat(amount);
      this.wallet.balance = (currentBalance + receiveAmount).toFixed(2);

      const receipt = {
        id: `rcpt_${uuidv4()}`,
        to: this.id,
        from,
        amount,
        purpose,
        timestamp: new Date().toISOString(),
        status: 'received'
      };

      this.taskHistory.push({
        type: 'received_payment',
        receipt,
        timestamp: new Date().toISOString()
      });

      console.log(`💰 Agent ${this.type} received ${amount} USDC from ${from}`);
      return receipt;
    }
  }

  // Shutdown agent and cleanup
  async shutdown() {
    this.status = 'inactive';
    console.log(`🔄 Agent ${this.type} (${this.id.slice(0,8)}) shutdown`);
  }
}