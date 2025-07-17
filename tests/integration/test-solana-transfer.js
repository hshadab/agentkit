import CircleUSDCHandler from './circleHandler.js';

async function testSolanaTransfer() {
    const handler = new CircleUSDCHandler();
    await handler.initialize();
    
    console.log('\n🔍 Testing Solana Transfer\n');
    console.log('Wallet ID:', process.env.CIRCLE_SOL_WALLET_ID);
    console.log('To Address:', process.env.SOL_ALICE);
    
    try {
        const result = await handler.transferUSDC(
            '0.01',
            process.env.SOL_ALICE,
            false,
            'SOL'
        );
        
        console.log('✅ Transfer initiated:', result.id);
        
        // Wait and check status
        setTimeout(async () => {
            const status = await handler.getTransferDetails(result.id);
            console.log('\nTransfer Status:', status.status);
            if (status.errorCode) {
                console.log('Error Code:', status.errorCode);
                console.log('Error:', status.errorMessage || 'No details');
            }
        }, 5000);
        
    } catch (error) {
        console.error('❌ Solana transfer failed:', error.message);
    }
}

testSolanaTransfer();
