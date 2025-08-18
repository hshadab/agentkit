#!/usr/bin/env node

import { researchCollaborationDemo } from './examples/research-collaboration.js';
import { cctpCrossChainDemo } from './examples/cctp-cross-chain-demo.js';
import { runBasicTests } from './tests/basic.test.js';

// Main demo script
async function runAIAgentsDemo() {
  console.log('🚀 AI Agents + ZKP + USDC + CCTP Integration Demo');
  console.log('=================================================\n');

  console.log('This demo showcases:');
  console.log('- 🤖 AI agents with autonomous spending capabilities');
  console.log('- 🔐 NovaNet ZKP verification for agent authorization');
  console.log('- 💰 Circle Programmable Wallets for USDC payments');
  console.log('- 🌉 Circle CCTP V2 for cross-chain USDC transfers');
  console.log('- ⚡ Fast Transfer for urgent cross-chain payments');
  console.log('- 🤝 Multi-agent collaboration with automated payments');
  console.log('- ✅ Complete audit trail with cryptographic proofs\n');

  const choice = process.argv[2] || 'full';

  switch (choice) {
    case 'basic':
      console.log('Running basic AI agent tests...\n');
      await runBasicTests();
      break;
      
    case 'collaboration':
      console.log('Running multi-agent research collaboration demo...\n');
      await researchCollaborationDemo();
      break;
      
    case 'cctp':
      console.log('Running CCTP cross-chain transfer demo...\n');
      await cctpCrossChainDemo();
      break;
      
    case 'full':
    default:
      console.log('Running full demo suite...\n');
      
      console.log('📋 Part 1: Basic AI Agent Functionality');
      console.log('======================================');
      await runBasicTests();
      
      console.log('\n\n📋 Part 2: Multi-Agent Collaboration');
      console.log('===================================');
      await researchCollaborationDemo();
      
      console.log('\n\n📋 Part 3: CCTP Cross-Chain Transfers');
      console.log('====================================');
      await cctpCrossChainDemo();
      
      console.log('\n\n🎉 Full Demo Complete!');
      console.log('======================');
      console.log('This demonstrates the future of AI commerce:');
      console.log('- AI agents can autonomously manage budgets');
      console.log('- Zero-knowledge proofs ensure authorization');
      console.log('- Instant USDC settlements enable real-time AI economy');
      console.log('- Multi-agent collaboration creates complex workflows');
      console.log('- Complete transparency with cryptographic guarantees\n');
      
      console.log('- Cross-chain USDC transfers with Circle CCTP V2');
      console.log('- Fast Transfer for urgent cross-chain payments\n');
      
      console.log('🔮 Next Steps:');
      console.log('- Implement smart contract escrow automation');
      console.log('- Add programmable hooks for automated workflows');
      console.log('- Scale to enterprise AI agent fleets');
      console.log('- Connect to Circle production APIs for mainnet\n');
      break;
  }
}

// Show usage if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('AI Agents Demo Usage:');
  console.log('node demo.js [basic|collaboration|cctp|full]');
  console.log('');
  console.log('Options:');
  console.log('  basic         - Run basic AI agent tests only');
  console.log('  collaboration - Run multi-agent collaboration demo');
  console.log('  cctp          - Run CCTP cross-chain transfer demo');
  console.log('  full          - Run complete demo suite (default)');
  process.exit(0);
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  runAIAgentsDemo().catch(error => {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  });
}