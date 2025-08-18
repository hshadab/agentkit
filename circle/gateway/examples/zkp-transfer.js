#!/usr/bin/env node

import ZKPGatewayIntegration from '../zkpGatewayIntegration.js';

// Test data for different proof types
const TEST_DATA = {
  kyc: {
    age: 25,
    location: "US",
    verified: true,
    document_hash: "0x1234567890abcdef"
  },
  device_proximity: {
    device_id: "device_001",
    location: { lat: 40.7128, lng: -74.0060 },
    proximity_threshold: 100,
    timestamp: Date.now()
  },
  balance: {
    account: "test_account",
    balance: 1000,
    threshold: 500,
    currency: "USDC"
  }
};

async function main() {
  const zkpGateway = new ZKPGatewayIntegration();
  
  try {
    console.log('🔄 Initializing ZKP Gateway Integration...');
    await zkpGateway.initialize();
    
    // Show status
    console.log('\n📊 Gateway Status:');
    const status = await zkpGateway.getGatewayStatus();
    console.log(`   Initialized: ${status.initialized}`);
    console.log(`   ZKP Engine: ${status.zkpEngineConnected ? '✅ Connected' : '⚠️ Disconnected'}`);
    console.log(`   Supported Networks: ${status.supportedNetworks.length}`);
    
    console.log('\n💼 Wallet Balances:');
    console.table(status.walletInfo);
    
    // Example KYC verified transfer (uncomment to run)
    /*
    const fromNetwork = 'eth-sepolia';
    const toNetwork = 'base-sepolia';
    const amount = '5.0';
    const recipient = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // alice
    
    console.log(`\n🔐 Executing KYC verified cross-chain transfer...`);
    console.log(`   From: ${fromNetwork} → To: ${toNetwork}`);
    console.log(`   Amount: ${amount} USDC`);
    console.log(`   Recipient: ${recipient}`);
    
    const result = await zkpGateway.kycVerifiedTransfer(
      fromNetwork,
      toNetwork,
      amount,
      recipient,
      TEST_DATA.kyc
    );
    
    console.log('\n✅ ZKP Verified Transfer Complete!');
    console.log(`   ZKP Verified: ${result.zkpVerified}`);
    console.log(`   Proof ID: ${result.proofId || 'N/A'}`);
    console.log(`   Transaction: ${result.transfer.transactionHash}`);
    console.log(`   Estimated finalization: ${new Date(result.transfer.estimatedFinalization).toLocaleString()}`);
    */
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    zkpGateway.disconnect();
  }
}

// Parse command line arguments for different proof types
const args = process.argv.slice(2);
if (args.length >= 5) {
  const [proofType, fromNetwork, toNetwork, amount, recipient] = args;
  
  if (!TEST_DATA[proofType]) {
    console.error(`❌ Unknown proof type: ${proofType}`);
    console.log(`Available types: ${Object.keys(TEST_DATA).join(', ')}`);
    process.exit(1);
  }
  
  // Execute with command line args
  const zkpGateway = new ZKPGatewayIntegration();
  zkpGateway.initialize()
    .then(() => zkpGateway.verifyAndTransfer({
      proofType,
      proofData: TEST_DATA[proofType],
      fromNetwork,
      toNetwork,
      amount,
      recipient
    }))
    .then(result => {
      console.log('✅ ZKP Verified Transfer Complete!');
      console.log(`   Proof Type: ${proofType}`);
      console.log(`   ZKP Verified: ${result.zkpVerified}`);
      console.log(`   Proof ID: ${result.proofId || 'N/A'}`);
      console.log(`   From: ${result.transfer.fromNetwork} → To: ${result.transfer.toNetwork}`);
      console.log(`   Amount: ${result.transfer.amount} USDC`);
      console.log(`   Transaction: ${result.transfer.transactionHash}`);
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    })
    .finally(() => {
      zkpGateway.disconnect();
    });
} else {
  main();
}

// Usage examples:
// node zkp-transfer.js                                                     # Show status and balances
// node zkp-transfer.js kyc eth-sepolia base-sepolia 5.0 0x70997970C51812dc3A010C7d01b50e0d17dc79C8   # KYC verified transfer
// node zkp-transfer.js device_proximity eth-sepolia base-sepolia 3.0 0x70997970C51812dc3A010C7d01b50e0d17dc79C8   # Device proximity verified transfer