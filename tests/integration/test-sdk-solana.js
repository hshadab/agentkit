import CircleHandlerSDK from './circleHandlerSDK.js';

async function testSDKSolanaTransfer() {
    const handler = new CircleHandlerSDK();
    
    try {
        await handler.initialize();
        
        console.log('\n🔍 Testing Solana Transfer with Circle SDK\n');
        
        // Test small Solana transfer
        const result = await handler.transfer('0.01', process.env.SOL_ALICE, 'SOL');
        
        if (result.success) {
            console.log('✅ Transfer initiated successfully');
            console.log('Transfer ID:', result.transferId);
            console.log('Initial status:', result.status);
            
            // Wait a bit then check status
            console.log('\n⏳ Waiting 15 seconds before checking status...');
            await new Promise(resolve => setTimeout(resolve, 15000));
            
            // Check status
            const statusResult = await handler.getTransferStatus(result.transferId);
            
            if (statusResult.success) {
                console.log('\n📊 Transfer Status:');
                console.log('Status:', statusResult.data.status);
                console.log('Transaction Hash:', statusResult.data.transactionHash || 'not yet available');
                
                // Check Solana-specific fields
                if (statusResult.data.solanaTransactionInfo) {
                    console.log('\n🔍 Solana Transaction Info:');
                    console.log(JSON.stringify(statusResult.data.solanaTransactionInfo, null, 2));
                }
                
                // Full response for debugging
                console.log('\n📋 Full Response:');
                console.log(JSON.stringify(statusResult.data, null, 2));
            }
        } else {
            console.error('❌ Transfer failed:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testSDKSolanaTransfer();