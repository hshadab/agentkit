import { v4 as uuidv4 } from 'uuid';
import AIAgent from './aiAgent.js';

// Multi-agent collaboration system following Circle's AutoGen pattern
export default class AgentCollaboration {
  constructor(projectName, budget = '100.00') {
    this.projectId = uuidv4();
    this.projectName = projectName;
    this.budget = budget;
    this.agents = new Map();
    this.tasks = [];
    this.results = [];
    this.collaborationHistory = [];
    this.status = 'initialized';
    this.startTime = null;
    this.endTime = null;
  }

  // Add agent to collaboration
  async addAgent(type, role, capabilities, spendingAuthority) {
    const agent = new AIAgent(type, role, capabilities, spendingAuthority);
    await agent.initialize();
    
    this.agents.set(agent.id, agent);
    console.log(`➕ Added ${type} agent to project: ${this.projectName}`);
    
    return agent;
  }

  // Start collaboration on a specific task
  async startCollaboration(taskDescription) {
    this.status = 'active';
    this.startTime = new Date();
    
    console.log(`🚀 Starting collaboration: ${this.projectName}`);
    console.log(`📋 Task: ${taskDescription}`);

    // Create task entry
    const task = {
      id: uuidv4(),
      description: taskDescription,
      startTime: this.startTime,
      status: 'in_progress',
      participants: Array.from(this.agents.keys()),
      budget: this.budget
    };

    this.tasks.push(task);

    // Coordinate agents based on Circle's pattern
    const result = await this.coordinateAgents(task);
    
    return result;
  }

  // Coordinate multiple agents (following Circle's AutoGen approach)
  async coordinateAgents(task) {
    const coordination = {
      taskId: task.id,
      phases: [],
      totalCost: 0,
      success: false
    };

    try {
      // Phase 1: Research & Planning
      console.log('\n📊 Phase 1: Research & Planning');
      const researchPhase = await this.executeResearchPhase(task);
      coordination.phases.push(researchPhase);
      coordination.totalCost += parseFloat(researchPhase.cost);

      // Phase 2: Execution
      console.log('\n⚙️ Phase 2: Task Execution');
      const executionPhase = await this.executeTaskPhase(task, researchPhase.findings);
      coordination.phases.push(executionPhase);
      coordination.totalCost += parseFloat(executionPhase.cost);

      // Phase 3: Validation
      console.log('\n✅ Phase 3: Quality Validation');
      const validationPhase = await this.executeValidationPhase(task, executionPhase.deliverable);
      coordination.phases.push(validationPhase);
      coordination.totalCost += parseFloat(validationPhase.cost);

      // Phase 4: Payment Distribution
      console.log('\n💰 Phase 4: Payment Distribution');
      const paymentPhase = await this.distributePayments(coordination);
      coordination.phases.push(paymentPhase);

      coordination.success = true;
      task.status = 'completed';
      task.endTime = new Date();

      console.log(`\n🎉 Collaboration completed! Total cost: ${coordination.totalCost.toFixed(2)} USDC`);

    } catch (error) {
      console.error('❌ Collaboration failed:', error.message);
      coordination.success = false;
      task.status = 'failed';
    }

    this.results.push(coordination);
    return coordination;
  }

  // Research phase - gather information
  async executeResearchPhase(task) {
    const researchers = this.getAgentsByType('researcher');
    const phase = {
      name: 'Research',
      startTime: new Date(),
      participants: [],
      findings: {},
      cost: 0
    };

    for (const researcher of researchers) {
      console.log(`🔍 ${researcher.type} agent researching...`);
      
      // Agent thinks about the task
      const reasoning = await researcher.think(task.description, { phase: 'research' });
      
      // Request spending for research tools
      const auth = await researcher.requestSpending(
        reasoning.reasoning.estimatedCost,
        'data-api',
        `Research for: ${task.description}`
      );

      // Simulate payment for research APIs
      const transaction = await researcher.makePayment(auth, 'research-api-provider', {
        phase: 'research',
        task: task.id
      });

      phase.participants.push({
        agentId: researcher.id,
        contribution: reasoning.reasoning.analysis,
        cost: reasoning.reasoning.estimatedCost,
        transaction: transaction.id
      });

      phase.cost += parseFloat(reasoning.reasoning.estimatedCost);
      phase.findings[researcher.id] = reasoning.reasoning;
    }

    phase.endTime = new Date();
    console.log(`📊 Research completed. Cost: ${phase.cost.toFixed(2)} USDC`);
    
    return phase;
  }

  // Execution phase - complete the actual work
  async executeTaskPhase(task, researchFindings) {
    const executors = this.getAgentsByType('executor');
    const phase = {
      name: 'Execution',
      startTime: new Date(),
      participants: [],
      deliverable: null,
      cost: 0
    };

    for (const executor of executors) {
      console.log(`⚙️ ${executor.type} agent executing...`);
      
      // Agent thinks about execution based on research
      const reasoning = await executor.think(task.description, { 
        phase: 'execution',
        research: researchFindings 
      });

      // Request spending for execution resources
      const auth = await executor.requestSpending(
        reasoning.reasoning.estimatedCost,
        'external-services',
        `Execution for: ${task.description}`
      );

      // Simulate payment for execution resources
      const transaction = await executor.makePayment(auth, 'execution-service-provider', {
        phase: 'execution',
        task: task.id
      });

      // Generate deliverable (simulated)
      const deliverable = {
        type: 'task_completion',
        content: `Completed task: ${task.description}`,
        metadata: reasoning.reasoning,
        completedBy: executor.id,
        timestamp: new Date().toISOString()
      };

      phase.participants.push({
        agentId: executor.id,
        contribution: deliverable,
        cost: reasoning.reasoning.estimatedCost,
        transaction: transaction.id
      });

      phase.cost += parseFloat(reasoning.reasoning.estimatedCost);
      phase.deliverable = deliverable;
    }

    phase.endTime = new Date();
    console.log(`⚙️ Execution completed. Cost: ${phase.cost.toFixed(2)} USDC`);
    
    return phase;
  }

  // Validation phase - verify quality
  async executeValidationPhase(task, deliverable) {
    const validators = this.getAgentsByType('validator');
    const phase = {
      name: 'Validation',
      startTime: new Date(),
      participants: [],
      validationResult: null,
      cost: 0
    };

    for (const validator of validators) {
      console.log(`✅ ${validator.type} agent validating...`);
      
      // Agent validates the deliverable
      const reasoning = await validator.think(`Validate: ${deliverable.content}`, {
        phase: 'validation',
        deliverable
      });

      // Request spending for validation tools
      const auth = await validator.requestSpending(
        reasoning.reasoning.estimatedCost,
        'validation-tools',
        `Validation for: ${task.description}`
      );

      // Simulate payment for validation tools
      const transaction = await validator.makePayment(auth, 'validation-service-provider', {
        phase: 'validation',
        task: task.id
      });

      phase.participants.push({
        agentId: validator.id,
        validation: reasoning.reasoning,
        cost: reasoning.reasoning.estimatedCost,
        transaction: transaction.id
      });

      phase.cost += parseFloat(reasoning.reasoning.estimatedCost);
      phase.validationResult = reasoning.reasoning;
    }

    phase.endTime = new Date();
    console.log(`✅ Validation completed. Result: ${phase.validationResult.recommendation}. Cost: ${phase.cost.toFixed(2)} USDC`);
    
    return phase;
  }

  // Distribute payments to agents based on contributions
  async distributePayments(coordination) {
    const coordinators = this.getAgentsByType('coordinator');
    if (coordinators.length === 0) {
      console.log('⚠️ No coordinator found, skipping payment distribution');
      return { name: 'Payment', cost: 0, distributions: [] };
    }

    const coordinator = coordinators[0];
    const phase = {
      name: 'Payment Distribution',
      startTime: new Date(),
      coordinator: coordinator.id,
      distributions: [],
      cost: 0
    };

    // Calculate payments based on contributions
    const paymentPlan = this.calculatePayments(coordination);

    for (const payment of paymentPlan) {
      console.log(`💰 Paying ${payment.amount} USDC to ${payment.agentType} agent`);
      
      // Coordinator authorizes payment
      const auth = await coordinator.requestSpending(
        payment.amount,
        'agent-payments',
        `Payment for task contribution`
      );

      // Get recipient agent
      const recipient = this.agents.get(payment.agentId);
      
      // Execute payment
      const transaction = await coordinator.makePayment(auth, recipient.wallet.address, {
        phase: 'payment',
        contribution: payment.contribution
      });

      // Recipient receives payment
      await recipient.receivePayment(payment.amount, coordinator.id, 'task_contribution');

      phase.distributions.push({
        to: payment.agentId,
        amount: payment.amount,
        reason: payment.contribution,
        transaction: transaction.id
      });

      phase.cost += parseFloat(payment.amount);
    }

    phase.endTime = new Date();
    console.log(`💰 Payment distribution completed. Total: ${phase.cost.toFixed(2)} USDC`);
    
    return phase;
  }

  // Calculate payment amounts based on contributions
  calculatePayments(coordination) {
    const basePayment = 3.0; // Base USDC per agent
    const qualityBonus = 2.0; // Bonus for high quality
    
    const payments = [];
    
    // Pay researchers
    const researchPhase = coordination.phases.find(p => p.name === 'Research');
    if (researchPhase) {
      researchPhase.participants.forEach(participant => {
        payments.push({
          agentId: participant.agentId,
          agentType: 'researcher',
          amount: basePayment.toFixed(2),
          contribution: 'research_contribution'
        });
      });
    }

    // Pay executors
    const executionPhase = coordination.phases.find(p => p.name === 'Execution');
    if (executionPhase) {
      executionPhase.participants.forEach(participant => {
        const bonus = Math.random() > 0.5 ? qualityBonus : 0;
        payments.push({
          agentId: participant.agentId,
          agentType: 'executor',
          amount: (basePayment + bonus).toFixed(2),
          contribution: 'execution_contribution'
        });
      });
    }

    // Pay validators
    const validationPhase = coordination.phases.find(p => p.name === 'Validation');
    if (validationPhase) {
      validationPhase.participants.forEach(participant => {
        payments.push({
          agentId: participant.agentId,
          agentType: 'validator',
          amount: basePayment.toFixed(2),
          contribution: 'validation_contribution'
        });
      });
    }

    return payments;
  }

  // Helper methods
  getAgentsByType(type) {
    return Array.from(this.agents.values()).filter(agent => agent.type === type);
  }

  getCollaborationStatus() {
    return {
      projectId: this.projectId,
      projectName: this.projectName,
      status: this.status,
      agentCount: this.agents.size,
      tasksCompleted: this.tasks.filter(t => t.status === 'completed').length,
      totalBudget: this.budget,
      startTime: this.startTime,
      endTime: this.endTime,
      results: this.results.length
    };
  }

  async shutdown() {
    // Shutdown all agents
    for (const agent of this.agents.values()) {
      await agent.shutdown();
    }
    
    this.status = 'completed';
    this.endTime = new Date();
    console.log(`🔄 Collaboration ${this.projectName} shutdown`);
  }
}