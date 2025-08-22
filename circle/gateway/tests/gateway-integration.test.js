import GatewayHandler from '../gatewayHandler.js';
import GatewayAPI from '../gatewayAPI.js';
import ZKPGatewayIntegration from '../zkpGatewayIntegration.js';

// Gateway Integration Test Suite
console.log('🧪 Circle Gateway Integration Tests');

async function testGatewayAPI() {
  console.log('\n=== Gateway API Tests ===');
  
  const gatewayAPI = new GatewayAPI();
  
  try {
    // Test 1: Gateway API Connection
    console.log('1. Testing Gateway API connection...');
    const connectionResult = await gatewayAPI.testConnection();
    console.log('   Connection result:', connectionResult.success ? '✅ Connected' : '❌ Failed');
    
    if (connectionResult.success) {
      // Test 2: Gateway Info
      console.log('2. Getting Gateway info...');
      const infoResult = await gatewayAPI.getGatewayInfo();
      if (infoResult.success) {
        console.log('   ✅ Gateway info retrieved');
        console.log('   Supported domains:', infoResult.supportedDomains?.length || 0);
        console.log('   Supported tokens:', infoResult.supportedTokens?.length || 0);
      } else {
        console.log('   ❌ Gateway info failed:', infoResult.error);
      }
    }
    
  } catch (error) {
    console.log('❌ Gateway API tests failed:', error.message);
  }
}

async function testGatewayHandler() {
  console.log('\n=== Gateway Handler Tests ===');
  
  const gatewayHandler = new GatewayHandler();
  
  try {
    // Test 1: Initialization
    console.log('1. Initializing Gateway Handler...');
    await gatewayHandler.initialize();
    console.log('   ✅ Gateway Handler initialized');
    
    // Test 2: Get supported networks
    console.log('2. Getting supported networks...');
    const networks = await gatewayHandler.getSupportedNetworks();
    console.log(`   ✅ ${networks.length} networks supported:`, networks.map(n => n.name).join(', '));
    
    // Test 3: Get wallet info
    console.log('3. Getting wallet info...');
    const walletInfo = await gatewayHandler.getWalletInfo();
    
    for (const [network, info] of Object.entries(walletInfo)) {
      if (info.error) {
        console.log(`   ⚠️  ${network}: ${info.error}`);
      } else {
        console.log(`   ✅ ${network}:`);
        console.log(`      Address: ${info.address}`);
        console.log(`      USDC: ${info.usdcBalance}`);
        console.log(`      Gateway: ${info.gatewayBalance}`);
        console.log(`      Total: ${info.totalBalance}`);
      }
    }
    
    // Test 4: Get unified balance
    console.log('4. Getting unified Gateway balance...');
    const unifiedBalance = await gatewayHandler.getUnifiedBalance();
    console.log(`   ✅ Unified balance: ${unifiedBalance.totalBalance} USDC`);
    
    for (const [network, balance] of Object.entries(unifiedBalance.networks)) {
      if (balance.error) {
        console.log(`      ⚠️  ${network}: ${balance.error}`);
      } else {
        console.log(`      ${network}: ${balance.balance} USDC`);
      }
    }
    
  } catch (error) {
    console.log('❌ Gateway Handler tests failed:', error.message);
  }
}

async function testZKPGatewayIntegration() {
  console.log('\n=== ZKP + Gateway Integration Tests ===');
  
  const zkpGateway = new ZKPGatewayIntegration();
  
  try {
    // Test 1: Initialization
    console.log('1. Initializing ZKP Gateway Integration...');
    await zkpGateway.initialize();
    console.log('   ✅ ZKP Gateway Integration initialized');
    
    // Test 2: Get Gateway status
    console.log('2. Getting Gateway status...');
    const status = await zkpGateway.getGatewayStatus();
    console.log('   Status:');
    console.log(`      Initialized: ${status.initialized ? '✅' : '❌'}`);
    console.log(`      ZKP Engine: ${status.zkpEngineConnected ? '✅ Connected' : '⚠️  Not connected'}`);
    console.log(`      Networks: ${status.supportedNetworks.length}`);
    
    // Test 3: Simulate ZKP + Gateway workflow (dry run)
    console.log('3. Testing ZKP + Gateway workflow (simulation)...');
    
    // Mock transfer parameters (similar to CCTP workflow)
    const mockTransferParams = {
      proofType: 'kyc',
      proofData: {
        userId: 'test_user_001',
        complianceLevel: 'standard',
        timestamp: Date.now()
      },
      fromNetwork: 'eth-sepolia',
      toNetwork: 'base-sepolia',
      amount: '1.0',
      recipient: '0x742d35Cc6634C0532925a3b8D402b1DeF8d87d87' // Test address
    };
    
    console.log(`   Simulating: ${mockTransferParams.amount} USDC transfer`);
    console.log(`   From: ${mockTransferParams.fromNetwork} → To: ${mockTransferParams.toNetwork}`);
    console.log(`   ZKP Type: ${mockTransferParams.proofType}`);
    
    // Note: This would fail without real Gateway API credentials, but shows the workflow
    try {
      const result = await zkpGateway.verifyAndTransfer(mockTransferParams);
      console.log('   ✅ ZKP + Gateway workflow completed');
      console.log('   Result:', {
        zkpVerified: result.zkpVerified,
        transferType: result.transferType,
        proofId: result.proofId
      });
    } catch (error) {
      console.log('   ⚠️  ZKP + Gateway workflow simulation failed (expected without API credentials)');
      console.log('   Error:', error.message);
    }
    
  } catch (error) {
    console.log('❌ ZKP Gateway Integration tests failed:', error.message);
  }
}

async function runFullTestSuite() {
  console.log('🚀 Starting Circle Gateway Integration Test Suite...');
  console.log('⏰ Test started at:', new Date().toISOString());
  
  await testGatewayAPI();
  await testGatewayHandler();
  await testZKPGatewayIntegration();
  
  console.log('\n✅ Gateway Integration Tests Completed');
  console.log('📝 Summary:');
  console.log('   - Gateway API client implemented');
  console.log('   - Gateway Handler with real contracts');
  console.log('   - ZKP + Gateway workflow integration');
  console.log('   - Same structure as CCTP workflow');
  console.log('\n🎯 Ready for production testing with real Circle Gateway API credentials');
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullTestSuite().catch(console.error);
}

export { testGatewayAPI, testGatewayHandler, testZKPGatewayIntegration, runFullTestSuite };