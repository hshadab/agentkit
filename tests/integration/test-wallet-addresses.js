import CircleHandlerSDK from './circleHandlerSDK.js';

async function testWalletAddresses() {
    const handler = new CircleHandlerSDK();
    
    try {
        await handler.initialize();
        
        console.log('\n🔍 Checking Wallet Configuration\n');
        
        const walletId = process.env.CIRCLE_SOL_WALLET_ID;
        console.log('Solana Wallet ID:', walletId);
        
        // Get wallet details using SDK
        const wallet = await handler.getWallet(walletId);
        console.log('\n📊 Wallet Details:');
        console.log(JSON.stringify(wallet, null, 2));
        
        // Get wallet addresses
        if (handler.circle.wallets.listAddresses) {
            try {
                const addressesResponse = await handler.circle.wallets.listAddresses(walletId);
                console.log('\n📬 Wallet Addresses:');
                console.log(JSON.stringify(addressesResponse.data, null, 2));
            } catch (e) {
                console.log('Could not list addresses:', e.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testWalletAddresses();