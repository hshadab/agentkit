#!/usr/bin/env node

import CircleHandler from './circleHandler.js';

async function showWalletDetails() {
    console.log('🔍 Getting Wallet Details...\n');
    
    const handler = new CircleHandler();
    await handler.initialize();
    
    console.log('📋 Wallet Configuration:');
    console.log('========================');
    console.log(`Ethereum Wallet ID: ${handler.walletId}`);
    console.log(`Solana Wallet ID: ${handler.solanaWalletId}`);
    
    // Get recipient addresses from the resolver
    const recipients = handler.recipients;
    
    console.log('\n📍 Known Recipient Addresses:');
    console.log('============================');
    for (const [name, address] of Object.entries(recipients)) {
        console.log(`${name}: ${address}`);
    }
    
    console.log('\n💡 To add USDC to your wallets:');
    console.log('================================');
    console.log('Since Circle Sandbox wallets don\'t have public addresses,');
    console.log('you need to use one of these methods:\n');
    
    console.log('1. Circle Dashboard Method:');
    console.log('   - Go to https://app-sandbox.circle.com/');
    console.log('   - Navigate to Wallets section');
    console.log('   - Select wallet and click "Add Funds"');
    console.log('   - Add test USDC directly\n');
    
    console.log('2. Transfer from Another Circle Wallet:');
    console.log('   - If you have another Circle sandbox account with USDC');
    console.log('   - Use wallet IDs for internal transfers:');
    console.log(`   - ETH Wallet: ${handler.walletId}`);
    console.log(`   - SOL Wallet: ${handler.solanaWalletId}\n`);
    
    console.log('3. Convert USD to USDC:');
    console.log('   - Your wallets already have USD balance');
    console.log('   - Check if Circle Dashboard has a "Convert" option');
    console.log('   - Or contact Circle support for sandbox USDC\n');
    
    console.log('Note: Circle Sandbox wallets are internal and don\'t have');
    console.log('blockchain addresses like regular crypto wallets.');
}

showWalletDetails().catch(console.error);