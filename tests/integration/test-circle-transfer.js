import CircleHandler from './circleHandler.js';
import dotenv from 'dotenv';
dotenv.config();

async function testTransfer() {
    console.log('🔧 Testing Circle Transfer...\n');
    
    // Log environment
    console.log('Environment Check:');
    console.log('- API Key exists:', !!process.env.CIRCLE_API_KEY);
    console.log('- ETH Wallet ID:', process.env.CIRCLE_ETH_WALLET_ID);
    console.log('- API Key prefix:', process.env.CIRCLE_API_KEY?.substring(0, 20) + '...');
    
    const handler = new CircleHandler();
    
    try {
        // Initialize
        await handler.initialize();
        console.log('\n✅ SDK Initialized');
        
        // Check configuration
        console.log('\n📋 Configuration:');
        console.log('- Environment:', handler.sdk.config.environment || 'unknown');
        
        // List wallets to verify access
        console.log('\n👛 Fetching wallets...');
        const wallets = await handler.sdk.wallets.listWallets();
        console.log('Wallets found:', wallets.data?.length || 0);
        
        if (wallets.data && wallets.data.length > 0) {
            wallets.data.forEach(w => {
                console.log(`- Wallet ${w.walletId}: ${w.description}`);
            });
        }
        
        // Attempt a small test transfer
        console.log('\n💸 Attempting test transfer...');
        const result = await handler.transfer(
            0.01,  // Small amount
            '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',  // Alice
            'ETH'
        );
        
        console.log('\n📊 Transfer Result:', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.response?.data) {
            console.error('API Error Details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testTransfer();
