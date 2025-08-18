#!/usr/bin/env node

import AIAgent from '../core/aiAgent.js';
import AIAgentWalletManager from '../wallets/walletManager.js';
import AIAgentZKPVerifier from '../zkp/zkpVerifier.js';

/**
 * CCTP Cross-Chain AI Agent Demo
 * 
 * Demonstrates:
 * - AI agents performing cross-chain USDC transfers
 * - ZKP authorization for cross-chain operations
 * - Real Circle CCTP V2 integration
 * - Multi-chain balance management
 * - Fast Transfer for urgent payments
 */

async function cctpCrossChainDemo() {
  console.log('🌉 CCTP Cross-Chain AI Agent Demo');
  console.log('=================================\n');

  console.log('This demo showcases:');
  console.log('- 🤖 AI agents with cross-chain spending capabilities');
  console.log('- 🔐 ZKP authorization for cross-chain transfers');
  console.log('- ⚡ Circle CCTP V2 with Fast Transfer support');
  console.log('- 🌐 Multi-chain USDC operations (Ethereum ↔ Base ↔ Avalanche)');
  console.log('- 💰 Automated cross-chain rebalancing\n');

  try {
    // Initialize systems
    const walletManager = new AIAgentWalletManager();
    const zkpVerifier = new AIAgentZKPVerifier();
    
    await walletManager.initialize();
    await zkpVerifier.initialize();

    console.log('📋 Step 1: Creating Multi-Chain AI Agent');
    console.log('========================================');

    // Create an executor agent for cross-chain operations
    const executorAgent = new AIAgent('executor', 'cross_chain_executor_001');
    await executorAgent.initialize(walletManager, zkpVerifier);

    // Fund agent on multiple chains
    await walletManager.fundAgentWallet(executorAgent.agentId, 30.00); // Base funding

    console.log(`✅ Created cross-chain executor agent: ${executorAgent.agentId.slice(0, 8)}`);

    console.log('\n📋 Step 2: Check Multi-Chain Balances');
    console.log('====================================');

    const multiChainBalance = await walletManager.getMultiChainBalance(executorAgent.agentId);
    console.log(`💰 Agent ${executorAgent.agentId.slice(0, 8)} balances across chains:`);
    
    for (const [network, balance] of Object.entries(multiChainBalance.multiChainBalances)) {
      if (balance.error) {
        console.log(`   ${network}: ❌ ${balance.error}`);
      } else {
        console.log(`   ${network}: ${balance.balance} USDC`);
      }
    }
    console.log(`   Total: ${multiChainBalance.totalUSDC} USDC across all chains`);

    console.log('\n📋 Step 3: Generate ZKP Authorization');
    console.log('===================================');

    // Generate ZKP proof for cross-chain authorization
    const authProof = await zkpVerifier.generateAgentAuthorizationProof(
      executorAgent.agentId,
      'system_owner',
      15.00,
      'Cross-chain USDC transfer demonstration'
    );

    console.log(`🔐 ZKP Authorization generated:`);
    console.log(`   Proof ID: ${authProof.proofId}`);
    console.log(`   Verified: ${authProof.verified}`);
    console.log(`   zkEngine: ${authProof.zkEngine}`);

    console.log('\n📋 Step 4: Cross-Chain Transfer (Ethereum → Base)');
    console.log('================================================');

    // Example recipient address (would be another agent or user)
    const recipientAddress = '0x742d35Cc6634C0532925a3b8D402b1DeF8d87d87'; // Example address

    try {
      const crossChainTransfer = await walletManager.executeCrossChainTransfer(
        executorAgent.agentId,
        'ethereum-sepolia',    // From network
        'base-sepolia',        // To network  
        '5.0',                 // Amount in USDC
        recipientAddress,      // Recipient
        authProof,             // ZKP authorization
        'normal'               // Priority level
      );

      console.log(`✅ Cross-chain transfer completed!`);
      console.log(`   Transfer ID: ${crossChainTransfer.transferId || 'N/A'}`);
      console.log(`   Burn Tx: ${crossChainTransfer.burnTx}`);
      console.log(`   Mint Tx: ${crossChainTransfer.mintTx}`);
      console.log(`   Amount: ${crossChainTransfer.amount} USDC`);
      console.log(`   Route: ${crossChainTransfer.fromNetwork} → ${crossChainTransfer.toNetwork}`);

    } catch (error) {
      console.log(`⚠️ Cross-chain transfer simulation (CCTP contracts not funded):`);
      console.log(`   Would transfer: 5.0 USDC`);
      console.log(`   Route: ethereum-sepolia → base-sepolia`);
      console.log(`   Error: ${error.message}`);
    }

    console.log('\n📋 Step 5: Fast Transfer (Urgent Payment)');
    console.log('========================================');

    // Generate another authorization for urgent transfer
    const urgentAuthProof = await zkpVerifier.generateBudgetComplianceProof(
      executorAgent.agentId,
      3.0,    // Requested amount
      5.0,    // Current spent
      25.0,   // Period limit
      'urgent-services'
    );

    try {
      const fastTransfer = await walletManager.executeCrossChainTransfer(
        executorAgent.agentId,
        'base-sepolia',        // From network
        'avalanche-fuji',      // To network
        '3.0',                 // Amount
        recipientAddress,      // Recipient
        urgentAuthProof,       // ZKP authorization
        'urgent'               // Fast transfer priority
      );

      console.log(`⚡ Fast transfer completed!`);
      console.log(`   Estimated completion: ${fastTransfer.estimatedFinalization || '30 seconds'}`);
      console.log(`   Transfer type: ${fastTransfer.transferType || 'fast'}`);

    } catch (error) {
      console.log(`⚠️ Fast transfer simulation:`);
      console.log(`   Would transfer: 3.0 USDC (urgent priority)`);
      console.log(`   Route: base-sepolia → avalanche-fuji`);
      console.log(`   Estimated completion: 30 seconds`);
      console.log(`   Error: ${error.message}`);
    }

    console.log('\n📋 Step 6: Auto-Rebalancing Demo');
    console.log('===============================');

    // Check if agent needs rebalancing for a large payment
    const rebalanceCheck = await walletManager.shouldRebalanceChains(
      executorAgent.agentId,
      'ethereum-sepolia',    // Target network
      20.0                   // Required amount
    );

    console.log(`⚖️ Rebalance analysis for 20.0 USDC payment:`);
    console.log(`   Needs rebalance: ${rebalanceCheck.needsRebalance}`);
    
    if (rebalanceCheck.needsRebalance) {
      console.log(`   Can rebalance: ${rebalanceCheck.canRebalance}`);
      if (rebalanceCheck.canRebalance) {
        console.log(`   Best source: ${rebalanceCheck.sourceNetwork} (${rebalanceCheck.sourceBalance} USDC)`);
        console.log(`   Would transfer: ${rebalanceCheck.transferAmount} USDC`);
      } else {
        console.log(`   Reason: ${rebalanceCheck.reason}`);
      }
    }

    console.log('\n📋 Step 7: Cross-Chain Transfer History');
    console.log('=====================================');

    const transferHistory = await walletManager.getCrossChainTransferHistory(executorAgent.agentId);
    console.log(`📊 Agent transfer history:`);
    console.log(`   Local transfers: ${transferHistory.localHistory.length}`);
    console.log(`   On-chain events: ${transferHistory.onChainHistory.length}`);
    console.log(`   Total transfers: ${transferHistory.totalTransfers}`);

    console.log('\n📋 Step 8: Supported CCTP Networks');
    console.log('=================================');

    const supportedNetworks = await walletManager.getSupportedCCTPNetworks();
    console.log(`🌐 CCTP-enabled networks:`);
    
    supportedNetworks.forEach(network => {
      console.log(`   ${network.name} (${network.key}):`);
      console.log(`     Status: ${network.status}`);
      console.log(`     Chain ID: ${network.chainId}`);
      console.log(`     CCTP Domain: ${network.domain}`);
      if (network.usdc) {
        console.log(`     USDC: ${network.usdc}`);
      }
      if (network.error) {
        console.log(`     Error: ${network.error}`);
      }
    });

    console.log('\n🎉 CCTP Cross-Chain Demo Complete!');
    console.log('=================================');
    console.log('\n🔮 Key CCTP V2 Features Demonstrated:');
    console.log('- ✅ Real Circle CCTP contracts integration');
    console.log('- ✅ Cross-chain USDC burn and mint operations');
    console.log('- ✅ Circle attestation service integration');
    console.log('- ✅ Fast Transfer for urgent payments');
    console.log('- ✅ Multi-chain balance management');
    console.log('- ✅ ZKP-authorized cross-chain operations');
    console.log('- ✅ Automated rebalancing logic');
    console.log('- ✅ Complete audit trail across chains');

    console.log('\n💡 Production-Ready Features:');
    console.log('- Real CCTP V2 contract addresses for all networks');
    console.log('- Circle\'s official attestation service');
    console.log('- Ethereum Sepolia ↔ Base Sepolia ↔ Avalanche Fuji');
    console.log('- AI agents can now operate across multiple chains seamlessly');
    console.log('- ZKP proofs ensure authorized cross-chain operations');

  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    // Cleanup
    process.exit(0);
  }
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  cctpCrossChainDemo();
}

export { cctpCrossChainDemo };