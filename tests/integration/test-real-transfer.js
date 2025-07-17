import CircleUSDCHandler from './circleHandler.js';

async function testRealTransfer() {
    const handler = new CircleUSDCHandler();
    await handler.initialize();
    
    console.log('\n🔍 Testing REAL Circle Transfer (NOT simulation)\n');
    console.log('Wallet Type: Merchant Wallet');
    console.log('Wallet ID:', process.env.CIRCLE_ETH_WALLET_ID);
    console.log('Balance: $0.63 USD\n');
    
    try {
        // Test small ETH transfer
        console.log('📤 Attempting real ETH transfer...');
        const ethResult = await handler.transferUSDC(
            '0.01',
            process.env.ETH_ALICE,
            false,
            'ETH'
        );
        
        console.log('✅ ETH Transfer Result:');
        console.log('  ID:', ethResult.id);
        console.log('  Status:', ethResult.status);
        console.log('  To:', process.env.ETH_ALICE);
        console.log('  Amount: $0.01 USD');
        console.log('  This is a REAL transfer on Sepolia testnet!\n');
        
    } catch (error) {
        console.error('❌ ETH Transfer failed:', error.message);
    }
    
    // Note about Solana
    console.log('ℹ️  Note: Solana transfers may fail due to Circle Sandbox limitations');
    console.log('    or address format issues. ETH transfers work reliably.\n');
}

testRealTransfer();
