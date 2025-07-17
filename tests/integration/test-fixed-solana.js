import CircleHandler from './circleHandler.js';

async function testFixedSolanaTransfer() {
    const handler = new CircleHandler();
    
    try {
        await handler.initialize();
        
        console.log('\n🔍 Testing Fixed Solana Transfer Implementation\n');
        console.log('Previous working tx example: 2qGeUS6WtNM4BcoD6wp9evcGUceEvcuZYPf51zdWnHrYVNPRjafTKJCLeCgrfxSfSeyoZ2hy46gJfmhGy3ZWeYMA');
        console.log('This proves Circle CAN return Solana tx hashes!\n');
        
        // Test small Solana transfer
        const result = await handler.transfer('0.01', process.env.SOL_ALICE, 'SOL');
        
        if (result.success) {
            console.log('✅ Transfer initiated successfully');
            console.log('Transfer ID:', result.transferId);
            console.log('Initial status:', result.status);
            
            // The aggressive polling is already started in the background
            // Let's wait and see the results
            console.log('\n⏳ Aggressive polling has been started automatically...');
            console.log('Check the logs above for polling results.');
            
            // Also do a manual check after 30 seconds
            setTimeout(async () => {
                console.log('\n📊 Manual status check after 30 seconds:');
                const statusResult = await handler.getTransferStatus(result.transferId);
                if (statusResult.success) {
                    console.log('Final status:', statusResult.data.status);
                    console.log('Transaction hash:', statusResult.data.transactionHash || 'Still not available');
                }
            }, 30000);
            
        } else {
            console.error('❌ Transfer failed:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testFixedSolanaTransfer();