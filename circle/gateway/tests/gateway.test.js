#!/usr/bin/env node

import GatewayHandler from '../gatewayHandler.js';

async function testGatewayHandler() {
  console.log('🧪 Testing Gateway Handler...');
  
  const gateway = new GatewayHandler();
  
  try {
    // Test 1: Initialization
    console.log('\n1️⃣ Testing initialization...');
    await gateway.initialize();
    console.log('✅ Gateway initialized successfully');
    
    // Test 2: Wallet Info
    console.log('\n2️⃣ Testing wallet info...');
    const walletInfo = await gateway.getWalletInfo();
    console.log('✅ Wallet info retrieved:');
    console.table(walletInfo);
    
    // Test 3: Supported Networks
    console.log('\n3️⃣ Testing supported networks...');
    const networks = await gateway.getSupportedNetworks();
    console.log('✅ Supported networks:');
    networks.forEach(network => {
      console.log(`   - ${network.name} (Chain ID: ${network.config.chainId})`);
    });
    
    // Test 4: Balance Check
    console.log('\n4️⃣ Testing balance checks...');
    for (const network of ['eth-sepolia', 'base-sepolia', 'avalanche-fuji']) {
      try {
        const balance = await gateway.getBalance(network);
        console.log(`✅ ${network}: ${balance.balance} USDC`);
      } catch (error) {
        console.log(`⚠️ ${network}: ${error.message}`);
      }
    }
    
    console.log('\n✅ All Gateway Handler tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testGatewayHandler();
}

export { testGatewayHandler };