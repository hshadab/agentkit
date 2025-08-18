#!/usr/bin/env node

import GatewayHandler from '../gatewayHandler.js';

async function main() {
  const gateway = new GatewayHandler();
  
  try {
    console.log('🔄 Initializing Gateway Handler...');
    await gateway.initialize();
    
    // Show wallet info
    console.log('\n📊 Current Balances:');
    const walletInfo = await gateway.getWalletInfo();
    console.table(walletInfo);
    
    // Example cross-chain transfer (uncomment to run)
    /*
    const fromNetwork = 'eth-sepolia';
    const toNetwork = 'base-sepolia';
    const amount = '5.0'; // 5 USDC
    const recipient = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // alice
    
    console.log(`\n🌉 Cross-chain transfer:`);
    console.log(`   From: ${fromNetwork}`);
    console.log(`   To: ${toNetwork}`);
    console.log(`   Amount: ${amount} USDC`);
    console.log(`   Recipient: ${recipient}`);
    
    const result = await gateway.transfer(fromNetwork, toNetwork, amount, recipient);
    
    console.log('\n✅ Transfer initiated!');
    console.log(`   Transaction: ${result.transactionHash}`);
    console.log(`   Block: ${result.blockNumber}`);
    console.log(`   Estimated finalization: ${new Date(result.estimatedFinalization).toLocaleString()}`);
    */
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 4) {
  const [fromNetwork, toNetwork, amount, recipient] = args;
  
  // Override the example with command line args
  const gateway = new GatewayHandler();
  gateway.initialize()
    .then(() => gateway.transfer(fromNetwork, toNetwork, amount, recipient))
    .then(result => {
      console.log('✅ Cross-chain transfer initiated!');
      console.log(`   From: ${result.fromNetwork}`);
      console.log(`   To: ${result.toNetwork}`);
      console.log(`   Amount: ${result.amount} USDC`);
      console.log(`   Recipient: ${result.recipient}`);
      console.log(`   Transaction: ${result.transactionHash}`);
      console.log(`   Estimated finalization: ${new Date(result.estimatedFinalization).toLocaleString()}`);
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
} else {
  main();
}

// Usage examples:
// node transfer.js                                                          # Show current balances
// node transfer.js eth-sepolia base-sepolia 5.0 0x70997970C51812dc3A010C7d01b50e0d17dc79C8   # Transfer 5 USDC from Ethereum to Base