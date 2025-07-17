import CircleHandler from './circleHandler.js';

async function testBothChains() {
    const handler = new CircleHandler();
    await handler.initialize();
    
    console.log('\n🔍 Testing ETH vs SOL Transfer Comparison\n');
    
    // Test small transfers on both chains
    const testAmount = '0.01';
    
    try {
        // Test Ethereum transfer
        console.log('1️⃣ Testing Ethereum Transfer...');
        const ethResult = await handler.transfer(testAmount, process.env.ETH_ALICE, 'ETH');
        console.log('ETH Transfer Result:', {
            success: ethResult.success,
            id: ethResult.transferId,
            status: ethResult.status
        });
        
        // Test Solana transfer
        console.log('\n2️⃣ Testing Solana Transfer...');
        const solResult = await handler.transfer(testAmount, process.env.SOL_ALICE, 'SOL');
        console.log('SOL Transfer Result:', {
            success: solResult.success,
            id: solResult.transferId,
            status: solResult.status
        });
        
        // Wait a bit then check both
        console.log('\n⏳ Waiting 10 seconds before checking status...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Check ETH status
        console.log('\n📊 Checking ETH Transfer Status:');
        const ethStatus = await handler.getTransferStatus(ethResult.transferId);
        if (ethStatus.success) {
            console.log('  Status:', ethStatus.data.status);
            console.log('  Tx Hash:', ethStatus.data.transactionHash || 'pending');
        }
        
        // Check SOL status
        console.log('\n📊 Checking SOL Transfer Status:');
        const solStatus = await handler.getTransferStatus(solResult.transferId);
        if (solStatus.success) {
            console.log('  Status:', solStatus.data.status);
            console.log('  Tx Hash:', solStatus.data.transactionHash || 'pending');
            
            // Check for any error details
            if (solStatus.data.errorCode) {
                console.log('  Error Code:', solStatus.data.errorCode);
                console.log('  Error Message:', solStatus.data.errorMessage);
            }
            
            // Log full response for debugging
            console.log('\n  Full SOL Response:', JSON.stringify(solStatus.data, null, 2));
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testBothChains();