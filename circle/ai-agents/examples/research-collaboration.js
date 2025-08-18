#!/usr/bin/env node

import AgentCollaboration from '../core/agentCollaboration.js';
import AIAgentZKPVerifier from '../zkp/zkpVerifier.js';

// Demo: Multi-agent research collaboration with ZKP verification
async function researchCollaborationDemo() {
  console.log('🎯 AI Agent Research Collaboration Demo');
  console.log('=====================================\n');

  const zkpVerifier = new AIAgentZKPVerifier();
  await zkpVerifier.initialize();

  try {
    // Create collaboration project
    const project = new AgentCollaboration(
      'Cryptocurrency Market Analysis',
      '200.00' // Total budget in USDC
    );

    console.log('📋 Creating research team...\n');

    // Add research agents
    const researcher = await project.addAgent(
      'researcher',
      'Market Data Analyst',
      ['data-gathering', 'trend-analysis', 'report-generation'],
      '50.00'
    );

    const executor = await project.addAgent(
      'executor', 
      'Analysis Executor',
      ['data-processing', 'model-execution', 'result-compilation'],
      '75.00'
    );

    const validator = await project.addAgent(
      'validator',
      'Quality Assurance Specialist', 
      ['accuracy-checking', 'methodology-review', 'peer-review'],
      '25.00'
    );

    const coordinator = await project.addAgent(
      'coordinator',
      'Project Coordinator',
      ['team-management', 'payment-distribution', 'milestone-tracking'],
      '100.00'
    );

    console.log('\n🔐 Generating ZKP authorization proofs...\n');

    // Generate ZKP proofs for each agent's spending authority
    const researcherAuth = await zkpVerifier.generateAgentAuthorizationProof(
      researcher.id,
      'project_owner_123',
      50.00,
      'Market research and data analysis'
    );

    const executorAuth = await zkpVerifier.generateAgentAuthorizationProof(
      executor.id,
      'project_owner_123', 
      75.00,
      'Data processing and analysis execution'
    );

    const validatorAuth = await zkpVerifier.generateAgentAuthorizationProof(
      validator.id,
      'project_owner_123',
      25.00,
      'Quality validation and review'
    );

    const coordinatorAuth = await zkpVerifier.generateAgentAuthorizationProof(
      coordinator.id,
      'project_owner_123',
      100.00,
      'Project coordination and payments'
    );

    console.log(`✅ Researcher authorization: ${researcherAuth.verified ? 'VERIFIED' : 'FAILED'}`);
    console.log(`✅ Executor authorization: ${executorAuth.verified ? 'VERIFIED' : 'FAILED'}`);
    console.log(`✅ Validator authorization: ${validatorAuth.verified ? 'VERIFIED' : 'FAILED'}`);
    console.log(`✅ Coordinator authorization: ${coordinatorAuth.verified ? 'VERIFIED' : 'FAILED'}\n`);

    // Start the collaboration
    const task = 'Analyze cryptocurrency market trends for Q1 2025 and provide investment recommendations';
    console.log(`🚀 Starting collaboration task: ${task}\n`);

    const result = await project.startCollaboration(task);

    console.log('\n📊 Collaboration Results:');
    console.log('========================');
    console.log(`✅ Success: ${result.success}`);
    console.log(`💰 Total Cost: ${result.totalCost.toFixed(2)} USDC`);
    console.log(`⏱️ Phases Completed: ${result.phases.length}`);

    // Generate work completion proofs for quality agents
    console.log('\n🔐 Generating work completion proofs...\n');

    for (const phase of result.phases) {
      if (phase.participants && Array.isArray(phase.participants)) {
        for (const participant of phase.participants) {
          const agent = project.agents.get(participant.agentId);
          if (agent) {
            const workProof = await zkpVerifier.generateWorkCompletionProof(
              agent.id,
              project.projectId,
              participant.contribution,
              8 // Quality score out of 10
            );
            
            console.log(`✅ ${agent.type} work completion proof: ${workProof.verified ? 'VERIFIED' : 'FAILED'}`);
          }
        }
      }
    }

    // Generate multi-agent consensus proof for final payment distribution
    console.log('\n🤝 Generating consensus proof for payment approval...\n');

    const agentIds = Array.from(project.agents.keys());
    const consensusVotes = new Array(agentIds.length).fill(true); // All agents approve
    
    const consensusProof = await zkpVerifier.generateConsensusProof(
      coordinator.id,
      agentIds,
      result.totalCost,
      consensusVotes
    );

    console.log(`✅ Payment consensus proof: ${consensusProof.verified ? 'VERIFIED' : 'FAILED'}`);
    console.log(`📊 Approval percentage: ${consensusProof.publicSignals.approval_percentage}%\n`);

    // Show project status
    const status = project.getCollaborationStatus();
    console.log('📈 Final Project Status:');
    console.log('========================');
    console.log(`Project: ${status.projectName}`);
    console.log(`Status: ${status.status}`);
    console.log(`Agents: ${status.agentCount}`);
    console.log(`Tasks Completed: ${status.tasksCompleted}`);
    console.log(`Budget: ${status.totalBudget} USDC`);
    console.log(`Duration: ${Math.round((status.endTime - status.startTime) / 1000)}s\n`);

    // Show agent wallets final state
    console.log('💼 Agent Wallet States:');
    console.log('=======================');
    
    // Get wallet info from agents directly
    for (const [agentId, agent] of project.agents) {
      const spendingHistory = await agent.walletManager.getSpendingHistory(agentId);
      console.log(`${agent.type}: ${agent.wallet.balance} USDC (spent: ${spendingHistory?.totalSpent || '0.00'} USDC)`);
    }

    console.log('\n🎉 Research collaboration completed successfully!');
    console.log('Key achievements:');
    console.log('- ✅ ZKP-verified agent authorization');
    console.log('- ✅ Automated multi-phase execution'); 
    console.log('- ✅ Quality-based payment distribution');
    console.log('- ✅ Multi-agent consensus for approvals');
    console.log('- ✅ Complete audit trail with cryptographic proofs\n');

    // Cleanup
    await project.shutdown();
    zkpVerifier.disconnect();

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    zkpVerifier.disconnect();
    process.exit(1);
  }
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  researchCollaborationDemo();
}

export { researchCollaborationDemo };