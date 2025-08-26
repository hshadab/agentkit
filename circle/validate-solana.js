import CircleUSDCHandler from './circleHandler.js';

async function testSimpleSolanaTransfer() {
    console.log('🔍 Testing Solana Transfer\n');
    
    const handler = new CircleUSDCHandler();
    await handler.initialize();
    
    // Test with system program address (always valid)
    const testAddress = '11111111111111111111111111111111';
    const amount = '0.01';
    
    try {
        console.log(`Attempting to send ${amount} USDC to ${testAddress} on Solana...`);
        const result = await handler.transferUSDC(amount, testAddress, 'SOL');
        
        console.log('✅ Transfer initiated successfully!');
        console.log('Transfer ID:', result.id);
        console.log('Full response:', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.log('❌ Transfer failed:');
        
        if (error.response?.data) {
            console.log('Circle API Error:', JSON.stringify(error.response.data, null, 2));
            console.log('\nStatus Code:', error.response.status);
        } else {
            console.log('Error:', error.message);
        }
    }
}

testSimpleSolanaTransfer().catch(console.error);
