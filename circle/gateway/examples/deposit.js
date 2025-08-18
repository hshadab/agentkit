#!/usr/bin/env node

import GatewayHandler from '../gatewayHandler.js';

async function main() {
  const gateway = new GatewayHandler();
  
  try {
    console.log('🔄 Initializing Gateway Handler...');
    await gateway.initialize();
    
    // Show wallet info
    console.log('\n📊 Wallet Information:');
    const walletInfo = await gateway.getWalletInfo();
    console.table(walletInfo);
    
    // Get supported networks
    const networks = await gateway.getSupportedNetworks();
    console.log('\n🌐 Supported Networks:');
    networks.forEach(network => {
      console.log(`  - ${network.name} (Chain ID: ${network.config.chainId})`);
    });
    
    // Example deposit (uncomment to run)
    /*
    const network = 'eth-sepolia';
    const amount = '10.0'; // 10 USDC
    
    console.log(`\n💰 Depositing ${amount} USDC to Gateway on ${network}...`);
    const result = await gateway.deposit(network, amount);
    
    console.log('✅ Deposit successful!');
    console.log(`   Network: ${result.network}`);
    console.log(`   Amount: ${result.amount} USDC`);
    console.log(`   Transaction: ${result.transactionHash}`);
    console.log(`   Block: ${result.blockNumber}`);
    */
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 2) {
  const [network, amount] = args;
  
  // Override the example with command line args
  const gateway = new GatewayHandler();
  gateway.initialize()
    .then(() => gateway.deposit(network, amount))
    .then(result => {
      console.log('✅ Deposit successful!');
      console.log(`   Network: ${result.network}`);
      console.log(`   Amount: ${result.amount} USDC`);
      console.log(`   Transaction: ${result.transactionHash}`);
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
} else {
  main();
}

// Usage examples:
// node deposit.js                    # Show wallet info and networks
// node deposit.js eth-sepolia 10.0   # Deposit 10 USDC to Ethereum Sepolia